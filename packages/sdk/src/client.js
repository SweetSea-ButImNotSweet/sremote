import { AdapterDriver } from './strategies/adapter.js';
import { MediaSessionDriver } from './strategies/mediasession.js';
import { DomDriver } from './strategies/dom.js';
import { BridgeDriver } from './strategies/bridge.js';
import { showInstallModal } from './ui/install-modal.js';
import { lockGlobalSRemoteIfAbsent } from './guard.js';
import { createLogger, LOG_LEVELS } from '@sremote/shared';

// Execute immediately when module is loaded to protect window.sremote
lockGlobalSRemoteIfAbsent();

export class SRemoteClient {
  constructor(options = {}) {
    lockGlobalSRemoteIfAbsent();
    this.options = { fallbackToDom: true, timeout: 2000, passkey: null, driverPriority: ['adapter', 'mediasession', 'dom', 'bridge'], ...options };

    const initialLogLevel = typeof this.options.logLevel === 'number' ? this.options.logLevel : this.options.debug ? LOG_LEVELS.DEBUG : undefined;

    this.logger = createLogger({ prefix: 'wrapper', level: initialLogLevel, defaultLevel: LOG_LEVELS.ERROR });

    // If userscript already ran before client creation, sync log level immediately
    this.syncLogLevelFromUserscript();

    const driverOptions = { ...this.options, logger: this.logger };
    this.bridgeDriver = new BridgeDriver(driverOptions);
    this.userscriptDriver = this.bridgeDriver; // Alias for backward compatibility
    this.domDriver = new DomDriver(driverOptions);
    this.adapterDriver = new AdapterDriver({ ...driverOptions, instanceManager: this.domDriver.instanceManager });
    this.mediaSessionDriver = new MediaSessionDriver(driverOptions);

    this.mode = 'detecting'; // 'userscript' | 'dom-direct' | 'unsupported'
    this._readyPromise = null;
    this._listeners = new Set(); // { event, handler, key, unbindDom, unbindUserscript }

    this.instances = {
      list: key => {
        const result = [];
        const seenIds = new Set();

        // 1. First Priority: In-page Custom Adapters
        if (this.adapterDriver) {
          const adapterList = this.adapterDriver.list() || [];
          for (const item of adapterList) {
            seenIds.add(item.instanceId);
            result.push(item);
          }
        }

        // 2. Second Priority: External Bridge (Userscript / Host) instances
        if (this.bridgeDriver.isAvailable()) {
          const userList = this.bridgeDriver.list(key || this.options.passkey) || [];
          for (const item of userList) {
            const id = typeof item === 'string' ? item : item.instanceId;
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              result.push(item);
            }
          }
        } else if (this.domDriver) {
          // 3. Fallback: Local DOM media elements
          const domList = this.domDriver.list() || [];
          for (const item of domList) {
            const id = typeof item === 'string' ? item : item.instanceId;
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              result.push(item);
            }
          }
        }

        return result;
      },
      get: (instanceId, key) => this.status(instanceId, key),
      capabilities: (instanceId, key) => this.capabilities(instanceId, key),
      getIframe: (instanceId, key) => {
        if (this.userscriptDriver.isAvailable()) {
          return this.userscriptDriver.getIframe(instanceId, key || this.options.passkey);
        }
        return null;
      },
      assign: (iframeOrSelector, customId) => this.userscriptDriver.assignId(iframeOrSelector, customId),
      setMultiMode: (mode, key) => {
        this.domDriver.setMultiMode(mode);
        if (this.userscriptDriver.isAvailable()) {
          this.userscriptDriver.setMultiMode(mode, key || this.options.passkey);
        }
      },
      isMultiMode: key => {
        if (this.userscriptDriver.isAvailable()) {
          return this.userscriptDriver.isMultiMode(key || this.options.passkey);
        }
        return this.domDriver.isMultiMode();
      },
      setExclusive: (mode, key) => {
        this.domDriver.setExclusive(mode);
        if (this.userscriptDriver.isAvailable()) {
          this.userscriptDriver.setExclusive(mode, key || this.options.passkey);
        }
      },
      query: key => {
        if (this.userscriptDriver.isAvailable()) {
          return this.userscriptDriver.query(key || this.options.passkey);
        }
        return [];
      },
      note: (dict, key) => {
        if (this.userscriptDriver.isAvailable()) {
          this.userscriptDriver.note(dict, key || this.options.passkey);
        }
      },
    };

    this.adapters = {
      register: (adapter, instanceId) => {
        const registeredId = this.adapterDriver.register(adapter, instanceId);
        this.syncGlobalAdapters();
        return registeredId;
      },
      unregister: instanceId => {
        this.logger.log(`Unregistering adapter for instance: ${instanceId}`);
        const result = this.adapterDriver.unregister(instanceId);
        return result;
      },
      get: instanceId => this.adapterDriver.get(instanceId),
      has: instanceId => this.adapterDriver.has(instanceId),
      list: () => this.adapterDriver.list(),
      get map() {
        return this.adapterDriver.adaptersMap;
      },
    };

    // Attach/override window.sremote.adapters to guarantee Single Source of Truth
    this.syncGlobalAdapters();

    this.rpc = {
      call: (action, params, instanceId, key) => this.userscriptDriver.call(action, params, instanceId, key),
      postMessage: (msg, origin, instanceId, from, key) => this.userscriptDriver.postWindowMessage(msg, origin, instanceId, from, key),
      onMessage: (handler, key) => this.on('iframe:message', handler, key),
    };

    this.css = {
      set: (css, instanceId, key) => this.userscriptDriver.call('setIframeCSS', { css }, instanceId, key),
      get: (instanceId, key) => this.userscriptDriver.call('getIframeCSS', {}, instanceId, key),
      remove: (instanceId, key) => this.userscriptDriver.call('removeIframeCSS', {}, instanceId, key),
    };
  }

  syncGlobalAdapters() {
    try {
      if (typeof window !== 'undefined') {
        if (window.sremote && typeof window.sremote === 'object') {
          try {
            window.sremote.adapters = this.adapters;
          } catch {
            try {
              Object.defineProperty(window.sremote, 'adapters', { value: this.adapters, writable: true, configurable: true });
            } catch {}
          }
        }
        if (typeof globalThis !== 'undefined') {
          globalThis[Symbol.for('__sremote_client__')] = this;
        }
      }
    } catch {}
  }

  isUserscriptAvailable() {
    return this.userscriptDriver.isAvailable();
  }

  syncListenersToUserscript() {
    if (this.userscriptDriver.isAvailable()) {
      for (const entry of this._listeners) {
        if (!entry.unbindUserscript) {
          try {
            entry.unbindUserscript = this.userscriptDriver.on(entry.event, entry.handler, entry.key || this.options.passkey);
            // Once userscript handles the event stream, detach fallback DOM listener to avoid duplicate event calls
            if (typeof entry.unbindDom === 'function') {
              entry.unbindDom();
              entry.unbindDom = null;
            }
          } catch (err) {
            this.logger.warn(`Failed to sync listener for '${entry.event}' to userscript:`, err);
          }
        }
      }
    }
  }

  syncLogLevelFromUserscript() {
    if (this.userscriptDriver?.isAvailable()) {
      const api = this.userscriptDriver.getApi();
      if (api && typeof api.logLevel === 'number' && api.logLevel >= 0) {
        this.logger.setLevel(api.logLevel);
      }
    }
  }

  async ready() {
    // If local custom adapters are already registered, local adapter driver is immediately ready
    if (this.adapterDriver && this.adapterDriver.isAvailable() && this.mode === 'detecting') {
      this.mode = 'dom-direct';
    }

    if (this._readyPromise) return this._readyPromise;

    this._readyPromise = new Promise(resolve => {
      const onConnected = reason => {
        this.mode = 'userscript';
        this.syncLogLevelFromUserscript();
        this.logger.log(reason);
        this.syncGlobalAdapters();
        this.syncListenersToUserscript();
        resolve(this);
      };

      if (this.userscriptDriver.isAvailable()) {
        onConnected('Userscript detected immediately. Mode: userscript');
        return;
      }

      // If already has local adapter or fallback is ready, resolve immediately
      if (this.adapterDriver?.isAvailable()) {
        this.mode = 'dom-direct';
        resolve(this);
        return;
      }

      let resolved = false;

      const onReadyEvent = () => {
        if (resolved) return;
        resolved = true;
        window.removeEventListener('sremote:ready', onReadyEvent);
        clearTimeout(timer);
        onConnected("Received 'sremote:ready' event. Mode: userscript");
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('sremote:ready', onReadyEvent, { once: true });
      }

      const timer = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        if (typeof window !== 'undefined') {
          window.removeEventListener('sremote:ready', onReadyEvent);
        }

        if (this.userscriptDriver.isAvailable()) {
          onConnected('Userscript detected after wait timeout. Mode: userscript');
        } else if (this.options.fallbackToDom) {
          this.mode = 'dom-direct';
          this.logger.log('Userscript not detected. Falling back to Mode: dom-direct');
          resolve(this);
        } else {
          this.mode = 'unsupported';
          this.logger.warn('Userscript not detected and DOM fallback disabled. Mode: unsupported');
          resolve(this);
        }
      }, this.options.timeout);
    });

    return this._readyPromise;
  }

  /**
   * Resolves appropriate driver for a specific target following the driverPriority pipeline.
   * Priority list defaults to: ['adapter', 'mediasession', 'dom', 'bridge']
   * @param {string|Object|null} targetOrId
   * @returns {{ driver: Object, name: string }|null}
   */
  getDriverForTarget(targetOrId = null) {
    const priority = Array.isArray(this.options.driverPriority) ? this.options.driverPriority : ['adapter', 'mediasession', 'dom', 'bridge'];

    for (const key of priority) {
      const norm = String(key || '').toLowerCase();

      // 1. Adapter Driver
      if (norm === 'adapter' && this.adapterDriver) {
        if (typeof targetOrId === 'string' && this.adapterDriver.has(targetOrId)) {
          return { driver: this.adapterDriver, name: 'AdapterDriver' };
        }
        if (!targetOrId && this.adapterDriver.isAvailable()) {
          const isSingle = this.domDriver ? !this.domDriver.isMultiMode() : true;
          if (isSingle) {
            return { driver: this.adapterDriver, name: 'AdapterDriver' };
          }
        }
      }

      // 2. MediaSession Driver
      if (norm === 'mediasession' && this.mediaSessionDriver) {
        if (targetOrId === 'mediasession' || (!targetOrId && this.mediaSessionDriver.isEligible())) {
          return { driver: this.mediaSessionDriver, name: 'MediaSessionDriver' };
        }
      }

      // 3. Dom Driver (Genuine DOM elements)
      if (norm === 'dom' && this.domDriver) {
        if (typeof targetOrId === 'object' && targetOrId instanceof (typeof Element !== 'undefined' ? Element : Object)) {
          return { driver: this.domDriver, name: 'DomDriver' };
        }
        if (typeof targetOrId === 'string' && (targetOrId.startsWith('#') || targetOrId.startsWith('.'))) {
          return { driver: this.domDriver, name: 'DomDriver' };
        }
        // If mode is dom-direct or fallback enabled and target is not an external iframe ID
        if (!targetOrId && (this.mode === 'dom-direct' || this.options.fallbackToDom)) {
          const domList = this.domDriver.list();
          if (domList.length > 0) {
            return { driver: this.domDriver, name: 'DomDriver' };
          }
        }
      }

      // 4. Bridge / Userscript Driver
      if ((norm === 'bridge' || norm === 'userscript') && this.bridgeDriver) {
        if (this.mode === 'userscript' || this.bridgeDriver.isAvailable()) {
          return { driver: this.bridgeDriver, name: 'BridgeDriver' };
        }
      }
    }

    // Default fallback
    if (this.bridgeDriver.isAvailable()) {
      return { driver: this.bridgeDriver, name: 'BridgeDriver' };
    }
    if (this.options.fallbackToDom && this.domDriver) {
      return { driver: this.domDriver, name: 'DomDriver' };
    }
    return null;
  }

  get activeDriver() {
    const resolved = this.getDriverForTarget(null);
    return resolved ? resolved.driver : null;
  }

  /**
   * Helper to execute commands on the active driver after awaiting readiness
   * @private
   */
  async _exec(method, ...args) {
    // Extract target identifier from args depending on action signature
    // For seek/seekTo/volume/mute/speed/load/quality/subtitle/shuffle/repeat: targetOrId is args[1]
    // For play/pause/toggle/stop/next/previous: targetOrId is args[0]
    const valueActions = ['seek', 'seekTo', 'volume', 'mute', 'speed', 'load', 'quality', 'subtitle', 'shuffle', 'repeat'];
    const targetOrId = valueActions.includes(method) ? args[1] : args[0];

    const resolvedInitial = this.getDriverForTarget(targetOrId);
    if (!resolvedInitial && (this.mode === 'userscript' || this.mode === 'dom-direct')) {
      throw new Error(`[SRemote:SDK] No active driver available to execute ${method}()`);
    }

    // Only await ready() if no immediate local adapter or eligible MediaSession driver available
    const hasImmediateLocal = this.adapterDriver?.isAvailable() || this.mediaSessionDriver?.isEligible();
    if (!hasImmediateLocal) {
      await this.ready();
    }

    const resolved = this.getDriverForTarget(targetOrId);
    if (!resolved?.driver) {
      this.logger.error(`No active driver available to execute ${method}()`);
      throw new Error(`[SRemote:SDK] No active driver available to execute ${method}()`);
    }

    const { driver, name: driverName } = resolved;
    const targetLabel = targetOrId ? ` (target: ${typeof targetOrId === 'string' ? targetOrId : 'custom'})` : '';
    this.logger.scope('action').log(`(SDK) Routing -> ${method} to [${driverName}]${targetLabel}`, ...args);
    return driver[method](...args);
  }

  // --- Quick Playback Controls ---
  async play(targetOrId, key) {
    return this._exec('play', targetOrId, key);
  }

  async pause(targetOrId, key) {
    return this._exec('pause', targetOrId, key);
  }

  async toggle(targetOrId, key) {
    return this._exec('toggle', targetOrId, key);
  }

  async stop(targetOrId, key) {
    return this._exec('stop', targetOrId, key);
  }

  async seek(offset, targetOrId, key) {
    return this._exec('seek', offset, targetOrId, key);
  }

  async seekTo(time, targetOrId, key) {
    return this._exec('seekTo', time, targetOrId, key);
  }

  async volume(vol, targetOrId, key) {
    return this._exec('volume', vol, targetOrId, key);
  }

  async mute(muted, targetOrId, key) {
    return this._exec('mute', muted, targetOrId, key);
  }

  async speed(rate, targetOrId, key) {
    return this._exec('speed', rate, targetOrId, key);
  }

  async pip(enable, targetOrId, key) {
    return this._exec('pip', enable, targetOrId, key);
  }

  async load(source, targetOrId, key) {
    return this._exec('load', source, targetOrId, key);
  }

  async quality(level, targetOrId, key) {
    return this._exec('quality', level, targetOrId, key);
  }

  async getQualities(targetOrId, key) {
    return this._exec('getQualities', targetOrId, key);
  }

  async subtitle(track, targetOrId, key) {
    return this._exec('subtitle', track, targetOrId, key);
  }

  async getSubtitles(targetOrId, key) {
    return this._exec('getSubtitles', targetOrId, key);
  }

  async shuffle(enable, targetOrId, key) {
    return this._exec('shuffle', enable, targetOrId, key);
  }

  async repeat(mode, targetOrId, key) {
    return this._exec('repeat', mode, targetOrId, key);
  }

  async next(targetOrId, key) {
    return this._exec('next', targetOrId, key);
  }

  async previous(targetOrId, key) {
    return this._exec('previous', targetOrId, key);
  }

  status(instanceId, key) {
    // 1. Check local adapters first
    if (this.domDriver?.adaptersMap) {
      if (instanceId && this.domDriver.adaptersMap.has(instanceId)) {
        return this.domDriver.getStatus(instanceId);
      }
      if (!instanceId && !this.domDriver.isMultiMode() && this.domDriver.adaptersMap.size > 0) {
        return this.domDriver.getStatus();
      }
    }

    // 2. Query userscriptDriver
    if (this.userscriptDriver.isAvailable()) {
      return this.userscriptDriver.status(instanceId, key);
    }
    if (this.domDriver) {
      return this.domDriver.getStatus(instanceId);
    }
    return null;
  }

  capabilities(targetOrId, key) {
    // 1. Check local adapters first
    if (this.domDriver?.adaptersMap) {
      if (typeof targetOrId === 'string' && this.domDriver.adaptersMap.has(targetOrId)) {
        return this.domDriver.getCapabilities(targetOrId);
      }
      if (!targetOrId && !this.domDriver.isMultiMode() && this.domDriver.adaptersMap.size > 0) {
        return this.domDriver.getCapabilities();
      }
    }

    // 2. Query userscriptDriver
    if (this.userscriptDriver.isAvailable()) {
      return this.userscriptDriver.capabilities(targetOrId, key);
    }
    if (this.domDriver) {
      return this.domDriver.getCapabilities(targetOrId);
    }
    return null;
  }

  // --- Global Lifecycle & Events ---
  async hello(options, key) {
    await this.ready();
    if (this.userscriptDriver.isAvailable()) {
      const api = this.userscriptDriver.getApi();
      if (api && typeof api.hello === 'function') {
        return api.hello(options, key || this.options.passkey);
      }
    }
    return false;
  }

  bindMetadata(meta, instanceId, key) {
    return this.userscriptDriver.bindMetadata(meta, instanceId, key);
  }

  emit(event, payload) {
    this.logger.debug(`emit event '${event}':`, payload);
    if (this.userscriptDriver.isAvailable()) {
      const api = this.userscriptDriver.getApi();
      if (api && typeof api.emit === 'function') {
        return api.emit(event, payload);
      }
    }
    if (this.domDriver && typeof this.domDriver.emit === 'function') {
      return this.domDriver.emit(event, payload);
    }
  }

  on(event, handler, key) {
    this.logger.debug(`Listening to event: ${event}`);
    const entry = { event, handler, key, unbindDom: null, unbindUserscript: null };

    // If userscript is available, bind directly to userscript
    if (this.userscriptDriver.isAvailable()) {
      try {
        entry.unbindUserscript = this.userscriptDriver.on(event, handler, key || this.options.passkey);
      } catch {}
    } else if (this.domDriver && typeof this.domDriver.on === 'function') {
      // Only fallback to DomDriver when userscript is not yet available
      try {
        entry.unbindDom = this.domDriver.on(event, handler);
      } catch {}
    }

    this._listeners.add(entry);

    return () => this.off(event, handler);
  }

  off(event, handler) {
    this.logger.debug(`Unlistening event: ${event}`);
    for (const entry of Array.from(this._listeners)) {
      if (entry.event === event && (!handler || entry.handler === handler)) {
        if (typeof entry.unbindDom === 'function') {
          try {
            entry.unbindDom();
          } catch {}
        } else if (this.domDriver) {
          this.domDriver.off(entry.event, entry.handler);
        }

        if (typeof entry.unbindUserscript === 'function') {
          try {
            entry.unbindUserscript();
          } catch {}
        } else if (this.userscriptDriver.isAvailable()) {
          this.userscriptDriver.off(entry.event, entry.handler);
        }

        this._listeners.delete(entry);
      }
    }
  }

  destroy() {
    this.logger.debug('Destroying SRemoteClient instance...');
    for (const entry of Array.from(this._listeners)) {
      if (typeof entry.unbindDom === 'function') {
        try {
          entry.unbindDom();
        } catch {}
      }
      if (typeof entry.unbindUserscript === 'function') {
        try {
          entry.unbindUserscript();
        } catch {}
      }
    }
    this._listeners.clear();

    if (this.domDriver && typeof this.domDriver.destroy === 'function') {
      try {
        this.domDriver.destroy();
      } catch {}
    }
    this._readyPromise = null;
  }

  showInstallModal(options) {
    return showInstallModal(options);
  }
}

export function createSRemote(options) {
  return new SRemoteClient(options);
}

// Default singleton client instance
export const sremote = new SRemoteClient();

// Expose singleton on global symbol for 100% resilient cross-bundle resolution
if (typeof globalThis !== 'undefined') {
  try {
    globalThis[Symbol.for('__sremote_client__')] = sremote;
  } catch {}
}

if (typeof window !== 'undefined') {
  try {
    sremote[Symbol.for('__sremote_source__')] = 'wrapper';
    sremote[Symbol.for('__sremote_native__')] = true;
    sremote.isSremoteNative = true;
    sremote.isDummy = false;

    // Define window.sremote if not existing or dummy
    if (!window.sremote || window.sremote.isDummy) {
      window.sremote = sremote;
    }
  } catch {}
}

export default sremote;

export { showInstallModal };

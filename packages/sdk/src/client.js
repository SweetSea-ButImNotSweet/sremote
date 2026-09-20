import { AdapterDriver } from './drivers/adapter.js';
import { MediaSessionDriver } from './drivers/mediasession.js';
import { DomDriver } from './drivers/dom.js';
import { BridgeDriver } from './drivers/bridge.js';
import { DriverCache } from './driver-cache.js';
import { FluentInstance } from './fluent/instance.js';
import { showInstallModal } from './ui/install-modal.js';
import { lockGlobalSRemoteIfAbsent } from './guard.js';
import { logger, ConnectionManager, HierarchicalFSM } from '@sremote/shared';

// Execute immediately when module is loaded to protect window.sremote
lockGlobalSRemoteIfAbsent();

export class SRemoteClient {
  constructor(options = {}) {
    lockGlobalSRemoteIfAbsent();
    this.options = { fallbackToDom: true, timeout: 2000, passkey: null, driverPriority: ['adapter', 'mediasession', 'dom', 'bridge'], ...options };

    const initialLogLevel = typeof this.options.logLevel === 'number' ? this.options.logLevel : this.options.debug ? logger.LEVELS.DEBUG : undefined;

    this.logger = logger.create({ prefix: 'wrapper', level: initialLogLevel, defaultLevel: logger.LEVELS.ERROR });

    // If userscript already ran before client creation, sync log level immediately
    this.syncLogLevelFromUserscript();

    const driverOptions = { ...this.options, logger: this.logger };
    this.bridgeDriver = new BridgeDriver(driverOptions);
    this.userscriptDriver = this.bridgeDriver; // Alias for backward compatibility
    this.domDriver = new DomDriver(driverOptions);
    this.adapterDriver = new AdapterDriver({ ...driverOptions, instanceManager: this.domDriver.instanceManager });
    this.mediaSessionDriver = new MediaSessionDriver(driverOptions);

    this.fsm = options.fsm || new HierarchicalFSM();
    this.connectionManager = new ConnectionManager({ ...this.options, logger: this.logger, fsm: this.fsm });
    this.driverCache = new DriverCache({ logger: this.logger });
    this._commandQueue = []; // Auto-queue for commands waiting for ready FSM

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

    this.debug = {
      scan: () => this.bridgeDriver.getApi()?.debug?.scan?.() ?? [],
      getMediaElement: instanceId => this.bridgeDriver.getApi()?.debug?.getMediaElement?.(instanceId) ?? null,
      inspect: instanceId => this.bridgeDriver.getApi()?.debug?.inspect?.(instanceId) ?? null,
      getState: instanceId => this.bridgeDriver.getApi()?.debug?.getState?.(instanceId) ?? null,
      capabilities: instanceId => this.bridgeDriver.getApi()?.debug?.capabilities?.(instanceId) ?? null,
      getCapabilities: instanceId => this.bridgeDriver.getApi()?.debug?.getCapabilities?.(instanceId) ?? null,
      dump: instanceId => this.bridgeDriver.getApi()?.debug?.dump?.(instanceId) ?? null,
      setSource: (src, instanceId) => this.bridgeDriver.getApi()?.debug?.setSource?.(src, instanceId),
      logLevel: newLevel => {
        if (typeof newLevel === 'number') {
          this.logger.setLevel(newLevel);
        }
        return this.bridgeDriver.getApi()?.debug?.logLevel?.(newLevel) ?? this.logger.level;
      },
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
    if (this._readyPromise) return this._readyPromise;

    this._readyPromise = (async () => {
      // If local custom adapters are already registered, local adapter driver is immediately ready
      if (this.adapterDriver && this.adapterDriver.isAvailable() && this.mode === 'detecting') {
        this.mode = 'dom-direct';
      }

      await this.connectionManager.connect({ checkUserscriptAvailable: () => this.userscriptDriver.isAvailable(), checkAdapterAvailable: () => this.adapterDriver?.isAvailable() });

      if (this.userscriptDriver.isAvailable()) {
        this.mode = 'userscript';
        this.syncLogLevelFromUserscript();
        this.syncGlobalAdapters();
        this.syncListenersToUserscript();
      } else if (this.options.fallbackToDom) {
        this.mode = 'dom-direct';
      } else {
        this.mode = 'unsupported';
      }

      // Flush any queued commands waiting for readiness
      this._flushCommandQueue();
      return this;
    })();

    return this._readyPromise;
  }

  _flushCommandQueue() {
    if (this._commandQueue.length === 0) return;
    const pending = [...this._commandQueue];
    this._commandQueue = [];
    for (const item of pending) {
      try {
        item.run();
      } catch (err) {
        item.reject(err);
      }
    }
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
   * Unified Execution Pipeline
   * @param {string} actionName
   * @param {*} payload
   * @param {Object} context
   * @returns {Promise<any>}
   */
  async execute(actionName, payload, context = {}) {
    const targetOrId = context?.targetId ?? null;

    // 1. Check FSM: if transport is not yet connected, auto-queue the command
    if (!this.connectionManager.isConnected) {
      this.logger.debug(`[Auto-Queue] Enqueuing '${actionName}' while connecting...`);
      return new Promise((resolve, reject) => {
        const timeoutTimer = setTimeout(() => {
          const idx = this._commandQueue.findIndex(q => q.timer === timeoutTimer);
          if (idx !== -1) {
            this._commandQueue.splice(idx, 1);
            reject(new Error(`[SRemote:SDK] Command '${actionName}' timed out waiting for connection.`));
          }
        }, this.options.timeout || 2000);

        this._commandQueue.push({
          timer: timeoutTimer,
          run: () => {
            clearTimeout(timeoutTimer);
            this.execute(actionName, payload, context).then(resolve, reject);
          },
          reject,
        });

        // Trigger connection if not already in flight
        this.ready().catch(reject);
      });
    }

    // 2. Fast-Path: JIT Driver Cache Lookup (0ms)
    let driver = this.driverCache.getDriverForAction(targetOrId, actionName);

    if (!driver) {
      // 3. Cache Miss: Resolve through priority pipeline
      const resolved = this.getDriverForTarget(targetOrId);
      if (!resolved?.driver) {
        this.logger.error(`No active driver available to execute ${actionName}()`);
        throw new Error(`[SRemote:SDK] No active driver available to execute ${actionName}()`);
      }

      driver = resolved.driver;

      // Detect platform tag for cache entry
      let platform = 'generic';
      if (resolved.name === 'BridgeDriver') platform = 'userscript-bridge';
      else if (resolved.name === 'AdapterDriver') platform = 'custom-adapter';
      else if (resolved.name === 'MediaSessionDriver') platform = 'mediasession';
      else if (resolved.name === 'DomDriver') platform = 'html5-dom';

      // Save to JIT Cache
      this.driverCache.setDriverForAction(targetOrId, actionName, driver, { platform, element: typeof targetOrId === 'object' ? targetOrId : null });
    }

    const targetLabel = targetOrId ? ` (target: ${typeof targetOrId === 'string' ? targetOrId : 'custom'})` : '';
    this.logger.scope('action').log(`(SDK) Dispatching -> ${actionName}${targetLabel}`, { payload, context });

    return driver.execute(actionName, payload, {
      targetId: targetOrId,
      passkey: context?.passkey || this.options.passkey,
      source: 'sdk-client',
      timestamp: Date.now(),
      ...context,
    });
  }

  /**
   * Returns a scoped FluentInstance targeting a specific element or player
   * @param {string|HTMLElement|null} [target=null]
   * @param {Object} [options={}]
   * @param {string|null} [options.key=null]
   * @returns {FluentInstance}
   */
  select(target = null, options = {}) {
    return new FluentInstance(this, target, options);
  }

  // --- Pure Root Playback Controls (Targets default/active instance) ---
  async play() {
    return this.execute('play');
  }

  async pause() {
    return this.execute('pause');
  }

  async toggle() {
    return this.execute('toggle');
  }

  async stop() {
    return this.execute('stop');
  }

  async seek(offset) {
    return this.execute('seek', offset);
  }

  async seekTo(time) {
    return this.execute('seekTo', time);
  }

  async volume(vol) {
    return this.execute('volume', vol);
  }

  async mute(muted = true) {
    return this.execute('mute', muted);
  }

  async speed(rate) {
    return this.execute('speed', rate);
  }

  async pip(enable = true) {
    return this.execute('pip', enable);
  }

  async load(source) {
    return this.execute('load', source);
  }

  async quality(level) {
    return this.execute('quality', level);
  }

  async getQualities() {
    return this.execute('getQualities');
  }

  async subtitle(track) {
    return this.execute('subtitle', track);
  }

  async getSubtitles() {
    return this.execute('getSubtitles');
  }

  async shuffle(enable = true) {
    return this.execute('shuffle', enable);
  }

  async repeat(mode = true) {
    return this.execute('repeat', mode);
  }

  async next() {
    return this.execute('next');
  }

  async previous() {
    return this.execute('previous');
  }

  status(instanceId, key) {
    // 1. Check local adapters first
    if (this.adapterDriver?.adaptersMap) {
      if (instanceId && this.adapterDriver.adaptersMap.has(instanceId)) {
        return this.adapterDriver.getState(instanceId);
      }
      if (!instanceId && this.adapterDriver.adaptersMap.size > 0) {
        return this.adapterDriver.getState();
      }
    }

    // 2. Query userscriptDriver
    if (this.userscriptDriver.isAvailable()) {
      return this.userscriptDriver.status(instanceId, key);
    }
    if (this.domDriver) {
      return this.domDriver.status(instanceId);
    }
    return null;
  }

  capabilities(targetOrId, key) {
    // 1. Check local adapters first
    if (this.adapterDriver?.adaptersMap) {
      if (typeof targetOrId === 'string' && this.adapterDriver.adaptersMap.has(targetOrId)) {
        return this.adapterDriver.getCapabilities(targetOrId);
      }
      if (!targetOrId && this.adapterDriver.adaptersMap.size > 0) {
        return this.adapterDriver.getCapabilities();
      }
    }

    // 2. Query userscriptDriver
    if (this.userscriptDriver.isAvailable()) {
      return this.userscriptDriver.capabilities(targetOrId, key);
    }
    if (this.domDriver) {
      return this.domDriver.capabilities(targetOrId);
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
export const clientSingleton = new SRemoteClient();

/**
 * Callable SRemote entrypoint and singleton client.
 * Allows scoped fluent selection: `sremote('#player').play().seek(10)`
 * As well as global calls: `sremote.play()`, `sremote.adapters`, `sremote.debug`
 */
function sremoteCallable(target = null, options = {}) {
  return clientSingleton.select(target, options);
}

export const sremote = new Proxy(sremoteCallable, {
  get(targetFn, prop, _receiver) {
    if (prop in targetFn) return targetFn[prop];
    const val = clientSingleton[prop];
    if (typeof val === 'function') {
      return val.bind(clientSingleton);
    }
    return val;
  },
  set(targetFn, prop, value) {
    clientSingleton[prop] = value;
    return true;
  },
  has(targetFn, prop) {
    return prop in targetFn || prop in clientSingleton;
  },
});

// Expose singleton on global symbol for 100% resilient cross-bundle resolution
if (typeof globalThis !== 'undefined') {
  try {
    globalThis[Symbol.for('__sremote_client__')] = clientSingleton;
  } catch {}
}

if (typeof window !== 'undefined') {
  try {
    clientSingleton[Symbol.for('__sremote_source__')] = 'wrapper';
    clientSingleton[Symbol.for('__sremote_native__')] = true;
    clientSingleton.isSremoteNative = true;
    clientSingleton.isDummy = false;

    // Define window.sremote if not existing or dummy
    if (!window.sremote || window.sremote.isDummy) {
      window.sremote = sremote;
    }
  } catch {}
}

export default sremote;

export { showInstallModal };

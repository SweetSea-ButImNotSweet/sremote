import { UserscriptDriver } from './strategies/userscript.js';
import { DomDriver } from './strategies/dom.js';
import { showInstallModal } from './ui/install-modal.js';
import { lockGlobalSRemoteIfAbsent } from './guard.js';

// Execute immediately when module is loaded to protect window.sremote
lockGlobalSRemoteIfAbsent();

export class SRemoteClient {
  constructor(options = {}) {
    lockGlobalSRemoteIfAbsent();
    this.options = { fallbackToDom: true, timeout: 2000, passkey: null, ...options };

    this.userscriptDriver = new UserscriptDriver(this.options);
    this.domDriver = new DomDriver(this.options);
    this.mode = 'detecting'; // 'userscript' | 'dom-direct' | 'unsupported'
    this._readyPromise = null;

    this.instances = {
      list: key => {
        if (this.userscriptDriver.isAvailable()) {
          const api = this.userscriptDriver.getApi();
          return api?.instances?.list ? api.instances.list(key || this.options.passkey) : api?.list?.(key || this.options.passkey) || [];
        }
        return this.domDriver.list();
      },
      get: (instanceId, key) => this.status(instanceId, key),
      capabilities: (instanceId, key) => this.capabilities(instanceId, key),
      getIframe: (instanceId, key) => {
        if (this.userscriptDriver.isAvailable()) {
          const api = this.userscriptDriver.getApi();
          return api?.instances?.getIframe ? api.instances.getIframe(instanceId, key || this.options.passkey) : api?.getIframe?.(instanceId, key || this.options.passkey) || null;
        }
        return null;
      },
      assign: (iframeOrSelector, customId) => this.userscriptDriver.assignId(iframeOrSelector, customId),
      setMultiMode: (mode, key) => {
        this.domDriver.setMultiMode(mode);
        if (this.userscriptDriver.isAvailable()) {
          const api = this.userscriptDriver.getApi();
          if (api?.instances?.setMultiMode) api.instances.setMultiMode(mode, key || this.options.passkey);
          else if (api?.setMultiMode) api.setMultiMode(mode, key || this.options.passkey);
        }
      },
      isMultiMode: key => {
        if (this.userscriptDriver.isAvailable()) {
          const api = this.userscriptDriver.getApi();
          return api?.instances?.isMultiMode ? api.instances.isMultiMode(key || this.options.passkey) : Boolean(api?.isMultiMode?.(key || this.options.passkey));
        }
        return this.domDriver.isMultiMode();
      },
      setExclusive: (mode, key) => {
        this.domDriver.setExclusive(mode);
        if (this.userscriptDriver.isAvailable()) {
          const api = this.userscriptDriver.getApi();
          if (api?.instances?.setExclusive) api.instances.setExclusive(mode, key || this.options.passkey);
          else if (api?.setExclusive) api.setExclusive(mode, key || this.options.passkey);
        }
      },
      query: key => {
        if (this.userscriptDriver.isAvailable()) {
          const api = this.userscriptDriver.getApi();
          return api?.instances?.query ? api.instances.query(key || this.options.passkey) : api?.query?.(key || this.options.passkey) || [];
        }
        return this.domDriver.list();
      },
      note: (dict, key) => {
        if (this.userscriptDriver.isAvailable()) {
          const api = this.userscriptDriver.getApi();
          if (api?.instances?.note) api.instances.note(dict, key || this.options.passkey);
          else if (api?.note) api.note(dict, key || this.options.passkey);
        }
      },
    };

    this.adapters = {
      register: (adapter, instanceId, key) => {
        const domId = this.domDriver.useAdapter(adapter, instanceId);
        if (this.userscriptDriver.isAvailable()) {
          const api = this.userscriptDriver.getApi();
          if (api?.adapters?.register) return api.adapters.register(adapter, instanceId, key || this.options.passkey);
          return this.userscriptDriver.useAdapter(adapter, instanceId, key);
        }
        return domId;
      },
      unregister: (instanceId, key) => {
        if (this.userscriptDriver.isAvailable()) {
          const api = this.userscriptDriver.getApi();
          if (api?.adapters?.unregister) return api.adapters.unregister(instanceId, key || this.options.passkey);
          return this.userscriptDriver.removeAdapter(instanceId, key);
        }
        return this.domDriver.removeAdapter(instanceId);
      },
      get: (instanceId, key) => {
        if (this.userscriptDriver.isAvailable()) {
          const api = this.userscriptDriver.getApi();
          if (api?.adapters?.get) return api.adapters.get(instanceId, key || this.options.passkey);
          return this.userscriptDriver.getCustomAdapter(instanceId, key);
        }
        return this.domDriver.getCustomAdapter(instanceId);
      },
    };

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

  isUserscriptAvailable() {
    return this.userscriptDriver.isAvailable();
  }

  syncAdaptersToUserscript() {
    if (this.userscriptDriver.isAvailable()) {
      const api = this.userscriptDriver.getApi();
      for (const [id, adapter] of this.domDriver.adaptersMap.entries()) {
        if (api?.adapters?.register) {
          api.adapters.register(adapter, id, this.options.passkey);
        } else {
          this.userscriptDriver.useAdapter(adapter, id, this.options.passkey);
        }
      }
    }
  }

  async ready() {
    if (this._readyPromise) return this._readyPromise;

    this._readyPromise = new Promise(resolve => {
      if (this.userscriptDriver.isAvailable()) {
        this.mode = 'userscript';
        this.syncAdaptersToUserscript();
        resolve(this);
        return;
      }

      let resolved = false;

      const onReadyEvent = () => {
        if (resolved) return;
        resolved = true;
        this.mode = 'userscript';
        this.syncAdaptersToUserscript();
        window.removeEventListener('sremote:ready', onReadyEvent);
        clearTimeout(timer);
        resolve(this);
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
          this.mode = 'userscript';
          this.syncAdaptersToUserscript();
        } else if (this.options.fallbackToDom) {
          this.mode = 'dom-direct';
        } else {
          this.mode = 'unsupported';
        }
        resolve(this);
      }, this.options.timeout);
    });

    return this._readyPromise;
  }

  get activeDriver() {
    if (this.mode === 'userscript' || this.userscriptDriver.isAvailable()) {
      return this.userscriptDriver;
    }
    if (this.mode === 'dom-direct' || this.options.fallbackToDom) {
      return this.domDriver;
    }
    return null;
  }

  /**
   * Helper to execute commands on the active driver after awaiting readiness
   * @private
   */
  async _exec(method, ...args) {
    await this.ready();
    const driver = this.activeDriver;
    if (!driver) {
      throw new Error(`[SRemote:Wrapper] No active driver available to execute ${method}()`);
    }
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
    if (this.userscriptDriver.isAvailable()) {
      return this.userscriptDriver.status(instanceId, key);
    }
    return null;
  }

  capabilities(targetOrId, key) {
    if (this.userscriptDriver.isAvailable()) {
      return this.userscriptDriver.capabilities(targetOrId, key);
    }
    if (this.domDriver) {
      return this.domDriver.getCapabilities(targetOrId);
    }
    return null;
  }

  // --- Global Lifecycle & Events ---
  hello(options, key) {
    if (this.userscriptDriver.isAvailable()) {
      const api = this.userscriptDriver.getApi();
      if (api && typeof api.hello === 'function') {
        return api.hello(options, key || this.options.passkey);
      }
    }
  }

  bindMediaSession(instanceId, key) {
    return this.userscriptDriver.bindMediaSession(instanceId, key);
  }

  bindMetadata(meta, instanceId, key) {
    return this.userscriptDriver.bindMetadata(meta, instanceId, key);
  }

  emit(event, payload) {
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
    if (this.userscriptDriver.isAvailable()) {
      return this.userscriptDriver.on(event, handler, key);
    }
    return this.domDriver.on(event, handler);
  }

  off(event, handler) {
    if (this.userscriptDriver.isAvailable()) {
      return this.userscriptDriver.off(event, handler);
    }
    return this.domDriver.off(event, handler);
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

export default sremote;

export { showInstallModal };

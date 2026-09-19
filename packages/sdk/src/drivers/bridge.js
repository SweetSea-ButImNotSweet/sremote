import { isNativeSRemoteInstance } from '../guard.js';

/**
 * BridgeDriver (Extensible Host Bridge)
 *
 * Connects the SDK to external high-privilege host environments.
 * Currently uses UserscriptTransport (window.sremote / window.SRemote / GM).
 * Future-proofed for ElectronTransport and TauriTransport.
 */
export class BridgeDriver {
  constructor(options = {}) {
    this.options = { passkey: null, ...options };
    this.logger = options.logger || null;
    this.transportType = options.transport || 'userscript'; // 'userscript' | 'electron' | 'tauri'
  }

  getPasskey(key) {
    return key || this.options.passkey || null;
  }

  isAvailable() {
    if (typeof window === 'undefined') return false;
    if (typeof globalThis !== 'undefined') {
      const nativeDriver = globalThis[Symbol.for('__sremote_native_driver__')];
      if (nativeDriver && isNativeSRemoteInstance(nativeDriver)) {
        return true;
      }
      const internalBridge = globalThis[Symbol.for('__sremote_internal_bridge__')];
      if (internalBridge && isNativeSRemoteInstance(internalBridge)) {
        return true;
      }
    }
    const api = window.SRemote;
    // Do not treat wrapper itself as external bridge
    if (api?.[Symbol.for('__sremote_source__')] === 'wrapper') {
      return false;
    }
    return isNativeSRemoteInstance(api);
  }

  getApi(required = false) {
    if (typeof window === 'undefined') {
      if (required) throw new Error('[SRemote:BridgeDriver] External host bridge not detected');
      return null;
    }
    if (typeof globalThis !== 'undefined') {
      const nativeDriver = globalThis[Symbol.for('__sremote_native_driver__')];
      if (nativeDriver && isNativeSRemoteInstance(nativeDriver)) {
        return nativeDriver;
      }
      const internalBridge = globalThis[Symbol.for('__sremote_internal_bridge__')];
      if (internalBridge && isNativeSRemoteInstance(internalBridge)) {
        return internalBridge;
      }
    }
    const api = window.SRemote || null;
    if (api?.[Symbol.for('__sremote_source__')] === 'wrapper') {
      return null;
    }
    const nativeApi = isNativeSRemoteInstance(api) ? api : null;
    if (required && !nativeApi) {
      throw new Error('[SRemote:BridgeDriver] External host bridge not detected');
    }
    return nativeApi;
  }

  _resolveMethod(api, methodPath) {
    if (!api || !methodPath) return null;
    const parts = methodPath.split('.');
    let cur = api;
    let parent = null;
    for (const part of parts) {
      if (!cur || (typeof cur !== 'object' && typeof cur !== 'function')) return null;
      parent = cur;
      cur = cur[part];
    }
    if (typeof cur !== 'function') return null;
    return { fn: cur, context: parent };
  }

  _callRequired(method, ...args) {
    const api = this.getApi(true);
    const resolved = this._resolveMethod(api, method);
    if (!resolved) {
      throw new Error(`[SRemote:BridgeDriver] Method '${method}' not supported by host bridge`);
    }
    if (this.logger?.scope) {
      this.logger.scope('action').log(`(BridgeDriver) Forwarding '${method}' to Host (${this.transportType})`, ...args);
    }
    return resolved.fn.call(resolved.context, ...args);
  }

  _callOptional(method, defaultVal, ...args) {
    const api = this.getApi();
    const resolved = this._resolveMethod(api, method);
    if (!resolved) return defaultVal;
    return resolved.fn.call(resolved.context, ...args);
  }

  /**
   * Unified Driver Execution Contract
   * @param {string} actionName - Action name
   * @param {*} payload - Action parameter/payload
   * @param {Object} context - Execution context { targetId, passkey, source, timestamp }
   * @returns {Promise<any>}
   */
  async execute(actionName, payload, context = {}) {
    const instanceId = context?.targetId ?? null;
    const passkey = this.getPasskey(context?.passkey);

    const norm = String(actionName || '');
    switch (norm) {
      case 'play':
      case 'pause':
      case 'toggle':
      case 'stop':
        return this._callRequired(norm, instanceId, passkey);
      case 'seek':
        return this._callRequired('seek', payload, instanceId, passkey);
      case 'seekTo':
        return this._callRequired('seekTo', payload, instanceId, passkey);
      case 'volume':
        return this._callRequired('volume', payload, instanceId, passkey);
      case 'mute':
        return this._callRequired('mute', payload, instanceId, passkey);
      case 'speed':
      case 'playbackRate':
        return this._callRequired('rate', payload, instanceId, passkey);
      case 'pip':
        return this._callRequired('pip', payload, instanceId, passkey);
      case 'load':
        return this._callRequired('load', payload, instanceId, passkey);
      case 'quality':
        return this._callOptional('quality', undefined, payload, instanceId, passkey);
      case 'getQualities':
        return this._callOptional('getQualities', [], instanceId, passkey);
      case 'subtitle':
        return this._callOptional('subtitle', undefined, payload, instanceId, passkey);
      case 'getSubtitles':
        return this._callOptional('getSubtitles', [], instanceId, passkey);
      case 'shuffle':
        return this._callOptional('shuffle', undefined, payload, instanceId, passkey);
      case 'repeat':
        return this._callOptional('repeat', undefined, payload, instanceId, passkey);
      case 'next':
        return this._callOptional('next', undefined, instanceId, passkey);
      case 'previous':
        return this._callOptional('previous', undefined, instanceId, passkey);
      case 'bindMetadata':
        return this._callOptional('bindMetadata', undefined, payload, instanceId, passkey);
      default:
        return this._callOptional(actionName, undefined, payload, instanceId, passkey);
    }
  }

  async on(event, callback, key) {
    const api = this.getApi(true);
    const resolved = this._resolveMethod(api, 'on');
    if (!resolved) throw new Error('[SRemote:BridgeDriver] Host does not support .on()');
    return resolved.fn.call(resolved.context, event, callback, this.getPasskey(key));
  }

  async off(event, callback, key) {
    const api = this.getApi();
    const resolved = this._resolveMethod(api, 'off');
    if (resolved) {
      return resolved.fn.call(resolved.context, event, callback, this.getPasskey(key));
    }
  }

  async emit(event, payload, key) {
    return this._callOptional('emit', undefined, event, payload, this.getPasskey(key));
  }

  async call(action, params, instanceId, key) {
    return this._callRequired('rpc.call', action, params, instanceId, this.getPasskey(key));
  }

  async postWindowMessage(msg, origin, instanceId, from, key) {
    return this._callRequired('rpc.postMessage', msg, origin, instanceId, from, this.getPasskey(key));
  }

  getIframe(instanceId, key) {
    return this._callOptional('instances.getIframe', null, instanceId, this.getPasskey(key));
  }

  assignId(iframeOrSelector, customId) {
    return this._callOptional('instances.assign', false, iframeOrSelector, customId);
  }

  setMultiMode(mode, key) {
    return this._callOptional('instances.setMultiMode', undefined, mode, this.getPasskey(key));
  }

  isMultiMode(key) {
    return this._callOptional('instances.isMultiMode', false, this.getPasskey(key));
  }

  setExclusive(mode, key) {
    return this._callOptional('instances.setExclusive', undefined, mode, this.getPasskey(key));
  }

  query(key) {
    return this._callOptional('instances.query', [], this.getPasskey(key));
  }

  note(dict, key) {
    return this._callOptional('instances.note', undefined, dict, this.getPasskey(key));
  }

  list(key) {
    return this._callOptional('instances.list', [], this.getPasskey(key));
  }
}

// Backward-compatible alias
export { BridgeDriver as UserscriptDriver };

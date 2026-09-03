import { BaseDriver } from './base.js';
import { isNativeSRemoteInstance } from '../guard.js';

export class UserscriptDriver extends BaseDriver {
  isAvailable() {
    if (typeof window === 'undefined') return false;
    // Must check for native userscript instance, not just any object
    // (window.sremote may be a dummy proxy set by lockGlobalSRemoteIfAbsent)
    const api = window.SRemote || window.sremote;
    return isNativeSRemoteInstance(api);
  }

  getApi(required = false) {
    if (typeof window === 'undefined') {
      if (required) throw new Error('[SRemote:Wrapper] SRemote Userscript not detected');
      return null;
    }
    const api = window.SRemote || window.sremote || null;
    // Only return real native userscript API, not the dummy proxy
    const nativeApi = isNativeSRemoteInstance(api) ? api : null;
    if (required && !nativeApi) {
      throw new Error('[SRemote:Wrapper] SRemote Userscript not detected');
    }
    return nativeApi;
  }

  /**
   * Helper to invoke a required API method with passkey
   * @private
   */
  _callRequired(method, ...args) {
    const api = this.getApi(true);
    const fn = api[method];
    if (typeof fn !== 'function') {
      throw new Error(`[SRemote:Wrapper] Method '${method}' not supported by userscript`);
    }
    return fn.call(api, ...args);
  }

  /**
   * Helper to invoke an optional API method with passkey fallback
   * @private
   */
  _callOptional(method, defaultVal, ...args) {
    const api = this.getApi();
    if (!api || typeof api[method] !== 'function') return defaultVal;
    return api[method](...args);
  }

  async play(instanceId, key) {
    return this._callRequired('play', instanceId, this.getPasskey(key));
  }

  async pause(instanceId, key) {
    return this._callRequired('pause', instanceId, this.getPasskey(key));
  }

  async toggle(instanceId, key) {
    return this._callRequired('toggle', instanceId, this.getPasskey(key));
  }

  async stop(instanceId, key) {
    return this._callRequired('stop', instanceId, this.getPasskey(key));
  }

  async seek(offset, instanceId, key) {
    return this._callRequired('seek', offset, instanceId, this.getPasskey(key));
  }

  async seekTo(time, instanceId, key) {
    return this._callRequired('seekTo', time, instanceId, this.getPasskey(key));
  }

  async volume(vol, instanceId, key) {
    return this._callRequired('volume', vol, instanceId, this.getPasskey(key));
  }

  async mute(muted, instanceId, key) {
    return this._callRequired('mute', muted, instanceId, this.getPasskey(key));
  }

  async speed(rate, instanceId, key) {
    const api = this.getApi(true);
    const passkey = this.getPasskey(key);
    if (typeof api.speed === 'function') {
      return api.speed(rate, instanceId, passkey);
    }
    return api.playbackRate(rate, instanceId, passkey);
  }

  async pip(enable, instanceId, key) {
    return this._callRequired('pip', enable, instanceId, this.getPasskey(key));
  }

  async load(source, instanceId, key) {
    return this._callRequired('load', source, instanceId, this.getPasskey(key));
  }

  async quality(level, instanceId, key) {
    return this._callOptional('quality', undefined, level, instanceId, this.getPasskey(key));
  }

  async getQualities(instanceId, key) {
    return this._callOptional('getQualities', [], instanceId, this.getPasskey(key));
  }

  async subtitle(track, instanceId, key) {
    return this._callOptional('subtitle', undefined, track, instanceId, this.getPasskey(key));
  }

  async getSubtitles(instanceId, key) {
    return this._callOptional('getSubtitles', [], instanceId, this.getPasskey(key));
  }

  async shuffle(enable, instanceId, key) {
    return this._callOptional('shuffle', undefined, enable, instanceId, this.getPasskey(key));
  }

  async repeat(mode, instanceId, key) {
    return this._callOptional('repeat', undefined, mode, instanceId, this.getPasskey(key));
  }

  async next(instanceId, key) {
    const api = this.getApi();
    const passkey = this.getPasskey(key);
    if (api && typeof api.next === 'function') return api.next(instanceId, passkey);
    return this._callOptional('nexttrack', undefined, instanceId, passkey);
  }

  async previous(instanceId, key) {
    const api = this.getApi();
    const passkey = this.getPasskey(key);
    if (api && typeof api.previous === 'function') return api.previous(instanceId, passkey);
    return this._callOptional('previoustrack', undefined, instanceId, passkey);
  }

  assignId(iframeOrSelector, customId) {
    return this._callOptional('assignId', false, iframeOrSelector, customId);
  }

  getIframe(instanceId, key) {
    return this._callOptional('getIframe', null, instanceId, this.getPasskey(key));
  }

  // --- Custom Adapter Management ---
  useAdapter(adapter, instanceId, key) {
    return this._callOptional('useAdapter', null, adapter, instanceId, this.getPasskey(key));
  }

  removeAdapter(instanceId, key) {
    return this._callOptional('removeAdapter', false, instanceId, this.getPasskey(key));
  }

  getCustomAdapter(instanceId, key) {
    return this._callOptional('getCustomAdapter', null, instanceId, this.getPasskey(key));
  }

  list(key) {
    return this._callOptional('list', [], this.getPasskey(key));
  }

  status(instanceId, key) {
    return this._callOptional('status', null, instanceId, this.getPasskey(key));
  }

  capabilities(instanceId, key) {
    const api = this.getApi();
    const passkey = this.getPasskey(key);
    if (api && typeof api.capabilities === 'function') {
      return api.capabilities(instanceId, passkey);
    }
    if (api?.instances && typeof api.instances.capabilities === 'function') {
      return api.instances.capabilities(instanceId, passkey);
    }
    if (api && typeof api.getCapabilities === 'function') {
      return api.getCapabilities(instanceId, passkey);
    }
    return null;
  }

  bindMetadata(meta, instanceId, key) {
    return this._callOptional('bindMetadata', undefined, meta, instanceId, this.getPasskey(key));
  }

  setMultiMode(mode, key) {
    return this._callOptional('setMultiMode', undefined, mode, this.getPasskey(key));
  }

  isMultiMode(key) {
    return this._callOptional('isMultiMode', false, this.getPasskey(key));
  }

  setExclusive(mode, key) {
    return this._callOptional('setExclusive', undefined, mode, this.getPasskey(key));
  }

  query(key) {
    return this._callOptional('query', [], this.getPasskey(key));
  }

  call(action, params, instanceId, key) {
    return this._callRequired('call', action, params, instanceId, this.getPasskey(key));
  }

  postWindowMessage(message, targetOrigin = '*', instanceId = null, from = 'parent', key = null) {
    return this._callOptional('postWindowMessage', false, message, targetOrigin, instanceId, from, this.getPasskey(key));
  }

  on(event, handler, key) {
    const api = this.getApi();
    if (api && typeof api.on === 'function') {
      return api.on(event, handler, this.getPasskey(key));
    }
    const fullEvent = event.startsWith('sremote:') ? event : `sremote:${event}`;
    const listener = e => handler(e.detail);
    window.addEventListener(fullEvent, listener);
    return () => window.removeEventListener(fullEvent, listener);
  }

  off(event, handler) {
    const api = this.getApi();
    if (api && typeof api.off === 'function') {
      return api.off(event, handler);
    }
    const fullEvent = event.startsWith('sremote:') ? event : `sremote:${event}`;
    window.removeEventListener(fullEvent, handler);
  }
}

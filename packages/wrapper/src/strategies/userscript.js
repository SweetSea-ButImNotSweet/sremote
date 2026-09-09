import { isNativeSRemoteInstance } from '../guard.js';

export class UserscriptDriver {
  constructor(options = {}) {
    this.options = { passkey: null, ...options };
    this.logger = options.logger || null;
  }

  getPasskey(key) {
    return key || this.options.passkey || null;
  }

  isAvailable() {
    if (typeof window === 'undefined') return false;
    const api = window.SRemote || window.sremote;
    // Do not treat wrapper itself as external userscript driver
    if (api && api[Symbol.for('__sremote_source__')] === 'wrapper') {
      return false;
    }
    return isNativeSRemoteInstance(api);
  }

  getApi(required = false) {
    if (typeof window === 'undefined') {
      if (required) throw new Error('[SRemote:Wrapper] SRemote Userscript not detected');
      return null;
    }
    const api = window.SRemote || window.sremote || null;
    if (api && api[Symbol.for('__sremote_source__')] === 'wrapper') {
      return null;
    }
    const nativeApi = isNativeSRemoteInstance(api) ? api : null;
    if (required && !nativeApi) {
      throw new Error('[SRemote:Wrapper] SRemote Userscript not detected');
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
      throw new Error(`[SRemote:Wrapper] Method '${method}' not supported by userscript`);
    }
    return resolved.fn.call(resolved.context, ...args);
  }

  _callOptional(method, defaultVal, ...args) {
    const api = this.getApi();
    const resolved = this._resolveMethod(api, method);
    if (!resolved) return defaultVal;
    return resolved.fn.call(resolved.context, ...args);
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
    return this._callRequired('rate', rate, instanceId, this.getPasskey(key));
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
    return this._callOptional('next', undefined, instanceId, this.getPasskey(key));
  }

  async previous(instanceId, key) {
    return this._callOptional('previous', undefined, instanceId, this.getPasskey(key));
  }

  list(key) {
    return this._callOptional('instances.list', [], this.getPasskey(key));
  }

  status(instanceId, key) {
    return this._callOptional('status', null, instanceId, this.getPasskey(key));
  }

  capabilities(instanceId, key) {
    return this._callOptional('capabilities', null, instanceId, this.getPasskey(key));
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

  useAdapter(adapter, instanceId, key) {
    return this._callOptional('adapters.register', null, adapter, instanceId, this.getPasskey(key));
  }

  removeAdapter(instanceId, key) {
    return this._callOptional('adapters.unregister', false, instanceId, this.getPasskey(key));
  }

  getCustomAdapter(instanceId, key) {
    return this._callOptional('adapters.get', null, instanceId, this.getPasskey(key));
  }

  call(action, params, instanceId, key) {
    return this._callRequired('rpc.call', action, params, instanceId, this.getPasskey(key));
  }

  postWindowMessage(msg, origin, instanceId, from, key) {
    return this._callOptional('rpc.postMessage', false, msg, origin, instanceId, from, this.getPasskey(key));
  }

  on(event, handler, key) {
    return this._callOptional('on', () => {}, event, handler, this.getPasskey(key));
  }

  off(event, handler) {
    return this._callOptional('off', undefined, event, handler);
  }

  bindMetadata(meta, instanceId, key) {
    return this._callOptional('bindMetadata', false, meta, instanceId, this.getPasskey(key));
  }
}

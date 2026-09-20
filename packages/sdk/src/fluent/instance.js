/**
 * FluentInstance
 *
 * Implements a scoped, Promise-like (Thenable) pipeline queue for SRemote instances.
 * Enables fluent syntax:
 *   await sremote('#hero-video', { key: 'secret' }).play().seek(10).volume(0.8);
 */

export class FluentInstance {
  /**
   * @param {import('../client.js').SRemoteClient} client
   * @param {string|HTMLElement|null} [target=null]
   * @param {Object} [options={}]
   * @param {string|null} [options.key=null]
   */
  constructor(client, target = null, options = {}) {
    this.client = client;
    this.target = target;
    this.options = options;
    this._resolvedInstanceId = null;
    this._chain = Promise.resolve();
  }

  /**
   * Resolves the target into an instanceId or element.
   * @returns {string|HTMLElement|null}
   */
  resolveTarget() {
    if (this._resolvedInstanceId) {
      return this._resolvedInstanceId;
    }

    const t = this.target;
    if (!t) return null;

    // Direct DOM element
    if (typeof t === 'object' && t !== null && t.nodeType === 1) {
      const existingId = t.getAttribute?.('data-sremote-id') || t.id;
      if (existingId) {
        this._resolvedInstanceId = existingId;
        return existingId;
      }
      return t;
    }

    if (typeof t === 'string') {
      // 1. Check if it's already an active instanceId in AdapterDriver
      if (this.client.adapterDriver?.has(t)) {
        this._resolvedInstanceId = t;
        return t;
      }
      // 2. Check if it's a CSS selector
      if (typeof document !== 'undefined') {
        try {
          const el = document.querySelector(t);
          if (el) {
            const elId = el.getAttribute?.('data-sremote-id') || el.id;
            if (elId) {
              this._resolvedInstanceId = elId;
              return elId;
            }
            return el;
          }
        } catch {}
      }
      // Fallback: treated as an instanceId string directly
      this._resolvedInstanceId = t;
      return t;
    }

    return null;
  }

  /**
   * Internal queue pipeline step executor
   * @param {string} action
   * @param {*} [payload=undefined]
   * @returns {Promise<any>}
   * @private
   */
  async _exec(action, payload) {
    const target = this.resolveTarget();
    return this.client.execute(action, payload, { targetId: target, passkey: this.options.key || this.client.options.passkey });
  }

  /**
   * Append an action step to the pipeline chain
   * @param {string} action
   * @param {*} [payload=undefined]
   * @returns {this}
   * @private
   */
  _enqueue(action, payload) {
    this._chain = this._chain.then(() => this._exec(action, payload));
    return this;
  }

  // --- Thenable Contract ---
  then(onFulfilled, onRejected) {
    return this._chain.then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this._chain.catch(onRejected);
  }

  finally(onFinally) {
    return this._chain.finally(onFinally);
  }

  // --- Pure Playback Methods (0 or 1 functional arguments only) ---
  play() {
    return this._enqueue('play');
  }

  pause() {
    return this._enqueue('pause');
  }

  toggle() {
    return this._enqueue('toggle');
  }

  stop() {
    return this._enqueue('stop');
  }

  seek(offset) {
    return this._enqueue('seek', offset);
  }

  seekTo(time) {
    return this._enqueue('seekTo', time);
  }

  volume(val) {
    return this._enqueue('volume', val);
  }

  mute(val = true) {
    return this._enqueue('mute', val);
  }

  speed(rate) {
    return this._enqueue('speed', rate);
  }

  pip(enable = true) {
    return this._enqueue('pip', enable);
  }

  load(source) {
    return this._enqueue('load', source);
  }

  quality(level) {
    return this._enqueue('quality', level);
  }

  subtitle(track) {
    return this._enqueue('subtitle', track);
  }

  shuffle(enable = true) {
    return this._enqueue('shuffle', enable);
  }

  repeat(mode = true) {
    return this._enqueue('repeat', mode);
  }

  next() {
    return this._enqueue('next');
  }

  previous() {
    return this._enqueue('previous');
  }

  // --- Scoped Query and Inspection Helpers ---
  async getQualities() {
    return this._exec('getQualities');
  }

  async getSubtitles() {
    return this._exec('getSubtitles');
  }

  status() {
    const target = this.resolveTarget();
    return this.client.status(typeof target === 'string' ? target : null);
  }

  capabilities() {
    const target = this.resolveTarget();
    return this.client.capabilities(target);
  }

  bindMetadata(meta) {
    const target = this.resolveTarget();
    return this.client.bindMetadata(meta, typeof target === 'string' ? target : null, this.options.key);
  }

  on(event, handler) {
    return this.client.on(event, handler, this.options.key);
  }

  off(event, handler) {
    return this.client.off(event, handler);
  }
}

import { FluentInstance } from './instance.js';

/**
 * FluentGroupInstance
 *
 * Implements a multi-instance broadcasting pipeline queue for SRemote instances.
 * Executes actions across all matched instances in parallel via Promise.allSettled.
 *
 * Example:
 *   await sremote.all('.video-player').play().volume(0.5);
 */
export class FluentGroupInstance {
  /**
   * @param {import('../client.js').SRemoteClient} client
   * @param {string|Array<string|HTMLElement>|null} [selector=null]
   * @param {Object} [options={}]
   */
  constructor(client, selector = null, options = {}) {
    this.client = client;
    this.selector = selector;
    this.options = options;
    this._chain = Promise.resolve();
    this._lenient = true; // Multi-instance broadcast is naturally resilient
  }

  /**
   * Resolves all target instances/elements matching the selector.
   * @returns {Array<FluentInstance>}
   */
  resolveInstances() {
    const instances = [];
    const s = this.selector;

    // 1. If no selector is provided: target all active registered adapter instances
    if (!s) {
      if (this.client.adapterDriver?.adaptersMap) {
        for (const id of this.client.adapterDriver.adaptersMap.keys()) {
          instances.push(new FluentInstance(this.client, id, this.options));
        }
      }
      // Also include active DOM elements discovered if any
      if (typeof document !== 'undefined') {
        const domElements = document.querySelectorAll('[data-sremote-id], video, audio, iframe[data-sremote-provider]');
        for (const el of domElements) {
          const id = el.getAttribute('data-sremote-id') || el.id;
          if (!instances.some(i => i.target === id || i.target === el)) {
            instances.push(new FluentInstance(this.client, el, this.options));
          }
        }
      }
      return instances;
    }

    // 2. If selector is an array of targets
    if (Array.isArray(s)) {
      return s.map(target => new FluentInstance(this.client, target, this.options));
    }

    // 3. If selector is a CSS selector string
    if (typeof s === 'string' && typeof document !== 'undefined') {
      try {
        const elements = document.querySelectorAll(s);
        if (elements.length > 0) {
          return Array.from(elements).map(el => new FluentInstance(this.client, el, this.options));
        }
      } catch {}
      // Fallback: treated as single target if not a valid DOM query
      return [new FluentInstance(this.client, s, this.options)];
    }

    return instances;
  }

  /**
   * Enables Lenient Mode
   * @returns {this}
   */
  lenient() {
    this._lenient = true;
    return this;
  }

  /**
   * Enables Strict Mode
   * @returns {this}
   */
  strict() {
    this._lenient = false;
    return this;
  }

  /**
   * Synchronous reactive state snapshots for all instances in group.
   * @returns {Array<import('@sremote/shared').SRemoteMediaState>}
   */
  get state() {
    return this.resolveInstances().map(i => i.state);
  }

  /**
   * Internal queue executor broadcasting to all resolved instances in parallel
   * @param {string|Function} actionOrFn
   * @param {*} [payload=undefined]
   * @returns {this}
   * @private
   */
  _enqueue(actionOrFn, payload) {
    this._chain = this._chain.then(
      async () => {
        const instances = this.resolveInstances();
        const promises = instances.map(inst => {
          if (typeof actionOrFn === 'function') {
            return actionOrFn(inst);
          }
          return inst[actionOrFn]?.(payload);
        });

        if (this._lenient) {
          await Promise.allSettled(promises);
        } else {
          await Promise.all(promises);
        }
      },
      err => {
        if (this._lenient) {
          return;
        }
        throw err;
      },
    );
    return this;
  }

  /**
   * Inspect current reactive states across group between steps
   * @param {(states: Array<import('@sremote/shared').SRemoteMediaState>) => void} fn
   * @returns {this}
   */
  tap(fn) {
    return this._enqueue(() => {
      if (typeof fn === 'function') fn(this.state);
    });
  }

  // --- Thenable Contract & Error Boundary ---
  then(onFulfilled, onRejected) {
    return this._chain.then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    const handler = typeof onRejected === 'function' ? onRejected : () => undefined;
    this._chain = this._chain.catch(handler);
    return this;
  }

  finally(onFinally) {
    return this._chain.finally(onFinally);
  }

  // --- Broadcast Playback Controls ---
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

  /**
   * Subscribes to events across all instances currently in the group.
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} Unbind callback
   */
  on(event, handler) {
    if (typeof handler !== 'function') return () => {};
    const instances = this.resolveInstances();
    const unbinders = instances.map(inst => inst.on(event, handler));
    return () => {
      unbinders.forEach(u => {
        try {
          u();
        } catch {}
      });
    };
  }

  /**
   * Unsubscribes from events across all instances in the group.
   * @param {string} event
   * @param {Function} [handler]
   */
  off(event, handler) {
    const instances = this.resolveInstances();
    instances.forEach(inst => inst.off(event, handler));
  }

  /**
   * Destroys all targets in the group: unregisters adapters and cleans up listeners.
   */
  destroy() {
    return this._enqueue(inst => {
      const target = inst.resolveTarget();
      if (typeof target === 'string' && this.client.adapters) {
        this.client.adapters.unregister(target);
      }
    });
  }
}

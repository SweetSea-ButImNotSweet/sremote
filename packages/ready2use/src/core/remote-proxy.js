/**
 * Creates a standalone remote control interface that delegates commands
 * to the underlying SRemote custom adapter or the registered SRemote client instance.
 *
 * @param {Object} adapter - The custom adapter instance
 * @param {Object} [sremoteClient] - Optional SRemote client instance
 * @param {string} [instanceId] - SRemote instance ID
 * @returns {Object} Unified remote controller
 */
export function createRemoteProxy(adapter, sremoteClient = null, instanceId = null) {
  // If SRemote client is provided and supports select() or get()
  if (sremoteClient && instanceId) {
    if (typeof sremoteClient.select === 'function') {
      try {
        const fluent = sremoteClient.select(instanceId);
        if (fluent) {
          if (adapter && !fluent.adapter) {
            Object.defineProperty(fluent, 'adapter', { get: () => adapter, configurable: true });
          }
          if (instanceId && !fluent.instanceId) {
            Object.defineProperty(fluent, 'instanceId', { get: () => instanceId, configurable: true });
          }
          return fluent;
        }
      } catch {}
    } else if (typeof sremoteClient.get === 'function') {
      try {
        const instanceRemote = sremoteClient.get(instanceId);
        if (instanceRemote) return instanceRemote;
      } catch {}
    }
  }

  const safeAdapter = adapter || {};

  class FluentRemoteProxy {
    constructor() {
      this._chain = Promise.resolve();
      this._lenient = false;
    }

    get instanceId() {
      return instanceId;
    }

    get adapter() {
      return safeAdapter;
    }

    get capabilities() {
      return safeAdapter.capabilities || {};
    }

    /**
     * Synchronous reactive state snapshot reading directly from adapter
     */
    get state() {
      if (typeof safeAdapter.getState === 'function') {
        const s = safeAdapter.getState();
        if (s && typeof s.then !== 'function') return s;
      }
      return { paused: typeof safeAdapter.paused === 'function' ? safeAdapter.paused() : typeof safeAdapter.paused === 'boolean' ? safeAdapter.paused : true };
    }

    /**
     * Enables Lenient Mode: errors in chained actions are swallowed/logged and the pipeline continues.
     */
    lenient() {
      this._lenient = true;
      return this;
    }

    /**
     * Enables Strict Mode: failures reject the pipeline (Fail-Fast default).
     */
    strict() {
      this._lenient = false;
      return this;
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

    _enqueue(fn) {
      this._chain = this._chain.then(
        async () => fn(),
        err => {
          if (this._lenient) {
            return fn();
          }
          throw err;
        },
      );
      return this;
    }

    /**
     * Inspect current reactive state between steps without breaking the chain
     */
    tap(fn) {
      return this._enqueue(async () => {
        if (typeof fn === 'function') {
          let s = this.state;
          if (typeof safeAdapter.getState === 'function') {
            try {
              s = await safeAdapter.getState();
            } catch {}
          }
          fn(s);
        }
      });
    }

    // --- Fluent Playback Methods ---
    play() {
      return this._enqueue(() => (typeof safeAdapter.play === 'function' ? safeAdapter.play() : Promise.resolve()));
    }

    pause() {
      return this._enqueue(() => (typeof safeAdapter.pause === 'function' ? safeAdapter.pause() : Promise.resolve()));
    }

    toggle() {
      return this._enqueue(() => {
        if (typeof safeAdapter.toggle === 'function') {
          return safeAdapter.toggle();
        }
        const isPaused = typeof safeAdapter.paused === 'function' ? safeAdapter.paused() : typeof safeAdapter.paused === 'boolean' ? safeAdapter.paused : true;
        return isPaused
          ? typeof safeAdapter.play === 'function'
            ? safeAdapter.play()
            : Promise.resolve()
          : typeof safeAdapter.pause === 'function'
            ? safeAdapter.pause()
            : Promise.resolve();
      });
    }

    stop() {
      return this._enqueue(() => {
        if (typeof safeAdapter.stop === 'function') return safeAdapter.stop();
        if (typeof safeAdapter.pause === 'function') return safeAdapter.pause();
        return Promise.resolve();
      });
    }

    seek(offset) {
      return this._enqueue(async () => {
        if (typeof safeAdapter.seek === 'function') return safeAdapter.seek(offset);
        let cur = 0;
        if (typeof safeAdapter.getCurrentTime === 'function') {
          cur = Number((await safeAdapter.getCurrentTime()) || 0);
        }
        const target = Math.max(0, cur + Number(offset));
        return this.seekTo(target);
      });
    }

    seekTo(seconds) {
      return this._enqueue(() => {
        if (typeof safeAdapter.seekTo === 'function') return safeAdapter.seekTo(seconds);
        if (typeof safeAdapter.setCurrentTime === 'function') return safeAdapter.setCurrentTime(seconds);
        return Promise.resolve();
      });
    }

    volume(val) {
      return this._enqueue(() => {
        if (typeof safeAdapter.setVolume === 'function') return safeAdapter.setVolume(val);
        if (typeof safeAdapter.volume === 'function') return safeAdapter.volume(val);
        return Promise.resolve();
      });
    }

    mute(val = true) {
      return this._enqueue(() => {
        if (typeof safeAdapter.setMuted === 'function') return safeAdapter.setMuted(val);
        if (typeof safeAdapter.mute === 'function') return safeAdapter.mute(val);
        return Promise.resolve();
      });
    }

    speed(rate) {
      return this._enqueue(() => {
        if (typeof safeAdapter.setPlaybackRate === 'function') return safeAdapter.setPlaybackRate(rate);
        if (typeof safeAdapter.setSpeed === 'function') return safeAdapter.setSpeed(rate);
        if (typeof safeAdapter.speed === 'function') return safeAdapter.speed(rate);
        return Promise.resolve();
      });
    }

    next() {
      return this._enqueue(() => {
        if (typeof safeAdapter.next === 'function') return safeAdapter.next();
        return Promise.resolve();
      });
    }

    previous() {
      return this._enqueue(() => {
        if (typeof safeAdapter.previous === 'function') return safeAdapter.previous();
        return Promise.resolve();
      });
    }

    load(source) {
      return this._enqueue(() => {
        if (typeof safeAdapter.load === 'function') return safeAdapter.load(source);
        return Promise.resolve();
      });
    }

    quality(level) {
      return this._enqueue(() => {
        if (typeof safeAdapter.setQuality === 'function') return safeAdapter.setQuality(level);
        return Promise.resolve();
      });
    }

    subtitle(track) {
      return this._enqueue(() => {
        if (typeof safeAdapter.setSubtitle === 'function') return safeAdapter.setSubtitle(track);
        return Promise.resolve();
      });
    }

    shuffle(enable = true) {
      return this._enqueue(() => {
        if (typeof safeAdapter.setShuffle === 'function') return safeAdapter.setShuffle(enable);
        return Promise.resolve();
      });
    }

    repeat(mode = true) {
      return this._enqueue(() => {
        if (typeof safeAdapter.setRepeat === 'function') return safeAdapter.setRepeat(mode);
        return Promise.resolve();
      });
    }
  }

  return new FluentRemoteProxy();
}

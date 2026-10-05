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

    _enqueue(fn) {
      this._chain = this._chain.then(() => fn());
      return this;
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

    setCurrentTime(seconds) {
      return this.seekTo(seconds);
    }

    setVolume(volume) {
      return this._enqueue(() => {
        if (typeof safeAdapter.setVolume === 'function') return safeAdapter.setVolume(volume);
        return Promise.resolve();
      });
    }

    volume(val) {
      return this.setVolume(val);
    }

    setMuted(muted) {
      return this._enqueue(() => {
        if (typeof safeAdapter.setMuted === 'function') return safeAdapter.setMuted(muted);
        return Promise.resolve();
      });
    }

    mute(val = true) {
      return this.setMuted(val);
    }

    setPlaybackRate(rate) {
      return this._enqueue(() => {
        if (typeof safeAdapter.setPlaybackRate === 'function') return safeAdapter.setPlaybackRate(rate);
        if (typeof safeAdapter.setSpeed === 'function') return safeAdapter.setSpeed(rate);
        return Promise.resolve();
      });
    }

    speed(rate) {
      return this.setPlaybackRate(rate);
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

    // --- Direct Getters / Inspect methods (execute immediately on active chain) ---
    async getCurrentTime() {
      return this._chain.then(() => {
        if (typeof safeAdapter.getCurrentTime === 'function') return safeAdapter.getCurrentTime();
        return 0;
      });
    }

    async getVolume() {
      return this._chain.then(() => {
        if (typeof safeAdapter.getVolume === 'function') return safeAdapter.getVolume();
        return 1;
      });
    }

    async isMuted() {
      return this._chain.then(() => {
        if (typeof safeAdapter.isMuted === 'function') return safeAdapter.isMuted();
        if (typeof safeAdapter.getMuted === 'function') return safeAdapter.getMuted();
        return false;
      });
    }

    async getPlaybackRate() {
      return this._chain.then(() => {
        if (typeof safeAdapter.getPlaybackRate === 'function') return safeAdapter.getPlaybackRate();
        return 1;
      });
    }

    async getState() {
      return this._chain.then(() => {
        if (typeof safeAdapter.getState === 'function') return safeAdapter.getState();
        return {};
      });
    }
  }

  return new FluentRemoteProxy();
}

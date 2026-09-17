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
  // If SRemote client is provided and has an instance controller or adapters API
  if (sremoteClient && typeof sremoteClient.get === 'function' && instanceId) {
    try {
      const instanceRemote = sremoteClient.get(instanceId);
      if (instanceRemote) return instanceRemote;
    } catch {}
  }

  const safeAdapter = adapter || {};

  return {
    get instanceId() {
      return instanceId;
    },

    get adapter() {
      return safeAdapter;
    },

    get capabilities() {
      return safeAdapter.capabilities || {};
    },

    play() {
      return typeof safeAdapter.play === 'function' ? safeAdapter.play() : Promise.resolve();
    },

    pause() {
      return typeof safeAdapter.pause === 'function' ? safeAdapter.pause() : Promise.resolve();
    },

    toggle() {
      if (typeof safeAdapter.toggle === 'function') {
        return safeAdapter.toggle();
      }
      const isPaused = typeof safeAdapter.paused === 'function' ? safeAdapter.paused() : typeof safeAdapter.paused === 'boolean' ? safeAdapter.paused : true;
      return isPaused ? this.play() : this.pause();
    },

    stop() {
      if (typeof safeAdapter.stop === 'function') return safeAdapter.stop();
      return this.pause();
    },

    seek(offset) {
      if (typeof safeAdapter.seek === 'function') return safeAdapter.seek(offset);
      return (async () => {
        let cur = 0;
        if (typeof safeAdapter.getCurrentTime === 'function') {
          cur = Number((await safeAdapter.getCurrentTime()) || 0);
        }
        const target = Math.max(0, cur + Number(offset));
        return this.seekTo(target);
      })();
    },

    seekTo(seconds) {
      if (typeof safeAdapter.seekTo === 'function') return safeAdapter.seekTo(seconds);
      if (typeof safeAdapter.setCurrentTime === 'function') return safeAdapter.setCurrentTime(seconds);
      return Promise.resolve();
    },

    setCurrentTime(seconds) {
      return this.seekTo(seconds);
    },

    getCurrentTime() {
      if (typeof safeAdapter.getCurrentTime === 'function') return safeAdapter.getCurrentTime();
      return Promise.resolve(0);
    },

    setVolume(volume) {
      if (typeof safeAdapter.setVolume === 'function') return safeAdapter.setVolume(volume);
      return Promise.resolve();
    },

    getVolume() {
      if (typeof safeAdapter.getVolume === 'function') return safeAdapter.getVolume();
      return Promise.resolve(1);
    },

    setMuted(muted) {
      if (typeof safeAdapter.setMuted === 'function') return safeAdapter.setMuted(muted);
      return Promise.resolve();
    },

    isMuted() {
      if (typeof safeAdapter.isMuted === 'function') return safeAdapter.isMuted();
      if (typeof safeAdapter.getMuted === 'function') return safeAdapter.getMuted();
      return Promise.resolve(false);
    },

    setPlaybackRate(rate) {
      if (typeof safeAdapter.setPlaybackRate === 'function') return safeAdapter.setPlaybackRate(rate);
      if (typeof safeAdapter.setSpeed === 'function') return safeAdapter.setSpeed(rate);
      return Promise.resolve();
    },

    getPlaybackRate() {
      if (typeof safeAdapter.getPlaybackRate === 'function') return safeAdapter.getPlaybackRate();
      return Promise.resolve(1);
    },

    next() {
      if (typeof safeAdapter.next === 'function') return safeAdapter.next();
      return Promise.resolve();
    },

    previous() {
      if (typeof safeAdapter.previous === 'function') return safeAdapter.previous();
      return Promise.resolve();
    },

    load(source) {
      if (typeof safeAdapter.load === 'function') return safeAdapter.load(source);
      return Promise.resolve();
    },

    getState() {
      if (typeof safeAdapter.getState === 'function') return safeAdapter.getState();
      return Promise.resolve({});
    },
  };
}

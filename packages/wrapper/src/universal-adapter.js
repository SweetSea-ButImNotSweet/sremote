/**
 * Universal Adapter Factory
 *
 * Allows developers to create a standardized SRemoteCustomAdapter from any custom,
 * proprietary, or in-page player instance with automatic event forwarding and fallback defaults.
 */

/**
 * Creates an SRemote-compatible Universal Adapter from a simple configuration object.
 *
 * @param {Object} options - Adapter implementation hooks and metadata
 * @returns {import('./index.d.ts').SRemoteCustomAdapter} A fully compliant SRemote custom adapter
 */
export function createUniversalAdapter(options = {}) {
  const {
    name = 'universal-adapter',
    play,
    pause,
    toggle,
    stop,
    seek,
    seekTo,
    setCurrentTime,
    setVolume,
    setMuted,
    setPlaybackRate,
    setQuality,
    getQualities,
    setSubtitle,
    getSubtitles,
    setShuffle,
    setRepeat,
    next,
    previous,
    load,
    requestPip,
    getState,
  } = options;

  const localState = {
    paused: true,
    currentTime: 0,
    duration: null,
    volume: 1,
    muted: false,
    playbackRate: 1,
    quality: 'auto',
    subtitle: null,
    shuffle: false,
    repeat: 'off',
  };

  const hasFn = fn => typeof fn === 'function';
  const calculatedCapabilities = {
    play: hasFn(play),
    pause: hasFn(pause),
    toggle: hasFn(toggle) || (hasFn(play) && hasFn(pause)),
    stop: hasFn(stop) || hasFn(pause),
    seek: hasFn(seek) || hasFn(seekTo) || hasFn(setCurrentTime),
    volume: hasFn(setVolume),
    muted: hasFn(setMuted),
    speed: hasFn(setPlaybackRate),
    playbackRate: hasFn(setPlaybackRate),
    pip: hasFn(requestPip),
    quality: hasFn(setQuality),
    subtitles: hasFn(setSubtitle) || hasFn(getSubtitles),
    shuffle: hasFn(setShuffle),
    repeat: hasFn(setRepeat),
    next: hasFn(next),
    previous: hasFn(previous),
    load: hasFn(load),
    hasAdapter: true,
    hasNative: false,
    hasMediaSession: false,
    ...(options.capabilities && typeof options.capabilities === 'object' ? options.capabilities : {}),
  };

  const adapter = {
    name,
    capabilities: calculatedCapabilities,

    async play() {
      if (typeof play === 'function') {
        const res = await play();
        localState.paused = false;
        return res;
      }
    },

    async pause() {
      if (typeof pause === 'function') {
        const res = await pause();
        localState.paused = true;
        return res;
      }
    },

    async toggle() {
      if (typeof toggle === 'function') {
        return toggle();
      }
      const isPaused = adapter.paused ? (typeof adapter.paused === 'function' ? adapter.paused() : adapter.paused) : localState.paused;
      return isPaused ? adapter.play() : adapter.pause();
    },

    async stop() {
      if (typeof stop === 'function') {
        return stop();
      }
      await adapter.pause();
      await adapter.seekTo?.(0);
    },

    async seek(offset) {
      if (typeof seek === 'function') {
        return seek(offset);
      }
      const cur = (await adapter.getCurrentTime?.()) ?? localState.currentTime ?? 0;
      return adapter.seekTo?.(Math.max(0, cur + offset));
    },

    async seekTo(time) {
      if (typeof seekTo === 'function') {
        const res = await seekTo(time);
        localState.currentTime = time;
        return res;
      }
      if (typeof setCurrentTime === 'function') {
        const res = await setCurrentTime(time);
        localState.currentTime = time;
        return res;
      }
    },

    async setCurrentTime(time) {
      return adapter.seekTo(time);
    },

    async setVolume(vol) {
      if (typeof setVolume === 'function') {
        const res = await setVolume(vol);
        localState.volume = vol;
        return res;
      }
    },

    async setMuted(muted) {
      if (typeof setMuted === 'function') {
        const res = await setMuted(muted);
        localState.muted = Boolean(muted);
        return res;
      }
    },

    async setPlaybackRate(rate) {
      if (typeof setPlaybackRate === 'function') {
        const res = await setPlaybackRate(rate);
        localState.playbackRate = rate;
        return res;
      }
    },

    async setQuality(level) {
      if (typeof setQuality === 'function') {
        const res = await setQuality(level);
        localState.quality = level;
        return res;
      }
    },

    async getQualities() {
      if (typeof getQualities === 'function') {
        return getQualities();
      }
      return [];
    },

    async setSubtitle(track) {
      if (typeof setSubtitle === 'function') {
        const res = await setSubtitle(track);
        localState.subtitle = track;
        return res;
      }
    },

    async getSubtitles() {
      if (typeof getSubtitles === 'function') {
        return getSubtitles();
      }
      return [];
    },

    async setShuffle(enable) {
      if (typeof setShuffle === 'function') {
        const res = await setShuffle(enable);
        localState.shuffle = Boolean(enable);
        return res;
      }
    },

    async setRepeat(mode) {
      if (typeof setRepeat === 'function') {
        const res = await setRepeat(mode);
        localState.repeat = mode;
        return res;
      }
    },

    async next() {
      if (typeof next === 'function') {
        return next();
      }
    },

    async previous() {
      if (typeof previous === 'function') {
        return previous();
      }
    },

    async load(source) {
      if (typeof load === 'function') {
        return load(source);
      }
    },

    async requestPip(enable) {
      if (typeof requestPip === 'function') {
        return requestPip(enable);
      }
    },

    getState() {
      if (typeof getState === 'function') {
        const s = getState();
        return typeof s === 'object' && s !== null ? { ...localState, ...s } : localState;
      }
      return { ...localState };
    },
  };

  return adapter;
}

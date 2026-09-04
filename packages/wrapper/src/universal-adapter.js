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
    mediaElement = null,
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

  let previousVolume = 1;
  const localState = { paused: true, currentTime: 0, duration: null, volume: 1, muted: false, playbackRate: 1, quality: 'auto', subtitle: null, shuffle: false, repeat: 'off' };

  const hasMediaEl = Boolean(mediaElement && (mediaElement.tagName === 'AUDIO' || mediaElement.tagName === 'VIDEO' || mediaElement instanceof HTMLMediaElement));
  const hasFn = fn => typeof fn === 'function';
  const calculatedCapabilities = {
    play: hasFn(play) || hasMediaEl,
    pause: hasFn(pause) || hasMediaEl,
    toggle: hasFn(toggle) || (hasFn(play) && hasFn(pause)) || hasMediaEl,
    stop: hasFn(stop) || hasFn(pause) || hasMediaEl,
    seek: hasFn(seek) || hasFn(seekTo) || hasFn(setCurrentTime) || hasMediaEl,
    volume: hasFn(setVolume) || hasMediaEl,
    muted: hasFn(setMuted) || hasMediaEl,
    speed: hasFn(setPlaybackRate) || hasMediaEl,
    playbackRate: hasFn(setPlaybackRate) || hasMediaEl,
    pip: hasFn(requestPip) || (hasMediaEl && Boolean(mediaElement.requestPictureInPicture)),
    quality: hasFn(setQuality),
    subtitles: hasFn(setSubtitle) || hasFn(getSubtitles),
    shuffle: hasFn(setShuffle),
    repeat: hasFn(setRepeat),
    next: hasFn(next),
    previous: hasFn(previous),
    load: hasFn(load),
    hasAdapter: true,
    hasNative: hasMediaEl,
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
      if (hasMediaEl) {
        const res = await mediaElement.play();
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
      if (hasMediaEl) {
        mediaElement.pause();
        localState.paused = true;
      }
    },

    async toggle() {
      if (typeof toggle === 'function') {
        return toggle();
      }
      const isPaused =
        typeof options.paused === 'function'
          ? Boolean(options.paused())
          : typeof options.paused === 'boolean'
            ? options.paused
            : hasMediaEl
              ? mediaElement.paused
              : localState.paused;
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
      const cur = (await adapter.getCurrentTime?.()) ?? (hasMediaEl ? mediaElement.currentTime : localState.currentTime) ?? 0;
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
      if (hasMediaEl) {
        mediaElement.currentTime = Number(time);
        localState.currentTime = Number(time);
      }
    },

    async setCurrentTime(time) {
      return adapter.seekTo(time);
    },

    async setVolume(vol) {
      const targetVol = Math.max(0, Math.min(1, Number(vol)));
      if (targetVol > 0) {
        previousVolume = targetVol;
      }
      localState.volume = targetVol;

      // Discard mute when volume is actively set
      localState.muted = false;

      if (hasMediaEl) {
        mediaElement.volume = targetVol;
        mediaElement.muted = false;
      }

      if (typeof setVolume === 'function') {
        const res = await setVolume(targetVol);
        if (typeof setMuted === 'function') {
          try {
            await setMuted(false);
          } catch {}
        }
        return res;
      }
    },

    async setMuted(muted) {
      const isMute = Boolean(muted);
      if (isMute) {
        // Save current volume before muting
        const curVol = hasMediaEl ? mediaElement.volume : localState.volume || 1;
        if (curVol > 0) {
          previousVolume = curVol;
        }
      }

      localState.muted = isMute;

      if (hasMediaEl) {
        mediaElement.muted = isMute;
        if (!isMute && mediaElement.volume === 0) {
          mediaElement.volume = previousVolume || 1;
        }
      }

      if (typeof setMuted === 'function') {
        const res = await setMuted(isMute);
        if (!isMute && typeof setVolume === 'function' && localState.volume === 0) {
          try {
            await setVolume(previousVolume || 1);
            localState.volume = previousVolume || 1;
          } catch {}
        }
        return res;
      }

      // Fallback if no setMuted function but setVolume exists
      if (typeof setVolume === 'function') {
        const nextVol = isMute ? 0 : previousVolume || 1;
        localState.volume = nextVol;
        return setVolume(nextVol);
      }
    },

    async setPlaybackRate(rate) {
      if (typeof setPlaybackRate === 'function') {
        const res = await setPlaybackRate(rate);
        localState.playbackRate = rate;
        return res;
      }
      if (hasMediaEl) {
        mediaElement.playbackRate = Number(rate);
        localState.playbackRate = Number(rate);
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

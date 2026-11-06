/**
 * Checks whether a media element has a valid media source attached.
 *
 * @param {HTMLMediaElement|Object} media
 * @returns {boolean}
 */
export function hasMediaSource(media) {
  return Boolean(media?.currentSrc ?? media?.src ?? media?.srcObject);
}

/**
 * Validates whether an element is a real, connected, interactable HTML media element.
 * Excludes detached DOM elements and tiny tracking/beacon videos (<32x32).
 * Uses offset dimensions to avoid forcing layout reflow.
 *
 * @param {HTMLMediaElement|HTMLElement|Object} media
 * @param {Object} [options]
 * @param {number} [options.minSize=32] - Minimum width/height required for video elements
 * @param {boolean} [options.requireConnected=true] - Require media to be connected to DOM
 * @returns {boolean}
 */
export function isValidMedia(media, options = {}) {
  if (!media) return false;

  const { minSize = 32, requireConnected = true } = options;
  if (requireConnected && !media.isConnected) return false;

  const tag = media.tagName?.toUpperCase() ?? '';

  if (tag === 'VIDEO') {
    try {
      // Use offset or intrinsic dimensions to avoid forced layout reflow
      const w = media.offsetWidth || (typeof media.videoWidth === 'number' ? media.videoWidth : 0);
      const h = media.offsetHeight || (typeof media.videoHeight === 'number' ? media.videoHeight : 0);
      const isTooSmall = (w > 0 && w < minSize) || (h > 0 && h < minSize);
      const isHidden = w === 0 && h === 0 && !media.hasAttribute?.('controls');

      // Reject tracking pixels or hidden videos without source/playback
      if (isTooSmall || (isHidden && media.paused && !hasMediaSource(media))) {
        return false;
      }
    } catch {}
  }

  return true;
}

/**
 * Evaluates standard capabilities for a media element or adapter.
 *
 * @param {HTMLMediaElement|Object} target
 * @returns {import('../index.d.ts').SRemoteCapabilities}
 */
export function evaluateCapabilities(target) {
  if (!target) {
    return {
      play: false,
      pause: false,
      toggle: false,
      stop: false,
      seek: false,
      volume: false,
      muted: false,
      speed: false,
      playbackRate: false,
      pip: false,
      quality: false,
      subtitles: false,
      shuffle: false,
      repeat: false,
      next: false,
      previous: false,
      load: false,
      hasAdapter: false,
      hasNative: false,
      hasMediaSession: false,
    };
  }

  if (target.capabilities && typeof target.capabilities === 'object') {
    return { ...target.capabilities };
  }

  const hasNative = typeof HTMLMediaElement !== 'undefined' && target instanceof HTMLMediaElement;
  const isVideo = target.tagName === 'VIDEO';
  const hasFn = fn => typeof target[fn] === 'function';

  const isRaw = target.mode === 'raw' || target.strict === true;
  const allowPolyfill = !isRaw && target.interventions?.polyfill !== false;

  return {
    play: hasNative || hasFn('play'),
    pause: hasNative || hasFn('pause'),
    toggle: hasFn('toggle') || (allowPolyfill && (hasNative || (hasFn('play') && hasFn('pause')))),
    stop: hasFn('stop') || (allowPolyfill && (hasNative || hasFn('pause'))),
    seek: hasNative || hasFn('seek') || hasFn('seekTo') || hasFn('setCurrentTime'),
    volume: hasNative || hasFn('volume') || hasFn('setVolume'),
    muted: hasNative || hasFn('mute') || hasFn('setMuted') || (allowPolyfill && (hasFn('volume') || hasFn('setVolume'))),
    speed: hasNative || hasFn('speed') || hasFn('setPlaybackRate'),
    playbackRate: hasNative || hasFn('setPlaybackRate'),
    pip: (isVideo && typeof document !== 'undefined' && Boolean(document.pictureInPictureEnabled || target.requestPictureInPicture)) || hasFn('requestPip') || hasFn('pip'),
    quality: hasFn('setQuality'),
    subtitles: Boolean(hasNative && target.textTracks?.length > 0) || hasFn('setSubtitle') || hasFn('getSubtitles'),
    shuffle: hasFn('setShuffle'),
    repeat: hasNative || hasFn('setRepeat'),
    next: hasFn('next'),
    previous: hasFn('previous'),
    load: hasNative || hasFn('load'),
    hasAdapter: !hasNative,
    hasNative,
    hasMediaSession: false,
  };
}

/**
 * Extracts standardized media state snapshot from a HTMLMediaElement or adapter.
 * @param {HTMLMediaElement|Object} media
 * @returns {import('./index.d.ts').SRemoteMediaState|null}
 */
export function extractMediaState(media) {
  if (!media) return null;

  // If already an adapter with getState()
  if (typeof media.getState === 'function') {
    try {
      return media.getState();
    } catch {}
  }

  const curVol = media.volume !== undefined ? media.volume : 1;
  const curMuted = media.muted !== undefined ? media.muted : false;
  const curTime = media.currentTime !== undefined ? media.currentTime : 0;
  const rawDur = media.duration;
  const curRate = media.playbackRate !== undefined ? media.playbackRate : 1;
  const isPaused = media.paused !== undefined ? (typeof media.paused === 'function' ? media.paused() : Boolean(media.paused)) : true;
  const isEnded = media.ended !== undefined ? Boolean(media.ended) : false;
  const curReadyState = media.readyState !== undefined ? media.readyState : 0;
  const curSrc = media.currentSrc || media.src || '';
  const dur = Number.isFinite(rawDur) ? rawDur : null;

  let bufferedEnd = 0;
  try {
    const buf = media.buffered;
    if (buf && buf.length > 0) bufferedEnd = buf.end(buf.length - 1);
  } catch {}

  const isLoop = media.loop !== undefined ? Boolean(media.loop) : false;
  const isFullscreen = typeof document !== 'undefined' && Boolean(document.fullscreenElement && (document.fullscreenElement === media || document.fullscreenElement.contains(media)));
  const isPip = typeof document !== 'undefined' && document.pictureInPictureElement === media;

  return {
    paused: isPaused,
    ended: Boolean(isEnded || (dur && dur > 0 && curTime >= dur - 0.1)),
    currentTime: curTime,
    duration: dur,
    buffered: bufferedEnd,
    volume: curVol,
    muted: curMuted,
    playbackRate: curRate,
    readyState: curReadyState,
    src: curSrc,
    loop: isLoop,
    repeat: isLoop ? 'one' : 'off',
    fullscreen: isFullscreen,
    pictureInPicture: isPip,
  };
}

/**
 * Creates a standardized SRemote event payload.
 * @param {string} event
 * @param {Object} options
 * @returns {Object}
 */
export function createEventPayload(event, options = {}) {
  const ev = String(event || '').toLowerCase();
  const {
    instanceId = 'unknown',
    source = 'adapter',
    mediaType = 'adapter',
    state = null,
    isProgrammatic = false,
    ...extra
  } = typeof options === 'object' && options !== null ? options : { value: options };

  return {
    source,
    instanceId,
    mediaType,
    action: ev,
    isProgrammatic,
    ...(state ? { state } : {}),
    ...extra,
  };
}

/**
 * Evaluates capabilities for an adapter or HTML5 media element.
 * @param {Object|HTMLElement} target
 * @returns {import('./index.d.ts').SRemoteCapabilities}
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

  // Target has explicit capabilities object
  if (target.capabilities && typeof target.capabilities === 'object') {
    return { ...target.capabilities };
  }

  const isVideo = Boolean(target.tagName === 'VIDEO');
  const isAudio = Boolean(target.tagName === 'AUDIO');
  const hasNative = isVideo || isAudio;

  const hasFn = fnName => Boolean(typeof target[fnName] === 'function');

  return {
    play: hasNative || hasFn('play'),
    pause: hasNative || hasFn('pause'),
    toggle: hasNative || hasFn('toggle') || (hasFn('play') && hasFn('pause')),
    stop: hasNative || hasFn('stop') || hasFn('pause'),
    seek: hasNative || hasFn('seek') || hasFn('seekTo') || hasFn('setCurrentTime'),
    volume: hasNative || hasFn('setVolume'),
    muted: hasNative || hasFn('setMuted'),
    speed: hasNative || hasFn('setPlaybackRate'),
    playbackRate: hasNative || hasFn('setPlaybackRate'),
    pip: (isVideo && typeof document !== 'undefined' && Boolean(document.pictureInPictureEnabled || target.requestPictureInPicture)) || hasFn('requestPip') || hasFn('pip'),
    quality: hasFn('setQuality'),
    subtitles: Boolean(hasNative && target.textTracks && target.textTracks.length > 0) || hasFn('setSubtitle') || hasFn('getSubtitles'),
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

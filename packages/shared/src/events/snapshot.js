const sharedLastKnownDurationMap = new WeakMap();

/**
 * Extracts standardized media state snapshot from a HTMLMediaElement or adapter.
 *
 * @param {HTMLMediaElement|Object} media
 * @returns {import('../index.d.ts').SRemoteMediaState|null}
 */
export function captureMediaSnapshot(media) {
  if (!media) return null;

  // If already an adapter with getState()
  if (typeof media.getState === 'function') {
    try {
      return media.getState();
    } catch {}
  }

  const curVol = media.volume ?? 1;
  const curMuted = media.muted ?? false;
  const curTime = media.currentTime ?? 0;
  const rawDur = media.duration;
  const curRate = media.playbackRate ?? 1;
  const isPaused = typeof media.paused === 'function' ? media.paused() : Boolean(media.paused ?? true);
  const isEnded = Boolean(media.ended);
  const curReadyState = media.readyState ?? 0;
  const curSrc = media.currentSrc ?? media.src ?? '';

  let dur = Number.isFinite(rawDur) && rawDur > 0 ? rawDur : null;
  if (typeof media === 'object') {
    try {
      if (dur) {
        sharedLastKnownDurationMap.set(media, dur);
      } else {
        dur = sharedLastKnownDurationMap.get(media) ?? null;
      }
    } catch {}
  }

  let bufferedEnd = 0;
  try {
    const buf = media.buffered;
    if (buf?.length > 0) bufferedEnd = buf.end(buf.length - 1);
  } catch {}

  const isLoop = Boolean(media.loop);
  const isFullscreen =
    typeof document !== 'undefined' && Boolean(document.fullscreenElement && (document.fullscreenElement === media || document.fullscreenElement.contains(media)));
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

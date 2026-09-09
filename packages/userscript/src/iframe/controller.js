import { safeGetProp } from '../core/utils.js';
import { descriptors, logger, console_warn } from '../config.js';
import { mockMediaSessionInstance } from './media-session.js';
import { executeMediaAction, safePlayMedia, safePauseMedia, getGlobalTransactionTracker } from '@sremote/shared';

export function getVideoState(targetMedia, activeMedia, resolveActiveMedia) {
  const media = targetMedia || activeMedia || (resolveActiveMedia() ? activeMedia : null);
  if (!media) return null;

  const curVol = safeGetProp(media, descriptors.volume, 'volume') ?? (media.volume !== undefined ? media.volume : 1);
  const curMuted = safeGetProp(media, descriptors.muted, 'muted') ?? (media.muted !== undefined ? media.muted : false);
  const curTime = safeGetProp(media, descriptors.currentTime, 'currentTime') ?? (media.currentTime !== undefined ? media.currentTime : 0);
  const rawDur = safeGetProp(media, descriptors.duration, 'duration') ?? media.duration;
  const curRate = safeGetProp(media, descriptors.playbackRate, 'playbackRate') ?? (media.playbackRate !== undefined ? media.playbackRate : 1);
  const isPaused = safeGetProp(media, descriptors.paused, 'paused') ?? (media.paused !== undefined ? media.paused : true);
  const isEnded = safeGetProp(media, descriptors.ended, 'ended') ?? (media.ended !== undefined ? media.ended : false);
  const curReadyState = safeGetProp(media, descriptors.readyState, 'readyState') ?? (media.readyState !== undefined ? media.readyState : 0);
  const curSrc = safeGetProp(media, descriptors.currentSrc, 'currentSrc') || media.currentSrc || safeGetProp(media, descriptors.src, 'src') || media.src || '';
  const dur = Number.isFinite(rawDur) ? rawDur : null;

  let bufferedEnd = 0;
  try {
    const buf = safeGetProp(media, descriptors.buffered, 'buffered') || media.buffered;
    if (buf && buf.length > 0) bufferedEnd = buf.end(buf.length - 1);
  } catch {}

  const isLoop = safeGetProp(media, descriptors.loop, 'loop') ?? (media.loop !== undefined ? media.loop : false);

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
    loop: Boolean(isLoop),
    repeat: isLoop ? 'one' : 'off',
    fullscreen: !!(document.fullscreenElement && (document.fullscreenElement === media || document.fullscreenElement.contains(media))),
    pictureInPicture: document.pictureInPictureElement === media,
  };
}
export function getIframeCapabilities(targetMedia, activeMedia, resolveActiveMedia) {
  const media = targetMedia || activeMedia || (resolveActiveMedia?.() ? activeMedia : null);
  const hasNative = Boolean(media && (media.tagName === 'VIDEO' || media.tagName === 'AUDIO'));
  const isVideo = Boolean(media && media.tagName === 'VIDEO');

  const msHandlers = mockMediaSessionInstance._handlers;
  const hasMsAction = action => Boolean(msHandlers.has(action));
  const hasMediaSession = Boolean((typeof navigator !== 'undefined' && navigator.mediaSession) || msHandlers.size > 0);

  const canPlay = hasNative || hasMsAction('play');
  const canPause = hasNative || hasMsAction('pause');
  const canToggle = (hasNative && canPlay && canPause) || hasMsAction('play') || hasMsAction('pause');
  const canStop = hasNative || hasMsAction('stop');
  const canSeek = hasNative || hasMsAction('seekto') || hasMsAction('seekforward') || hasMsAction('seekbackward');

  return {
    play: canPlay,
    pause: canPause,
    toggle: canToggle,
    stop: canStop,
    seek: canSeek,
    volume: hasNative,
    muted: hasNative,
    speed: hasNative,
    playbackRate: hasNative,
    pip: isVideo && typeof document !== 'undefined' && Boolean(document.pictureInPictureEnabled || media.requestPictureInPicture),
    quality: false,
    subtitles: Boolean(hasNative && media.textTracks && media.textTracks.length > 0),
    shuffle: hasMsAction('shuffle'),
    repeat: hasNative,
    next: hasMsAction('nexttrack'),
    previous: hasMsAction('previoustrack'),
    load: hasNative,
    hasAdapter: false,
    hasNative,
    hasMediaSession,
  };
}

export { safePlayMedia, safePauseMedia };

export function handleBindMetadata({ metadata, instanceId, emitToParent, sendMediaSessionState }) {
  if (!metadata || typeof metadata !== 'object') return;

  const safeArtworks = [];
  if (Array.isArray(metadata.artwork)) {
    for (const art of metadata.artwork) {
      if (!art?.src) continue;
      if (typeof art.src === 'string' && art.src.startsWith('blob:')) {
        console_warn(
          `[sremote] WTF you passed me ${instanceId} a Blob URL, but I told you to send Blob Object to bypass SOP. I just requested parent page to clone the object for me`,
        );
        emitToParent('requestBlobClone', { blobUrl: art.src });
      } else {
        safeArtworks.push(art);
      }
    }
  }

  try {
    const metaObj = { title: metadata.title, artist: metadata.artist, album: metadata.album, artwork: safeArtworks };
    logger.scope('mediaSession').log('(MediaSession) Bind metadata:', metaObj);
    if (typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata(metaObj);
    }
    mockMediaSessionInstance.metadata = metaObj;
  } catch (e) {
    console_warn('[sremote] Error setting MediaMetadata:', e);
  }
  sendMediaSessionState();
}

export function createMediaController({
  activeMediaGetter,
  mediaTypeGetter,
  resolveActiveMedia,
  notifyState,
  sendMediaSessionState,
  configuredVolumeSetter,
  configuredMutedSetter,
  programmaticActionTimestampSetter,
  emitToParent,
  instanceId,
}) {
  return async function executeControl(action, value, isPureGet = false) {
    if (!isPureGet) programmaticActionTimestampSetter(Date.now());
    const norm = action.toLowerCase();

    resolveActiveMedia();
    const activeMedia = activeMediaGetter();
    const mediaType = mediaTypeGetter();

    // 1. Custom Adapter Execution
    if (mediaType === 'adapter' && activeMedia && typeof activeMedia === 'object') {
      const handled = await executeMediaAction(activeMedia, norm, value, { isPureGet, instanceId, transactionTracker: getGlobalTransactionTracker() });
      if (!handled) return false;
      let resVal;
      if (typeof activeMedia.getState === 'function') {
        try {
          resVal = await activeMedia.getState();
        } catch {}
      }
      if (isPureGet) notifyState(action, resVal);
      return true;
    }

    // 2. HTML5 Video/Audio Execution
    if ((mediaType === 'video' || mediaType === 'audio') && activeMedia) {
      if (!isPureGet) {
        logger.scope('action').log(`DOM media executing -> ${action}`, { action, value });
      }

      if (norm === 'bindmetadata') {
        handleBindMetadata({ metadata: value, instanceId, emitToParent, sendMediaSessionState });
        return true;
      }

      if (norm === 'volume' && !isPureGet && value !== undefined && value !== null) {
        let num = Number(value);
        if (num > 1 && num <= 100) num /= 100;
        num = Math.min(1, Math.max(0, num));
        configuredVolumeSetter(num);
        configuredMutedSetter(false);
      } else if (norm === 'muted' && !isPureGet) {
        const curM = safeGetProp(activeMedia, descriptors.muted, 'muted');
        const nextM = value !== undefined && value !== null ? Boolean(value) : !curM;
        configuredMutedSetter(nextM);
      }

      const handled = await executeMediaAction(activeMedia, norm, value, { isPureGet, instanceId, transactionTracker: getGlobalTransactionTracker(), logger });

      if (handled) {
        if (isPureGet) {
          notifyState(action, getVideoState(activeMedia, activeMedia, resolveActiveMedia));
        }
        return true;
      }
    }

    // MediaSession Fallback (Only when real handlers exist)
    const hasMockHandler = mockMediaSessionInstance._handlers.size > 0;
    const canHandleNorm =
      mockMediaSessionInstance._handlers.has(norm) || (norm === 'toggle' && (mockMediaSessionInstance._handlers.has('play') || mockMediaSessionInstance._handlers.has('pause')));

    if (hasMockHandler && canHandleNorm) {
      if (!isPureGet) {
        if (norm === 'toggle') {
          const isPaused = navigator.mediaSession?.playbackState === 'paused' || mockMediaSessionInstance.playbackState === 'paused';
          await mockMediaSessionInstance.invoke(isPaused ? 'play' : 'pause');
        } else {
          await mockMediaSessionInstance.invoke(norm, { seekOffset: Number(value) || undefined });
        }
      }
      sendMediaSessionState(action);
      return true;
    }

    return false;
  };
}

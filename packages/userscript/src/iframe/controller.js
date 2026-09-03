import { safeGetProp, safeSetProp } from '../core/utils.js';
import { executeAdapterAction } from '../core/adapter-runner.js';
import { descriptors, console_warn } from '../config.js';
import { mockMediaSessionInstance } from './media-session.js';
import { findAllMedia } from './media-hunter.js';

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

export async function safePlayMedia(el) {
  if (!el) return;
  try {
    const isEnded = Boolean(safeGetProp(el, descriptors.ended, 'ended') || el.ended);
    const curTime = safeGetProp(el, descriptors.currentTime, 'currentTime') ?? 0;
    const dur = safeGetProp(el, descriptors.duration, 'duration') ?? 0;
    const curSrc = safeGetProp(el, descriptors.currentSrc, 'currentSrc') || el.currentSrc || safeGetProp(el, descriptors.src, 'src') || el.src || '';
    const readyState = safeGetProp(el, descriptors.readyState, 'readyState') ?? el.readyState ?? 0;

    if (!curSrc && readyState === 0 && !dur) {
      const hasInnerSource = el.querySelector && el.querySelector('source[src]');
      if (!hasInnerSource) {
        console_warn(
          `%c[sremote] MISSING_MEDIA_SOURCE:%c The iframe service has not loaded any media source into <${el.tagName.toLowerCase()}> (readyState = 0)! play() is ineffective until media source is injected.`,
          'background: #f59e0b; color: #000; font-weight: bold; padding: 2px 4px; border-radius: 3px;',
          'color: #f59e0b;',
        );
        return {
          success: false,
          error: 'MISSING_MEDIA_SOURCE',
          message: 'The iframe service has not loaded any media source into the media element (readyState = 0); play() is ineffective.',
        };
      }
    }

    if (isEnded || (dur > 0 && Math.abs(dur - curTime) <= 0.1)) {
      safeSetProp(el, descriptors.currentTime, 'currentTime', 0);
    }

    let res;
    if (typeof el.play === 'function') {
      try {
        res = el.play();
      } catch {}
    }
    if (!res && descriptors.play) {
      try {
        res = descriptors.play.call(el);
      } catch {}
    }
    if (res && typeof res.then === 'function') await res;
    return res;
  } catch (err) {
    console_warn('[sremote] safePlayMedia error:', err);
  }
}

export function safePauseMedia(el) {
  if (descriptors.pause) {
    try {
      descriptors.pause.call(el);
    } catch {}
  } else {
    try {
      el.pause();
    } catch {}
  }
}

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
      const handled = await executeAdapterAction(activeMedia, norm, value, isPureGet);
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
      let resVal;
      const getPaused = () => Boolean(safeGetProp(activeMedia, descriptors.paused, 'paused') ?? activeMedia.paused);

      switch (norm) {
        case 'play':
          if (!isPureGet) await safePlayMedia(activeMedia);
          resVal = !getPaused();
          break;
        case 'pause':
          if (!isPureGet) safePauseMedia(activeMedia);
          resVal = !getPaused();
          break;
        case 'toggle':
          if (!isPureGet) {
            if (getPaused()) await safePlayMedia(activeMedia);
            else safePauseMedia(activeMedia);
          }
          resVal = !getPaused();
          break;
        case 'stop':
          if (!isPureGet) {
            safePauseMedia(activeMedia);
            safeSetProp(activeMedia, descriptors.currentTime, 'currentTime', 0);
            notifyState('stop', 0);
          }
          resVal = safeGetProp(activeMedia, descriptors.currentTime, 'currentTime');
          break;
        case 'currenttime':
          if (!isPureGet && value !== undefined && value !== null) {
            safeSetProp(activeMedia, descriptors.currentTime, 'currentTime', Math.max(0, Number(value)));
          }
          resVal = safeGetProp(activeMedia, descriptors.currentTime, 'currentTime');
          break;
        case 'seek':
          if (!isPureGet && value !== undefined && value !== null) {
            const cur = safeGetProp(activeMedia, descriptors.currentTime, 'currentTime') || 0;
            safeSetProp(activeMedia, descriptors.currentTime, 'currentTime', Math.max(0, cur + Number(value)));
          }
          resVal = safeGetProp(activeMedia, descriptors.currentTime, 'currentTime');
          break;
        case 'volume':
          if (!isPureGet && value !== undefined && value !== null) {
            let num = Number(value);
            if (num > 1 && num <= 100) num /= 100;
            num = Math.min(1, Math.max(0, num));
            configuredVolumeSetter(num);
            safeSetProp(activeMedia, descriptors.volume, 'volume', num);
            for (const el of findAllMedia()) {
              if (el !== activeMedia) safeSetProp(el, descriptors.volume, 'volume', num);
            }
          }
          resVal = safeGetProp(activeMedia, descriptors.volume, 'volume');
          break;
        case 'muted':
          if (!isPureGet) {
            const curM = safeGetProp(activeMedia, descriptors.muted, 'muted');
            const nextM = value !== undefined && value !== null ? Boolean(value) : !curM;
            configuredMutedSetter(nextM);
            safeSetProp(activeMedia, descriptors.muted, 'muted', nextM);
            for (const el of findAllMedia()) {
              if (el !== activeMedia) safeSetProp(el, descriptors.muted, 'muted', nextM);
            }
          }
          resVal = safeGetProp(activeMedia, descriptors.muted, 'muted');
          break;
        case 'playbackrate':
          if (!isPureGet && value !== undefined) {
            safeSetProp(activeMedia, descriptors.playbackRate, 'playbackRate', Number(value) || 1);
          }
          resVal = safeGetProp(activeMedia, descriptors.playbackRate, 'playbackRate');
          break;
        case 'enterpip':
          if (!isPureGet && activeMedia.requestPictureInPicture) {
            try {
              await activeMedia.requestPictureInPicture();
            } catch {}
          }
          break;
        case 'exitpip':
          if (!isPureGet && document.exitPictureInPicture) {
            try {
              await document.exitPictureInPicture();
            } catch {}
          }
          break;
        case 'pip':
          if (!isPureGet) {
            if (document.pictureInPictureElement) {
              try {
                await document.exitPictureInPicture();
              } catch {}
            } else if (activeMedia.requestPictureInPicture) {
              try {
                await activeMedia.requestPictureInPicture();
              } catch {}
            }
          }
        case 'bindmetadata':
          handleBindMetadata({ metadata: value, instanceId, emitToParent, sendMediaSessionState });
          break;
        case 'nexttrack':
        case 'previoustrack':
          if (!isPureGet) {
            await mockMediaSessionInstance.invoke(norm);
          }
          break;
        case 'repeat':
        case 'loop':
          if (!isPureGet) {
            let nextLoop;
            if (value === undefined || value === null) {
              const curL = Boolean(safeGetProp(activeMedia, descriptors.loop, 'loop') ?? activeMedia.loop);
              nextLoop = !curL;
            } else if (typeof value === 'string') {
              nextLoop = value === 'one' || value === 'all';
            } else {
              nextLoop = Boolean(value);
            }
            safeSetProp(activeMedia, descriptors.loop, 'loop', nextLoop);
            for (const el of findAllMedia()) {
              if (el !== activeMedia) safeSetProp(el, descriptors.loop, 'loop', nextLoop);
            }
          }
          resVal = Boolean(safeGetProp(activeMedia, descriptors.loop, 'loop') ?? activeMedia.loop) ? 'one' : 'off';
          break;
        case 'shuffle':
          // HTML5 media elements do not have native playlist shuffle, invoke mediaSession if available
          if (!isPureGet && mockMediaSessionInstance._handlers.has('shuffle')) {
            await mockMediaSessionInstance.invoke('shuffle', { enable: Boolean(value) });
          }
          break;
        case 'getsubtitles':
          if (activeMedia.textTracks) {
            const tracks = [];
            for (let i = 0; i < activeMedia.textTracks.length; i++) {
              const t = activeMedia.textTracks[i];
              tracks.push({ id: t.id || String(i), label: t.label || t.language || `Track ${i + 1}`, language: t.language, mode: t.mode });
            }
            resVal = tracks;
          } else {
            resVal = [];
          }
          break;
        case 'subtitle':
          if (activeMedia.textTracks) {
            const targetLang = value === null || value === 'off' || value === false ? null : String(value).toLowerCase();
            for (let i = 0; i < activeMedia.textTracks.length; i++) {
              const t = activeMedia.textTracks[i];
              if (!targetLang) {
                t.mode = 'disabled';
              } else if (t.id === targetLang || (t.language && t.language.toLowerCase() === targetLang) || (t.label && t.label.toLowerCase() === targetLang)) {
                t.mode = 'showing';
              } else {
                t.mode = 'disabled';
              }
            }
          }
          break;
        case 'load':
          if (!isPureGet) {
            if (typeof value === 'string' && value) {
              safeSetProp(activeMedia, descriptors.src, 'src', value);
              if (typeof activeMedia.load === 'function') {
                activeMedia.load();
              }
            } else {
              console_warn('[SRemote] load() is primarily designed for custom adapters and is not implemented by default. Implement it via sremote.useAdapter().');
            }
          }
          break;
        default:
          return false;
      }

      if (isPureGet) notifyState(action, resVal);
      return true;
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

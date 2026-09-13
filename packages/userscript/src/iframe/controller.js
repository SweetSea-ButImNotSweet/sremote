import { logger, console_warn } from '../config.js';
import { mockMediaSessionInstance } from './media-session.js';
import { actions, capabilities, pipeline, state } from '@sremote/shared';

/**
 * Gets media state snapshot. Delegates to @sremote/shared state.get.
 */
export function getVideoState(targetMedia, activeMedia, resolveActiveMedia) {
  const media = targetMedia || activeMedia || (resolveActiveMedia?.() ? activeMedia : null);
  if (!media) return null;
  return state.get(media);
}

/**
 * Evaluates iframe capabilities for media instance.
 */
export function getIframeCapabilities(targetMedia, activeMedia, resolveActiveMedia) {
  const media = targetMedia || activeMedia || (resolveActiveMedia?.() ? activeMedia : null);
  const caps = capabilities.get(media);

  const msHandlers = mockMediaSessionInstance._handlers;
  const hasMsAction = action => Boolean(msHandlers.has(action));
  const hasMediaSession = Boolean((typeof navigator !== 'undefined' && navigator.mediaSession) || msHandlers.size > 0);

  return {
    ...caps,
    play: caps.play || hasMsAction('play'),
    pause: caps.pause || hasMsAction('pause'),
    toggle: caps.toggle || hasMsAction('play') || hasMsAction('pause'),
    stop: caps.stop || hasMsAction('stop'),
    seek: caps.seek || hasMsAction('seekto') || hasMsAction('seekforward') || hasMsAction('seekbackward'),
    shuffle: caps.shuffle || hasMsAction('shuffle'),
    next: caps.next || hasMsAction('nexttrack'),
    previous: caps.previous || hasMsAction('previoustrack'),
    hasMediaSession,
  };
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
    let activeMedia = activeMediaGetter();
    let mediaType = mediaTypeGetter();

    // Retry briefly if media momentarily switching/buffering
    if (!activeMedia) {
      await new Promise(r => setTimeout(r, 120));
      resolveActiveMedia();
      activeMedia = activeMediaGetter();
      mediaType = mediaTypeGetter();
    }

    // 1. Custom Adapter Execution
    if (mediaType === 'adapter' && activeMedia && typeof activeMedia === 'object') {
      if (!isPureGet) {
        const adapterName = activeMedia.name || instanceId;
        logger.scope('action').log(`(Userscript) Executing '${action}' via Adapter [${adapterName}]`, { action, value, instanceId });
      }
      const handled = await actions.execute(activeMedia, norm, value, { isPureGet, instanceId, transactionTracker: pipeline.getTracker() });
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

    // 2. MediaSession Priority (When real handlers exist or activeMedia is mediasession)
    const hasMockHandler = mockMediaSessionInstance._handlers.size > 0;
    const canHandleNorm =
      mockMediaSessionInstance._handlers.has(norm) || (norm === 'toggle' && (mockMediaSessionInstance._handlers.has('play') || mockMediaSessionInstance._handlers.has('pause')));

    if ((mediaType === 'mediasession' || hasMockHandler) && canHandleNorm) {
      if (!isPureGet) {
        logger.scope('action').log(`(Userscript) Executing '${action}' via MediaSession ActionHandler [${instanceId}]`, { action, value, instanceId });
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

    // 3. HTML5 Video/Audio DOM Execution
    if ((mediaType === 'video' || mediaType === 'audio') && activeMedia) {
      if (!isPureGet) {
        const tag = activeMedia.tagName ? activeMedia.tagName.toLowerCase() : mediaType;
        logger.scope('action').log(`(Userscript) Executing '${action}' via In-Page DOM <${tag}> [${instanceId}]`, { action, value, instanceId });
      }

      if (norm === 'bindmetadata') {
        handleBindMetadata({ metadata: value, instanceId, emitToParent, sendMediaSessionState });
        return true;
      }

      // Sync local trackers when volume or mute changed
      if (norm === 'volume' && !isPureGet && value !== undefined && value !== null) {
        let num = Number(value);
        if (num > 1 && num <= 100) num /= 100;
        configuredVolumeSetter?.(Math.min(1, Math.max(0, num)));
        configuredMutedSetter?.(false);
      } else if (norm === 'muted' && !isPureGet) {
        configuredMutedSetter?.(value !== undefined && value !== null ? Boolean(value) : !activeMedia.muted);
      }

      const handled = await actions.execute(activeMedia, norm, value, { isPureGet, instanceId, transactionTracker: pipeline.getTracker(), logger });

      if (handled) {
        if (isPureGet) {
          notifyState(action, state.get(activeMedia));
        }
        return true;
      }
    }

    return false;
  };
}

import { logger } from '../config.js';
import { mockMediaSessionInstance } from './media-session.js';
import { actions, capabilities, state } from '@sremote/shared';

/**
 * Resolves media target safely from parameters or resolver.
 */
function resolveTarget(target, active, resolveFn) {
  if (target) return target;
  if (typeof active === 'function') return active();
  if (active) return active;
  if (typeof resolveFn === 'function') {
    const res = resolveFn();
    if (res && typeof res !== 'boolean') return res;
  }
  return null;
}

/**
 * Gets media state snapshot. Delegates to @sremote/shared state.get.
 */
export function getVideoState(targetMedia, activeMedia, resolveActiveMedia) {
  const media = resolveTarget(targetMedia, activeMedia, resolveActiveMedia);
  return media ? state.get(media) : null;
}

/**
 * Evaluates iframe capabilities for media instance.
 */
export function getIframeCapabilities(targetMedia, activeMedia, resolveActiveMedia) {
  const media = resolveTarget(targetMedia, activeMedia, resolveActiveMedia);
  const caps = capabilities.get(media);
  const msHandlers = mockMediaSessionInstance._handlers;
  const hasMs = action => msHandlers.has(action);

  return {
    ...caps,
    play: caps.play || hasMs('play'),
    pause: caps.pause || hasMs('pause'),
    toggle: caps.toggle || hasMs('play') || hasMs('pause'),
    stop: caps.stop || hasMs('stop'),
    seek: caps.seek || hasMs('seekto') || hasMs('seekforward') || hasMs('seekbackward'),
    shuffle: caps.shuffle || hasMs('shuffle'),
    next: caps.next || hasMs('nexttrack'),
    previous: caps.previous || hasMs('previoustrack'),
    hasMediaSession: Boolean((typeof navigator !== 'undefined' && navigator.mediaSession) || msHandlers.size > 0),
  };
}

/**
 * Binds metadata to MediaSession and internal mocks.
 */
export function handleBindMetadata({ metadata, sendMediaSessionState } = {}) {
  if (!metadata || typeof metadata !== 'object') return;
  const artwork = Array.isArray(metadata.artwork) ? metadata.artwork.filter(a => a?.src) : [];
  const metaObj = { title: metadata.title || '', artist: metadata.artist || '', album: metadata.album || '', artwork };

  try {
    if (typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata(metaObj);
    }
    mockMediaSessionInstance.metadata = metaObj;
    logger.scope('mediaSession').log('(MediaSession) Bind metadata:', metaObj);
  } catch (e) {
    logger.warn('[sremote] Error setting MediaMetadata:', e);
  }
  sendMediaSessionState?.();
}

/**
 * Universal media controller for Iframe Agent.
 * Dispatches commands across Custom Adapters, Web MediaSession, and Native HTMLMediaElements.
 */
export function createMediaController(options = {}) {
  const ctx = options.ctx || options;
  const resolver = ctx.resolver || options.resolver;
  const instanceId = ctx.instanceId || options.instanceId;
  const notifyState = ctx.notifyState || options.notifyState;
  const sendMediaSessionState = ctx.sendMediaSessionState || options.sendMediaSessionState;

  // --- Strategy 1: Custom Ready2Use Adapter ---
  async function execAdapter(media, action, norm, value, isPureGet, cmdId = null) {
    if (!isPureGet) {
      logger.scope('action').log(`(Userscript) Executing '${action}' via Adapter [${media.name || instanceId}]`, { action, value, instanceId, cmdId });
    }
    const handled = await actions.execute(media, norm, value, { isPureGet, cmdId, isProgrammatic: true, instanceId, logger });
    if (!handled) return false;
    if (isPureGet && typeof media.getState === 'function') {
      try {
        notifyState?.(action, await media.getState());
      } catch {}
    }
    return true;
  }

  // --- Strategy 2: Web MediaSession API ---
  async function execMediaSession(action, norm, value, isPureGet) {
    if (!isPureGet) {
      logger.scope('action').log(`(Userscript) Executing '${action}' via MediaSession [${instanceId}]`, { action, value, instanceId });
      if (norm === 'toggle') {
        const isPaused = navigator.mediaSession?.playbackState === 'paused' || mockMediaSessionInstance.playbackState === 'paused';
        await mockMediaSessionInstance.invoke(isPaused ? 'play' : 'pause');
      } else {
        await mockMediaSessionInstance.invoke(norm, { seekOffset: Number(value) || undefined });
      }
    }
    sendMediaSessionState?.(action);
    return true;
  }

  // --- Strategy 3: HTML5 Native DOM Element (<video>/<audio>) ---
  async function execDomMedia(media, action, norm, value, isPureGet, cmdId = null) {
    if (!isPureGet) {
      const tag = media.tagName ? media.tagName.toLowerCase() : 'media';
      logger.scope('action').log(`(Userscript) Executing '${action}' via DOM <${tag}> [${instanceId}]`, { action, value, instanceId, cmdId });
    }

    if (norm === 'bindmetadata') {
      handleBindMetadata({ metadata: value, sendMediaSessionState });
      return true;
    }

    // Volume & Mute normalization
    if (!isPureGet) {
      if (norm === 'volume' && value !== undefined && value !== null) {
        const num = Number(value);
        const normVol = Math.min(1, Math.max(0, num > 1 ? num / 100 : num));
        if (ctx) {
          ctx.configuredVolume = normVol;
          ctx.configuredMuted = false;
        }
      } else if (norm === 'muted') {
        const nextMuted = value !== undefined && value !== null ? Boolean(value) : !media.muted;
        if (ctx) ctx.configuredMuted = nextMuted;
      }
    }

    const handled = await actions.execute(media, norm, value, { isPureGet, cmdId, isProgrammatic: true, instanceId, logger });
    if (handled && isPureGet) {
      notifyState?.(action, state.get(media));
    }
    return Boolean(handled);
  }

  return async function executeControl(action, value, isPureGet = false, controlOptions = {}) {
    const cmdId = controlOptions?.cmdId || null;
    const norm = String(action || '').toLowerCase();

    resolver?.resolveActiveMedia?.();
    let media = resolver?.getActiveMedia?.();
    let mediaType = resolver?.getMediaType?.();

    // Retry briefly if media is switching or buffering
    if (!media) {
      await new Promise(r => setTimeout(r, 120));
      resolver?.resolveActiveMedia?.();
      media = resolver?.getActiveMedia?.();
      mediaType = resolver?.getMediaType?.();
    }

    // 1. Adapter execution
    if (mediaType === 'adapter' && media && typeof media === 'object') {
      return execAdapter(media, action, norm, value, isPureGet, cmdId);
    }

    // 2. MediaSession execution
    const hasMockHandler = mockMediaSessionInstance._handlers.size > 0;
    const canHandleMs =
      mockMediaSessionInstance._handlers.has(norm) || (norm === 'toggle' && (mockMediaSessionInstance._handlers.has('play') || mockMediaSessionInstance._handlers.has('pause')));
    if ((mediaType === 'mediasession' || hasMockHandler) && canHandleMs) {
      return execMediaSession(action, norm, value, isPureGet);
    }

    // 3. HTML5 Video/Audio DOM execution
    if ((mediaType === 'video' || mediaType === 'audio') && media) {
      return execDomMedia(media, action, norm, value, isPureGet, cmdId);
    }

    return false;
  };
}

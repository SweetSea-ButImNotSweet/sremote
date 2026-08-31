import { ENABLE_DEBUG_API, console_warn } from '../config.js';
import { IframeStyleEngine } from './style-engine.js';
import { getVideoState, getIframeCapabilities, handleBindMetadata } from './controller.js';
import { findAllMedia } from './media-hunter.js';
import { mockMediaSessionInstance } from './media-session.js';

export function createRpcRegistry({ resolver, instanceId, emitToParent, sendMediaSessionState, notifyState, getOriginalMediaSrc, setOriginalMediaSrc }) {
  const customRpcActions = new Map();

  customRpcActions.set('getCapabilities', async () => {
    resolver.resolveActiveMedia();
    const capabilities = getIframeCapabilities(null, resolver.getActiveMedia(), resolver.resolveActiveMedia);
    return {
      capabilities,
      hasMedia: Boolean(resolver.getActiveMedia()),
      mediaType: resolver.getMediaType(),
      customActions: Array.from(customRpcActions.keys()),
      mediaSessionSupported: Boolean(navigator.mediaSession),
      hasCustomCSS: Boolean(IframeStyleEngine.getDynamicCSS()),
    };
  });

  customRpcActions.set('getMediaInfo', async () => {
    resolver.resolveActiveMedia();
    return { state: getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia), title: document.title, url: location.href, mediaType: resolver.getMediaType() };
  });

  customRpcActions.set('setIframeCSS', async params => {
    const css = params?.css || '';
    IframeStyleEngine.setDynamicCSS(css);
    return { success: true, css: IframeStyleEngine.getDynamicCSS() };
  });

  customRpcActions.set('getIframeCSS', async () => ({ success: true, css: IframeStyleEngine.getDynamicCSS() }));

  customRpcActions.set('removeIframeCSS', async () => {
    IframeStyleEngine.removeDynamicCSS();
    return { success: true };
  });

  if (ENABLE_DEBUG_API) {
    customRpcActions.set('debug_getState', async () => {
      resolver.resolveActiveMedia();
      const allMedia = findAllMedia();
      const mediaElements = allMedia.map((el, idx) => ({
        index: idx,
        tagName: el.tagName,
        src: el.currentSrc || el.src || '',
        paused: el.paused,
        muted: el.muted,
        volume: el.volume,
        currentTime: el.currentTime,
        duration: el.duration,
        readyState: el.readyState,
        networkState: el.networkState,
        isActive: el === resolver.getActiveMedia(),
      }));

      const ms = navigator.mediaSession || mockMediaSessionInstance;
      const mediaSession = {
        supported: Boolean(navigator.mediaSession),
        playbackState: ms?.playbackState,
        metadata: ms?.metadata ? { title: ms.metadata.title, artist: ms.metadata.artist, album: ms.metadata.album, artwork: ms.metadata.artwork || [] } : null,
        registeredHandlers: Array.from(mockMediaSessionInstance._handlers.keys()),
      };

      return {
        instanceId,
        location: location.href,
        origin: location.origin,
        mediaType: resolver.getMediaType(),
        state: getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
        mediaElements,
        mediaSession,
      };
    });

    customRpcActions.set('debug_setSource', async params => {
      resolver.resolveActiveMedia();
      if (!resolver.getActiveMedia() && findAllMedia().length === 0) {
        const audio = new Audio();
        document.body?.appendChild(audio);
        resolver.setActiveMedia(audio);
        resolver.setMediaType('audio');
      }
      const media = resolver.getActiveMedia() || findAllMedia()[0];
      if (!media) return { success: false, error: 'NO_MEDIA_FOUND', message: 'No media element found to set source' };

      if (!getOriginalMediaSrc()) {
        setOriginalMediaSrc(media.currentSrc || media.src);
      }

      const newSrc = params?.src;
      if (!newSrc) return { success: false, error: 'NO_SRC_PROVIDED', message: 'Parameter "src" is required' };

      media.src = newSrc;
      media.load();
      try {
        await media.play();
      } catch (err) {
        console_warn('[sremote_debug] Autoplay error on new source:', err);
      }

      if (params?.title && mockMediaSessionInstance) {
        handleBindMetadata({
          metadata: { title: params.title, artist: 'sremote.debug', album: 'Debug Track' },
          instanceId,
          emitToParent,
          sendMediaSessionState,
          activeMediaGetter: resolver.getActiveMedia,
          mediaTypeGetter: resolver.getMediaType,
          resolveActiveMedia: resolver.resolveActiveMedia,
        });
      }

      notifyState();
      return { success: true, newSrc, activeMediaTag: media.tagName };
    });

    customRpcActions.set('debug_toggleLoop', async () => {
      resolver.resolveActiveMedia();
      const media = resolver.getActiveMedia() || findAllMedia()[0];
      if (!media) return { success: false, error: 'NO_MEDIA_FOUND', message: 'No media element found to toggle loop' };
      media.loop = !media.loop;
      return { success: true, loop: media.loop };
    });

    customRpcActions.set('debug_simulateStall', async () => {
      resolver.resolveActiveMedia();
      const media = resolver.getActiveMedia() || findAllMedia()[0];
      if (!media) return { success: false, error: 'NO_MEDIA_FOUND', message: 'No media element found to simulate stall' };
      media.dispatchEvent(new Event('waiting'));
      media.dispatchEvent(new Event('stalled'));
      return { success: true, simulated: ['waiting', 'stalled'] };
    });

    customRpcActions.set('debug_restoreOriginal', async () => {
      resolver.resolveActiveMedia();
      const media = resolver.getActiveMedia() || findAllMedia()[0];
      if (!media) return { success: false, error: 'NO_MEDIA_FOUND', message: 'No media element found to restore source' };
      const orig = getOriginalMediaSrc();
      if (orig) {
        media.src = orig;
        media.load();
        try {
          await media.play();
        } catch {}
        setOriginalMediaSrc(null);
        notifyState();
        return { success: true, restored: media.src };
      }
      return { success: false, error: 'NO_SAVED_SOURCE', message: 'No original source was previously saved to restore' };
    });
  }

  return {
    customRpcActions,
    async executeRpc(action, params) {
      const fn = customRpcActions.get(action);
      if (typeof fn === 'function') {
        return fn(params);
      }
      throw new Error(`Custom action '${action}' not found`);
    },
  };
}

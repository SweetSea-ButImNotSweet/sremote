import { mockMediaSessionInstance, activeMediaSession } from './media-session.js';
import { pageWindow } from '../config.js';
import { getKnownShadowRoots } from './hooks.js';
import { hasMediaSource, queryMediaDeep as sharedQueryMediaDeep, findAllMedia as sharedFindAllMedia } from '@sremote/shared';

export function queryMediaDeep(root = document, visitedRoots = new Set()) {
  return sharedQueryMediaDeep(root, visitedRoots);
}

export function findAllMedia() {
  return sharedFindAllMedia({ getKnownShadowRoots });
}

export function createMediaResolver(createdMediaPool, bindVideoEvents) {
  let activeMedia = null;
  let mediaType = null;

  function resolveActiveMedia() {
    if (activeMedia && (mediaType === 'adapter' || activeMedia.isConnected || createdMediaPool.has(activeMedia))) {
      return true;
    }

    // 1. Custom Adapter (Highest Priority)
    if (mediaType === 'adapter' && activeMedia) {
      return true;
    }

    // 2. Real HTML5 Media with valid duration, src, or active playback
    const all = findAllMedia();
    if (all.length > 0) {
      // Helper to evaluate visible render area of a media element
      const getMediaArea = el => {
        try {
          if (!el?.isConnected) return 0;
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return rect.width * rect.height;
          }
          return (el.offsetWidth || 0) * (el.offsetHeight || 0);
        } catch {
          return 0;
        }
      };

      // Filter connected media elements first
      const connectedMedia = all.filter(el => el?.isConnected);
      const pool = connectedMedia.length > 0 ? connectedMedia : all;

      // Sort candidate media:
      // 1. Actively playing video (!paused && currentTime > 0)
      // 2. Has media source and valid duration
      // 3. Rendered display area (larger is main video, smaller like 160x90 is hover preview)
      const sortedCandidates = [...pool].sort((a, b) => {
        const aPlaying = !a.paused && !a.ended && (a.currentTime || 0) > 0 ? 1 : 0;
        const bPlaying = !b.paused && !b.ended && (b.currentTime || 0) > 0 ? 1 : 0;
        if (aPlaying !== bPlaying) return bPlaying - aPlaying;

        const aArea = getMediaArea(a);
        const bArea = getMediaArea(b);
        if (Math.abs(aArea - bArea) > 500) return bArea - aArea;

        const aHasSrc = hasMediaSource(a) || (a.duration && a.duration > 0) ? 1 : 0;
        const bHasSrc = hasMediaSource(b) || (b.duration && b.duration > 0) ? 1 : 0;
        return bHasSrc - aHasSrc;
      });

      const valid = sortedCandidates[0];

      activeMedia = valid;
      mediaType = valid.tagName ? valid.tagName.toLowerCase() : 'video';
      bindVideoEvents(valid);
      return true;
    }

    // 3. MediaSession with actual handlers, metadata, or active playback state
    const ms = pageWindow.navigator?.mediaSession || navigator?.mediaSession;
    const hasHandlers = mockMediaSessionInstance._handlers.size > 0;
    const hasMetadata = Boolean(ms?.metadata && (ms.metadata.title || ms.metadata.artist));
    const isPlayingState = ms?.playbackState === 'playing' || ms?.playbackState === 'paused';

    if (hasHandlers || hasMetadata || isPlayingState) {
      activeMedia = activeMediaSession;
      mediaType = 'mediasession';
      return true;
    }

    activeMedia = null;
    mediaType = null;
    return false;
  }

  return {
    getActiveMedia: () => activeMedia,
    getMediaType: () => mediaType,
    setActiveMedia: m => {
      activeMedia = m;
    },
    setMediaType: t => {
      mediaType = t;
    },
    resolveActiveMedia,
  };
}

import { mockMediaSessionInstance, activeMediaSession } from './media-session.js';
import { pageWindow } from '../config.js';
import { getKnownShadowRoots } from './hooks.js';

export function queryMediaDeep(root = document, visitedRoots = new Set()) {
  const list = [];
  try {
    if (!root || visitedRoots.has(root)) return list;
    visitedRoots.add(root);

    if (root.querySelectorAll) {
      const found = root.querySelectorAll('video, audio');
      for (let i = 0; i < found.length; i++) list.push(found[i]);
    }
    const allElements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      if (el.shadowRoot) {
        list.push(...queryMediaDeep(el.shadowRoot, visitedRoots));
      }
      if (el.tagName === 'IFRAME' || el.tagName === 'FRAME') {
        try {
          const childDoc = el.contentDocument || el.contentWindow?.document;
          if (childDoc) {
            list.push(...queryMediaDeep(childDoc, visitedRoots));
          }
        } catch {}
      }
    }
  } catch {}
  return list;
}

export function findAllMedia() {
  const visitedRoots = new Set();
  const mediaList = queryMediaDeep(document, visitedRoots);

  // Scan through all captured shadow roots (including closed mode)
  try {
    const shadowRoots = getKnownShadowRoots();
    for (let i = 0; i < shadowRoots.length; i++) {
      const sr = shadowRoots[i];
      if (sr && !visitedRoots.has(sr)) {
        const subMedia = queryMediaDeep(sr, visitedRoots);
        for (let j = 0; j < subMedia.length; j++) {
          if (!mediaList.includes(subMedia[j])) {
            mediaList.push(subMedia[j]);
          }
        }
      }
    }
  } catch {}

  return mediaList;
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
      const valid =
        all.find(el => !el.paused && !el.ended && el.currentTime > 0) ||
        all.find(el => !el.paused) ||
        all.find(el => (el.duration && el.duration > 0) || el.currentSrc || el.src) ||
        all[0];

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

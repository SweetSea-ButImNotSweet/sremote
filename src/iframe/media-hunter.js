import { mockMediaSessionInstance, activeMediaSession } from './media-session.js';
import { pageWindow } from '../config.js';

export function queryMediaDeep(root = document) {
  const list = [];
  try {
    if (!root) return list;
    if (root.querySelectorAll) {
      const found = root.querySelectorAll('video, audio');
      for (let i = 0; i < found.length; i++) list.push(found[i]);
    }
    const allElements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      if (el.shadowRoot) {
        list.push(...queryMediaDeep(el.shadowRoot));
      }
      if (el.tagName === 'IFRAME' || el.tagName === 'FRAME') {
        try {
          const childDoc = el.contentDocument || el.contentWindow?.document;
          if (childDoc) {
            list.push(...queryMediaDeep(childDoc));
          }
        } catch {}
      }
    }
  } catch {}
  return list;
}

export function findAllMedia() {
  return queryMediaDeep(document);
}

export function createMediaResolver(createdMediaPool, bindVideoEvents) {
  let activeMedia = null;
  let mediaType = null;

  function resolveActiveMedia() {
    if (activeMedia && (activeMedia.isConnected || createdMediaPool.has(activeMedia))) {
      return true;
    }

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

    const ms = pageWindow.navigator?.mediaSession || navigator?.mediaSession;
    if (mockMediaSessionInstance._handlers.size > 0 || (ms && (ms.metadata || ms.playbackState !== 'none'))) {
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

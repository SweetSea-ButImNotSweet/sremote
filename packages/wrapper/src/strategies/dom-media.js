/**
 * Helper utilities for discovering and controlling native HTML5 <video> / <audio> elements.
 */

/**
 * Resolves a media element from a selector, DOM node, or same-origin iframe.
 * @param {string|HTMLElement|null} target
 * @param {Document} [doc=document]
 * @returns {HTMLMediaElement|null}
 */
export function resolveMediaElement(target, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return null;

  if (!target) {
    return doc.querySelector('video, audio');
  }

  if (typeof target === 'string') {
    const el = doc.querySelector(target);
    if (!el) return null;
    if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') return el;
    if (el.tagName === 'IFRAME') {
      try {
        return el.contentDocument?.querySelector('video, audio') || null;
      } catch {
        return null;
      }
    }
    return el.querySelector('video, audio');
  }

  if (target.nodeType === 1) {
    if (target.tagName === 'VIDEO' || target.tagName === 'AUDIO') return target;
    if (target.tagName === 'IFRAME') {
      try {
        return target.contentDocument?.querySelector('video, audio') || null;
      } catch {
        return null;
      }
    }
    return target.querySelector?.('video, audio') || null;
  }

  return null;
}

/**
 * Standard controller for direct HTMLMediaElement playback actions.
 */
export const HtmlMediaController = {
  async play(el) {
    return el.play();
  },

  pause(el) {
    el.pause();
  },

  toggle(el) {
    if (el.paused) return el.play();
    el.pause();
  },

  stop(el) {
    el.pause();
    el.currentTime = 0;
  },

  seek(el, offset) {
    const duration = el.duration || 0;
    el.currentTime = Math.max(0, Math.min(duration, el.currentTime + offset));
  },

  seekTo(el, time) {
    const duration = el.duration || 0;
    el.currentTime = Math.max(0, Math.min(duration, time));
  },

  volume(el, vol) {
    el.volume = Math.max(0, Math.min(1, vol));
    el.muted = false;
  },

  mute(el, muted) {
    el.muted = typeof muted === 'boolean' ? muted : !el.muted;
  },

  speed(el, rate) {
    el.playbackRate = rate;
  },

  pip(el, enable) {
    if (!el || el.tagName !== 'VIDEO') {
      throw new Error('[SRemote:DomDriver] Video element not found');
    }
    if (typeof document === 'undefined') return;

    if (enable === true || (enable === undefined && document.pictureInPictureElement !== el)) {
      return el.requestPictureInPicture?.();
    }
    if (document.pictureInPictureElement === el) {
      return document.exitPictureInPicture?.();
    }
  },

  load(el, source) {
    if (typeof source === 'string' && source) {
      el.src = source;
      if (typeof el.load === 'function') {
        el.load();
      }
    } else {
      console.warn('[SRemote] load() is primarily designed for custom adapters and is not implemented by default. Implement it via sremote.useAdapter().');
    }
  },

  subtitle(el, track) {
    if (!el?.textTracks) return;
    const targetLang = track === null || track === 'off' || track === false ? null : String(track).toLowerCase();
    for (let i = 0; i < el.textTracks.length; i++) {
      const t = el.textTracks[i];
      if (!targetLang) {
        t.mode = 'disabled';
      } else if (t.id === targetLang || (t.language && t.language.toLowerCase() === targetLang) || (t.label && t.label.toLowerCase() === targetLang)) {
        t.mode = 'showing';
      } else {
        t.mode = 'disabled';
      }
    }
  },

  getSubtitles(el) {
    if (!el?.textTracks) return [];
    const tracks = [];
    for (let i = 0; i < el.textTracks.length; i++) {
      const t = el.textTracks[i];
      tracks.push({ id: t.id || String(i), label: t.label || t.language || `Track ${i + 1}`, language: t.language });
    }
    return tracks;
  },

  repeat(el, mode) {
    if (!el) return;
    if (typeof mode === 'string') {
      el.loop = mode === 'one' || mode === 'all';
    } else if (typeof mode === 'boolean') {
      el.loop = mode;
    } else {
      el.loop = !el.loop;
    }
  },
};

/**
 * Centralized Action Fallback Matrix for SRemote.
 * Single Source of Truth defining execution contracts, polyfills, DOM fallbacks,
 * and event notifications for every media action.
 */

import { getNativeMediaProp, setNativeMediaProp, callNative } from '../dom/native-media.js';

export const adapterPreviousVolumeMap = new WeakMap();

/**
 * Safely plays a media element, recovering from ended state, unstarted videos,
 * or prototype overrides by third-party players.
 * @param {HTMLMediaElement} el
 * @returns {Promise<any>}
 */
export async function safePlayMedia(el) {
  if (!el) return;
  try {
    const isEnded = Boolean(el.ended);
    const curTime = el.currentTime ?? 0;
    const dur = el.duration ?? 0;

    if (isEnded || (dur > 0 && Math.abs(dur - curTime) <= 0.1)) {
      setNativeMediaProp(el, 'currentTime', 0);
    }

    if (el.seeking) {
      await new Promise(resolve => {
        let timer = null;
        const onSeeked = () => {
          if (timer) clearTimeout(timer);
          resolve();
        };
        timer = setTimeout(onSeeked, 150);
        try {
          el.addEventListener('seeked', onSeeked, { once: true });
        } catch {
          resolve();
        }
      });
    }

    let res;
    if (typeof el.play === 'function') {
      try {
        res = el.play();
      } catch {}
    }

    if (!res) {
      try {
        res = callNative(el, 'play');
      } catch {}
    }

    if (res && typeof res.then === 'function') {
      try {
        await res;
      } catch (err) {
        if (err && (err.name === 'AbortError' || String(err?.message || err).includes('interrupted'))) {
          return res;
        }

        if (err?.name === 'NotAllowedError' && el.paused) {
          try {
            const playBtn = el.parentElement?.querySelector?.('.ytp-large-play-button, .vjs-big-play-button, .bpx-player-ctrl-play') || null;
            if (playBtn) {
              playBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            } else {
              const container = el.closest?.('.bpx-player-video-area, .bilibili-player-video, .player-container') || null;
              if (container && container !== el) {
                container.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
              }
            }
          } catch {}
        }
      }
    }
    return res;
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[sremote:action] safePlayMedia error:', err);
    }
  }
}

/**
 * Safely pauses a media element, recovering from prototype overrides.
 * @param {HTMLMediaElement} el
 */
export function safePauseMedia(el) {
  if (!el) return;
  try {
    if (typeof el.pause === 'function') {
      el.pause();
    }
  } catch {}
  try {
    callNative(el, 'pause');
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[sremote:action] safePauseMedia error:', err);
    }
  }
}

/**
 * Normalizes an action string into its canonical matrix key.
 * @param {string} action
 * @returns {string}
 */
export function normalizeActionKey(action) {
  const norm = String(action || '')
    .toLowerCase()
    .trim();
  switch (norm) {
    case 'currenttime':
    case 'seekto':
      return 'seekto';
    case 'muted':
    case 'mute':
      return 'mute';
    case 'rate':
    case 'playbackrate':
    case 'speed':
      return 'speed';
    case 'pip':
    case 'enterpip':
      return 'enterpip';
    case 'exitpip':
      return 'exitpip';
    default:
      return norm;
  }
}

/**
 * Central Fallback Matrix defining handlers and capabilities for all actions.
 */
export const ACTION_MATRIX = {
  // ----------------------------------------------------
  // 1. Playback Controls
  // ----------------------------------------------------
  play: {
    executeAdapter: async targetAdapter => {
      if (typeof targetAdapter.play === 'function') {
        const res = await targetAdapter.play();
        return { handled: true, result: res ?? true };
      }
      return { handled: false };
    },
    polyfill: null,
    executeNative: async mediaElement => {
      await safePlayMedia(mediaElement);
      return { handled: true, result: true };
    },
    mediaSessionAction: 'play',
    eventsToEmit: () => [{ event: 'play' }],
  },

  pause: {
    executeAdapter: async targetAdapter => {
      if (typeof targetAdapter.pause === 'function') {
        const res = await targetAdapter.pause();
        return { handled: true, result: res ?? true };
      }
      return { handled: false };
    },
    polyfill: null,
    executeNative: async mediaElement => {
      safePauseMedia(mediaElement);
      return { handled: true, result: true };
    },
    mediaSessionAction: 'pause',
    eventsToEmit: () => [{ event: 'pause' }],
  },

  toggle: {
    executeAdapter: async targetAdapter => {
      if (typeof targetAdapter.toggle === 'function') {
        const res = await targetAdapter.toggle();
        const isPaused = typeof targetAdapter.paused === 'function' ? targetAdapter.paused() : typeof targetAdapter.paused === 'boolean' ? targetAdapter.paused : null;
        return { handled: true, result: res ?? true, specificEvent: isPaused !== null ? (isPaused ? 'pause' : 'play') : 'toggle' };
      }
      return { handled: false };
    },
    polyfill: async targetAdapter => {
      if (typeof targetAdapter.play === 'function' && typeof targetAdapter.pause === 'function') {
        const isPaused = typeof targetAdapter.paused === 'function' ? targetAdapter.paused() : typeof targetAdapter.paused === 'boolean' ? targetAdapter.paused : true;
        if (isPaused) {
          const res = await targetAdapter.play();
          return { handled: true, result: res ?? true, specificEvent: 'play' };
        } else {
          const res = await targetAdapter.pause();
          return { handled: true, result: res ?? true, specificEvent: 'pause' };
        }
      }
      return { handled: false };
    },
    executeNative: async mediaElement => {
      const isPaused = getNativeMediaProp(mediaElement, 'paused', true);
      if (isPaused) {
        await safePlayMedia(mediaElement);
        return { handled: true, result: true, specificEvent: 'play' };
      } else {
        safePauseMedia(mediaElement);
        return { handled: true, result: true, specificEvent: 'pause' };
      }
    },
    mediaSessionAction: null,
    eventsToEmit: res => [{ event: res?.specificEvent || 'toggle' }],
  },

  stop: {
    executeAdapter: async targetAdapter => {
      if (typeof targetAdapter.stop === 'function') {
        const res = await targetAdapter.stop();
        return { handled: true, result: res ?? true };
      }
      return { handled: false };
    },
    polyfill: async targetAdapter => {
      let didSomething = false;
      if (typeof targetAdapter.pause === 'function') {
        await targetAdapter.pause();
        didSomething = true;
      }
      if (typeof targetAdapter.seekTo === 'function') {
        await targetAdapter.seekTo(0);
        didSomething = true;
      } else if (typeof targetAdapter.setCurrentTime === 'function') {
        await targetAdapter.setCurrentTime(0);
        didSomething = true;
      }
      if (didSomething) {
        return { handled: true, result: true };
      }
      return { handled: false };
    },
    executeNative: async mediaElement => {
      safePauseMedia(mediaElement);
      setNativeMediaProp(mediaElement, 'currentTime', 0);
      return { handled: true, result: true };
    },
    mediaSessionAction: 'stop',
    eventsToEmit: () => [{ event: 'pause' }, { event: 'stop' }],
  },

  // ----------------------------------------------------
  // 2. Timeline & Seeking
  // ----------------------------------------------------
  seek: {
    executeAdapter: async (targetAdapter, actionPayload) => {
      if (typeof targetAdapter.seek === 'function') {
        const res = await targetAdapter.seek(Number(actionPayload));
        return { handled: true, result: res ?? true };
      }
      return { handled: false };
    },
    polyfill: async (targetAdapter, actionPayload) => {
      if (typeof targetAdapter.seekTo === 'function' || typeof targetAdapter.setCurrentTime === 'function') {
        let cur = 0;
        if (typeof targetAdapter.getCurrentTime === 'function') {
          cur = Number((await targetAdapter.getCurrentTime()) || 0);
        }
        const targetTime = Math.max(0, cur + Number(actionPayload));
        if (typeof targetAdapter.seekTo === 'function') {
          await targetAdapter.seekTo(targetTime);
        } else {
          await targetAdapter.setCurrentTime(targetTime);
        }
        return { handled: true, result: true };
      }
      return { handled: false };
    },
    executeNative: async (mediaElement, actionPayload) => {
      if (actionPayload !== undefined && actionPayload !== null) {
        const dur = getNativeMediaProp(mediaElement, 'duration', 0) || 0;
        const curTime = getNativeMediaProp(mediaElement, 'currentTime', 0) ?? 0;
        const targetTime = Math.max(0, Math.min(dur || Infinity, curTime + Number(actionPayload)));
        setNativeMediaProp(mediaElement, 'currentTime', targetTime);
      }
      return { handled: true, result: true };
    },
    mediaSessionAction: val => (val >= 0 ? 'seekforward' : 'seekbackward'),
    eventsToEmit: () => [{ event: 'seeking' }, { event: 'seeked' }],
  },

  seekto: {
    executeAdapter: async (targetAdapter, actionPayload) => {
      const targetTime = Number(actionPayload);
      if (typeof targetAdapter.seekTo === 'function') {
        const res = await targetAdapter.seekTo(targetTime);
        return { handled: true, result: res ?? true };
      }
      if (typeof targetAdapter.setCurrentTime === 'function') {
        const res = await targetAdapter.setCurrentTime(targetTime);
        return { handled: true, result: res ?? true };
      }
      return { handled: false };
    },
    polyfill: async (targetAdapter, actionPayload) => {
      if (typeof targetAdapter.seek === 'function') {
        let cur = 0;
        if (typeof targetAdapter.getCurrentTime === 'function') {
          cur = Number((await targetAdapter.getCurrentTime()) || 0);
        }
        await targetAdapter.seek(Number(actionPayload) - cur);
        return { handled: true, result: true };
      }
      return { handled: false };
    },
    executeNative: async (mediaElement, actionPayload) => {
      if (actionPayload !== undefined && actionPayload !== null) {
        const dur = getNativeMediaProp(mediaElement, 'duration', 0) || 0;
        const targetTime = Math.max(0, Math.min(dur || Infinity, Number(actionPayload)));
        setNativeMediaProp(mediaElement, 'currentTime', targetTime);
      }
      return { handled: true, result: true };
    },
    mediaSessionAction: 'seekto',
    eventsToEmit: () => [{ event: 'seeking' }, { event: 'seeked' }],
  },

  // ----------------------------------------------------
  // 3. Audio & Volume
  // ----------------------------------------------------
  volume: {
    executeAdapter: async (targetAdapter, actionPayload) => {
      const targetVol = Math.max(0, Math.min(1, Number(actionPayload)));
      if (targetVol > 0) {
        adapterPreviousVolumeMap.set(targetAdapter, targetVol);
      }
      if (typeof targetAdapter.setVolume === 'function') {
        await targetAdapter.setVolume(targetVol);
      } else if (typeof targetAdapter.volume === 'function') {
        await targetAdapter.volume(targetVol);
      } else {
        return { handled: false };
      }

      if (typeof targetAdapter.setMuted === 'function') {
        try {
          await targetAdapter.setMuted(false);
        } catch {}
      } else if (typeof targetAdapter.mute === 'function') {
        try {
          await targetAdapter.mute(false);
        } catch {}
      }

      return { handled: true, result: true, volume: targetVol };
    },
    polyfill: null,
    executeNative: async (mediaElement, actionPayload) => {
      if (actionPayload !== undefined && actionPayload !== null) {
        const targetVol = Math.max(0, Math.min(1, Number(actionPayload)));
        setNativeMediaProp(mediaElement, 'volume', targetVol);
        setNativeMediaProp(mediaElement, 'muted', false);
        try {
          mediaElement.dispatchEvent(new Event('volumechange'));
        } catch {}
        return { handled: true, result: true, volume: targetVol };
      }
      return { handled: false };
    },
    mediaSessionAction: null,
    eventsToEmit: res => [{ event: 'volumechange', payload: { volume: res?.volume ?? 1, muted: false } }],
  },

  mute: {
    executeAdapter: async (targetAdapter, actionPayload) => {
      const isMuted = Boolean(actionPayload);
      const prevVol = adapterPreviousVolumeMap.get(targetAdapter) || 1;
      if (isMuted) {
        let curVol = 1;
        if (typeof targetAdapter.getVolume === 'function') {
          try {
            curVol = Number(await targetAdapter.getVolume());
          } catch {}
        }
        if (curVol > 0) {
          adapterPreviousVolumeMap.set(targetAdapter, curVol);
        }
      }

      if (typeof targetAdapter.setMuted === 'function') {
        await targetAdapter.setMuted(isMuted);
        return { handled: true, result: true, muted: isMuted };
      }
      if (typeof targetAdapter.mute === 'function') {
        await targetAdapter.mute(isMuted);
        return { handled: true, result: true, muted: isMuted };
      }
      return { handled: false };
    },
    polyfill: async (targetAdapter, actionPayload) => {
      const isMuted = Boolean(actionPayload);
      const prevVol = adapterPreviousVolumeMap.get(targetAdapter) || 1;
      if (typeof targetAdapter.setVolume === 'function') {
        await targetAdapter.setVolume(isMuted ? 0 : prevVol);
        return { handled: true, result: true, muted: isMuted };
      }
      if (typeof targetAdapter.volume === 'function') {
        await targetAdapter.volume(isMuted ? 0 : prevVol);
        return { handled: true, result: true, muted: isMuted };
      }
      return { handled: false };
    },
    executeNative: async (mediaElement, actionPayload) => {
      const curMuted = getNativeMediaProp(mediaElement, 'muted', false);
      const nextMuted = typeof actionPayload === 'boolean' ? actionPayload : !curMuted;
      setNativeMediaProp(mediaElement, 'muted', nextMuted);
      try {
        mediaElement.dispatchEvent(new Event('volumechange'));
      } catch {}
      return { handled: true, result: true, muted: nextMuted };
    },
    mediaSessionAction: null,
    eventsToEmit: res => [{ event: 'volumechange', payload: { muted: res?.muted ?? false } }],
  },

  // ----------------------------------------------------
  // 4. Playback Rate / Speed
  // ----------------------------------------------------
  speed: {
    executeAdapter: async (targetAdapter, actionPayload) => {
      if (actionPayload === undefined || actionPayload === null) return { handled: false };
      const rate = Number(actionPayload) || 1;
      if (typeof targetAdapter.setPlaybackRate === 'function') {
        await targetAdapter.setPlaybackRate(rate);
        return { handled: true, result: true, rate };
      }
      if (typeof targetAdapter.playbackRate === 'function') {
        await targetAdapter.playbackRate(rate);
        return { handled: true, result: true, rate };
      }
      if (typeof targetAdapter.setSpeed === 'function') {
        await targetAdapter.setSpeed(rate);
        return { handled: true, result: true, rate };
      }
      if (typeof targetAdapter.speed === 'function') {
        await targetAdapter.speed(rate);
        return { handled: true, result: true, rate };
      }
      return { handled: false };
    },
    polyfill: null,
    executeNative: async (mediaElement, actionPayload) => {
      if (actionPayload !== undefined && actionPayload !== null) {
        const rate = Number(actionPayload) || 1;
        setNativeMediaProp(mediaElement, 'playbackRate', rate);
        try {
          mediaElement.dispatchEvent(new Event('ratechange'));
        } catch {}
        return { handled: true, result: true, rate };
      }
      return { handled: false };
    },
    mediaSessionAction: null,
    eventsToEmit: res => [{ event: 'ratechange', payload: { playbackRate: res?.rate ?? 1 } }],
  },

  // ----------------------------------------------------
  // 5. Picture-in-Picture (PiP)
  // ----------------------------------------------------
  enterpip: {
    executeAdapter: async targetAdapter => {
      if (typeof targetAdapter.requestPip === 'function') {
        const res = await targetAdapter.requestPip(true);
        return { handled: true, result: res ?? true };
      }
      if (typeof targetAdapter.pip === 'function') {
        const res = await targetAdapter.pip(true);
        return { handled: true, result: res ?? true };
      }
      return { handled: false };
    },
    polyfill: null,
    executeNative: async mediaElement => {
      if (typeof document !== 'undefined') {
        if (mediaElement.tagName !== 'VIDEO') {
          throw new Error('[sremote:action] Element must be <video> for picture-in-picture');
        }
        if (document.pictureInPictureElement !== mediaElement && mediaElement.requestPictureInPicture) {
          const res = await mediaElement.requestPictureInPicture();
          return { handled: true, result: res ?? true };
        }
      }
      return { handled: true, result: true };
    },
    mediaSessionAction: 'enterpictureinpicture',
    eventsToEmit: () => [{ event: 'enterpictureinpicture' }],
  },

  exitpip: {
    executeAdapter: async targetAdapter => {
      if (typeof targetAdapter.requestPip === 'function') {
        const res = await targetAdapter.requestPip(false);
        return { handled: true, result: res ?? true };
      }
      if (typeof targetAdapter.pip === 'function') {
        const res = await targetAdapter.pip(false);
        return { handled: true, result: res ?? true };
      }
      return { handled: false };
    },
    polyfill: null,
    executeNative: async () => {
      if (typeof document !== 'undefined' && document.pictureInPictureElement) {
        await document.exitPictureInPicture?.();
      }
      return { handled: true, result: true };
    },
    mediaSessionAction: null,
    eventsToEmit: () => [{ event: 'leavepictureinpicture' }],
  },

  // ----------------------------------------------------
  // 6. Source Loading
  // ----------------------------------------------------
  load: {
    executeAdapter: async (targetAdapter, actionPayload) => {
      if (typeof targetAdapter.load === 'function') {
        const res = await targetAdapter.load(actionPayload);
        return { handled: true, result: res ?? true };
      }
      return { handled: false };
    },
    polyfill: null,
    executeNative: async (mediaElement, actionPayload) => {
      if (typeof actionPayload === 'string' && actionPayload) {
        mediaElement.src = actionPayload;
        if (typeof mediaElement.load === 'function') mediaElement.load();
        return { handled: true, result: true };
      }
      return { handled: false };
    },
    mediaSessionAction: null,
    eventsToEmit: () => [{ event: 'loadstart' }],
  },

  // ----------------------------------------------------
  // 7. Video Quality
  // ----------------------------------------------------
  quality: {
    executeAdapter: async (targetAdapter, actionPayload) => {
      if (typeof targetAdapter.setQuality === 'function') {
        const res = await targetAdapter.setQuality(actionPayload);
        return { handled: true, result: res ?? true };
      }
      return { handled: false };
    },
    polyfill: null,
    executeNative: async () => {
      return { handled: false }; // Native media elements do not have standard setQuality API
    },
    mediaSessionAction: null,
    eventsToEmit: null,
  },

  getqualities: {
    executeAdapter: async targetAdapter => {
      if (typeof targetAdapter.getQualities === 'function') {
        const res = await targetAdapter.getQualities();
        return { handled: true, result: res || [] };
      }
      return { handled: false };
    },
    polyfill: null,
    executeNative: async () => {
      return { handled: true, result: [] };
    },
    mediaSessionAction: null,
    eventsToEmit: null,
  },

  // ----------------------------------------------------
  // 8. Subtitles / Captions
  // ----------------------------------------------------
  subtitle: {
    executeAdapter: async (targetAdapter, actionPayload) => {
      if (typeof targetAdapter.setSubtitle === 'function') {
        const res = await targetAdapter.setSubtitle(actionPayload);
        return { handled: true, result: res ?? true };
      }
      return { handled: false };
    },
    polyfill: null,
    executeNative: async (mediaElement, actionPayload) => {
      if (mediaElement.textTracks) {
        const targetLang = actionPayload === null || actionPayload === 'off' || actionPayload === false ? null : String(actionPayload).toLowerCase();
        for (let i = 0; i < mediaElement.textTracks.length; i++) {
          const t = mediaElement.textTracks[i];
          if (!targetLang) {
            t.mode = 'disabled';
          } else if (t.id === targetLang || t.language?.toLowerCase() === targetLang || t.label?.toLowerCase() === targetLang) {
            t.mode = 'showing';
          } else {
            t.mode = 'disabled';
          }
        }
        return { handled: true, result: true };
      }
      return { handled: false };
    },
    mediaSessionAction: null,
    eventsToEmit: null,
  },

  getsubtitles: {
    executeAdapter: async targetAdapter => {
      if (typeof targetAdapter.getSubtitles === 'function') {
        const res = await targetAdapter.getSubtitles();
        return { handled: true, result: res || [] };
      }
      return { handled: false };
    },
    polyfill: null,
    executeNative: async mediaElement => {
      if (mediaElement.textTracks) {
        const tracks = [];
        for (let i = 0; i < mediaElement.textTracks.length; i++) {
          const t = mediaElement.textTracks[i];
          tracks.push({ id: t.id || String(i), label: t.label || t.language || `Track ${i + 1}`, language: t.language });
        }
        return { handled: true, result: tracks };
      }
      return { handled: true, result: [] };
    },
    mediaSessionAction: null,
    eventsToEmit: null,
  },

  // ----------------------------------------------------
  // 9. Playlist & Playback State
  // ----------------------------------------------------
  shuffle: {
    executeAdapter: async (targetAdapter, actionPayload) => {
      if (typeof targetAdapter.setShuffle === 'function') {
        const res = await targetAdapter.setShuffle(actionPayload);
        return { handled: true, result: res ?? true };
      }
      if (typeof targetAdapter.shuffle === 'function') {
        const res = await targetAdapter.shuffle(actionPayload);
        return { handled: true, result: res ?? true };
      }
      return { handled: false };
    },
    polyfill: null,
    executeNative: async () => {
      return { handled: false };
    },
    mediaSessionAction: null,
    eventsToEmit: null,
  },

  repeat: {
    executeAdapter: async (targetAdapter, actionPayload) => {
      if (typeof targetAdapter.setRepeat === 'function') {
        const res = await targetAdapter.setRepeat(actionPayload);
        return { handled: true, result: res ?? true };
      }
      if (typeof targetAdapter.repeat === 'function') {
        const res = await targetAdapter.repeat(actionPayload);
        return { handled: true, result: res ?? true };
      }
      return { handled: false };
    },
    polyfill: null,
    executeNative: async (mediaElement, actionPayload) => {
      mediaElement.loop = actionPayload === true || actionPayload === 'one';
      return { handled: true, result: true };
    },
    mediaSessionAction: null,
    eventsToEmit: null,
  },

  next: {
    executeAdapter: async targetAdapter => {
      if (typeof targetAdapter.next === 'function') {
        const res = await targetAdapter.next();
        return { handled: true, result: res ?? true };
      }
      return { handled: false };
    },
    polyfill: null,
    executeNative: async () => {
      return { handled: false };
    },
    mediaSessionAction: 'nexttrack',
    eventsToEmit: null,
  },

  previous: {
    executeAdapter: async targetAdapter => {
      if (typeof targetAdapter.previous === 'function') {
        const res = await targetAdapter.previous();
        return { handled: true, result: res ?? true };
      }
      return { handled: false };
    },
    polyfill: null,
    executeNative: async () => {
      return { handled: false };
    },
    mediaSessionAction: 'previoustrack',
    eventsToEmit: null,
  },
};

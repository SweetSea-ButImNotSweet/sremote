/**
 * Universal Action Engine for SRemote.
 * Consolidates media control execution for HTMLMediaElement, DOM elements, and Custom Adapters.
 * Single Source of Truth for action dispatching.
 */

const adapterPreviousVolumeMap = new WeakMap();

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
        return el.contentDocument?.querySelector('video, audio') ?? null;
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

const mediaProto = typeof HTMLMediaElement !== 'undefined' ? HTMLMediaElement.prototype : {};
export const nativeMediaDescriptors = {
  play: typeof mediaProto.play === 'function' ? mediaProto.play : null,
  pause: typeof mediaProto.pause === 'function' ? mediaProto.pause : null,
  currentTime: typeof Object.getOwnPropertyDescriptor === 'function' ? Object.getOwnPropertyDescriptor(mediaProto, 'currentTime') : null,
  volume: typeof Object.getOwnPropertyDescriptor === 'function' ? Object.getOwnPropertyDescriptor(mediaProto, 'volume') : null,
  muted: typeof Object.getOwnPropertyDescriptor === 'function' ? Object.getOwnPropertyDescriptor(mediaProto, 'muted') : null,
  playbackRate: typeof Object.getOwnPropertyDescriptor === 'function' ? Object.getOwnPropertyDescriptor(mediaProto, 'playbackRate') : null,
  paused: typeof Object.getOwnPropertyDescriptor === 'function' ? Object.getOwnPropertyDescriptor(mediaProto, 'paused') : null,
  duration: typeof Object.getOwnPropertyDescriptor === 'function' ? Object.getOwnPropertyDescriptor(mediaProto, 'duration') : null,
};

/**
 * Safely plays a media element, recovering from ended state, unstarted videos,
 * or prototype overrides by third-party players (e.g. Bilibili Nano/Dash).
 * @param {HTMLMediaElement} el
 * @returns {Promise<void>}
 */
export async function safePlayMedia(el) {
  if (!el) return;
  try {
    const isEnded = Boolean(el.ended);
    const curTime = el.currentTime ?? 0;
    const dur = el.duration ?? 0;

    if (isEnded || (dur > 0 && Math.abs(dur - curTime) <= 0.1)) {
      try {
        if (nativeMediaDescriptors.currentTime?.set) {
          nativeMediaDescriptors.currentTime.set.call(el, 0);
        } else {
          el.currentTime = 0;
        }
      } catch {}
    }

    let res;
    // 1. Try instance play() first
    if (typeof el.play === 'function') {
      try {
        res = el.play();
      } catch {}
    }

    // 2. If instance play() returned nothing or failed, try native prototype play
    if (!res && nativeMediaDescriptors.play) {
      try {
        res = nativeMediaDescriptors.play.call(el);
      } catch {}
    }

    if (res && typeof res.then === 'function') {
      try {
        await res;
      } catch (playErr) {
        // If play was rejected (e.g. Autoplay without user interaction), attempt simulated click on player container
        try {
          const container = el.closest?.('.bpx-player-video-area, .bilibili-player-video, .player-container, video') || el;
          container.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        } catch {}
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
    if (nativeMediaDescriptors.pause) {
      nativeMediaDescriptors.pause.call(el);
    }
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[sremote:action] safePauseMedia error:', err);
    }
  }
}

/**
 * Executes a normalized action on a target (HTMLMediaElement or Custom Adapter).
 *
 * @param {HTMLMediaElement|Object} target
 * @param {string} action
 * @param {*} [value]
 * @param {Object} [options={}]
 * @param {boolean} [options.isPureGet=false]
 * @param {Object} [options.transactionTracker=null]
 * @param {string} [options.instanceId='unknown']
 * @returns {Promise<any>}
 */
export async function executeMediaAction(target, action, value = undefined, options = {}) {
  if (!target) return false;
  const { isPureGet = false, transactionTracker = null, instanceId = 'unknown', logger = null } = options;
  const norm = String(action || '').toLowerCase();

  const isAdapter = Boolean(
    target &&
      (typeof target.getState === 'function' ||
        typeof target.useAdapter === 'function' ||
        target[Symbol.for('__sremote_adapter__')] ||
        target.source === 'adapter' ||
        target.isAdapter === true ||
        target.capabilities?.hasAdapter ||
        (!target.tagName && typeof target.play === 'function' && typeof target.pause === 'function')),
  );

  if (!isPureGet && transactionTracker && typeof transactionTracker.startTransaction === 'function') {
    transactionTracker.startTransaction(norm, value, instanceId);
  }

  if (logger?.debug) {
    logger.debug(`[ActionEngine] Executing '${norm}' on ${isAdapter ? 'Adapter' : target.tagName || 'Object'}`, { value, instanceId });
  }

  // --- 1. Custom Adapter Execution ---
  if (isAdapter) {
    let emittedDuringAction = false;
    const autoEmit = (eventName, payload = {}) => {
      if (!isPureGet && typeof target.emit === 'function' && !emittedDuringAction) {
        try {
          target.emit(eventName, { programmatic: true, isProgrammatic: true, ...payload });
        } catch (err) {
          if (logger?.warn) logger.warn(`[sremote] Error auto-emitting '${eventName}':`, err);
        }
      }
    };

    switch (norm) {
      case 'play':
        if (!isPureGet && typeof target.play === 'function') {
          await target.play();
          autoEmit('play');
        }
        return true;

      case 'pause':
        if (!isPureGet && typeof target.pause === 'function') {
          await target.pause();
          autoEmit('pause');
        }
        return true;

      case 'toggle':
        if (!isPureGet) {
          if (typeof target.toggle === 'function') {
            await target.toggle();
            const isPaused = typeof target.paused === 'function' ? target.paused() : typeof target.paused === 'boolean' ? target.paused : null;
            if (isPaused !== null) autoEmit(isPaused ? 'pause' : 'play');
            else autoEmit('toggle');
          } else if (typeof target.play === 'function' && typeof target.pause === 'function') {
            const isPaused = typeof target.paused === 'function' ? target.paused() : typeof target.paused === 'boolean' ? target.paused : true;
            if (isPaused) {
              await target.play();
              autoEmit('play');
            } else {
              await target.pause();
              autoEmit('pause');
            }
          }
        }
        return true;

      case 'stop':
        if (!isPureGet) {
          if (typeof target.stop === 'function') {
            await target.stop();
          } else {
            if (typeof target.pause === 'function') await target.pause();
            if (typeof target.seekTo === 'function') {
              await target.seekTo(0);
            } else if (typeof target.setCurrentTime === 'function') {
              await target.setCurrentTime(0);
            }
          }
          autoEmit('pause');
          autoEmit('stop');
        }
        return true;

      case 'seek':
        if (!isPureGet) {
          if (typeof target.seek === 'function') {
            await target.seek(Number(value));
          } else if (typeof target.seekTo === 'function' || typeof target.setCurrentTime === 'function') {
            let cur = 0;
            if (typeof target.getCurrentTime === 'function') {
              cur = Number((await target.getCurrentTime()) || 0);
            }
            const targetTime = Math.max(0, cur + Number(value));
            if (typeof target.seekTo === 'function') {
              await target.seekTo(targetTime);
            } else {
              await target.setCurrentTime(targetTime);
            }
          }
          autoEmit('seeking');
          autoEmit('seeked');
        }
        return true;

      case 'currenttime':
      case 'seekto':
        if (!isPureGet) {
          const targetTime = Number(value);
          if (typeof target.seekTo === 'function') {
            await target.seekTo(targetTime);
          } else if (typeof target.setCurrentTime === 'function') {
            await target.setCurrentTime(targetTime);
          } else if (typeof target.seek === 'function') {
            let cur = 0;
            if (typeof target.getCurrentTime === 'function') {
              cur = Number((await target.getCurrentTime()) || 0);
            }
            await target.seek(targetTime - cur);
          }
          autoEmit('seeking');
          autoEmit('seeked');
        }
        return true;

      case 'volume':
        if (!isPureGet) {
          const targetVol = Math.max(0, Math.min(1, Number(value)));
          if (targetVol > 0) {
            adapterPreviousVolumeMap.set(target, targetVol);
          }
          if (typeof target.setVolume === 'function') {
            await target.setVolume(targetVol);
          } else if (typeof target.volume === 'function') {
            await target.volume(targetVol);
          } else if (target.mediaElement) {
            target.mediaElement.volume = targetVol;
            target.mediaElement.muted = false;
          }

          if (typeof target.setMuted === 'function') {
            try {
              await target.setMuted(false);
            } catch {}
          } else if (typeof target.mute === 'function') {
            try {
              await target.mute(false);
            } catch {}
          }

          autoEmit('volumechange', { volume: targetVol, muted: false });
        }
        return true;

      case 'muted':
      case 'mute':
        if (!isPureGet) {
          const isMuted = Boolean(value);
          const prevVol = adapterPreviousVolumeMap.get(target) || 1;
          if (isMuted) {
            let curVol = 1;
            if (typeof target.getVolume === 'function') {
              try {
                curVol = Number(await target.getVolume());
              } catch {}
            } else if (target.mediaElement) {
              curVol = target.mediaElement.volume;
            }
            if (curVol > 0) adapterPreviousVolumeMap.set(target, curVol);

            if (typeof target.setMuted === 'function') {
              await target.setMuted(true);
            } else if (typeof target.mute === 'function') {
              await target.mute(true);
            } else if (typeof target.setVolume === 'function') {
              await target.setVolume(0);
            } else if (typeof target.volume === 'function') {
              await target.volume(0);
            } else if (target.mediaElement) {
              target.mediaElement.muted = true;
            }
          } else {
            if (typeof target.setMuted === 'function') {
              await target.setMuted(false);
            } else if (typeof target.mute === 'function') {
              await target.mute(false);
            }

            if (typeof target.setVolume === 'function') {
              await target.setVolume(prevVol);
            } else if (typeof target.volume === 'function') {
              await target.volume(prevVol);
            } else if (target.mediaElement) {
              target.mediaElement.muted = false;
              target.mediaElement.volume = prevVol;
            }
          }
          autoEmit('volumechange', { muted: isMuted });
        }
        return true;

      case 'speed':
      case 'rate':
      case 'playbackrate':
        if (!isPureGet) {
          const rate = Number(value) || 1;
          if (typeof target.setPlaybackRate === 'function') {
            await target.setPlaybackRate(rate);
          } else if (typeof target.setSpeed === 'function') {
            await target.setSpeed(rate);
          } else if (typeof target.speed === 'function') {
            await target.speed(rate);
          } else if (target.mediaElement) {
            target.mediaElement.playbackRate = rate;
          }
          autoEmit('ratechange', { playbackRate: rate });
        }
        return true;

      case 'pip':
      case 'enterpip':
        if (!isPureGet) {
          if (typeof target.requestPip === 'function') {
            await target.requestPip(true);
          } else if (typeof target.pip === 'function') {
            await target.pip(true);
          } else if (target.mediaElement && typeof document !== 'undefined') {
            if (target.mediaElement.requestPictureInPicture) {
              await target.mediaElement.requestPictureInPicture();
            }
          }
        }
        return true;

      case 'exitpip':
        if (!isPureGet) {
          if (typeof target.requestPip === 'function') {
            await target.requestPip(false);
          } else if (typeof target.pip === 'function') {
            await target.pip(false);
          } else if (typeof document !== 'undefined' && document.pictureInPictureElement) {
            await document.exitPictureInPicture?.();
          }
        }
        return true;

      case 'load':
        if (!isPureGet && typeof target.load === 'function') {
          return target.load(value);
        }
        return false;

      case 'quality':
        if (!isPureGet && typeof target.setQuality === 'function') {
          return target.setQuality(value);
        }
        return false;

      case 'getqualities':
        if (typeof target.getQualities === 'function') {
          return target.getQualities();
        }
        return [];

      case 'subtitle':
        if (!isPureGet && typeof target.setSubtitle === 'function') {
          return target.setSubtitle(value);
        }
        return false;

      case 'getsubtitles':
        if (typeof target.getSubtitles === 'function') {
          return target.getSubtitles();
        }
        return [];

      case 'shuffle':
        if (!isPureGet && typeof target.setShuffle === 'function') {
          return target.setShuffle(value);
        }
        return false;

      case 'repeat':
        if (!isPureGet) {
          if (typeof target.setRepeat === 'function') {
            return target.setRepeat(value);
          }
          if (target.mediaElement) {
            target.mediaElement.loop = value === true || value === 'one';
          }
        }
        return true;

      case 'next':
        if (!isPureGet && typeof target.next === 'function') {
          return target.next();
        }
        return false;

      case 'previous':
        if (!isPureGet && typeof target.previous === 'function') {
          return target.previous();
        }
        return false;

      default:
        return false;
    }
  }

  // --- 2. HTMLMediaElement Execution ---
  const el = target;
  switch (norm) {
    case 'play':
      if (!isPureGet) await safePlayMedia(el);
      return true;

    case 'pause':
      if (!isPureGet) safePauseMedia(el);
      return true;

    case 'toggle':
      if (!isPureGet) {
        const isPaused = el.paused !== undefined ? el.paused : (nativeMediaDescriptors.paused?.get?.call(el) ?? true);
        if (isPaused) await safePlayMedia(el);
        else safePauseMedia(el);
      }
      return true;

    case 'stop':
      if (!isPureGet) {
        safePauseMedia(el);
        try {
          if (nativeMediaDescriptors.currentTime?.set) {
            nativeMediaDescriptors.currentTime.set.call(el, 0);
          } else {
            el.currentTime = 0;
          }
        } catch {
          el.currentTime = 0;
        }
      }
      return true;

    case 'seek':
      if (!isPureGet && value !== undefined && value !== null) {
        const dur = el.duration || (nativeMediaDescriptors.duration?.get?.call(el) ?? 0) || 0;
        const curTime = el.currentTime ?? nativeMediaDescriptors.currentTime?.get?.call(el) ?? 0;
        const targetTime = Math.max(0, Math.min(dur || Infinity, curTime + Number(value)));
        try {
          if (nativeMediaDescriptors.currentTime?.set) {
            nativeMediaDescriptors.currentTime.set.call(el, targetTime);
          } else {
            el.currentTime = targetTime;
          }
        } catch {
          el.currentTime = targetTime;
        }
        try {
          el.dispatchEvent(new Event('seeking'));
          el.dispatchEvent(new Event('seeked'));
        } catch {}
      }
      return true;

    case 'currenttime':
    case 'seekto':
      if (!isPureGet && value !== undefined && value !== null) {
        const dur = el.duration || (nativeMediaDescriptors.duration?.get?.call(el) ?? 0) || 0;
        const targetTime = Math.max(0, Math.min(dur || Infinity, Number(value)));
        try {
          if (nativeMediaDescriptors.currentTime?.set) {
            nativeMediaDescriptors.currentTime.set.call(el, targetTime);
          } else {
            el.currentTime = targetTime;
          }
        } catch {
          el.currentTime = targetTime;
        }
        try {
          el.dispatchEvent(new Event('seeking'));
          el.dispatchEvent(new Event('seeked'));
        } catch {}
      }
      return true;

    case 'volume':
      if (!isPureGet && value !== undefined && value !== null) {
        const targetVol = Math.max(0, Math.min(1, Number(value)));
        try {
          if (nativeMediaDescriptors.volume?.set) {
            nativeMediaDescriptors.volume.set.call(el, targetVol);
          } else {
            el.volume = targetVol;
          }
          if (nativeMediaDescriptors.muted?.set) {
            nativeMediaDescriptors.muted.set.call(el, false);
          } else {
            el.muted = false;
          }
        } catch {
          el.volume = targetVol;
          el.muted = false;
        }
        try {
          el.dispatchEvent(new Event('volumechange'));
        } catch {}
      }
      return true;

    case 'muted':
    case 'mute':
      if (!isPureGet) {
        const curMuted = el.muted ?? nativeMediaDescriptors.muted?.get?.call(el) ?? false;
        const nextMuted = typeof value === 'boolean' ? value : !curMuted;
        try {
          if (nativeMediaDescriptors.muted?.set) {
            nativeMediaDescriptors.muted.set.call(el, nextMuted);
          } else {
            el.muted = nextMuted;
          }
        } catch {
          el.muted = nextMuted;
        }
        try {
          el.dispatchEvent(new Event('volumechange'));
        } catch {}
      }
      return true;

    case 'speed':
    case 'rate':
    case 'playbackrate':
      if (!isPureGet && value !== undefined && value !== null) {
        const rate = Number(value) || 1;
        try {
          if (nativeMediaDescriptors.playbackRate?.set) {
            nativeMediaDescriptors.playbackRate.set.call(el, rate);
          } else {
            el.playbackRate = rate;
          }
        } catch {
          el.playbackRate = rate;
        }
        try {
          el.dispatchEvent(new Event('ratechange'));
        } catch {}
      }
      return true;

    case 'pip':
    case 'enterpip':
      if (!isPureGet && typeof document !== 'undefined') {
        if (el.tagName !== 'VIDEO') {
          throw new Error('[sremote:action] Element must be <video> for picture-in-picture');
        }
        if (document.pictureInPictureElement !== el && el.requestPictureInPicture) {
          return el.requestPictureInPicture();
        }
      }
      return true;

    case 'exitpip':
      if (!isPureGet && typeof document !== 'undefined') {
        if (document.pictureInPictureElement) {
          return document.exitPictureInPicture?.();
        }
      }
      return true;

    case 'load':
      if (!isPureGet && typeof value === 'string' && value) {
        el.src = value;
        if (typeof el.load === 'function') el.load();
      }
      return true;

    case 'repeat':
      if (!isPureGet) {
        el.loop = value === true || value === 'one';
      }
      return true;

    case 'subtitle':
      if (!isPureGet && el.textTracks) {
        const targetLang = value === null || value === 'off' || value === false ? null : String(value).toLowerCase();
        for (let i = 0; i < el.textTracks.length; i++) {
          const t = el.textTracks[i];
          if (!targetLang) {
            t.mode = 'disabled';
          } else if (t.id === targetLang || t.language?.toLowerCase() === targetLang || t.label?.toLowerCase() === targetLang) {
            t.mode = 'showing';
          } else {
            t.mode = 'disabled';
          }
        }
      }
      return true;

    case 'getsubtitles':
      if (el.textTracks) {
        const tracks = [];
        for (let i = 0; i < el.textTracks.length; i++) {
          const t = el.textTracks[i];
          tracks.push({ id: t.id || String(i), label: t.label || t.language || `Track ${i + 1}`, language: t.language });
        }
        return tracks;
      }
      return [];

    default:
      return false;
  }
}

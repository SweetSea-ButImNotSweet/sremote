import { logger, console_warn } from '../config.js';

const adapterPreviousVolumeMap = new WeakMap();

/**
 * Executes a normalized command on a Custom Adapter (used in both Parent and Iframe context).
 *
 * @param {Object} adapter - Custom Adapter object
 * @param {string} action - Action command name (e.g. 'play', 'pause', 'seek', 'volume')
 * @param {*} [value] - Action parameter value
 * @param {boolean} [isPureGet=false] - Whether this is an inspection/getter call
 * @returns {Promise<boolean>} True if handled, false otherwise
 */
export async function executeAdapterAction(adapter, action, value = undefined, isPureGet = false) {
  if (!adapter || typeof adapter !== 'object') return false;
  const norm = String(action || '').toLowerCase();

  if (!isPureGet) {
    logger.scope('action').log(`Adapter executing -> ${action}`, { action, value });
  }

  let emittedDuringAction = false;
  const autoEmit = (eventName, payload = {}) => {
    if (!isPureGet && typeof adapter.emit === 'function' && !emittedDuringAction) {
      try {
        adapter.emit(eventName, { programmatic: true, isProgrammatic: true, ...payload });
      } catch (err) {
        console_warn(`[sremote] Error in auto-emit for '${eventName}':`, err);
      }
    }
  };

  try {
    switch (norm) {
      case 'play':
        if (!isPureGet && typeof adapter.play === 'function') {
          await adapter.play();
          autoEmit('play');
        }
        return true;

      case 'pause':
        if (!isPureGet && typeof adapter.pause === 'function') {
          await adapter.pause();
          autoEmit('pause');
        }
        return true;

      case 'toggle':
        if (!isPureGet) {
          if (typeof adapter.toggle === 'function') {
            await adapter.toggle();
            const isPaused = typeof adapter.paused === 'function' ? adapter.paused() : typeof adapter.paused === 'boolean' ? adapter.paused : null;
            if (isPaused !== null) autoEmit(isPaused ? 'pause' : 'play');
            else autoEmit('toggle');
          } else if (typeof adapter.play === 'function' && typeof adapter.pause === 'function') {
            const isPaused = typeof adapter.paused === 'function' ? adapter.paused() : typeof adapter.paused === 'boolean' ? adapter.paused : true;
            if (isPaused) {
              await adapter.play();
              autoEmit('play');
            } else {
              await adapter.pause();
              autoEmit('pause');
            }
          }
        }
        return true;

      case 'stop':
        if (!isPureGet) {
          if (typeof adapter.stop === 'function') {
            await adapter.stop();
          } else {
            if (typeof adapter.pause === 'function') await adapter.pause();
            if (typeof adapter.seekTo === 'function') await adapter.seekTo(0);
          }
          autoEmit('pause');
          autoEmit('stop');
        }
        return true;

      case 'seek':
        if (!isPureGet) {
          if (typeof adapter.seek === 'function') {
            await adapter.seek(Number(value));
          } else if (typeof adapter.seekTo === 'function' && typeof adapter.getCurrentTime === 'function') {
            const cur = Number((await adapter.getCurrentTime()) || 0);
            await adapter.seekTo(Math.max(0, cur + Number(value)));
          }
          autoEmit('seeking');
          autoEmit('seeked');
        }
        return true;

      case 'currenttime':
      case 'seekto':
        if (!isPureGet && typeof adapter.seekTo === 'function') {
          await adapter.seekTo(Number(value));
          autoEmit('seeking');
          autoEmit('seeked');
        }
        return true;

      case 'volume':
        if (!isPureGet) {
          const targetVol = Math.max(0, Math.min(1, Number(value)));
          if (targetVol > 0) {
            adapterPreviousVolumeMap.set(adapter, targetVol);
          }

          if (typeof adapter.setVolume === 'function') {
            await adapter.setVolume(targetVol);
            if (typeof adapter.setMuted === 'function') {
              try {
                await adapter.setMuted(false);
              } catch {}
            }
          } else if (adapter.mediaElement && (adapter.mediaElement.tagName === 'AUDIO' || adapter.mediaElement.tagName === 'VIDEO')) {
            adapter.mediaElement.volume = targetVol;
            adapter.mediaElement.muted = false;
          }
          autoEmit('volumechange', { volume: targetVol, muted: false });
        }
        return true;

      case 'muted':
      case 'mute':
        if (!isPureGet) {
          const isMuted = Boolean(value);
          const prevVol = adapterPreviousVolumeMap.get(adapter) || 1;

          if (isMuted) {
            let curVol = 1;
            if (typeof adapter.getVolume === 'function') {
              try {
                curVol = Number(await adapter.getVolume());
              } catch {}
            } else if (adapter.mediaElement) {
              curVol = adapter.mediaElement.volume;
            }
            if (curVol > 0) {
              adapterPreviousVolumeMap.set(adapter, curVol);
            }
          }

          if (typeof adapter.setMuted === 'function') {
            await adapter.setMuted(isMuted);
            if (!isMuted && typeof adapter.setVolume === 'function') {
              try {
                const cur = typeof adapter.getVolume === 'function' ? await adapter.getVolume() : null;
                if (cur === 0) {
                  await adapter.setVolume(prevVol);
                }
              } catch {}
            }
          } else if (typeof adapter.setVolume === 'function') {
            await adapter.setVolume(isMuted ? 0 : prevVol);
          } else if (adapter.mediaElement && (adapter.mediaElement.tagName === 'AUDIO' || adapter.mediaElement.tagName === 'VIDEO')) {
            adapter.mediaElement.muted = isMuted;
            if (!isMuted && adapter.mediaElement.volume === 0) {
              adapter.mediaElement.volume = prevVol;
            }
          }
          autoEmit('volumechange', { muted: isMuted });
        }
        return true;

      case 'speed':
        if (!isPureGet && typeof adapter.setPlaybackRate === 'function') {
          const newRate = Number(value) || 1;
          await adapter.setPlaybackRate(newRate);
          autoEmit('ratechange', { playbackRate: newRate });
        }
        return true;

      case 'quality':
        if (!isPureGet && typeof adapter.setQuality === 'function') {
          await adapter.setQuality(value);
        }
        return true;

      case 'subtitle':
        if (!isPureGet && typeof adapter.setSubtitle === 'function') {
          await adapter.setSubtitle(value);
        }
        return true;

      case 'shuffle':
        if (!isPureGet && typeof adapter.setShuffle === 'function') {
          await adapter.setShuffle(value);
        }
        return true;

      case 'repeat':
        if (!isPureGet && typeof adapter.setRepeat === 'function') {
          await adapter.setRepeat(value);
        }
        return true;

      case 'next':
        if (!isPureGet && typeof adapter.next === 'function') {
          await adapter.next();
        }
        return true;

      case 'previous':
        if (!isPureGet && typeof adapter.previous === 'function') {
          await adapter.previous();
        }
        return true;

      case 'pip':
      case 'enterpip':
      case 'exitpip':
        if (!isPureGet) {
          if (typeof adapter.pip === 'function') {
            await adapter.pip(value);
          } else if (typeof adapter.requestPip === 'function') {
            await adapter.requestPip(value);
          }
        }
        return true;

      case 'load':
        if (!isPureGet) {
          if (typeof adapter.load === 'function') {
            await adapter.load(value);
          } else {
            console_warn('[SRemote] load() is not implemented on this custom adapter.');
          }
        }
        return true;

      default:
        return false;
    }
  } catch (err) {
    console_warn(`[sremote] Error executing adapter action '${action}':`, err);
    return true; // Still handled by adapter domain
  }
}

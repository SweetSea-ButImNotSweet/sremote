import { console_warn } from '../config.js';

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

  try {
    switch (norm) {
      case 'play':
        if (!isPureGet && typeof adapter.play === 'function') await adapter.play();
        return true;

      case 'pause':
        if (!isPureGet && typeof adapter.pause === 'function') await adapter.pause();
        return true;

      case 'toggle':
        if (!isPureGet) {
          if (typeof adapter.toggle === 'function') {
            await adapter.toggle();
          } else if (typeof adapter.play === 'function' && typeof adapter.pause === 'function') {
            const isPaused = typeof adapter.paused === 'function' ? adapter.paused() : typeof adapter.paused === 'boolean' ? adapter.paused : true;
            if (isPaused) await adapter.play();
            else await adapter.pause();
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
        }
        return true;

      case 'currenttime':
      case 'seekto':
        if (!isPureGet && typeof adapter.seekTo === 'function') {
          await adapter.seekTo(Number(value));
        }
        return true;

      case 'volume':
        if (!isPureGet && typeof adapter.setVolume === 'function') {
          await adapter.setVolume(Number(value));
        }
        return true;

      case 'muted':
      case 'mute':
        if (!isPureGet && typeof adapter.setMuted === 'function') {
          await adapter.setMuted(Boolean(value));
        }
        return true;

      case 'speed':
      case 'rate':
      case 'playbackrate':
        if (!isPureGet && typeof adapter.setPlaybackRate === 'function') {
          await adapter.setPlaybackRate(Number(value) || 1);
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

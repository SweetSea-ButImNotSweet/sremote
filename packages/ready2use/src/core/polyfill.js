/**
 * Adapter polyfills & normalization helpers for Ready2Use player adapters.
 * Platform providers can import and apply these selectively.
 */

/**
 * Ensures adapter has a toggle() method. If missing, polyfills it using play() and pause().
 * @param {Object} adapter - SRemote adapter object to polyfill
 * @returns {Object} The polyfilled adapter
 */
export function toggle(adapter) {
  if (!adapter) return adapter;
  if (typeof adapter.toggle === 'function') return adapter;

  if (typeof adapter.play === 'function' && typeof adapter.pause === 'function') {
    adapter.toggle = function () {
      const isPaused = typeof adapter.paused === 'function' ? adapter.paused() : typeof adapter.paused === 'boolean' ? adapter.paused : true;

      if (isPaused) {
        return adapter.play();
      } else {
        return adapter.pause();
      }
    };
  }

  return adapter;
}

/**
 * Ensures adapter has a seek(seconds) method. If missing but seekTo exists, aliases it.
 * @param {Object} adapter - SRemote adapter object to polyfill
 * @returns {Object} The polyfilled adapter
 */
export function seek(adapter) {
  if (!adapter) return adapter;
  if (typeof adapter.seek === 'function') return adapter;

  if (typeof adapter.seekTo === 'function') {
    adapter.seek = function (seconds) {
      return adapter.seekTo(seconds);
    };
  } else if (typeof adapter.setCurrentTime === 'function') {
    adapter.seek = function (seconds) {
      return adapter.setCurrentTime(seconds);
    };
  }

  return adapter;
}

/**
 * Ensures adapter has a seekTo(seconds) method. If missing but seek exists, aliases it.
 * @param {Object} adapter - SRemote adapter object to polyfill
 * @returns {Object} The polyfilled adapter
 */
export function seekTo(adapter) {
  if (!adapter) return adapter;
  if (typeof adapter.seekTo === 'function') return adapter;

  if (typeof adapter.seek === 'function') {
    adapter.seekTo = function (seconds) {
      return adapter.seek(seconds);
    };
  } else if (typeof adapter.setCurrentTime === 'function') {
    adapter.seekTo = function (seconds) {
      return adapter.setCurrentTime(seconds);
    };
  }

  return adapter;
}

/**
 * Manages volume & mute state, handles auto-unmute on volume increase,
 * remembers previous non-zero volume, and provides fallback mute implementation.
 */
export class Volume {
  /**
   * @param {number} [initialVolume=1]
   */
  constructor(initialVolume = 1) {
    this.previousVolume = Number(initialVolume) > 0 ? Number(initialVolume) : 1;
  }

  /**
   * Records a non-zero volume level.
   * @param {number} vol
   */
  record(vol) {
    const v = Number(vol);
    if (!Number.isNaN(v) && v > 0) {
      this.previousVolume = v;
    }
  }

  /**
   * Applies smart volume and mute behaviors onto the given adapter.
   * - Saves previous volume when volume > 0
   * - Automatically unmutes if setVolume is called with a value > 0
   * - Restores previousVolume if setMuted(false) is called while volume is 0
   * - Polyfills setMuted via setVolume(0) / setVolume(previousVolume) if setMuted is missing
   *
   * @param {Object} adapter
   * @returns {Object} The enhanced adapter
   */
  apply(adapter) {
    if (!adapter) return adapter;

    const self = this;
    const origSetVolume = adapter.setVolume;
    const origSetMuted = adapter.setMuted;

    if (typeof origSetVolume === 'function') {
      adapter.setVolume = async function (vol) {
        const v = Number(vol);
        self.record(v);
        const res = await origSetVolume.call(this, vol);
        if (typeof adapter.setMuted === 'function') {
          try {
            await adapter.setMuted(false);
          } catch {}
        }
        return res;
      };
    }

    if (typeof origSetMuted === 'function') {
      adapter.setMuted = async function (muted) {
        const isMute = Boolean(muted);
        if (isMute) {
          if (typeof adapter.getVolume === 'function') {
            try {
              const cur = Number(await adapter.getVolume());
              self.record(cur);
            } catch {}
          }
        }
        const res = await origSetMuted.call(this, isMute);
        if (!isMute && typeof adapter.getVolume === 'function') {
          try {
            const cur = Number(await adapter.getVolume());
            if (cur === 0 && typeof adapter.setVolume === 'function') {
              await adapter.setVolume(self.previousVolume || 1);
            }
          } catch {}
        }
        return res;
      };
    } else if (typeof origSetVolume === 'function') {
      // Fallback setMuted using setVolume if native player has no setMuted
      adapter.setMuted = async function (muted) {
        const isMute = Boolean(muted);
        if (isMute) {
          if (typeof adapter.getVolume === 'function') {
            try {
              const cur = Number(await adapter.getVolume());
              self.record(cur);
            } catch {}
          }
          return adapter.setVolume(0);
        }
        return adapter.setVolume(self.previousVolume || 1);
      };
    }

    return adapter;
  }
}

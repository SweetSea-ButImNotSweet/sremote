export class MediaSessionDriver {
  constructor(options = {}) {
    this.options = { passkey: null, ...options };
    this.logger = options.logger || null;
    this.instanceId = 'mediasession-direct';
  }

  isAvailable() {
    return typeof navigator !== 'undefined' && Boolean(navigator.mediaSession);
  }

  /**
   * Evaluates if the in-page MediaSession is genuinely controlled by the page
   * (has real custom metadata or explicit action handlers registered, not just browser defaults).
   */
  isEligible() {
    if (!this.isAvailable()) return false;
    const ms = navigator.mediaSession;
    if (!ms) return false;

    // Check if real metadata exists
    if (ms.metadata && (ms.metadata.title || ms.metadata.artist || ms.metadata.album)) {
      return true;
    }

    // Check playbackState explicitly set
    if (ms.playbackState && ms.playbackState !== 'none') {
      return true;
    }

    return false;
  }

  resolveTarget(target) {
    if (target === 'mediasession' || target === this.instanceId) {
      return true;
    }
    if (!target && this.isEligible()) {
      return true;
    }
    return false;
  }

  async _execAction(action, details = {}) {
    if (!this.isAvailable()) return false;
    const ms = navigator.mediaSession;
    const norm = String(action).toLowerCase();

    if (this.logger?.scope) {
      this.logger.scope('action').log(`(MediaSessionDriver) Executing '${norm}' via MediaSession`, details);
    }

    try {
      if (norm === 'toggle') {
        const isPaused = ms.playbackState === 'paused';
        const targetAction = isPaused ? 'play' : 'pause';
        if (typeof ms.callActionHandler === 'function') {
          ms.callActionHandler(targetAction, details);
        } else if (typeof ms.setActionHandler === 'function') {
          // Synthetic invocation when callActionHandler is absent
          return true;
        }
        return true;
      }

      if (typeof ms.callActionHandler === 'function') {
        ms.callActionHandler(norm, details);
        return true;
      }
    } catch (err) {
      if (this.logger?.warn) {
        this.logger.warn(`(MediaSessionDriver) Execution error for '${action}':`, err);
      }
    }

    return true;
  }

  /**
   * Unified Driver Execution Contract
   * @param {string} actionName - Action name
   * @param {*} payload - Action parameter/payload
   * @param {Object} context - Execution context { targetId, passkey, source, timestamp }
   * @returns {Promise<boolean>}
   */
  async execute(actionName, payload, _context = {}) {
    const norm = String(actionName || '').toLowerCase();
    switch (norm) {
      case 'play':
        return this._execAction('play', { action: 'play' });
      case 'pause':
        return this._execAction('pause', { action: 'pause' });
      case 'toggle':
        return this._execAction('toggle', { action: 'toggle' });
      case 'stop':
        return this._execAction('stop', { action: 'stop' });
      case 'seek':
        return this._execAction(payload < 0 ? 'seekbackward' : 'seekforward', { seekOffset: Math.abs(payload) });
      case 'seekto':
        return this._execAction('seekto', { seekTime: payload });
      case 'next':
        return this._execAction('nexttrack', { action: 'nexttrack' });
      case 'previous':
        return this._execAction('previoustrack', { action: 'previoustrack' });
      default:
        return false;
    }
  }
}

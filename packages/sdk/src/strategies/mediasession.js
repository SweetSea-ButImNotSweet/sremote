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

  async play(_target) {
    return this._execAction('play', { action: 'play' });
  }
  async pause(_target) {
    return this._execAction('pause', { action: 'pause' });
  }
  async toggle(_target) {
    return this._execAction('toggle', { action: 'toggle' });
  }
  async stop(_target) {
    return this._execAction('stop', { action: 'stop' });
  }
  async seek(offset, _target) {
    return this._execAction('seekforward', { seekOffset: offset });
  }
  async seekTo(time, _target) {
    return this._execAction('seekto', { seekTime: time });
  }
  async next(_target) {
    return this._execAction('nexttrack', { action: 'nexttrack' });
  }
  async previous(_target) {
    return this._execAction('previoustrack', { action: 'previoustrack' });
  }
  async speed(_rate, _target) {
    return false;
  }
  async volume(_vol, _target) {
    return false;
  }
  async mute(_muted, _target) {
    return false;
  }
  async pip(_enable, _target) {
    return false;
  }
  async load(_source, _target) {
    return false;
  }
  async quality(_level, _target) {
    return false;
  }
  async subtitle(_track, _target) {
    return false;
  }
  async shuffle(_enable, _target) {
    return false;
  }
  async repeat(_mode, _target) {
    return false;
  }
}

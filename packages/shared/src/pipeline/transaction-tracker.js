/**
 * Transaction-based Event Pipeline & Tracker for SRemote.
 * Tracks programmatic commands (volume, seek, play, pause) to accurately assign
 * `isProgrammatic = true` and suppress feedback loops (echo cancellation).
 */

export class ActionTransactionTracker {
  constructor(options = {}) {
    this.defaultTtlMs = typeof options.defaultTtlMs === 'number' ? options.defaultTtlMs : 350;
    // Map: action -> [{ token, targetValue, instanceId, expiresAt, consumed }]
    this._transactions = new Map();
    // Cache: instanceId -> { volume, muted, paused, ... } to detect exact value echoes
    this._lastState = new Map();
  }

  /**
   * Starts a programmatic transaction.
   * @param {string} action - Action name (e.g. 'volume', 'seek', 'play', 'pause')
   * @param {*} targetValue - Value applied
   * @param {string} [instanceId='unknown']
   * @param {number} [ttlMs]
   * @returns {string} Transaction token
   */
  startTransaction(action, targetValue = undefined, instanceId = 'unknown', ttlMs = this.defaultTtlMs) {
    const act = String(action || '').toLowerCase();
    const token = `${act}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const expiresAt = Date.now() + ttlMs;

    if (!this._transactions.has(act)) {
      this._transactions.set(act, []);
    }

    const list = this._transactions.get(act);
    // Cleanup expired transactions
    const now = Date.now();
    const valid = list.filter(t => t.expiresAt > now && !t.consumed);

    valid.push({ token, targetValue, instanceId, expiresAt, consumed: false });

    this._transactions.set(act, valid);

    // Update expected state cache
    if (!this._lastState.has(instanceId)) {
      this._lastState.set(instanceId, {});
    }
    const stateObj = this._lastState.get(instanceId);
    if (act === 'volume') {
      stateObj.volume = typeof targetValue === 'number' ? targetValue : undefined;
    } else if (act === 'muted' || act === 'mute') {
      stateObj.muted = Boolean(targetValue);
    } else if (act === 'play') {
      stateObj.paused = false;
    } else if (act === 'pause') {
      stateObj.paused = true;
    }

    return token;
  }

  /**
   * Matches an incoming native event against active programmatic transactions.
   * @param {string} eventName - Incoming event name (e.g. 'volumechange', 'play', 'pause', 'seeked')
   * @param {Object} [payload={}] - Incoming event payload
   * @returns {{ isProgrammatic: boolean, token: string|null, shouldSuppressEcho: boolean }}
   */
  matchAndConsume(eventName, payload = {}) {
    const ev = String(eventName || '').toLowerCase();
    const instanceId = payload.instanceId || 'unknown';
    const now = Date.now();

    // Mapping of event to originating actions
    let targetActions = [];
    if (ev === 'volumechange') {
      targetActions = ['volume', 'muted', 'mute'];
    } else if (ev === 'play' || ev === 'playing') {
      targetActions = ['play', 'toggle'];
    } else if (ev === 'pause') {
      targetActions = ['pause', 'stop', 'toggle'];
    } else if (ev === 'seeked' || ev === 'seeking') {
      targetActions = ['seek', 'seekto', 'currenttime'];
    } else if (ev === 'ratechange') {
      targetActions = ['speed', 'rate', 'playbackrate'];
    } else {
      targetActions = [ev];
    }

    for (const act of targetActions) {
      const list = this._transactions.get(act);
      if (!list || list.length === 0) continue;

      for (const item of list) {
        if (item.expiresAt > now && !item.consumed) {
          // If instanceId matches or target is generic
          if (!item.instanceId || item.instanceId === 'unknown' || item.instanceId === instanceId) {
            item.consumed = true;
            return { isProgrammatic: true, token: item.token, shouldSuppressEcho: false };
          }
        }
      }
    }

    return { isProgrammatic: false, token: null, shouldSuppressEcho: false };
  }

  /**
   * Checks if a command would be an exact duplicate echo of the current state.
   * Useful for UI stores that re-trigger commands upon receiving events.
   * @param {string} action
   * @param {*} value
   * @param {string} [instanceId='unknown']
   * @returns {boolean} True if this is an echo that should be suppressed
   */
  isEcho(action, value, instanceId = 'unknown') {
    const act = String(action || '').toLowerCase();
    const stateObj = this._lastState.get(instanceId);
    if (!stateObj) return false;

    if (act === 'volume' && typeof value === 'number') {
      if (typeof stateObj.volume === 'number' && Math.abs(stateObj.volume - value) < 0.001) {
        return true;
      }
    }
    if ((act === 'muted' || act === 'mute') && typeof value === 'boolean') {
      if (typeof stateObj.muted === 'boolean' && stateObj.muted === value) {
        return true;
      }
    }
    if (act === 'play' && stateObj.paused === false) {
      return true;
    }
    if (act === 'pause' && stateObj.paused === true) {
      return true;
    }

    return false;
  }

  clear() {
    this._transactions.clear();
    this._lastState.clear();
  }
}

let globalTrackerInstance = null;

export function getGlobalTransactionTracker() {
  if (!globalTrackerInstance) {
    globalTrackerInstance = new ActionTransactionTracker();
  }
  return globalTrackerInstance;
}

export function createTransactionTracker(options) {
  return new ActionTransactionTracker(options);
}

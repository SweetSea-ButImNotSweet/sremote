/**
 * Transaction-based Event Pipeline & Tracker for SRemote.
 * Tracks programmatic commands (volume, seek, play, pause) to accurately assign
 * `isProgrammatic = true` and suppress feedback loops (echo cancellation).
 */

/**
 * @typedef {Object} TransactionItem
 * @property {string} token
 * @property {*} targetValue
 * @property {string} instanceId
 * @property {number} expiresAt
 * @property {boolean} consumed
 */

/**
 * @typedef {Object} MatchResult
 * @property {boolean} isProgrammatic
 * @property {string|null} token
 * @property {boolean} shouldSuppressEcho
 */

export class ActionTransactionTracker {
  /**
   * @param {Object} [options]
   * @param {number} [options.defaultTtlMs=350] - Default TTL for transactions in ms
   * @param {number} [options.maxTransactionsPerAction=50] - Max tracked transactions per action before pruning
   */
  constructor(options = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? 350;
    this.maxTransactionsPerAction = options.maxTransactionsPerAction ?? 50;
    /** @type {Map<string, TransactionItem[]>} */
    this._transactions = new Map();
    /** @type {Map<string, Record<string, any>>} */
    this._lastState = new Map();
  }

  /**
   * Cleans up expired or consumed transactions for a given action list.
   * @private
   * @param {TransactionItem[]} list
   * @param {number} now
   * @returns {TransactionItem[]}
   */
  _pruneList(list, now) {
    return list.filter(t => t.expiresAt > now && !t.consumed);
  }

  /**
   * Starts a programmatic transaction.
   * @param {string} action - Action name (e.g. 'volume', 'seek', 'play', 'pause')
   * @param {*} [targetValue=undefined] - Value applied
   * @param {string} [instanceId='unknown']
   * @param {number} [ttlMs]
   * @returns {string} Transaction token
   */
  startTransaction(action, targetValue = undefined, instanceId = 'unknown', ttlMs = this.defaultTtlMs) {
    const act = String(action || '').toLowerCase();
    const token = `${act}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const expiresAt = Date.now() + ttlMs;

    const now = Date.now();
    let list = this._pruneList(this._transactions.get(act) ?? [], now);

    // Guard against memory explosion if many transactions are added rapidly
    if (list.length >= this.maxTransactionsPerAction) {
      list.shift();
    }

    list.push({ token, targetValue, instanceId, expiresAt, consumed: false });
    this._transactions.set(act, list);

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
   * Prioritizes transactions matching both instanceId and value (if available), then most recent active.
   *
   * @param {string} eventName - Incoming event name (e.g. 'volumechange', 'play', 'pause', 'seeked')
   * @param {Object} [payload={}] - Incoming event payload
   * @returns {MatchResult}
   */
  matchAndConsume(eventName, payload = {}) {
    const ev = String(eventName || '').toLowerCase();
    const instanceId = payload.instanceId || 'unknown';
    const payloadValue = payload.value;
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
      if (!list?.length) continue;

      // 1. Try to find an exact match for both instanceId AND targetValue (if payloadValue is defined)
      if (payloadValue !== undefined) {
        for (let i = list.length - 1; i >= 0; i--) {
          const item = list[i];
          if (item.expiresAt > now && !item.consumed) {
            const instanceMatch = !item.instanceId || item.instanceId === 'unknown' || item.instanceId === instanceId;
            if (instanceMatch && item.targetValue !== undefined) {
              const valueMatch =
                typeof item.targetValue === 'number' && typeof payloadValue === 'number' ? Math.abs(item.targetValue - payloadValue) < 0.05 : item.targetValue === payloadValue;

              if (valueMatch) {
                item.consumed = true;
                return { isProgrammatic: true, token: item.token, shouldSuppressEcho: false };
              }
            }
          }
        }
      }

      // 2. Fallback: match the latest valid unconsumed transaction for this instanceId
      for (let i = list.length - 1; i >= 0; i--) {
        const item = list[i];
        if (item.expiresAt > now && !item.consumed) {
          const instanceMatch = !item.instanceId || item.instanceId === 'unknown' || item.instanceId === instanceId;
          if (instanceMatch) {
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
      return typeof stateObj.volume === 'number' && Math.abs(stateObj.volume - value) < 0.001;
    }
    if ((act === 'muted' || act === 'mute') && typeof value === 'boolean') {
      return stateObj.muted === value;
    }
    if (act === 'play') {
      return stateObj.paused === false;
    }
    if (act === 'pause') {
      return stateObj.paused === true;
    }

    return false;
  }

  /**
   * Cleans up tracked state and transactions for a specific instanceId.
   * @param {string} instanceId
   */
  removeInstance(instanceId) {
    if (!instanceId || instanceId === 'unknown') return;
    this._lastState.delete(instanceId);

    for (const [act, list] of this._transactions.entries()) {
      const filtered = list.filter(item => item.instanceId !== instanceId);
      if (filtered.length === 0) {
        this._transactions.delete(act);
      } else {
        this._transactions.set(act, filtered);
      }
    }
  }

  /**
   * Clears all transactions and states.
   */
  clear() {
    this._transactions.clear();
    this._lastState.clear();
  }
}

let globalTrackerInstance = null;

export function getGlobalTransactionTracker() {
  return (globalTrackerInstance ??= new ActionTransactionTracker());
}

export function createTransactionTracker(options) {
  return new ActionTransactionTracker(options);
}

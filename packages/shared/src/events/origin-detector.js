/**
 * @typedef {Object} ActionScope
 * @property {string} action
 * @property {*} [value]
 * @property {string|null} [cmdId]
 * @property {string} [instanceId]
 * @property {number} timestamp
 */

/** @type {ActionScope|null} */
let currentActiveScope = null;

function deferMicrotask(cb) {
  if (typeof globalThis !== 'undefined' && typeof globalThis.queueMicrotask === 'function') {
    globalThis.queueMicrotask(cb);
  } else {
    Promise.resolve()
      .then(cb)
      .catch(() => {});
  }
}

/**
 * Runs a function within an explicit programmatic action scope.
 * While this scope is active, events triggered by the media element or adapter
 * are accurately recognized as `isProgrammatic: true` and associated with `cmdId`.
 *
 * @template T
 * @param {string} action - Action being executed (e.g. 'play', 'seekto', 'volume')
 * @param {*} value - Action parameter or payload
 * @param {Object} [meta={}] - Metadata { cmdId, instanceId }
 * @param {() => T} fn - Function executing the underlying DOM or adapter action
 * @returns {T}
 */
export function runInActionScope(action, value, meta = {}, fn) {
  const normAction = String(action || '').toLowerCase();
  const instanceId = meta?.instanceId || 'unknown';
  const cmdId = meta?.cmdId || null;

  currentActiveScope = { action: normAction, value, cmdId, instanceId, timestamp: Date.now() };

  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      return res.finally(() => {
        // Keep active for one microtask to catch synchronous / immediate DOM events
        deferMicrotask(() => {
          if (currentActiveScope?.cmdId === cmdId) {
            currentActiveScope = null;
          }
        });
      });
    }
    return res;
  } finally {
    deferMicrotask(() => {
      if (currentActiveScope?.cmdId === cmdId) {
        currentActiveScope = null;
      }
    });
  }
}

/**
 * Gets the currently active action scope, if any.
 * @returns {ActionScope|null}
 */
export function getActiveActionScope() {
  return currentActiveScope;
}

/**
 * Detects whether an event was triggered programmatically by SRemote or by human interaction.
 *
 * @param {Object} params
 * @param {string} params.eventName - Event being inspected
 * @param {string} [params.instanceId] - Instance target ID
 * @returns {boolean} True if programmatic
 */
export function isProgrammatic({ eventName, instanceId } = {}) {
  if (!eventName) return false;

  // Explicit Active Action Scope (Zero heuristic)
  if (currentActiveScope) {
    const scopeInst = currentActiveScope.instanceId;
    const instanceMatch = !scopeInst || scopeInst === 'unknown' || !instanceId || instanceId === 'unknown' || scopeInst === instanceId;
    if (instanceMatch) {
      return true;
    }
  }

  return false;
}

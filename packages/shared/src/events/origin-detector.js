import { PROGRAMMATIC_WINDOW_MS } from './constants.js';

/**
 * Heuristically detects whether an event was triggered programmatically by SRemote or by human interaction.
 *
 * @param {Object} params
 * @param {string} params.eventName - Event being inspected
 * @param {string} params.instanceId - Instance target ID
 * @param {import('../pipeline/transaction-tracker.js').TransactionTracker} [params.tracker]
 * @param {() => number} [params.timestampGetter] - Function returning timestamp of last programmatic call
 * @param {HTMLMediaElement} [params.media] - Underlying media element
 * @param {*} [params.value] - Action parameter value
 * @returns {boolean} True if programmatic
 */
export function isProgrammatic({ eventName, instanceId, tracker, timestampGetter, media, value }) {
  if (!eventName) return false;
  const ev = String(eventName).toLowerCase();

  // 1. Transaction Tracker inspection
  if (tracker && typeof tracker.hasActiveTransaction === 'function') {
    let actionKey = null;
    if (ev === 'play' || ev === 'playing') actionKey = 'play';
    else if (ev === 'pause') actionKey = 'pause';
    else if (ev === 'seeking' || ev === 'seeked') actionKey = 'currenttime';
    else if (ev === 'ratechange') actionKey = 'rate';
    else if (ev === 'volumechange') {
      actionKey = media?.muted ? 'muted' : 'volume';
    }

    if (actionKey) {
      if (tracker.hasActiveTransaction(instanceId, actionKey, value)) {
        return true;
      }
    }
  }

  // 2. Programmatic Timestamp Window fallback
  if (typeof timestampGetter === 'function') {
    const lastTs = timestampGetter();
    if (typeof lastTs === 'number' && Date.now() - lastTs < PROGRAMMATIC_WINDOW_MS) {
      return true;
    }
  }

  return false;
}


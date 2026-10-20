import { MEDIA_EVENTS, TIMEUPDATE_THROTTLE_MS, PROGRESS_THROTTLE_MS, ALMOST_END_THRESHOLD_SEC, ALMOST_END_MIN_DURATION_SEC, ALMOST_END_RESET_THRESHOLD_SEC } from './constants.js';
import { captureMediaSnapshot } from './snapshot.js';
import { buildEventEnvelope } from './envelope.js';
import { detectProgrammaticOrigin } from './origin-detector.js';
import { getGlobalTransactionTracker } from '../pipeline/transaction-tracker.js';

/**
 * Attaches standardized event listeners to an HTMLMediaElement with smart end/almostend handling and throttled progress/timeupdate.
 *
 * @param {HTMLMediaElement} media - Target HTMLMediaElement
 * @param {(event: string, payload: Object) => void} onEvent - Event dispatcher callback
 * @param {Object} [options={}] - Options for binding
 * @returns {() => void} Detach / cleanup function to remove all attached listeners
 */
export function attachDomMediaListeners(media, onEvent, options = {}) {
  if (!media || typeof media.addEventListener !== 'function' || typeof onEvent !== 'function') {
    return () => {};
  }

  const {
    instanceId = 'dom-media',
    source = 'dom',
    treatAlmostEndAsEnd = false,
    events = MEDIA_EVENTS,
    excludedEvents = null,
    programmaticActionTimestampGetter = null,
    transactionTracker = getGlobalTransactionTracker(),
  } = options;

  const excludedSet = excludedEvents ? (excludedEvents instanceof Set ? excludedEvents : new Set(Array.from(excludedEvents).map(e => String(e).toLowerCase()))) : null;
  const targetEvents = excludedSet?.size > 0 ? events.filter(evt => !excludedSet.has(evt.toLowerCase())) : events;

  if (targetEvents.length === 0) {
    return () => {};
  }

  let hasEmittedAlmostEnd = false;
  let lastTimeupdate = 0;
  let lastProgress = 0;
  let trailingTimeupdateTimer = null;
  let trailingProgressTimer = null;
  const boundListeners = [];

  const dispatchStandardizedEvent = (evtName, eventObj) => {
    const isProgrammatic = detectProgrammaticOrigin({ eventName: evtName, instanceId, media, tracker: transactionTracker, timestampGetter: programmaticActionTimestampGetter });

    onEvent(
      evtName,
      buildEventEnvelope(evtName, {
        source,
        instanceId,
        mediaType: media.tagName?.toLowerCase() ?? 'video',
        state: captureMediaSnapshot(media),
        isProgrammatic,
        originalEvent: eventObj,
      }),
    );
  };

  for (const evtName of targetEvents) {
    const listener = eventObj => {
      const now = Date.now();

      if (evtName === 'timeupdate') {
        const remaining = TIMEUPDATE_THROTTLE_MS - (now - lastTimeupdate);
        if (remaining > 0) {
          if (!trailingTimeupdateTimer) {
            trailingTimeupdateTimer = setTimeout(() => {
              trailingTimeupdateTimer = null;
              lastTimeupdate = Date.now();
              dispatchStandardizedEvent('timeupdate', eventObj);
            }, remaining);
          }
          return;
        }

        if (trailingTimeupdateTimer) {
          clearTimeout(trailingTimeupdateTimer);
          trailingTimeupdateTimer = null;
        }
        lastTimeupdate = now;

        const dur = Number.isFinite(media.duration) ? media.duration : null;
        const curTime = media.currentTime || 0;
        if (dur && dur > ALMOST_END_MIN_DURATION_SEC && curTime >= dur - ALMOST_END_THRESHOLD_SEC && curTime <= dur) {
          if (!hasEmittedAlmostEnd) {
            hasEmittedAlmostEnd = true;
            const almostEndEvent = treatAlmostEndAsEnd ? 'ended' : 'almostend';
            const isProgrammatic = detectProgrammaticOrigin({
              eventName: almostEndEvent,
              instanceId,
              media,
              tracker: transactionTracker,
              timestampGetter: programmaticActionTimestampGetter,
            });
            onEvent(
              almostEndEvent,
              buildEventEnvelope(almostEndEvent, { source, instanceId, mediaType: media.tagName?.toLowerCase() ?? 'video', state: captureMediaSnapshot(media), isProgrammatic }),
            );
          }
        } else if (dur && curTime < dur - ALMOST_END_RESET_THRESHOLD_SEC) {
          hasEmittedAlmostEnd = false;
        }
      }

      if (evtName === 'progress') {
        const remaining = PROGRESS_THROTTLE_MS - (now - lastProgress);
        if (remaining > 0) {
          if (!trailingProgressTimer) {
            trailingProgressTimer = setTimeout(() => {
              trailingProgressTimer = null;
              lastProgress = Date.now();
              dispatchStandardizedEvent('progress', eventObj);
            }, remaining);
          }
          return;
        }

        if (trailingProgressTimer) {
          clearTimeout(trailingProgressTimer);
          trailingProgressTimer = null;
        }
        lastProgress = now;
      }

      if (evtName === 'seeking') {
        hasEmittedAlmostEnd = false;
      }

      dispatchStandardizedEvent(evtName, eventObj);
    };

    try {
      media.addEventListener(evtName, listener, { passive: true });
      boundListeners.push({ event: evtName, listener });
    } catch {}
  }

  // Return clean detach function
  return () => {
    if (trailingTimeupdateTimer) {
      clearTimeout(trailingTimeupdateTimer);
      trailingTimeupdateTimer = null;
    }
    if (trailingProgressTimer) {
      clearTimeout(trailingProgressTimer);
      trailingProgressTimer = null;
    }
    for (const { event, listener } of boundListeners) {
      try {
        media.removeEventListener(event, listener);
      } catch {}
    }
    boundListeners.length = 0;
  };
}

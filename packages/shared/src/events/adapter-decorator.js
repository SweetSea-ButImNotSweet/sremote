import { MEDIA_EVENTS, SAFE_FALLBACK_EVENTS, STATE_CHANGING_EVENTS, ACTION_METHODS, TIMEUPDATE_LOG_THROTTLE_MS } from './constants.js';
import { captureMediaSnapshot } from './snapshot.js';
import { buildEventPayload } from './payload.js';
import { isProgrammatic } from './origin-detector.js';
import { bindDomMedia } from './dom-binder.js';
import { evaluateCapabilities } from './validator.js';
import { defaultLogger } from '../logger.js';
import { getTransactionTracker } from '../pipeline/transaction-tracker.js';

/**
 * Decorates a user-provided custom adapter without mutating the original object.
 * Provides prototype inheritance, safe emit wiring with Echo Guard, state synthesis, and selective DOM fallback.
 *
 * @param {Object} rawAdapter - Raw adapter object provided by the user
 * @param {Object} options - Configuration options
 * @param {string} options.instanceId - Instance ID assigned to the adapter
 * @param {Function} [options.onEmit] - Callback triggered when adapter calls emit(event, payload)
 * @param {string} [options.source='adapter'] - Source identifier
 * @returns {Object} Decorated SRemote custom adapter
 */
export function wrapAdapter(rawAdapter, options = {}) {
  if (!rawAdapter || typeof rawAdapter !== 'object') return null;

  const { instanceId, onEmit, source = 'adapter' } = options;
  const adapter = Object.create(rawAdapter);
  const originalEmit = typeof rawAdapter.emit === 'function' ? rawAdapter.emit.bind(rawAdapter) : null;

  // Explicitly declared handled events by the adapter
  const declaredHandledEvents = new Set(Array.isArray(rawAdapter.handledEvents) ? rawAdapter.handledEvents.map(e => String(e).toLowerCase()) : []);
  const lastAdapterEmitTimeMap = new Map(); // event -> timestamp

  let detachDomFallback = null;
  let programmaticActionTimestamp = 0;

  // Intercept action methods to detect programmatic calls
  for (const method of ACTION_METHODS) {
    if (typeof rawAdapter[method] === 'function') {
      adapter[method] = function (...args) {
        programmaticActionTimestamp = Date.now();
        return rawAdapter[method].apply(this, args);
      };
    }
  }

  // Subscribe to rawAdapter if it implements an event emitter contract (.on)
  let isEmitting = false;
  let unbindAdapterEvents = null;
  if (typeof rawAdapter.on === 'function') {
    unbindAdapterEvents = rawAdapter.on('*', payload => {
      if (isEmitting) return; // Prevent echo loop from adapter.emit -> rawAdapter.on -> adapter.emit
      const eventName = payload?.event || payload?.type;
      if (eventName) {
        adapter.emit(eventName, payload);
      }
    });
  }

  let lastTimeupdateAdapterLog = 0;

  adapter.emit = (event, payload = {}) => {
    if (isEmitting) return;
    isEmitting = true;
    try {
      const ev = String(event || '').toLowerCase();
      const now = Date.now();
      lastAdapterEmitTimeMap.set(ev, now);

      try {
        originalEmit?.(event, payload);
      } catch {}

      const payloadObj = typeof payload === 'object' && payload !== null ? payload : { value: payload };
      const isProg =
        payloadObj.isProgrammatic ??
        payloadObj.programmatic ??
        isProgrammatic({
          eventName: ev,
          instanceId,
          value: payloadObj.value,
          tracker: getTransactionTracker(),
          timestampGetter: () => programmaticActionTimestamp,
        });

      const state = captureMediaSnapshot(adapter);
      const fullPayload = buildEventPayload(ev, { source, instanceId, mediaType: 'adapter', isProgrammatic: isProg, ...(state ? { state } : {}), ...payloadObj });

      const shouldLogAdapterEvent = ev !== 'timeupdate' || now - lastTimeupdateAdapterLog >= TIMEUPDATE_LOG_THROTTLE_MS;
      if (ev === 'timeupdate' && shouldLogAdapterEvent) {
        lastTimeupdateAdapterLog = now;
      }

      if (shouldLogAdapterEvent) {
        defaultLogger.scope('event').debug(`Adapter emit -> ${ev}`, fullPayload);
      }

      if (typeof onEmit === 'function') {
        try {
          onEmit(ev, fullPayload);
        } catch {}

        // Automatically trigger unified 'state' event for state-changing events
        if (ev !== 'state' && STATE_CHANGING_EVENTS.has(ev)) {
          try {
            const statePayload = buildEventPayload('state', {
              source,
              instanceId,
              mediaType: 'adapter',
              triggerEvent: ev,
              isProgrammatic: isProg,
              state,
              ...(typeof payload === 'object' && payload !== null ? payload : {}),
            });
            onEmit('state', statePayload);
          } catch {}
        }
      }
    } finally {
      isEmitting = false;
    }
  };

  if (typeof adapter.toggle !== 'function' && typeof adapter.play === 'function' && typeof adapter.pause === 'function') {
    adapter.toggle = async function () {
      const isPaused = typeof adapter.paused === 'function' ? adapter.paused() : Boolean(adapter.paused ?? true);
      return isPaused ? adapter.play() : adapter.pause();
    };
  }

  adapter.capabilities ??= evaluateCapabilities(adapter);

  // Setup Selective DOM Fallback if a native HTMLMediaElement is attached to the adapter
  const targetMediaEl =
    rawAdapter.mediaElement && (rawAdapter.mediaElement.tagName === 'VIDEO' || rawAdapter.mediaElement.tagName === 'AUDIO')
      ? rawAdapter.mediaElement
      : rawAdapter.element && (rawAdapter.element.tagName === 'VIDEO' || rawAdapter.element.tagName === 'AUDIO')
        ? rawAdapter.element
        : null;

  if (targetMediaEl) {
    try {
      // Mark element as claimed by this adapter so auto-trackers don't duplicate it
      targetMediaEl[Symbol.for('__sremote_adapter__')] = instanceId;
    } catch {}

    if (rawAdapter.fallbackEvents !== false) {
      const allowedFallbackEvents = Array.isArray(rawAdapter.fallbackEvents)
        ? rawAdapter.fallbackEvents.map(e => String(e).toLowerCase())
        : rawAdapter.fallbackLifecycle === true
          ? MEDIA_EVENTS
          : SAFE_FALLBACK_EVENTS;

      detachDomFallback = bindDomMedia(
        targetMediaEl,
        (evtName, payload) => {
          const evNorm = evtName.toLowerCase();
          // Do not forward if adapter explicitly declares handling this event
          if (declaredHandledEvents.has(evNorm)) {
            return;
          }
          // Do not duplicate if adapter itself emitted this event within the last 300ms
          const lastEmit = lastAdapterEmitTimeMap.get(evNorm) || 0;
          if (Date.now() - lastEmit < 300) {
            return;
          }

          const state = captureMediaSnapshot(adapter) || payload.state;
          const forwarded = { ...payload, source: 'adapter-dom-fallback', instanceId, state };
          defaultLogger.scope('event').debug(`Adapter fallback emit -> ${evtName}`, forwarded);
          try {
            onEmit?.(evtName, forwarded);
          } catch {}
        },
        {
          instanceId,
          source: 'adapter-dom-fallback',
          events: allowedFallbackEvents,
          excludedEvents: declaredHandledEvents,
          programmaticActionTimestampGetter: () => programmaticActionTimestamp,
        },
      );
    }
  }

  const originalDestroy = typeof rawAdapter.destroy === 'function' ? rawAdapter.destroy.bind(rawAdapter) : null;
  adapter.destroy = () => {
    try {
      originalDestroy?.();
    } catch {}
    if (typeof detachDomFallback === 'function') {
      detachDomFallback();
      detachDomFallback = null;
    }
    if (typeof unbindAdapterEvents === 'function') {
      unbindAdapterEvents();
      unbindAdapterEvents = null;
    }
    if (targetMediaEl) {
      try {
        delete targetMediaEl[Symbol.for('__sremote_adapter__')];
      } catch {}
    }
  };

  return adapter;
}

// Backward-compatibility aliases
export const decorateCustomAdapter = wrapAdapter;
export const wrapCustomAdapter = wrapAdapter;

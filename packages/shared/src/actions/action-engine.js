/**
 * Universal Action Engine for SRemote.
 * Consolidates media control execution for HTMLMediaElement, DOM elements, and Custom Adapters.
 * Table-driven dispatcher powered by Centralized Action Fallback Matrix.
 */

import { wrapAdapter } from '../events/index.js';
import { ACTION_MATRIX, normalizeActionKey, safePlayMedia, safePauseMedia, adapterPreviousVolumeMap } from './action-matrix.js';

export { ACTION_MATRIX, normalizeActionKey, safePlayMedia, safePauseMedia, adapterPreviousVolumeMap };

/**
 * Resolves a media element from a selector, DOM node, or same-origin iframe.
 * @param {string|HTMLElement|null} target
 * @param {Document} [doc=document]
 * @returns {HTMLMediaElement|null}
 */
export function resolveMediaElement(target, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return null;

  if (!target) {
    return doc.querySelector('video, audio');
  }

  if (typeof target === 'string') {
    const el = doc.querySelector(target);
    if (!el) return null;
    if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') return el;
    if (el.tagName === 'IFRAME') {
      try {
        return el.contentDocument?.querySelector('video, audio') ?? null;
      } catch {
        return null;
      }
    }
    return el.querySelector('video, audio');
  }

  if (target.nodeType === 1) {
    if (target.tagName === 'VIDEO' || target.tagName === 'AUDIO') return target;
    if (target.tagName === 'IFRAME') {
      try {
        return target.contentDocument?.querySelector('video, audio') || null;
      } catch {
        return null;
      }
    }
    return target.querySelector?.('video, audio') || null;
  }

  return null;
}

/**
 * Checks whether an object is a SRemote Custom Adapter.
 * @param {any} target
 * @returns {boolean}
 */
export function isAdapterTarget(target) {
  return Boolean(
    target &&
      (typeof target.getState === 'function' ||
        typeof target.useAdapter === 'function' ||
        target[Symbol.for('__sremote_adapter__')] ||
        target.source === 'adapter' ||
        target.isAdapter === true ||
        target.capabilities?.hasAdapter ||
        (!target.tagName && typeof target.play === 'function' && typeof target.pause === 'function')),
  );
}

/**
 * Resolves the intervention policy for a given target.
 * @param {any} target
 * @returns {{ isRaw: boolean, allowPolyfill: boolean, allowAutoEmit: boolean, allowDomFallback: boolean }}
 */
export function resolveInterventionPolicy(target) {
  if (!target || typeof target !== 'object') {
    return { isRaw: false, allowPolyfill: true, allowAutoEmit: true, allowDomFallback: true };
  }

  const isRaw = target.mode === 'raw' || target.strict === true;
  const userInterventions = target.interventions || {};

  return {
    isRaw,
    allowPolyfill: !isRaw && userInterventions.polyfill !== false,
    allowAutoEmit: !isRaw && userInterventions.autoEmit !== false,
    allowDomFallback: !isRaw && userInterventions.domFallback !== false,
  };
}

/**
 * Checks if a target supports a specific action under its current intervention policy.
 * @param {any} target
 * @param {string} action
 * @returns {boolean}
 */
export function hasActionSupport(target, action) {
  if (!target) return false;
  const norm = normalizeActionKey(action);
  const entry = ACTION_MATRIX[norm];
  if (!entry) return false;

  const isAdapter = isAdapterTarget(target);
  if (!isAdapter) {
    return Boolean(entry.executeNative);
  }

  const policy = resolveInterventionPolicy(target);

  // 1. Adapter direct method
  if (norm === 'play' && typeof target.play === 'function') return true;
  if (norm === 'pause' && typeof target.pause === 'function') return true;
  if (norm === 'toggle' && typeof target.toggle === 'function') return true;
  if (norm === 'stop' && typeof target.stop === 'function') return true;
  if (norm === 'seek' && typeof target.seek === 'function') return true;
  if (norm === 'seekto' && (typeof target.seekTo === 'function' || typeof target.setCurrentTime === 'function')) return true;
  if (norm === 'volume' && (typeof target.setVolume === 'function' || typeof target.volume === 'function')) return true;
  if (norm === 'mute' && (typeof target.setMuted === 'function' || typeof target.mute === 'function')) return true;
  if (norm === 'speed' && (typeof target.setPlaybackRate === 'function' || typeof target.playbackRate === 'function' || typeof target.setSpeed === 'function')) return true;
  if (norm === 'enterpip' && (typeof target.requestPip === 'function' || typeof target.pip === 'function')) return true;
  if (norm === 'exitpip' && (typeof target.requestPip === 'function' || typeof target.pip === 'function')) return true;
  if (norm === 'load' && typeof target.load === 'function') return true;
  if (norm === 'quality' && typeof target.setQuality === 'function') return true;
  if (norm === 'getqualities' && typeof target.getQualities === 'function') return true;
  if (norm === 'subtitle' && typeof target.setSubtitle === 'function') return true;
  if (norm === 'getsubtitles' && typeof target.getSubtitles === 'function') return true;
  if (norm === 'shuffle' && (typeof target.setShuffle === 'function' || typeof target.shuffle === 'function')) return true;
  if (norm === 'repeat' && (typeof target.setRepeat === 'function' || typeof target.repeat === 'function')) return true;
  if (norm === 'next' && typeof target.next === 'function') return true;
  if (norm === 'previous' && typeof target.previous === 'function') return true;

  // 2. Polyfill support
  if (policy.allowPolyfill && entry.polyfill) {
    if (norm === 'toggle' && typeof target.play === 'function' && typeof target.pause === 'function') return true;
    if (norm === 'stop' && typeof target.pause === 'function') return true;
    if (norm === 'seek' && (typeof target.seekTo === 'function' || typeof target.setCurrentTime === 'function')) return true;
    if (norm === 'seekto' && typeof target.seek === 'function') return true;
    if (norm === 'mute' && (typeof target.setVolume === 'function' || typeof target.volume === 'function')) return true;
  }

  // 3. Attached DOM fallback
  if (policy.allowDomFallback && target.mediaElement && entry.executeNative) {
    return true;
  }

  return false;
}

/**
 * Executes a normalized action on a target (HTMLMediaElement or Custom Adapter)
 * using the Centralized Action Fallback Matrix.
 *
 * @param {HTMLMediaElement|Object} target
 * @param {string} action
 * @param {*} [value]
 * @param {Object} [options={}]
 * @param {boolean} [options.isPureGet=false]
 * @param {Object} [options.transactionTracker=null]
 * @param {string} [options.instanceId='unknown']
 * @param {Object} [options.logger=null]
 * @returns {Promise<any>}
 */
export async function executeMediaAction(target, action, value = undefined, options = {}) {
  if (!target) return false;
  const { isPureGet = false, transactionTracker = null, instanceId = 'unknown', logger = null } = options;
  const norm = normalizeActionKey(action);

  const entry = ACTION_MATRIX[norm];
  if (!entry) {
    if (logger?.warn) {
      logger.warn(`[sremote:action] Không có chức năng tương ứng cho hành động '${action}' trên đối tượng [${instanceId}]`);
    }
    return false;
  }

  const isAdapter = isAdapterTarget(target);

  if (!isPureGet && transactionTracker && typeof transactionTracker.startTransaction === 'function') {
    transactionTracker.startTransaction(norm, value, instanceId);
  }

  if (logger?.debug) {
    logger.debug(`[ActionEngine] Executing '${norm}' on ${isAdapter ? 'Adapter' : target.tagName || 'Object'}`, { value, instanceId });
  }

  // ----------------------------------------------------
  // Branch A: Custom Adapter Execution
  // ----------------------------------------------------
  if (isAdapter) {
    const policy = resolveInterventionPolicy(target);
    let execResult = { handled: false };

    // 1. Direct Adapter execution
    if (entry.executeAdapter) {
      try {
        execResult = await entry.executeAdapter(target, value, options);
      } catch (err) {
        if (logger?.warn) logger.warn(`[sremote:action] Error executing '${norm}' on adapter:`, err);
        throw err;
      }
    }

    // 2. Synthetic Polyfill (if permitted)
    if (!execResult.handled && policy.allowPolyfill && entry.polyfill) {
      try {
        execResult = await entry.polyfill(target, value, options);
        if (execResult.handled && logger?.debug) {
          logger.debug(`[sremote:action] Polyfilled '${norm}' on adapter [${target.name || instanceId}]`);
        }
      } catch (err) {
        if (logger?.warn) logger.warn(`[sremote:action] Error polyfilling '${norm}':`, err);
      }
    }

    // 3. Attached DOM fallback (if permitted and element exists)
    if (!execResult.handled && policy.allowDomFallback && target.mediaElement && entry.executeNative) {
      try {
        execResult = await entry.executeNative(target.mediaElement, value, options);
        if (execResult.handled && logger?.debug) {
          logger.debug(`[sremote:action] Fallback '${norm}' to attached mediaElement on adapter [${target.name || instanceId}]`);
        }
      } catch (err) {
        if (logger?.warn) logger.warn(`[sremote:action] Error executing native fallback for '${norm}':`, err);
      }
    }

    // 4. Handle Unsupported Action
    if (!execResult.handled) {
      if (logger?.warn) {
        logger.warn(
          `[sremote:action] Không có chức năng tương ứng cho hành động '${action}' trên Adapter [${target.name || instanceId}] ` +
            `(chế độ: ${target.mode || (target.strict ? 'raw' : 'managed')}, polyfill: ${policy.allowPolyfill})`,
        );
      }
      return false;
    }

    // 5. Automatic Event Emission (if permitted)
    if (policy.allowAutoEmit && !isPureGet && typeof target.emit === 'function' && entry.eventsToEmit) {
      try {
        const events = entry.eventsToEmit(execResult);
        if (Array.isArray(events)) {
          for (const evItem of events) {
            const evName = evItem.event || evItem;
            const evPayload = evItem.payload || {};
            target.emit(evName, { programmatic: true, isProgrammatic: true, ...evPayload });
          }
        }
      } catch (err) {
        if (logger?.warn) logger.warn(`[sremote:action] Error auto-emitting events for '${norm}':`, err);
      }
    }

    return execResult.result ?? true;
  }

  // ----------------------------------------------------
  // Branch B: Native HTMLMediaElement Execution
  // ----------------------------------------------------
  if (entry.executeNative) {
    try {
      const execResult = await entry.executeNative(target, value, options);
      if (!execResult.handled) {
        if (logger?.warn) {
          logger.warn(`[sremote:action] Không có chức năng tương ứng cho '${action}' trên phần tử Native Media [${instanceId}]`);
        }
        return false;
      }
      return execResult.result ?? true;
    } catch (err) {
      if (logger?.warn) logger.warn(`[sremote:action] Error executing native '${norm}':`, err);
      throw err;
    }
  }

  if (logger?.warn) {
    logger.warn(`[sremote:action] Không có chức năng tương ứng cho '${action}' trên phần tử Native Media [${instanceId}]`);
  }
  return false;
}

export const actions = { execute: executeMediaAction, safePlay: safePlayMedia, safePause: safePauseMedia, wrapAdapter, hasSupport: hasActionSupport, isAdapter: isAdapterTarget };

import { bindMediaEvents, extractMediaState, evaluateCapabilities, isValidMediaElement, hasMediaSource } from '@sremote/shared';
import { generateInstanceId } from '../core/utils.js';
import { console_log, logger } from '../config.js';

/**
 * Sets up lightweight auto-tracking of <video> and <audio> elements on the Top DOM.
 * Does NOT overwrite or hook native prototypes.
 *
 * @param {Object} instanceManager - SRemote instance manager
 * @param {Object} [options={}]
 * @returns {{ destroy: Function, topMediaElementsMap: Map<string, HTMLMediaElement> }}
 */
export function setupTopMediaTracker(instanceManager, options = {}) {
  if (typeof document === 'undefined') {
    return { destroy: () => {}, topMediaElementsMap: new Map() };
  }

  const { instances, emitGlobalEvent, notifyMediaCountChange, pauseOthersExcept } = instanceManager;
  const trackedElements = new WeakSet();
  const unbindFns = new Map(); // instanceId -> unbindFunction
  const topMediaElementsMap = new Map(); // instanceId -> HTMLMediaElement

  function isElementClaimed(mediaEl) {
    if (!mediaEl) return false;
    try {
      if (mediaEl[Symbol.for('__sremote_adapter__')]) {
        return true;
      }
    } catch {}
    return false;
  }

  function trackElement(mediaEl, trackOpts = {}) {
    if (!isValidMediaElement(mediaEl) || trackedElements.has(mediaEl) || isElementClaimed(mediaEl)) return;
    trackedElements.add(mediaEl);

    const customId = mediaEl.id || mediaEl.getAttribute('data-sremote-id') || generateInstanceId('top_media');
    const mediaType = mediaEl.tagName ? mediaEl.tagName.toLowerCase() : 'video';

    // Build instance registration in instanceManager.instances
    const initialCapabilities = evaluateCapabilities(mediaEl);
    const initialState = extractMediaState(mediaEl);

    const instanceInfo = {
      instanceId: customId,
      location: typeof location !== 'undefined' ? location.href : '',
      origin: typeof location !== 'undefined' ? location.origin : '',
      note: 'Top DOM Media',
      mediaType,
      capabilities: initialCapabilities,
      state: initialState,
      status: 'ready',
      lastSeen: Date.now(),
      isTopMedia: true,
      mediaElement: mediaEl,
    };

    if (!instanceManager.isMultiModeActive() && instances.size > 0) {
      for (const oldId of Array.from(instances.keys())) {
        if (oldId !== customId) {
          console_log(`%c[SRemote:lifecycle] Replacing stale instance in Single Mode: ${oldId} -> ${customId}`, 'color: #f59e0b;');
          instanceManager.removeInstance(oldId, 'replaced_by_new_instance');
        }
      }
    }

    instances.set(customId, instanceInfo);
    topMediaElementsMap.set(customId, mediaEl);
    if (!instanceManager.isMultiModeActive() || !instanceManager.currentActiveInstanceId) {
      instanceManager.setCurrentActiveInstanceId(customId);
    }

    let lastTimeupdate = 0;
    const TIMEUPDATE_THROTTLE_MS = 250;

    // Standard event listener binding without prototype hooking
    const unbind = bindMediaEvents(
      mediaEl,
      (evtName, payload) => {
        // Late check in case element was claimed by an adapter after initial tracking
        if (isElementClaimed(mediaEl)) {
          untrackElement(customId);
          return;
        }

        const now = Date.now();
        instanceInfo.lastSeen = now;

        // Throttle high-frequency timeupdate events to avoid event flood and CPU jank
        if (evtName === 'timeupdate') {
          if (now - lastTimeupdate < TIMEUPDATE_THROTTLE_MS) {
            return;
          }
          lastTimeupdate = now;
        }

        if (payload?.state) {
          instanceInfo.state = payload.state;
        }

        if (evtName === 'play' || evtName === 'playing') {
          if (hasMediaSource(mediaEl)) {
            // Only take over active ID from top-dom media when no parent adapter is registered
            if (instanceManager.parentAdaptersMap.size === 0 || instanceManager.isMultiModeActive()) {
              instanceManager.setCurrentActiveInstanceId(customId);
            }
            if (instanceManager.exclusiveMode === 'auto') {
              pauseOthersExcept(customId);
            }
          }
        }

        logger.scope('dom').debug(`Top DOM media event -> ${evtName}`, payload);
        emitGlobalEvent(evtName, payload);
      },
      { instanceId: customId, source: 'top-dom', mediaType },
    );

    unbindFns.set(customId, unbind);
    if (!trackOpts.silent) {
      notifyMediaCountChange();
    }
    emitGlobalEvent('accept', { source: 'top-dom', instanceId: customId, mediaType, location: location.href, origin: location.origin });
  }

  function untrackElement(customId) {
    const unbind = unbindFns.get(customId);
    if (unbind) {
      try {
        unbind();
      } catch {}
      unbindFns.delete(customId);
    }
    topMediaElementsMap.delete(customId);
    if (instances.has(customId)) {
      instanceManager.removeInstance(customId, 'dom-removed');
    }
  }

  function suppressMediaElement(mediaElOrId) {
    if (!mediaElOrId) return;
    if (typeof mediaElOrId === 'string') {
      untrackElement(mediaElOrId);
      return;
    }
    for (const [id, el] of topMediaElementsMap.entries()) {
      if (el === mediaElOrId || (mediaElOrId.contains && mediaElOrId.contains(el))) {
        untrackElement(id);
      }
    }
  }

  let isTracking = false;
  let observer = null;
  let pendingMutations = [];
  let mutationMicrotaskScheduled = false;

  function processPendingMutations() {
    mutationMicrotaskScheduled = false;
    if (!isTracking || pendingMutations.length === 0) return;

    const mutations = pendingMutations;
    pendingMutations = [];

    let hasAdded = false;

    for (const m of mutations) {
      // 1. Handle added nodes
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) {
          if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
            trackElement(node);
            hasAdded = true;
          } else if (node.childElementCount > 0 && node.querySelectorAll) {
            const nested = node.querySelectorAll('video, audio');
            for (const n of nested) {
              trackElement(n);
              hasAdded = true;
            }
          }
        }
      }

      // 2. Handle removed nodes - only if there are tracked elements to clean up
      if (topMediaElementsMap.size > 0) {
        for (const node of m.removedNodes) {
          if (node.nodeType === 1) {
            for (const [id, el] of topMediaElementsMap.entries()) {
              if (el === node || (node.contains && node.contains(el))) {
                untrackElement(id);
              }
            }
          }
        }
      }
    }

    if (hasAdded) {
      notifyMediaCountChange();
    }
  }

  function start() {
    if (isTracking) return;
    isTracking = true;

    // 1. Initial scan of existing media elements (batch silently)
    try {
      const mediaEls = document.querySelectorAll('video, audio');
      if (mediaEls.length > 0) {
        for (const el of mediaEls) {
          trackElement(el, { silent: true });
        }
        notifyMediaCountChange();
      }
    } catch {}

    // 2. Observe DOM mutations with microtask batching for dynamically added/removed media elements
    if (typeof MutationObserver !== 'undefined' && !observer) {
      observer = new MutationObserver(mutations => {
        if (!isTracking) return;
        pendingMutations.push(...mutations);
        if (!mutationMicrotaskScheduled) {
          mutationMicrotaskScheduled = true;
          Promise.resolve().then(processPendingMutations);
        }
      });

      try {
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
      } catch {}
    }
  }

  function stop() {
    if (!isTracking) return;
    isTracking = false;
    pendingMutations = [];
    mutationMicrotaskScheduled = false;

    if (observer) {
      try {
        observer.disconnect();
      } catch {}
      observer = null;
    }
    for (const id of Array.from(topMediaElementsMap.keys())) {
      untrackElement(id);
    }
  }

  function destroy() {
    stop();
    trackedElements.clear?.();
  }

  // Auto-start if enabled (default false, opt-in via hello({ trackParent: true }))
  if (options.autoStart === true) {
    start();
  }

  return {
    start,
    stop,
    destroy,
    untrackElement,
    suppressMediaElement,
    get isTracking() {
      return isTracking;
    },
    topMediaElementsMap,
  };
}

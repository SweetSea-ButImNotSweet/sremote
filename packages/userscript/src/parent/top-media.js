import { bindMediaEvents, extractMediaState, evaluateCapabilities } from '@sremote/shared';
import { generateInstanceId } from '../core/utils.js';
import { console_log } from '../config.js';

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

  function trackElement(mediaEl) {
    if (!mediaEl || trackedElements.has(mediaEl)) return;
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

    instances.set(customId, instanceInfo);
    topMediaElementsMap.set(customId, mediaEl);

    console_log(`%c[SRemote:top-dom] Registered top-level <${mediaType}> instance: ${customId}`, 'color: #10b981; font-weight: bold;');

    // Standard event listener binding without prototype hooking
    const unbind = bindMediaEvents(
      mediaEl,
      (evtName, payload) => {
        instanceInfo.lastSeen = Date.now();
        if (payload?.state) {
          instanceInfo.state = payload.state;
        }

        if (evtName === 'play' || evtName === 'playing') {
          instanceManager.currentActiveInstanceId = customId;
          if (instanceManager.exclusiveMode === 'auto') {
            pauseOthersExcept(customId);
          }
        }

        emitGlobalEvent(evtName, payload);
      },
      {
        instanceId: customId,
        source: 'top-dom',
        mediaType,
      },
    );

    unbindFns.set(customId, unbind);
    notifyMediaCountChange();
    emitGlobalEvent('accept', {
      source: 'top-dom',
      instanceId: customId,
      mediaType,
      location: location.href,
      origin: location.origin,
    });
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

  let isTracking = false;
  let observer = null;

  function start() {
    if (isTracking) return;
    isTracking = true;

    // 1. Initial scan of existing media elements
    try {
      const mediaEls = document.querySelectorAll('video, audio');
      for (const el of mediaEls) {
        trackElement(el);
      }
    } catch {}

    // 2. Observe DOM mutations for dynamically added or removed media elements
    if (typeof MutationObserver !== 'undefined' && !observer) {
      observer = new MutationObserver(mutations => {
        if (!isTracking) return;
        for (const m of mutations) {
          // Handle added nodes
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) {
              if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
                trackElement(node);
              } else if (node.querySelectorAll) {
                const nested = node.querySelectorAll('video, audio');
                for (const n of nested) trackElement(n);
              }
            }
          }

          // Handle removed nodes
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
      });

      try {
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
      } catch {}
    }
  }

  function stop() {
    if (!isTracking) return;
    isTracking = false;
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
    get isTracking() {
      return isTracking;
    },
    topMediaElementsMap,
  };
}

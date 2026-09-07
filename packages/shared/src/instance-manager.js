import { wrapCustomAdapter } from './events.js';
import { createLogger, LOG_LEVELS } from './logger.js';

/**
 * Generates a unique instance identifier.
 * @param {string} [prefix='sv']
 * @returns {string}
 */
export function generateInstanceId(prefix = 'sv') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

/**
 * Creates an InstanceManager to manage media instances, adapters, exclusivity, and events.
 *
 * @param {Object} [options={}]
 * @param {string} [options.ns='sremote:'] - Namespace prefix for signal event types
 * @param {Object} [options.logger] - Custom logger methods: { log, debug, warn, error }
 * @param {Function} [options.onSignal] - Callback when media count signals are emitted: (payload) => void
 * @param {Function} [options.getIframeCount] - Function returning current live iframe count
 * @returns {Object} InstanceManager
 */
export function createInstanceManager(options = {}) {
  const { ns = 'sremote:', logger = {}, onSignal = null, getIframeCount = null } = options;

  const log = typeof logger.log === 'function' ? logger.log : () => {};
  const debug = typeof logger.debug === 'function' ? logger.debug : () => {};
  const warn = typeof logger.warn === 'function' ? logger.warn : typeof console !== 'undefined' ? console.warn.bind(console) : () => {};

  const eventLogger = createLogger({
    prefix: 'event',
    getLevel: typeof logger.level === 'number' ? () => logger.level : typeof logger.getLevel === 'function' ? logger.getLevel : undefined,
    defaultLevel: typeof logger.level === 'number' ? logger.level : LOG_LEVELS.ERROR,
  });

  const instances = new Map(); // instanceId -> { port, location, origin, note, state, mediaType, lastSeen, status, iframeEl, authenticated }
  const parentAdaptersMap = new Map(); // adapterKey -> adapterObject
  const assignedIframeIdMap = new Map(); // instanceId -> HTMLIFrameElement
  const iframeToAssignedIdMap = new WeakMap(); // HTMLIFrameElement -> instanceId
  const globalEventListeners = new Map();

  let exclusiveMode = null; // null | 'auto' | instanceId
  let multiModeConfig = null; // null (auto-detect) | true (force multi) | false (force single)
  let currentActiveInstanceId = null;
  let isSessionLocked = false;
  let isSessionDenied = false;
  let lastAcceptedData = null;

  function isMultiModeActive() {
    if (typeof multiModeConfig === 'boolean') return multiModeConfig;
    try {
      const iframesCount = typeof getIframeCount === 'function' ? getIframeCount() : typeof document !== 'undefined' ? document.querySelectorAll('iframe').length : 0;

      if (iframesCount <= 1 && instances.size <= 1) return false;
    } catch {}
    return instances.size > 1;
  }

  function getLatestActiveInstanceId() {
    const isSingle = !isMultiModeActive();

    // In Single Mode, if parent page registered a custom adapter, it MUST always take top priority
    if (isSingle && parentAdaptersMap.size > 0) {
      currentActiveInstanceId = Array.from(parentAdaptersMap.keys())[parentAdaptersMap.size - 1];
      return currentActiveInstanceId;
    }

    if (currentActiveInstanceId && (instances.has(currentActiveInstanceId) || parentAdaptersMap.has(currentActiveInstanceId))) {
      return currentActiveInstanceId;
    }
    if (parentAdaptersMap.size > 0) {
      currentActiveInstanceId = Array.from(parentAdaptersMap.keys())[parentAdaptersMap.size - 1];
      return currentActiveInstanceId;
    }
    let latestId = null;
    let latestTime = -1;
    for (const [id, item] of instances.entries()) {
      const seen = item.lastSeen || 0;
      if (seen > latestTime) {
        latestTime = seen;
        latestId = id;
      }
    }
    currentActiveInstanceId = latestId || Array.from(instances.keys())[instances.size - 1] || null;
    return currentActiveInstanceId;
  }

  function broadcastToPorts(payload, excludeInstanceId = null) {
    for (const [id, item] of instances.entries()) {
      if (id === excludeInstanceId) continue;
      try {
        item.port?.postMessage(payload);
      } catch {}
    }
  }

  function notifyMediaCountChange() {
    const activeInstances = Array.from(instances.entries()).map(([id, item]) => ({ instanceId: id, location: item.location, note: item.note, mediaType: item.mediaType }));
    const count = activeInstances.length;

    let payload = null;
    if (count > 1) {
      payload = { type: `${ns}multipleMediaDetected`, source: 'parent', count, instances: activeInstances };
      debug(`%c[SRemote:signal] Emit -> multipleMediaDetected (source: parent)`, 'color: #06b6d4;', payload);
    } else if (count === 1) {
      payload = { type: `${ns}singleMediaDetected`, source: 'parent', count: 1, instance: activeInstances[0] };
      debug(`%c[SRemote:signal] Emit -> singleMediaDetected (source: parent)`, 'color: #06b6d4;', payload);
    }

    if (payload) {
      if (typeof onSignal === 'function') {
        try {
          onSignal(payload);
        } catch (e) {
          warn('[sremote] Error in onSignal callback:', e);
        }
      } else if (typeof window !== 'undefined' && typeof window.postMessage === 'function') {
        window.postMessage(payload, '*');
      }
    }
  }

  function emitGlobalEvent(event, payload = {}) {
    const rawEv = String(event || '').toLowerCase();
    const ev = rawEv.replace(/^sremote:/, '');
    const fullEv = `sremote:${ev}`;

    eventLogger.debug(`Dispatched -> ${ev}`, payload);

    if ((ev === 'accept' || rawEv === 'accept') && payload?.instanceId) {
      lastAcceptedData = payload;
    } else if ((ev === 'disconnect' || rawEv === 'disconnect') && payload?.instanceId && lastAcceptedData?.instanceId === payload.instanceId) {
      lastAcceptedData = null;
    }

    const triggerHandlers = targetMap => {
      if (!targetMap) return;
      for (const fn of targetMap) {
        try {
          fn(payload);
        } catch (e) {
          warn('[sremote] Error in event listener:', e);
        }
      }
    };

    triggerHandlers(globalEventListeners.get(ev));
    if (fullEv !== ev) {
      triggerHandlers(globalEventListeners.get(fullEv));
    }

    const wildcardListeners = globalEventListeners.get('*');
    if (wildcardListeners) {
      const starPayload = typeof payload === 'object' && payload !== null ? { action: ev, ...payload } : { action: ev, value: payload };
      for (const fn of wildcardListeners) {
        try {
          fn(starPayload);
        } catch (e) {
          warn('[sremote] Error in wildcard listener:', e);
        }
      }
    }
  }

  function on(event, handler) {
    if (typeof handler !== 'function') return () => {};
    const rawEv = String(event || '').toLowerCase();
    const ev = rawEv.replace(/^sremote:/, '');
    const fullEv = `sremote:${ev}`;

    const addListener = key => {
      if (!globalEventListeners.has(key)) globalEventListeners.set(key, new Set());
      globalEventListeners.get(key).add(handler);
    };

    addListener(ev);
    if (fullEv !== ev) {
      addListener(fullEv);
    }

    // Sticky replay for accept / wildcard
    if ((ev === 'accept' || ev === '*') && lastAcceptedData && (instances.has(lastAcceptedData.instanceId) || parentAdaptersMap.has(lastAcceptedData.instanceId))) {
      try {
        const replayPayload = ev === '*' ? { action: 'accept', ...lastAcceptedData } : lastAcceptedData;
        setTimeout(() => {
          try {
            handler(replayPayload);
          } catch {}
        }, 0);
      } catch {}
    }

    return () => off(event, handler);
  }

  function off(event, handler) {
    const rawEv = String(event || '').toLowerCase();
    const ev = rawEv.replace(/^sremote:/, '');
    const fullEv = `sremote:${ev}`;

    const removeListener = key => {
      const set = globalEventListeners.get(key);
      if (set) {
        if (handler) set.delete(handler);
        else globalEventListeners.delete(key);
      }
    };

    removeListener(ev);
    removeListener(fullEv);
  }

  function pauseOthersExcept(activeInstanceId) {
    for (const [id, item] of instances.entries()) {
      if (id !== activeInstanceId) {
        try {
          if (item.isTopMedia && item.mediaElement) {
            item.mediaElement.pause?.();
          } else {
            item.port?.postMessage({ type: `${ns}pause` });
          }
        } catch {}
      }
    }
    for (const [id, ad] of parentAdaptersMap.entries()) {
      if (id !== activeInstanceId) {
        try {
          ad.pause?.();
        } catch {}
      }
    }
  }

  function removeInstance(instanceId, reason = 'disconnected') {
    const item = instances.get(instanceId);
    if (!item) return;
    log(`%c[SRemote:lifecycle] Instance removed: ${instanceId} (reason: ${reason})`, 'color: #ef4444; font-weight: bold;');
    try {
      item.port?.close();
    } catch {}
    instances.delete(instanceId);
    if (currentActiveInstanceId === instanceId) {
      currentActiveInstanceId = null;
    }
    notifyMediaCountChange();
    emitGlobalEvent('disconnect', { instanceId, reason });
  }

  function handleUseAdapter(adapterVal, instanceId = null) {
    if (!adapterVal || typeof adapterVal !== 'object') return null;
    const targetId = instanceId || generateInstanceId('adapter');

    if (!isMultiModeActive() && parentAdaptersMap.size > 0) {
      for (const oldId of Array.from(parentAdaptersMap.keys())) {
        if (oldId !== targetId) {
          log(`%c[SRemote:adapter] Replacing stale adapter in Single Mode: ${oldId} -> ${targetId}`, 'color: #f59e0b;');
          parentAdaptersMap.delete(oldId);
        }
      }
    }

    // Create a non-mutating adapter wrapper inheriting from the user's object
    const adapter = wrapCustomAdapter(adapterVal, {
      instanceId: targetId,
      source: 'adapter',
      onEmit: (ev, fullPayload) => {
        if (ev === 'play' || ev === 'playing') {
          currentActiveInstanceId = targetId;
          if (exclusiveMode === 'auto' || exclusiveMode === true) {
            pauseOthersExcept(targetId);
          }
        }
        emitGlobalEvent(ev, fullPayload);
      },
    });

    parentAdaptersMap.set(targetId, adapter);
    currentActiveInstanceId = targetId;
    log(`%c[SRemote:adapter] Registered custom adapter for instance '${targetId}'`, 'color: #06b6d4; font-weight: bold;');

    const currentLoc = typeof location !== 'undefined' ? location.href : '';
    const currentOrigin = typeof location !== 'undefined' ? location.origin : '';
    const acceptPayload = { source: 'adapter', instanceId: targetId, mediaType: 'adapter', location: currentLoc, origin: currentOrigin };
    emitGlobalEvent('accept', acceptPayload);

    return targetId;
  }

  function handleRemoveAdapter(instanceId = null) {
    if (instanceId) {
      const deleted = parentAdaptersMap.delete(instanceId);
      if (deleted && currentActiveInstanceId === instanceId) {
        currentActiveInstanceId = null;
      }
      return deleted;
    }
    parentAdaptersMap.clear();
    currentActiveInstanceId = null;
    return true;
  }

  function getCustomAdapter(instanceId = null) {
    if (instanceId) return parentAdaptersMap.get(instanceId) || null;
    if (parentAdaptersMap.size === 1) return Array.from(parentAdaptersMap.values())[0] || null;
    return parentAdaptersMap.get(currentActiveInstanceId) || Array.from(parentAdaptersMap.values())[0] || null;
  }

  return {
    instances,
    parentAdaptersMap,
    assignedIframeIdMap,
    iframeToAssignedIdMap,
    globalEventListeners,
    get exclusiveMode() {
      return exclusiveMode;
    },
    setExclusiveMode: mode => {
      exclusiveMode = mode;
    },
    get multiModeConfig() {
      return multiModeConfig;
    },
    setMultiModeConfig: mode => {
      multiModeConfig = mode;
    },
    get currentActiveInstanceId() {
      return currentActiveInstanceId;
    },
    setCurrentActiveInstanceId: id => {
      currentActiveInstanceId = id;
    },
    get isSessionLocked() {
      return isSessionLocked;
    },
    setSessionLocked: locked => {
      isSessionLocked = locked;
    },
    get isSessionDenied() {
      return isSessionDenied;
    },
    setSessionDenied: denied => {
      isSessionDenied = denied;
    },
    get lastAcceptedData() {
      return lastAcceptedData;
    },
    isMultiModeActive,
    getLatestActiveInstanceId,
    broadcastToPorts,
    notifyMediaCountChange,
    emitGlobalEvent,
    on,
    off,
    pauseOthersExcept,
    removeInstance,
    handleUseAdapter,
    handleRemoveAdapter,
    getCustomAdapter,
  };
}

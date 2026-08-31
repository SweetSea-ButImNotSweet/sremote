import { NS, console_log, console_debug } from '../config.js';
import { generateInstanceId } from '../core/utils.js';

export function createInstanceManager() {
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
      const liveIframes = document.querySelectorAll('iframe');
      if (liveIframes.length <= 1 && instances.size <= 1) return false;
    } catch {}
    return instances.size > 1;
  }

  function getLatestActiveInstanceId() {
    if (currentActiveInstanceId && instances.has(currentActiveInstanceId)) {
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

    if (count > 1) {
      const payload = { type: `${NS}multipleMediaDetected`, source: 'parent', count, instances: activeInstances };
      console_debug(`%c[SRemote:signal] Emit -> multipleMediaDetected (source: parent)`, 'color: #06b6d4;', payload);
      window.postMessage(payload, '*');
    } else if (count === 1) {
      const payload = { type: `${NS}singleMediaDetected`, source: 'parent', count: 1, instance: activeInstances[0] };
      console_debug(`%c[SRemote:signal] Emit -> singleMediaDetected (source: parent)`, 'color: #06b6d4;', payload);
      window.postMessage(payload, '*');
    }
  }

  function emitGlobalEvent(event, payload = {}) {
    const ev = String(event || '').toLowerCase();
    if (ev === 'accept' && payload?.instanceId) {
      lastAcceptedData = payload;
    } else if (ev === 'disconnect' && payload?.instanceId && lastAcceptedData?.instanceId === payload.instanceId) {
      lastAcceptedData = null;
    }

    const specificListeners = globalEventListeners.get(ev);
    if (specificListeners) {
      for (const fn of specificListeners) {
        try {
          fn(payload);
        } catch (e) {
          console.warn('[sremote] Error in event listener:', e);
        }
      }
    }

    const wildcardListeners = globalEventListeners.get('*');
    if (wildcardListeners) {
      const starPayload = typeof payload === 'object' && payload !== null ? { action: ev, ...payload } : { action: ev, value: payload };
      for (const fn of wildcardListeners) {
        try {
          fn(starPayload);
        } catch (e) {
          console.warn('[sremote] Error in wildcard listener:', e);
        }
      }
    }
  }

  function pauseOthersExcept(activeInstanceId) {
    for (const [id, item] of instances.entries()) {
      if (id !== activeInstanceId) {
        try {
          item.port?.postMessage({ type: `${NS}pause` });
        } catch {}
      }
    }
  }

  function removeInstance(instanceId, reason = 'disconnected') {
    const item = instances.get(instanceId);
    if (!item) return;
    console_log(`%c[SRemote:lifecycle] Instance removed: ${instanceId} (reason: ${reason})`, 'color: #ef4444; font-weight: bold;');
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
          console_log(`%c[SRemote:adapter] Replacing stale adapter in Single Mode: ${oldId} -> ${targetId}`, 'color: #f59e0b;');
          parentAdaptersMap.delete(oldId);
        }
      }
    }

    adapterVal.emit = (event, payload = {}) => {
      const ev = String(event || '').toLowerCase();
      const fullPayload = { source: 'adapter', instanceId: targetId, mediaType: 'adapter', ...(typeof payload === 'object' && payload !== null ? payload : { value: payload }) };

      if (ev === 'play' || ev === 'playing') {
        if (exclusiveMode === 'auto') {
          pauseOthersExcept(targetId);
        }
      }

      emitGlobalEvent(ev, fullPayload);
    };

    parentAdaptersMap.set(targetId, adapterVal);
    currentActiveInstanceId = targetId;
    console_log(`%c[SRemote:adapter] Registered custom adapter for instance '${targetId}'`, 'color: #06b6d4; font-weight: bold;');

    const acceptPayload = { source: 'adapter', instanceId: targetId, mediaType: 'adapter', location: location.href, origin: location.origin };
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
    pauseOthersExcept,
    removeInstance,
    handleUseAdapter,
    handleRemoveAdapter,
  };
}

import { VERSION, NS, ENABLE_DEBUG_API, logger, pageWindow } from '../config.js';
import { createParentDebugApi } from '../debug/parent-debug.js';
import { buildSRemoteApi } from '@sremote/shared';
import { createInstancesHandlers } from './handlers/instances.js';
import { createRpcHandlers } from './handlers/rpc.js';
import { createCssHandlers } from './handlers/css.js';
import { createLifecycleHandlers } from './handlers/lifecycle.js';

export function createExportedApi({
  instanceManager,
  dispatchCommand,
  validateDomainAccess,
  queryMediaInstancesViaGM,
  topMediaTracker = null,
  transportManager = null,
  tabSessionId = null,
  onHelloInitiated = null,
}) {
  const { instances, assignedIframeIdMap, iframeToAssignedIdMap } = instanceManager;

  // 1. Initialize Domain Handlers
  const instancesHandlers = createInstancesHandlers({ instanceManager, validateDomainAccess, queryMediaInstancesViaGM, logger });

  const rpcHandlers = createRpcHandlers({ instanceManager, validateDomainAccess, getIframeElement: instancesHandlers.getIframeElement, logger, NS });

  const cssHandlers = createCssHandlers({ rpcCall: rpcHandlers.rpcCall });

  const lifecycleHandlers = createLifecycleHandlers({ instanceManager, validateDomainAccess, dispatchCommand, topMediaTracker, tabSessionId, logger, NS });

  const helloWithInitiateTracking = (...args) => {
    try {
      onHelloInitiated?.();
    } catch {}
    return lifecycleHandlers.broadcastHello(...args);
  };

  // 2. Build Unified API Object via buildSRemoteApi
  let exportedApi;

  const debugApi = ENABLE_DEBUG_API
    ? createParentDebugApi({
        instances,
        currentActiveInstanceIdGetter: () => instanceManager.currentActiveInstanceId,
        assignedIframeIdMap,
        iframeToAssignedIdMap,
        dispatchCommand,
        get exportedApi() {
          return exportedApi;
        },
      })
    : null;

  exportedApi = buildSRemoteApi({
    dispatchCommand,
    handlers: { ...instancesHandlers, ...rpcHandlers, ...cssHandlers, onRpcMessage: (handler, key) => exportedApi.on('iframe:message', handler, key) },
    eventsManager: { on: lifecycleHandlers.onEvent, off: lifecycleHandlers.offEvent },
    lifecycleHandlers: { hello: helloWithInitiateTracking, lock: lifecycleHandlers.lockSession, bindMetadata: lifecycleHandlers.bindMetadata },
    debugApi,
    customExtensions: {
      isDummy: false,
      isSremoteNative: true,
      [Symbol.for('__sremote_native__')]: true,
      get logLevel() {
        return logger.level;
      },
      // Dynamic getter to forward any window.sremote.adapters calls directly to Wrapper client
      get adapters() {
        const client = typeof globalThis !== 'undefined' ? globalThis[Symbol.for('__sremote_client__')] : null;
        if (client?.adapters) return client.adapters;
        return {
          create: options => {
            if (client?.adapters?.create) return client.adapters.create(options);
            return null;
          },
          register: (adapter, instanceId) => {
            if (client?.adapters) return client.adapters.register(adapter, instanceId);
            return null;
          },
          unregister: instanceId => {
            if (client?.adapters) return client.adapters.unregister(instanceId);
            return false;
          },
          get: instanceId => {
            if (client?.adapters) return client.adapters.get(instanceId);
            return null;
          },
          has: instanceId => {
            if (client?.adapters) return client.adapters.has(instanceId);
            return false;
          },
          list: () => {
            if (client?.adapters) return client.adapters.list();
            return [];
          },
          get map() {
            if (client?.adapters) return client.adapters.map;
            return new Map();
          },
        };
      },
      destroy() {
        if (transportManager && typeof transportManager.destroy === 'function') {
          transportManager.destroy();
        }
        if (topMediaTracker && typeof topMediaTracker.destroy === 'function') {
          topMediaTracker.destroy();
        }
      },
    },
  });

  // Explicitly bind to unsafeWindow.sremote and pageWindow.sremote
  try {
    if (typeof unsafeWindow !== 'undefined') {
      try {
        Object.defineProperty(unsafeWindow, 'sremote', { value: exportedApi, writable: true, configurable: true, enumerable: true });
      } catch {
        unsafeWindow.sremote = exportedApi;
      }
    }
    if (typeof pageWindow !== 'undefined' && pageWindow !== (typeof unsafeWindow !== 'undefined' ? unsafeWindow : null)) {
      try {
        Object.defineProperty(pageWindow, 'sremote', { value: exportedApi, writable: true, configurable: true, enumerable: true });
      } catch {
        pageWindow.sremote = exportedApi;
      }
    }
  } catch (err) {
    logger.scope('bootstrap').warn('Error defining sremote on window:', err);
  }

  // Proactively dispatch 'sremote:ready' on pageWindow and unsafeWindow for instant wrapper binding (0ms latency)
  try {
    const targetWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : pageWindow;
    if (typeof targetWin.dispatchEvent === 'function') {
      const readyDetail = { version: VERSION, isSremoteNative: true, api: exportedApi };
      const readyEvent =
        typeof CustomEvent === 'function' ? new CustomEvent('sremote:ready', { detail: readyDetail }) : Object.assign(new Event('sremote:ready'), { detail: readyDetail });
      targetWin.dispatchEvent(readyEvent);
    }
  } catch (err) {
    logger.scope('bootstrap').warn('Failed to dispatch sremote:ready event:', err);
  }

  logger.scope('bootstrap').log('window.sremote is ready with unified builder');
  return exportedApi;
}

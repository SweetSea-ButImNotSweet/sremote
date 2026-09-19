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
      [Symbol.for('__sremote_driver__')]: true,
      get logLevel() {
        return logger.level;
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

  // Register Native Driver to internal Symbols for 100% collision-free SDK discovery
  try {
    if (typeof globalThis !== 'undefined') {
      globalThis[Symbol.for('__sremote_native_driver__')] = exportedApi;
      // Backward compatibility for internal bridge resolution during transition
      globalThis[Symbol.for('__sremote_internal_bridge__')] = exportedApi;
    }
  } catch {}

  // Proactively dispatch 'sremote:driver:ready' and 'sremote:ready' for late-loading SDK clients
  try {
    const targetWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : pageWindow;
    if (typeof targetWin?.dispatchEvent === 'function') {
      const driverDetail = { version: VERSION, isSremoteNative: true, driver: exportedApi, api: exportedApi };
      const driverReadyEvent =
        typeof CustomEvent === 'function'
          ? new CustomEvent('sremote:driver:ready', { detail: driverDetail })
          : Object.assign(new Event('sremote:driver:ready'), { detail: driverDetail });
      targetWin.dispatchEvent(driverReadyEvent);

      // Legacy fallback event
      const legacyReadyEvent =
        typeof CustomEvent === 'function' ? new CustomEvent('sremote:ready', { detail: driverDetail }) : Object.assign(new Event('sremote:ready'), { detail: driverDetail });
      targetWin.dispatchEvent(legacyReadyEvent);
    }
  } catch (err) {
    logger.scope('bootstrap').warn('Failed to dispatch sremote:driver:ready event:', err);
  }

  logger.scope('bootstrap').log('SRemote Native Driver is ready');
  return exportedApi;
}

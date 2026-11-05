import { VERSION, NS, ENABLE_DEBUG_API } from '../const.js';
import { logger, pageWindow } from '../config.js';
import { createParentDebugApi } from '../debug/parent-debug.js';
import { buildSRemoteApi } from '@sremote/shared';
import { createInstancesHandlers } from './handlers/instances.js';
import { createRpcHandlers } from './handlers/rpc.js';
import { createCssHandlers } from './handlers/css.js';
import { createLifecycleHandlers } from './handlers/lifecycle.js';

export function createExportedApi({ instanceManager, dispatchCommand, validateDomainAccess, topMediaTracker = null, transportManager = null, onHelloInitiated = null }) {
  const { instances, assignedIframeIdMap, iframeToAssignedIdMap } = instanceManager;

  // 1. Initialize Domain Handlers
  const instancesHandlers = createInstancesHandlers({ instanceManager, transportManager, validateDomainAccess, logger });

  const rpcHandlers = createRpcHandlers({ instanceManager, validateDomainAccess, getIframeElement: instancesHandlers.getIframeElement, logger, NS });

  const cssHandlers = createCssHandlers({ rpcCall: rpcHandlers.rpcCall });

  const lifecycleHandlers = createLifecycleHandlers({ instanceManager, validateDomainAccess, dispatchCommand, topMediaTracker, transportManager, logger, NS });

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
      isSremoteNative: true,
      [Symbol.for('__sremote_native_driver__')]: true,
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
  const targetWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : pageWindow;
  try {
    if (targetWin) {
      targetWin[Symbol.for('__sremote_native_driver__')] = exportedApi;
      targetWin[Symbol.for('__sremote_internal_bridge__')] = exportedApi;
    }
    if (typeof globalThis !== 'undefined' && globalThis !== targetWin) {
      globalThis[Symbol.for('__sremote_native_driver__')] = exportedApi;
      globalThis[Symbol.for('__sremote_internal_bridge__')] = exportedApi;
    }
  } catch {}

  // Proactively dispatch 'sremote:driver:ready' and listen for late-loading SDK ping
  const dispatchReady = () => {
    try {
      if (typeof targetWin?.dispatchEvent === 'function') {
        const driverDetail = { version: VERSION, isSremoteNative: true, driver: exportedApi, api: exportedApi };
        const driverReadyEvent =
          typeof CustomEvent === 'function'
            ? new CustomEvent('sremote:driver:ready', { detail: driverDetail })
            : Object.assign(new Event('sremote:driver:ready'), { detail: driverDetail });
        targetWin.dispatchEvent(driverReadyEvent);
      }
    } catch (err) {
      logger.scope('bootstrap').warn('Failed to dispatch sremote:driver:ready event:', err);
    }
  };

  dispatchReady();

  try {
    targetWin?.addEventListener?.('sremote:client:ping', dispatchReady);
  } catch {}

  logger.scope('bootstrap').log('SRemote Native Driver is ready');
  return exportedApi;
}

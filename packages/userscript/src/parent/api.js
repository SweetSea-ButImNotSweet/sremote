import { VERSION, NS, ENABLE_DEBUG_API, logger, pageWindow } from '../config.js';
import { Storage, setHandshakeSecret } from '../core/storage.js';
import { generateInstanceId } from '../core/utils.js';
import { pendingRpcRequests } from './queue.js';
import { createParentDebugApi } from '../debug/parent-debug.js';
import { extractMediaState, evaluateCapabilities, buildSRemoteApi } from '@sremote/shared';

export function createExportedApi({ instanceManager, dispatchCommand, validateDomainAccess, queryMediaInstancesViaGM, topMediaTracker = null, transportManager = null }) {
  const { instances, assignedIframeIdMap, iframeToAssignedIdMap, globalEventListeners, isMultiModeActive, getLatestActiveInstanceId, pauseOthersExcept } = instanceManager;

  // --- 1. Internal Helpers ---
  const assignIframeId = (iframeOrSelector, customId) => {
    if (!customId || typeof customId !== 'string') return false;
    let el = null;
    if (typeof iframeOrSelector === 'string') {
      el = document.querySelector(iframeOrSelector);
    } else if (iframeOrSelector?.nodeType === 1 && iframeOrSelector?.tagName === 'IFRAME') {
      el = iframeOrSelector;
    }
    if (!el) return false;
    const cleanId = customId.trim();
    el.setAttribute('data-sremote-id', cleanId);
    assignedIframeIdMap.set(cleanId, el);
    iframeToAssignedIdMap.set(el, cleanId);
    logger.scope('assignId').log(`Pre-assigned instance ID '${cleanId}' to iframe element`, el);
    return true;
  };

  const getIframeElement = (instanceId, key) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked getIframe()! Valid Passkey is required.');
      return null;
    }
    if (!instanceId) return null;
    const inst = instances.get(instanceId);
    if (inst?.iframeEl?.isConnected) return inst.iframeEl;
    return assignedIframeIdMap.get(instanceId) || null;
  };

  const getStatus = (instanceId, key) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked status()! Valid Passkey is required.');
      return null;
    }
    let targetId = instanceId;
    if (!targetId) {
      targetId = instanceManager.currentActiveInstanceId || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
    }

    if (targetId && instances.has(targetId)) {
      const inst = instances.get(targetId);
      if (inst.isTopMedia && inst.mediaElement) {
        return extractMediaState(inst.mediaElement);
      }
      return inst.state || null;
    }
    return null;
  };

  const getCapabilities = (instanceId, key) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked capabilities()! Valid Passkey is required.');
      return null;
    }
    let targetId = instanceId;
    if (!targetId) {
      targetId = instanceManager.currentActiveInstanceId || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
    }
    if (targetId && instances.has(targetId)) {
      const inst = instances.get(targetId);
      if (inst.isTopMedia && inst.mediaElement) {
        return evaluateCapabilities(inst.mediaElement);
      }
      return (
        inst.capabilities || {
          play: true,
          pause: true,
          toggle: true,
          stop: true,
          seek: true,
          volume: true,
          muted: true,
          speed: true,
          playbackRate: true,
          pip: inst.mediaType === 'video',
          quality: false,
          subtitles: false,
          shuffle: false,
          repeat: true,
          next: false,
          previous: false,
          load: true,
          hasAdapter: false,
          hasNative: Boolean(inst.mediaType === 'video' || inst.mediaType === 'audio'),
          hasMediaSession: false,
        }
      );
    }
    return null;
  };

  const listInstances = key => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked list()! Valid Passkey is required.');
      return [];
    }
    const result = Array.from(instances.entries()).map(([id, info]) => ({
      instanceId: id,
      location: info.location,
      origin: info.origin,
      note: info.note || '',
      mediaType: info.mediaType,
      capabilities: info.capabilities || null,
      state: info.state,
      status: info.status || 'ready',
    }));
    return result;
  };

  const setMultiMode = (mode, key) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked setMultiMode()! Valid Passkey is required.');
      return;
    }
    if (typeof mode === 'boolean' || mode === null) {
      instanceManager.setMultiModeConfig(mode);
    }
  };

  const isMultiMode = key => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked isMultiMode()! Valid Passkey is required.');
      return false;
    }
    return isMultiModeActive();
  };

  const setExclusive = (mode, key) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked setExclusive()! Valid Passkey is required.');
      return;
    }
    instanceManager.setExclusiveMode(mode);
    if (mode && mode !== 'auto' && instances.has(mode)) {
      pauseOthersExcept(mode);
    }
  };

  const annotateInstances = (notesDict, key) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked note()! Valid Passkey is required.');
      return;
    }
    if (typeof notesDict === 'object' && notesDict) {
      for (const [id, note] of Object.entries(notesDict)) {
        const inst = instances.get(id);
        if (inst) inst.note = String(note);
      }
    }
  };

  const queryInstances = key => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked query()! Valid Passkey is required.');
      return [];
    }
    return queryMediaInstancesViaGM();
  };

  const rpcCall = (action, params, instanceId, key) => {
    if (!validateDomainAccess(key)) {
      return Promise.resolve({
        success: false,
        error: 'AUTH_FAILED',
        message: `Access denied. Valid Passkey is required for call('${action}')`,
        action,
        instanceId: instanceId || null,
      });
    }
    const targetId = instanceId || getLatestActiveInstanceId();
    const target = targetId ? instances.get(targetId) : null;
    if (!target?.port) {
      return Promise.resolve({
        success: false,
        error: 'INSTANCE_NOT_FOUND',
        message: `No active port for instance '${targetId || 'unknown'}'`,
        action,
        instanceId: targetId || null,
      });
    }
    return new Promise(resolve => {
      const rpcId = generateInstanceId('rpc');
      const timer = setTimeout(() => {
        pendingRpcRequests.delete(rpcId);
        resolve({ success: false, error: 'TIMEOUT', message: `RPC call '${action}' timed out after 5000ms`, action, instanceId: targetId });
      }, 5000);
      pendingRpcRequests.set(rpcId, { resolve, timer });
      try {
        target.port.postMessage({ type: `${NS}rpc_request`, source: 'parent', rpcId, action, params });
      } catch (err) {
        clearTimeout(timer);
        pendingRpcRequests.delete(rpcId);
        resolve({ success: false, error: 'PORT_ERROR', message: String(err), action, instanceId: targetId });
      }
    });
  };

  const postWindowMessage = (message, targetOrigin = '*', instanceId = null, from = 'parent', key = null) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked postWindowMessage()! Valid Passkey is required.');
      return false;
    }
    const targetId = instanceId || getLatestActiveInstanceId();
    const origin = typeof targetOrigin === 'string' ? targetOrigin : '*';
    const fromSource = String(from || 'parent').toLowerCase();

    if (fromSource === 'parent') {
      const iframeEl = getIframeElement(targetId, key);
      if (iframeEl?.contentWindow && typeof iframeEl.contentWindow.postMessage === 'function') {
        try {
          iframeEl.contentWindow.postMessage(message, origin);
          return true;
        } catch (err) {
          logger.scope('rpc').warn('Error posting message from parent to iframe window:', err);
          return false;
        }
      }
    }

    const target = targetId ? instances.get(targetId) : null;
    if (!target?.port) {
      logger.scope('rpc').warn(`Cannot post message: No active connection for instance '${targetId || 'unknown'}'`);
      return false;
    }
    try {
      target.port.postMessage({ type: `${NS}bridge_post`, source: 'parent', payload: message, targetOrigin: origin });
      return true;
    } catch (err) {
      logger.scope('rpc').warn('Error in postWindowMessage via MessagePort bridge:', err);
      return false;
    }
  };

  const setIframeCSS = (css, instanceId, key) => rpcCall('setIframeCSS', { css: String(css || '') }, instanceId, key);
  const getIframeCSS = (instanceId, key) => rpcCall('getIframeCSS', {}, instanceId, key);
  const removeIframeCSS = (instanceId, key) => rpcCall('removeIframeCSS', {}, instanceId, key);

  const getQualities = instanceId => {
    const inst = instanceId ? instances.get(instanceId) : null;
    return inst?.capabilities?.qualities || [];
  };

  const getSubtitles = instanceId => {
    const inst = instanceId ? instances.get(instanceId) : null;
    return inst?.capabilities?.subtitles || [];
  };

  const onEvent = (event, handler, key) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked on()! Valid Passkey is required.');
      return () => {};
    }
    const ev = String(event || '').toLowerCase();
    if (!globalEventListeners.has(ev)) globalEventListeners.set(ev, new Set());
    globalEventListeners.get(ev).add(handler);

    // Sticky replay
    const lastAcceptedData = instanceManager.lastAcceptedData;
    if ((ev === 'accept' || ev === '*') && lastAcceptedData && instances.has(lastAcceptedData.instanceId)) {
      try {
        const payload = ev === '*' ? { action: 'accept', ...lastAcceptedData } : lastAcceptedData;
        setTimeout(() => {
          try {
            handler(payload);
          } catch {}
        }, 0);
      } catch {}
    }

    return () => offEvent(ev, handler);
  };

  const offEvent = (event, handler) => {
    const ev = String(event || '').toLowerCase();
    globalEventListeners.get(ev)?.delete(handler);
  };

  const lockSession = () => {
    instanceManager.setSessionLocked(true);
    logger.scope('lock').log('SRemote is now session-locked for this page');
    return true;
  };

  let lastHelloTimestamp = 0;
  let activeHandshakeId = null;
  let activeHandshakeToken = null;

  const broadcastHello = (options = {}, target = null) => {
    let targetIframeWindow = target;
    let providedKey = null;
    let customCss = null;
    let treatAlmostEndAsEnd = null;

    if (options && typeof options === 'object') {
      if (typeof options.multiMode === 'boolean' || options.multiMode === null) {
        instanceManager.setMultiModeConfig(options.multiMode);
      }
      if (typeof options.treatAlmostEndAsEnd === 'boolean') {
        treatAlmostEndAsEnd = options.treatAlmostEndAsEnd;
      }
      if (!targetIframeWindow && options.target) {
        targetIframeWindow = options.target;
      }
      if (options.key) {
        providedKey = String(options.key).trim();
      }
      if (options.css && typeof options.css === 'string') {
        customCss = options.css;
      }
      if (typeof options.trackParent === 'boolean' && topMediaTracker) {
        if (options.trackParent) {
          topMediaTracker.start();
        } else {
          topMediaTracker.stop();
        }
      }
    }

    if (!validateDomainAccess(providedKey)) {
      const hostDomain = location.hostname || 'this_domain';
      logger.scope('auth').error(`Blocked hello() on locked domain '${hostDomain}'! Valid Passkey is required in hello({ key: '...' }).`);
      return false;
    }

    logger.scope('auth').log(`Access authorized for domain '${location.hostname}'`);

    const now = Date.now();
    // React Strict Mode & Rapid Call Coalescing:
    // If hello() is called repeatedly within 150ms without target change, reuse the active handshake secrets
    const isRapidRepeat = now - lastHelloTimestamp < 150 && activeHandshakeId && activeHandshakeToken && !targetIframeWindow;
    lastHelloTimestamp = now;

    let handshakeId;
    let handshakeToken;

    if (isRapidRepeat) {
      handshakeId = activeHandshakeId;
      handshakeToken = activeHandshakeToken;
      logger.scope('hello').log('Coalescing rapid hello call (Strict Mode safe)');
    } else {
      handshakeId = generateInstanceId('hs');
      handshakeToken = generateInstanceId('tok');
      activeHandshakeId = handshakeId;
      activeHandshakeToken = handshakeToken;
      setHandshakeSecret(handshakeId, handshakeToken);
    }

    const currentSeq = Number(Storage.get('sremote:hello_seq', 0)) || 0;
    const nextSeq = isRapidRepeat ? currentSeq : currentSeq + 1;
    if (!isRapidRepeat) {
      Storage.set('sremote:hello_seq', nextSeq);
    }

    Storage.set('sremote:latest_handshake', {
      seq: nextSeq,
      handshakeId,
      handshakeToken,
      parentOrigin: location.origin,
      css: customCss,
      ...(treatAlmostEndAsEnd !== null ? { treatAlmostEndAsEnd } : {}),
      timestamp: Date.now(),
    });

    const createHelloPayload = assignedInstanceId => ({
      type: `${NS}hello`,
      source: 'parent',
      handshakeId,
      handshakeToken,
      seq: nextSeq,
      ...(customCss ? { css: customCss } : {}),
      ...(treatAlmostEndAsEnd !== null ? { treatAlmostEndAsEnd } : {}),
      ...(assignedInstanceId ? { assignedInstanceId } : {}),
    });

    logger.scope('hello').log(`Parent sending hello (seq: ${nextSeq}) ->`, { hasTarget: !!targetIframeWindow, handshakeId, seq: nextSeq, hasCss: Boolean(customCss) });

    if (targetIframeWindow && typeof targetIframeWindow.postMessage === 'function') {
      try {
        let assignedId = null;
        try {
          const iframes = document.querySelectorAll('iframe');
          for (let i = 0; i < iframes.length; i++) {
            if (iframes[i].contentWindow === targetIframeWindow) {
              assignedId = iframes[i].getAttribute('data-sremote-id') || iframeToAssignedIdMap.get(iframes[i]) || null;
              break;
            }
          }
        } catch {}
        targetIframeWindow.postMessage(createHelloPayload(assignedId), '*');
      } catch (err) {
        logger.scope('hello').warn('Error posting hello to target iframe:', err);
      }
      return true;
    }

    try {
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        try {
          const ifr = iframes[i];
          const assignedId = ifr.getAttribute('data-sremote-id') || iframeToAssignedIdMap.get(ifr) || null;
          ifr.contentWindow?.postMessage(createHelloPayload(assignedId), '*');
        } catch {}
      }
    } catch {}

    try {
      for (let i = 0; i < window.frames.length; i++) {
        try {
          window.frames[i].postMessage(createHelloPayload(null), '*');
        } catch {}
      }
    } catch {}

    return true;
  };

  // --- 2. Build Unified API Object via buildSRemoteApi ---
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
    handlers: {
      getStatus,
      getCapabilities,
      getQualities,
      getSubtitles,
      listInstances,
      getIframeElement,
      assignIframeId,
      setMultiMode,
      isMultiMode,
      setExclusive,
      queryInstances,
      annotateInstances,
      rpcCall,
      postWindowMessage,
      onRpcMessage: (handler, key) => exportedApi.on('iframe:message', handler, key),
      setIframeCSS,
      getIframeCSS,
      removeIframeCSS,
    },
    eventsManager: { on: onEvent, off: offEvent },
    lifecycleHandlers: { hello: broadcastHello, lock: lockSession, bindMetadata: (meta, instanceId, key) => dispatchCommand('bindMetadata', meta, instanceId, key) },
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

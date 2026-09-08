import { NS, ENABLE_DEBUG_API, logger, console_log, console_warn, console_error, pageWindow } from '../config.js';
import { Storage, setHandshakeSecret } from '../core/storage.js';
import { generateInstanceId } from '../core/utils.js';
import { pendingRpcRequests } from './queue.js';
import { createParentDebugApi } from '../debug/parent-debug.js';
import { extractMediaState, evaluateCapabilities, buildSRemoteApi } from '@sremote/shared';

export function createExportedApi({ instanceManager, dispatchCommand, validateDomainAccess, queryMediaInstancesViaGM, topMediaTracker = null }) {
  const {
    instances,
    parentAdaptersMap,
    assignedIframeIdMap,
    iframeToAssignedIdMap,
    globalEventListeners,
    isMultiModeActive,
    getLatestActiveInstanceId,
    pauseOthersExcept,
    handleUseAdapter,
    handleRemoveAdapter,
  } = instanceManager;

  // --- 1. Internal Helpers ---
  const assignIframeId = (iframeOrSelector, customId) => {
    if (!customId || typeof customId !== 'string') return false;
    let el = null;
    if (typeof iframeOrSelector === 'string') {
      el = document.querySelector(iframeOrSelector);
    } else if (iframeOrSelector && iframeOrSelector.nodeType === 1 && iframeOrSelector.tagName === 'IFRAME') {
      el = iframeOrSelector;
    }
    if (!el) return false;
    const cleanId = customId.trim();
    el.setAttribute('data-sremote-id', cleanId);
    assignedIframeIdMap.set(cleanId, el);
    iframeToAssignedIdMap.set(el, cleanId);
    console_log(`%c[SRemote:assignId] Pre-assigned instance ID '${cleanId}' to iframe element`, 'color: #10b981; font-weight: bold;', el);
    return true;
  };

  const getIframeElement = (instanceId, key) => {
    if (!validateDomainAccess(key)) {
      console_error('[SRemote:auth] Blocked getIframe()! Valid Passkey is required.');
      return null;
    }
    if (!instanceId) return null;
    const inst = instances.get(instanceId);
    if (inst?.iframeEl && inst.iframeEl.isConnected) return inst.iframeEl;
    return assignedIframeIdMap.get(instanceId) || null;
  };

  const getStatus = (instanceId, key) => {
    if (!validateDomainAccess(key)) {
      console_error('[SRemote:auth] Blocked status()! Valid Passkey is required.');
      return null;
    }
    const isSingle = !isMultiModeActive();
    let targetId = instanceId;
    if (!targetId) {
      if (isSingle && parentAdaptersMap.size > 0) {
        targetId = Array.from(parentAdaptersMap.keys())[parentAdaptersMap.size - 1];
      } else {
        targetId = instanceManager.currentActiveInstanceId || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
      }
    }

    if (targetId && parentAdaptersMap.has(targetId)) {
      const adapter = parentAdaptersMap.get(targetId);
      return extractMediaState(adapter);
    }
    if (targetId && instances.has(targetId)) {
      const inst = instances.get(targetId);
      if (inst.isTopMedia && inst.mediaElement) {
        return extractMediaState(inst.mediaElement);
      }
      return inst.state || null;
    }
    if (!targetId && parentAdaptersMap.size > 0) {
      return extractMediaState(Array.from(parentAdaptersMap.values())[parentAdaptersMap.size - 1]);
    }
    return null;
  };

  const resolveAdapterCapabilities = adapter => {
    if (!adapter) return null;
    return evaluateCapabilities(adapter);
  };

  const getCapabilities = (instanceId, key) => {
    if (!validateDomainAccess(key)) {
      console_error('[SRemote:auth] Blocked capabilities()! Valid Passkey is required.');
      return null;
    }
    const isSingle = !isMultiModeActive();
    let targetId = instanceId;
    if (!targetId) {
      if (isSingle && parentAdaptersMap.size > 0) {
        targetId = Array.from(parentAdaptersMap.keys())[parentAdaptersMap.size - 1];
      } else {
        targetId = instanceManager.currentActiveInstanceId || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
      }
    }

    if (targetId && parentAdaptersMap.has(targetId)) {
      return resolveAdapterCapabilities(parentAdaptersMap.get(targetId));
    }
    if (!targetId && parentAdaptersMap.size > 0) {
      return resolveAdapterCapabilities(Array.from(parentAdaptersMap.values())[parentAdaptersMap.size - 1]);
    }
    if (targetId && instances.has(targetId)) {
      const inst = instances.get(targetId);
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
      console_error('[SRemote:auth] Blocked list()! Valid Passkey is required.');
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
    for (const [id, adapter] of parentAdaptersMap.entries()) {
      result.push({
        instanceId: id,
        location: location.href,
        origin: location.origin,
        note: 'Parent Custom Adapter',
        mediaType: 'adapter',
        capabilities: resolveAdapterCapabilities(adapter),
        status: 'ready',
        state: extractMediaState(adapter),
      });
    }
    return result;
  };

  const setMultiMode = (mode, key) => {
    if (!validateDomainAccess(key)) {
      console_error('[SRemote:auth] Blocked setMultiMode()! Valid Passkey is required.');
      return;
    }
    if (typeof mode === 'boolean' || mode === null) {
      instanceManager.setMultiModeConfig(mode);
    }
  };

  const isMultiMode = key => {
    if (!validateDomainAccess(key)) {
      console_error('[SRemote:auth] Blocked isMultiMode()! Valid Passkey is required.');
      return false;
    }
    return isMultiModeActive();
  };

  const setExclusive = (mode, key) => {
    if (!validateDomainAccess(key)) {
      console_error('[SRemote:auth] Blocked setExclusive()! Valid Passkey is required.');
      return;
    }
    instanceManager.setExclusiveMode(mode);
    if (mode && mode !== 'auto' && instances.has(mode)) {
      pauseOthersExcept(mode);
    }
  };

  const annotateInstances = (notesDict, key) => {
    if (!validateDomainAccess(key)) {
      console_error('[SRemote:auth] Blocked note()! Valid Passkey is required.');
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
      console_error('[SRemote:auth] Blocked query()! Valid Passkey is required.');
      return [];
    }
    return queryMediaInstancesViaGM();
  };

  const registerAdapter = (adapter, instanceId, key) => {
    if (!validateDomainAccess(key)) {
      console_error('[SRemote:auth] Blocked adapters.register()! Valid Passkey is required.');
      return null;
    }
    const registeredId = handleUseAdapter(adapter, instanceId);
    if (registeredId && topMediaTracker) {
      topMediaTracker.suppressMediaElement?.(registeredId);
      if (adapter?.element) {
        topMediaTracker.suppressMediaElement?.(adapter.element);
      }
      if (adapter?.iframe) {
        topMediaTracker.suppressMediaElement?.(adapter.iframe);
      }
    }
    return registeredId;
  };

  const unregisterAdapter = (instanceId, key) => {
    if (!validateDomainAccess(key)) {
      console_error('[SRemote:auth] Blocked adapters.unregister()! Valid Passkey is required.');
      return false;
    }
    return handleRemoveAdapter(instanceId);
  };

  const getCustomAdapter = (instanceId, key) => {
    if (!validateDomainAccess(key)) {
      console_error('[SRemote:auth] Blocked adapters.get()! Valid Passkey is required.');
      return null;
    }
    if (instanceId) return parentAdaptersMap.get(instanceId) || null;
    if (parentAdaptersMap.size === 1) return Array.from(parentAdaptersMap.values())[0] || null;
    // Prefer currentActiveInstanceId if it points to an adapter, otherwise return the latest adapter
    return parentAdaptersMap.get(instanceManager.currentActiveInstanceId) || Array.from(parentAdaptersMap.values())[parentAdaptersMap.size - 1] || null;
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
    if (!target || !target.port) {
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
      console_error('[SRemote:auth] Blocked postWindowMessage()! Valid Passkey is required.');
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
          console_warn('[sremote] Error posting message from parent to iframe window:', err);
          return false;
        }
      }
    }

    const target = targetId ? instances.get(targetId) : null;
    if (!target || !target.port) {
      console_warn(`[sremote] Cannot post message: No active connection for instance '${targetId || 'unknown'}'`);
      return false;
    }
    try {
      target.port.postMessage({ type: `${NS}bridge_post`, source: 'parent', payload: message, targetOrigin: origin });
      return true;
    } catch (err) {
      console_warn('[sremote] Error in postWindowMessage via MessagePort bridge:', err);
      return false;
    }
  };

  const setIframeCSS = (css, instanceId, key) => rpcCall('setIframeCSS', { css: String(css || '') }, instanceId, key);
  const getIframeCSS = (instanceId, key) => rpcCall('getIframeCSS', {}, instanceId, key);
  const removeIframeCSS = (instanceId, key) => rpcCall('removeIframeCSS', {}, instanceId, key);

  const getQualities = (instanceId, key) => {
    const adapter = getCustomAdapter(instanceId, key);
    return adapter && typeof adapter.getQualities === 'function' ? adapter.getQualities() : [];
  };

  const getSubtitles = (instanceId, key) => {
    const adapter = getCustomAdapter(instanceId, key);
    return adapter && typeof adapter.getSubtitles === 'function' ? adapter.getSubtitles() : [];
  };

  const onEvent = (event, handler, key) => {
    if (!validateDomainAccess(key)) {
      console_error('[SRemote:auth] Blocked on()! Valid Passkey is required.');
      return () => {};
    }
    const ev = String(event || '').toLowerCase();
    if (!globalEventListeners.has(ev)) globalEventListeners.set(ev, new Set());
    globalEventListeners.get(ev).add(handler);

    // Sticky replay
    const lastAcceptedData = instanceManager.lastAcceptedData;
    if ((ev === 'accept' || ev === '*') && lastAcceptedData && (instances.has(lastAcceptedData.instanceId) || parentAdaptersMap.has(lastAcceptedData.instanceId))) {
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
    console_log(`%c[SRemote:lock] SRemote is now session-locked for this page`, 'background: #0f172a; color: #38bdf8; font-weight: bold;');
    return true;
  };

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
      console_error(`%c[SRemote:auth] Blocked hello() on locked domain '${hostDomain}'! Valid Passkey is required in hello({ key: '...' }).`, 'color: #ef4444; font-weight: bold;');
      return false;
    }

    console_log(`%c[SRemote:auth] Access authorized for domain '${location.hostname}'`, 'color: #10b981; font-weight: bold;');

    const handshakeId = generateInstanceId('hs');
    const handshakeToken = generateInstanceId('tok');
    setHandshakeSecret(handshakeId, handshakeToken);

    const currentSeq = Number(Storage.get('sremote:hello_seq', 0)) || 0;
    const nextSeq = currentSeq + 1;
    Storage.set('sremote:hello_seq', nextSeq);
    const hasParentAdapter = parentAdaptersMap.size > 0;
    const adapterIds = hasParentAdapter ? Array.from(parentAdaptersMap.keys()) : [];

    Storage.set('sremote:latest_handshake', {
      seq: nextSeq,
      handshakeId,
      handshakeToken,
      parentOrigin: location.origin,
      css: customCss,
      hasParentAdapter,
      adapterIds,
      ...(treatAlmostEndAsEnd !== null ? { treatAlmostEndAsEnd } : {}),
      timestamp: Date.now(),
    });

    const createHelloPayload = assignedInstanceId => ({
      type: `${NS}hello`,
      source: 'parent',
      handshakeId,
      handshakeToken,
      seq: nextSeq,
      hasParentAdapter,
      adapterIds,
      ...(customCss ? { css: customCss } : {}),
      ...(treatAlmostEndAsEnd !== null ? { treatAlmostEndAsEnd } : {}),
      ...(assignedInstanceId ? { assignedInstanceId } : {}),
    });

    console_log(`%c[SRemote:hello] Parent sending hello (seq: ${nextSeq}) ->`, 'color: #38bdf8; font-weight: bold;', {
      hasTarget: !!targetIframeWindow,
      handshakeId,
      seq: nextSeq,
      hasParentAdapter,
      hasCss: Boolean(customCss),
    });

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
        console_warn('[sremote] Error posting hello to target iframe:', err);
      }
      return;
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
      registerAdapter,
      unregisterAdapter,
      getCustomAdapter,
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
    },
  });

  try {
    Object.defineProperty(pageWindow, 'sremote', { value: exportedApi, writable: false, configurable: false, enumerable: true });
  } catch {
    pageWindow.sremote = exportedApi;
  }

  console_log(`%c[sremote] window.sremote is ready with unified builder`, 'background: #065f46; color: #34d399; font-weight: bold;');
  return exportedApi;
}

import { NS, ENABLE_DEBUG_API, console_log, console_warn, console_error, pageWindow } from '../config.js';
import { Storage, setHandshakeSecret } from '../core/storage.js';
import { generateInstanceId } from '../core/utils.js';
import { pendingRpcRequests } from './queue.js';
import { createParentDebugApi } from '../debug/parent-debug.js';
import { extractMediaState, evaluateCapabilities } from '@sremote/shared';

export function createExportedApi({ instanceManager, dispatchCommand, validateDomainAccess, queryMediaInstancesViaGM }) {
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
    const activeId = instanceManager.currentActiveInstanceId;
    const targetId = instanceId || activeId || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
    if (!targetId) return null;
    if (instances.has(targetId)) return instances.get(targetId).state || null;
    if (parentAdaptersMap.has(targetId)) {
      const adapter = parentAdaptersMap.get(targetId);
      return extractMediaState(adapter);
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
    const activeId = instanceManager.currentActiveInstanceId;
    const targetId = instanceId || activeId || (instances.size === 1 ? Array.from(instances.keys())[0] : null);

    if (targetId && parentAdaptersMap.has(targetId)) {
      return resolveAdapterCapabilities(parentAdaptersMap.get(targetId));
    }
    if (!targetId && parentAdaptersMap.size === 1) {
      return resolveAdapterCapabilities(Array.from(parentAdaptersMap.values())[0]);
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
    return handleUseAdapter(adapter, instanceId);
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
    return parentAdaptersMap.get(instanceManager.currentActiveInstanceId) || null;
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

  // --- 2. Clean Dedicated Domain Sub-Namespaces ---

  const instancesNamespace = Object.freeze({
    list: listInstances,
    get: (instanceId, key) => getStatus(instanceId, key),
    capabilities: (instanceId, key) => getCapabilities(instanceId, key),
    getCapabilities: (instanceId, key) => getCapabilities(instanceId, key),
    getIframe: getIframeElement,
    assign: assignIframeId,
    setMultiMode,
    isMultiMode,
    setExclusive,
    query: queryInstances,
    note: annotateInstances,
  });

  const adaptersNamespace = Object.freeze({ register: registerAdapter, unregister: unregisterAdapter, get: getCustomAdapter });

  const rpcNamespace = Object.freeze({ call: rpcCall, postMessage: postWindowMessage, onMessage: (handler, key) => exportedApi.on('iframe:message', handler, key) });

  const cssNamespace = Object.freeze({ set: setIframeCSS, get: getIframeCSS, remove: removeIframeCSS });

  // --- 3. Build Strict Decluttered Root API ---

  const exportedApi = {
    // Quick Playback Controls
    play: (instanceId, key) => dispatchCommand('play', undefined, instanceId, key),
    pause: (instanceId, key) => dispatchCommand('pause', undefined, instanceId, key),
    toggle: (instanceId, key) => dispatchCommand('toggle', undefined, instanceId, key),
    stop: (instanceId, key) => dispatchCommand('stop', undefined, instanceId, key),
    seek: (offset, instanceId, key) => dispatchCommand('seek', offset, instanceId, key),
    seekTo: (time, instanceId, key) => dispatchCommand('currentTime', time, instanceId, key),
    volume: (vol, instanceId, key) => dispatchCommand('volume', vol, instanceId, key),
    mute: (muted, instanceId, key) => dispatchCommand('muted', muted, instanceId, key),
    rate: (rate, instanceId, key) => dispatchCommand('playbackRate', rate, instanceId, key),
    playbackRate: (rate, instanceId, key) => dispatchCommand('playbackRate', rate, instanceId, key),
    quality: (level, instanceId, key) => dispatchCommand('quality', level, instanceId, key),
    getQualities: (instanceId, key) => {
      const adapter = getCustomAdapter(instanceId, key);
      return adapter && typeof adapter.getQualities === 'function' ? adapter.getQualities() : [];
    },
    subtitle: (track, instanceId, key) => dispatchCommand('subtitle', track, instanceId, key),
    getSubtitles: (instanceId, key) => {
      const adapter = getCustomAdapter(instanceId, key);
      return adapter && typeof adapter.getSubtitles === 'function' ? adapter.getSubtitles() : [];
    },
    shuffle: (enable, instanceId, key) => dispatchCommand('shuffle', enable, instanceId, key),
    repeat: (mode, instanceId, key) => dispatchCommand('repeat', mode, instanceId, key),
    next: (instanceId, key) => dispatchCommand('next', undefined, instanceId, key),
    previous: (instanceId, key) => dispatchCommand('previous', undefined, instanceId, key),
    pip: (enable, instanceId, key) => {
      const _instanceId = typeof enable === 'string' ? enable : instanceId;
      const _enabled = typeof enable === 'boolean' ? enable : undefined;
      return dispatchCommand(_enabled === true ? 'enterpip' : _enabled === false ? 'exitpip' : 'pip', undefined, _instanceId, key);
    },
    load: (source, instanceId, key) => dispatchCommand('load', source, instanceId, key),
    status: getStatus,
    capabilities: getCapabilities,

    // Subsystems
    instances: instancesNamespace,
    adapters: adaptersNamespace,
    rpc: rpcNamespace,
    css: cssNamespace,

    // Metadata
    bindMetadata: (meta, instanceId, key) => dispatchCommand('bindMetadata', meta, instanceId, key),

    // Events & Lifecycle
    on: (event, handler, key) => {
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

      return () => exportedApi.off(ev, handler);
    },
    off: (event, handler) => {
      const ev = String(event || '').toLowerCase();
      globalEventListeners.get(ev)?.delete(handler);
    },
    lock: () => {
      instanceManager.setSessionLocked(true);
      console_log(`%c[SRemote:lock] SRemote is now session-locked for this page`, 'background: #0f172a; color: #38bdf8; font-weight: bold;');
      return true;
    },
    hello: (options = {}, target = null) => {
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
      }

      if (!validateDomainAccess(providedKey)) {
        const hostDomain = location.hostname || 'this_domain';
        console_error(
          `%c[SRemote:auth] Blocked hello() on locked domain '${hostDomain}'! Valid Passkey is required in hello({ key: '...' }).`,
          'color: #ef4444; font-weight: bold;',
        );
        return false;
      }

      console_log(`%c[SRemote:auth] Access authorized for domain '${location.hostname}'`, 'color: #10b981; font-weight: bold;');

      const handshakeId = generateInstanceId('hs');
      const handshakeToken = generateInstanceId('tok');
      setHandshakeSecret(handshakeId, handshakeToken);

      const currentSeq = Number(Storage.get('sremote:hello_seq', 0)) || 0;
      const nextSeq = currentSeq + 1;
      Storage.set('sremote:hello_seq', nextSeq);
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

      console_log(`%c[SRemote:hello] Parent sending hello (seq: ${nextSeq}) ->`, 'color: #38bdf8; font-weight: bold;', {
        hasTarget: !!targetIframeWindow,
        handshakeId,
        seq: nextSeq,
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
    },
  };

  if (ENABLE_DEBUG_API) {
    exportedApi.debug = createParentDebugApi({
      instances,
      currentActiveInstanceIdGetter: () => instanceManager.currentActiveInstanceId,
      assignedIframeIdMap,
      iframeToAssignedIdMap,
      dispatchCommand,
      exportedApi,
    });
  }

  exportedApi.isDummy = false;
  exportedApi.isSremoteNative = true;
  try {
    exportedApi[Symbol.for('__sremote_native__')] = true;
  } catch {}

  Object.freeze(exportedApi);

  try {
    Object.defineProperty(pageWindow, 'sremote', { value: exportedApi, writable: false, configurable: false, enumerable: true });
  } catch {
    pageWindow.sremote = exportedApi;
  }
  console_log(`%c[sremote] window.sremote is ready with decluttered namespaces`, 'background: #065f46; color: #34d399; font-weight: bold;');
  return exportedApi;
}

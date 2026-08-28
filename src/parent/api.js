import { NS, ENABLE_DEBUG_API, console_log, console_warn, console_error, pageWindow } from '../config.js';
import { Storage, setHandshakeSecret } from '../core/storage.js';
import { generateInstanceId } from '../core/utils.js';
import { pendingRpcRequests } from './queue.js';
import { createParentDebugApi } from '../debug/parent-debug.js';

export function createExportedApi({
  instances,
  parentAdaptersMap,
  assignedIframeIdMap,
  iframeToAssignedIdMap,
  dispatchCommand,
  handleUseAdapter,
  handleRemoveAdapter,
  isMultiModeActive,
  getLatestActiveInstanceId,
  currentActiveInstanceIdGetter,
  multiModeConfigSetter,
  exclusiveModeSetter,
  pauseOthersExcept,
  queryMediaInstancesViaGM,
  globalEventListeners,
  lastAcceptedDataGetter,
  validateDomainAccess,
  setSessionLocked,
}) {
  const exportedApi = {
    play: (instanceId, key) => dispatchCommand('play', undefined, instanceId, key),
    pause: (instanceId, key) => dispatchCommand('pause', undefined, instanceId, key),
    toggle: (instanceId, key) => dispatchCommand('toggle', undefined, instanceId, key),
    stop: (instanceId, key) => dispatchCommand('stop', undefined, instanceId, key),
    seek: (offset, instanceId, key) => dispatchCommand('seek', offset, instanceId, key),
    seekTo: (time, instanceId, key) => dispatchCommand('currentTime', time, instanceId, key),
    volume: (vol, instanceId, key) => dispatchCommand('volume', vol, instanceId, key),
    mute: (muted, instanceId, key) => dispatchCommand('muted', muted, instanceId, key),
    playbackRate: (rate, instanceId, key) => dispatchCommand('playbackRate', rate, instanceId, key),
    pip: (enable, instanceId, key) => {
      const _instanceId = typeof enable === 'string' ? enable : instanceId;
      const _enabled = typeof enable === 'boolean' ? enable : undefined;
      return dispatchCommand(_enabled === true ? 'enterpip' : _enabled === false ? 'exitpip' : 'pip', undefined, _instanceId, key);
    },
    assignId: (iframeOrSelector, customId) => {
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
    },
    getIframe: (instanceId, key) => {
      if (!validateDomainAccess(key)) {
        console_error('[SRemote:auth] Blocked getIframe()! Valid Passkey is required.');
        return null;
      }
      if (!instanceId) return null;
      const inst = instances.get(instanceId);
      if (inst?.iframeEl && inst.iframeEl.isConnected) return inst.iframeEl;
      return assignedIframeIdMap.get(instanceId) || null;
    },
    postWindowMessage: (message, targetOrigin = '*', instanceId = null, from = 'parent', key = null) => {
      if (!validateDomainAccess(key)) {
        console_error('[SRemote:auth] Blocked postWindowMessage()! Valid Passkey is required.');
        return false;
      }
      const targetId = instanceId || getLatestActiveInstanceId();
      const origin = typeof targetOrigin === 'string' ? targetOrigin : '*';
      const fromSource = String(from || 'parent').toLowerCase();

      // Case 1: from 'parent' -> Directly postMessage to iframe.contentWindow (event.source === window.parent)
      if (fromSource === 'parent') {
        const iframeEl = exportedApi.getIframe(targetId, key);
        if (iframeEl?.contentWindow && typeof iframeEl.contentWindow.postMessage === 'function') {
          try {
            iframeEl.contentWindow.postMessage(message, origin);
            return true;
          } catch (err) {
            console_warn('[sremote] Error posting message from parent to iframe window:', err);
            return false;
          }
        }
        // If iframe element is not found directly on parent DOM, fallback to port bridge
      }

      // Case 2: from 'iframe' (or fallback) -> Bridge via private MessagePort into iframe window context (event.source === window.self)
      const target = targetId ? instances.get(targetId) : null;
      if (!target || !target.port) {
        console_warn(`[sremote] Cannot post message: No active connection for instance '${targetId || 'unknown'}'`);
        return false;
      }
      try {
        target.port.postMessage({
          type: `${NS}bridge_post`,
          source: 'parent',
          payload: message,
          targetOrigin: origin,
        });
        return true;
      } catch (err) {
        console_warn('[sremote] Error in postWindowMessage via MessagePort bridge:', err);
        return false;
      }
    },
    onWindowMessage: (handler, key) => exportedApi.on('iframe:message', handler, key),
    call: (action, params, instanceId, key) => {
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
          resolve({
            success: false,
            error: 'TIMEOUT',
            message: `RPC call '${action}' timed out after 5000ms`,
            action,
            instanceId: targetId,
          });
        }, 5000);
        pendingRpcRequests.set(rpcId, { resolve, timer });
        try {
          target.port.postMessage({
            type: `${NS}rpc_request`,
            source: 'parent',
            rpcId,
            action,
            params,
          });
        } catch (err) {
          clearTimeout(timer);
          pendingRpcRequests.delete(rpcId);
          resolve({
            success: false,
            error: 'PORT_ERROR',
            message: String(err),
            action,
            instanceId: targetId,
          });
        }
      });
    },
    status: (instanceId, key) => {
      if (!validateDomainAccess(key)) {
        console_error('[SRemote:auth] Blocked status()! Valid Passkey is required.');
        return null;
      }
      const activeId = currentActiveInstanceIdGetter();
      const targetId = instanceId || activeId || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
      if (!targetId) return null;
      if (instances.has(targetId)) return instances.get(targetId).state || null;
      if (parentAdaptersMap.has(targetId)) {
        const adapter = parentAdaptersMap.get(targetId);
        return {
          paused: typeof adapter.paused === 'function' ? adapter.paused() : Boolean(adapter.paused),
          currentTime: typeof adapter.getCurrentTime === 'function' ? adapter.getCurrentTime() : 0,
          duration: typeof adapter.getDuration === 'function' ? adapter.getDuration() : 0,
          volume: typeof adapter.getVolume === 'function' ? adapter.getVolume() : 1,
          muted: typeof adapter.getMuted === 'function' ? adapter.getMuted() : false,
        };
      }
      return null;
    },
    bindMediaSession: (instanceId, key) => dispatchCommand('bindMediaSession', undefined, instanceId, key),
    bindMetadata: (meta, instanceId, key) => dispatchCommand('bindMetadata', meta, instanceId, key),
    useAdapter: (adapter, instanceId, key) => {
      if (!validateDomainAccess(key)) {
        console_error('[SRemote:auth] Blocked useAdapter()! Valid Passkey is required.');
        return null;
      }
      return handleUseAdapter(adapter, instanceId);
    },
    removeAdapter: (instanceId, key) => {
      if (!validateDomainAccess(key)) {
        console_error('[SRemote:auth] Blocked removeAdapter()! Valid Passkey is required.');
        return false;
      }
      return handleRemoveAdapter(instanceId);
    },
    getCustomAdapter: (instanceId, key) => {
      if (!validateDomainAccess(key)) {
        console_error('[SRemote:auth] Blocked getCustomAdapter()! Valid Passkey is required.');
        return null;
      }
      if (instanceId) return parentAdaptersMap.get(instanceId) || null;
      if (parentAdaptersMap.size === 1) return Array.from(parentAdaptersMap.values())[0] || null;
      return parentAdaptersMap.get(currentActiveInstanceIdGetter()) || null;
    },
    list: key => {
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
          status: 'ready',
          state: {
            paused: typeof adapter.paused === 'function' ? adapter.paused() : Boolean(adapter.paused),
            currentTime: typeof adapter.getCurrentTime === 'function' ? adapter.getCurrentTime() : 0,
            duration: typeof adapter.getDuration === 'function' ? adapter.getDuration() : 0,
            volume: typeof adapter.getVolume === 'function' ? adapter.getVolume() : 1,
            muted: typeof adapter.getMuted === 'function' ? adapter.getMuted() : false,
          },
        });
      }
      return result;
    },
    note: (notesDict, key) => {
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
    },
    setMultiMode: (mode, key) => {
      if (!validateDomainAccess(key)) {
        console_error('[SRemote:auth] Blocked setMultiMode()! Valid Passkey is required.');
        return;
      }
      if (typeof mode === 'boolean' || mode === null) {
        multiModeConfigSetter(mode);
      }
    },
    isMultiMode: key => {
      if (!validateDomainAccess(key)) {
        console_error('[SRemote:auth] Blocked isMultiMode()! Valid Passkey is required.');
        return false;
      }
      return isMultiModeActive();
    },
    setExclusive: (mode, key) => {
      if (!validateDomainAccess(key)) {
        console_error('[SRemote:auth] Blocked setExclusive()! Valid Passkey is required.');
        return;
      }
      exclusiveModeSetter(mode);
      if (mode && mode !== 'auto' && instances.has(mode)) {
        pauseOthersExcept(mode);
      }
    },
    query: key => {
      if (!validateDomainAccess(key)) {
        console_error('[SRemote:auth] Blocked query()! Valid Passkey is required.');
        return [];
      }
      return queryMediaInstancesViaGM();
    },
    setIframeCSS: (css, instanceId, key) => exportedApi.call('setIframeCSS', { css: String(css || '') }, instanceId, key),
    getIframeCSS: (instanceId, key) => exportedApi.call('getIframeCSS', {}, instanceId, key),
    removeIframeCSS: (instanceId, key) => exportedApi.call('removeIframeCSS', {}, instanceId, key),
    on: (event, handler, key) => {
      if (!validateDomainAccess(key)) {
        console_error('[SRemote:auth] Blocked on()! Valid Passkey is required.');
        return () => {};
      }
      const ev = String(event || '').toLowerCase();
      if (!globalEventListeners.has(ev)) globalEventListeners.set(ev, new Set());
      globalEventListeners.get(ev).add(handler);

      // Sticky replay: If this listener listens to 'accept' or '*' and we already have an active instance accepted, replay it immediately
      const lastAcceptedData = lastAcceptedDataGetter();
      if (
        (ev === 'accept' || ev === '*') &&
        lastAcceptedData &&
        (instances.has(lastAcceptedData.instanceId) || parentAdaptersMap.has(lastAcceptedData.instanceId))
      ) {
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
      setSessionLocked(true);
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
          multiModeConfigSetter(options.multiMode);
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

      // Increment GM hello sequence & store active handshake context
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

      // Clean handshake payload strictly for child iframe
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

      // Broadcast down to all child iframes in document
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

      // Fallback broadcast to window.frames
      try {
        for (let i = 0; i < window.frames.length; i++) {
          try {
            window.frames[i].postMessage(createHelloPayload(null), '*');
          } catch {}
        }
      } catch {}
    },
  };

  // Attach Parent debug API if enabled
  if (ENABLE_DEBUG_API) {
    exportedApi.debug = createParentDebugApi({
      instances,
      currentActiveInstanceIdGetter,
      assignedIframeIdMap,
      iframeToAssignedIdMap,
      dispatchCommand,
      exportedApi,
    });
  }

  // Freeze exportedApi deeply to prevent runtime tampering
  Object.freeze(exportedApi);

  try {
    Object.defineProperty(pageWindow, 'sremote', {
      value: exportedApi,
      writable: false,
      configurable: false,
      enumerable: true,
    });
  } catch {
    pageWindow.sremote = exportedApi;
  }
  console_log(`%c[sremote] window.sremote is ready`, 'background: #065f46; color: #34d399; font-weight: bold;');
  return exportedApi;
}

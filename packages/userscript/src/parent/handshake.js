import { NS, console_log, console_debug, console_warn } from '../config.js';
import { Storage, setHandshakeSecret, checkHandshakeSecret, consumeHandshakeSecret } from '../core/storage.js';
import { getOriginStorageKeys, generateInstanceId } from '../core/utils.js';
import { createPermissionDialog } from '../ui/permission-dialog.js';
import { flushPendingCommands, pendingRpcRequests } from './queue.js';

export function findIframeElementBySource(sourceWindow, root = document) {
  if (!sourceWindow || !root) return null;
  try {
    const iframes = root.querySelectorAll('iframe');
    for (let i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === sourceWindow) {
        return iframes[i];
      }
      // Deep search into nested accessible iframes
      try {
        const childDoc = iframes[i].contentDocument || iframes[i].contentWindow?.document;
        if (childDoc) {
          const nested = findIframeElementBySource(sourceWindow, childDoc);
          if (nested) return nested;
        }
      } catch {}
    }
  } catch {}
  return null;
}

export function setupParentHandshake(instanceManager) {
  const {
    instances,
    parentAdaptersMap,
    assignedIframeIdMap,
    iframeToAssignedIdMap,
    isMultiModeActive,
    removeInstance,
    notifyMediaCountChange,
    emitGlobalEvent,
    pauseOthersExcept,
  } = instanceManager;

  const blacklistedIframes = new WeakSet();
  const blacklistedSources = new WeakSet();
  const retryChallengeAttempts = new WeakMap();

  async function cloneBlobFromParent(blobUrl, instanceId) {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const item = instances.get(instanceId);
      if (item?.port) item.port.postMessage({ type: `${NS}resendBlobObject`, originalUrl: blobUrl, blob });
    } catch (err) {
      console_warn(`[sremote] Failed to clone blob '${blobUrl}' for instance '${instanceId}':`, err);
    }
  }

  function setupPortForInstance(instanceId, port, initialLocation, initialOrigin, iframeEl = null, initialStatus = 'ready') {
    if (!isMultiModeActive() && instances.size > 0) {
      for (const oldId of Array.from(instances.keys())) {
        if (oldId !== instanceId) {
          console_log(`%c[SRemote:lifecycle] Replacing stale instance in Single Mode: ${oldId} -> ${instanceId}`, 'color: #f59e0b;');
          removeInstance(oldId, 'replaced_by_new_instance');
        }
      }
    }

    instanceManager.setCurrentActiveInstanceId(instanceId);

    const item = {
      port,
      location: initialLocation,
      origin: initialOrigin,
      note: '',
      state: null,
      mediaType: null,
      capabilities: null,
      lastSeen: Date.now(),
      status: initialStatus,
      iframeEl: iframeEl || assignedIframeIdMap.get(instanceId) || null,
    };
    instances.set(instanceId, item);
    if (initialStatus === 'ready') {
      flushPendingCommands(instanceId, port, isMultiModeActive);
    }

    port.onmessage = e => {
      const data = e.data;
      if (!data || typeof data !== 'object') return;
      const type = String(data.type || '');
      if (!type.startsWith(NS)) return;

      item.lastSeen = Date.now();
      // Only update active ID from iframe messages when there is no parent-registered adapter
      // (adapter has higher priority in Single Mode to avoid being overwritten by iframe heartbeats)
      if (parentAdaptersMap.size === 0 || isMultiModeActive()) {
        instanceManager.setCurrentActiveInstanceId(instanceId);
      }

      const action = type.slice(NS.length);
      const lowerAction = action.toLowerCase();

      if (lowerAction !== 'ping' && lowerAction !== 'pong') {
        console_debug(`%c[SRemote:signal] Parent received from iframe (port) -> ${action}`, 'color: #10b981;', { instanceId, data });
      }

      if (lowerAction === 'rpc_response' && data.rpcId) {
        const req = pendingRpcRequests.get(data.rpcId);
        if (req) {
          clearTimeout(req.timer);
          pendingRpcRequests.delete(data.rpcId);
          if (data.result && data.result.success === false && data.result.error) {
            req.resolve?.({ success: false, error: data.result.error, message: data.result.message || 'RPC execution failed', instanceId });
          } else {
            req.resolve(typeof data.result === 'object' && data.result !== null ? { instanceId, ...data.result } : { success: true, instanceId, data: data.result });
          }
        }
        return;
      }

      if (lowerAction === 'pong') {
        if (item.pendingConsumeHandshakeId) {
          console_log(`%c[SRemote:handshake] Mutual Ping-Pong confirmed on port for '${instanceId}'. Consuming token '${item.pendingConsumeHandshakeId}'.`, 'color: #10b981;');
          consumeHandshakeSecret(item.pendingConsumeHandshakeId);
          item.pendingConsumeHandshakeId = null;
        }
        if (item.status === 'connecting') {
          item.status = 'ready';
          flushPendingCommands(instanceId, port, isMultiModeActive);
        }
        if (data.state) item.state = data.state;
        if (data.mediaType) item.mediaType = data.mediaType;
        if (data.capabilities) item.capabilities = data.capabilities;
        return;
      }

      if (lowerAction === 'disconnect' || lowerAction === 'mediadisconnected' || lowerAction === 'unload') {
        removeInstance(instanceId, lowerAction);
        return;
      }

      if (lowerAction === 'accept') {
        if (item.authenticated) return;

        let isValid = false;
        if (data.handshakeId && data.handshakeToken) {
          isValid = checkHandshakeSecret(data.handshakeId, data.handshakeToken);
        } else {
          isValid = true;
        }
        if (!isValid) {
          console_warn(`[sremote] SPOOF DETECTED on port for instance ${instanceId}! Closing port immediately.`);
          removeInstance(instanceId, 'spoof_detected');
          return;
        }
        item.authenticated = true;
        item.status = 'ready';
        // Only promote iframe to active instance if no parent adapter exists or multi-mode is active
        if (parentAdaptersMap.size === 0 || isMultiModeActive()) {
          instanceManager.setCurrentActiveInstanceId(instanceId);
        }
        if (data.state) item.state = data.state;
        if (data.mediaType) item.mediaType = data.mediaType;
        if (data.capabilities) item.capabilities = data.capabilities;
        notifyMediaCountChange();

        emitGlobalEvent('accept', data);
        return;
      }

      if (data.state) item.state = data.state;
      if (data.mediaType) item.mediaType = data.mediaType;
      if (data.capabilities) item.capabilities = data.capabilities;

      if (lowerAction === 'play' || lowerAction === 'playing') {
        const exclusiveMode = instanceManager.exclusiveMode;
        if (exclusiveMode === 'auto') {
          pauseOthersExcept(instanceId);
        } else if (exclusiveMode && exclusiveMode !== instanceId) {
          port.postMessage({ type: `${NS}pause`, source: 'parent' });
          return;
        }
      }

      if (lowerAction === 'bridge_message') {
        const bridgePayload = { source: 'iframe', instanceId, data: data.data, origin: data.origin, location: item.location };
        emitGlobalEvent('iframe:message', bridgePayload);
        emitGlobalEvent('message', bridgePayload);
        return;
      }

      if (lowerAction === 'requestblobclone' && data.blobUrl) {
        cloneBlobFromParent(data.blobUrl, instanceId);
        return;
      }

      if (lowerAction === 'nomedia') {
        console_warn(`[sremote] Iframe '${instanceId}' reported noMedia for action '${data.action || 'unknown'}':`, data.message || data.reason);
        emitGlobalEvent('nomedia', { instanceId, ...data });
        emitGlobalEvent('noMedia', { instanceId, ...data });
        return;
      }

      const forwardedPayload =
        typeof data === 'object' && data !== null
          ? { instanceId, source: data.source || 'iframe', mediaType: data.mediaType || item.mediaType, ...data }
          : { instanceId, source: 'iframe', mediaType: item.mediaType, value: data };
      emitGlobalEvent(action, forwardedPayload);
    };

    notifyMediaCountChange();
  }

  // Cross-Frame Handshake Window Listener
  const onWindowMessage = event => {
    if (event.source === window) return;

    const data = event.data;
    if (!data || typeof data !== 'object') return;
    const type = String(data.type || '');
    if (!type.startsWith(NS)) return;

    const action = type.slice(NS.length);
    const lowerAction = action.toLowerCase();
    const callerOrigin = event.origin || 'unknown_origin';

    if (lowerAction === 'accept') {
      const iframeEl = findIframeElementBySource(event.source);
      const preAssignedId = (iframeEl && (iframeEl.getAttribute('data-sremote-id') || iframeToAssignedIdMap.get(iframeEl))) || null;
      const instanceId = preAssignedId || data.instanceId || generateInstanceId();
      const iframeLoc = data.location || '';
      const iframeOrigin = event.origin && event.origin !== 'null' ? event.origin : data.origin || '*';

      console_log(`%c[SRemote:signal] Parent received cross-frame signal -> ${action}`, 'color: #6366f1; font-weight: bold;', {
        origin: callerOrigin,
        instanceId,
        data: { ...data, instanceId },
      });

      if (iframeEl && instanceId) {
        assignedIframeIdMap.set(instanceId, iframeEl);
        iframeToAssignedIdMap.set(iframeEl, instanceId);
      }

      // Check blacklist
      if (iframeEl && blacklistedIframes.has(iframeEl)) {
        console_warn(`[sremote] Dropped accept from blacklisted iframe element: ${instanceId}`);
        return;
      }
      if (event.source && blacklistedSources.has(event.source)) {
        console_warn(`[sremote] Dropped accept from blacklisted window source: ${instanceId}`);
        return;
      }

      let isValidSecret = false;
      let pendingConsumeHandshakeId = null;
      if (data.handshakeId && data.handshakeToken) {
        isValidSecret = checkHandshakeSecret(data.handshakeId, data.handshakeToken);
        if (isValidSecret) {
          pendingConsumeHandshakeId = data.handshakeId;
        }
      }

      if (!isValidSecret && event.ports && event.ports.length > 0) {
        const { allowKey: parentAllowKey } = getOriginStorageKeys(location.origin);
        const { allowKey: iframeAllowKey } = getOriginStorageKeys(iframeOrigin);
        const isPersisted = (parentAllowKey && Storage.get(parentAllowKey) === '1') || (iframeAllowKey && Storage.get(iframeAllowKey) === '1');
        if (
          isPersisted ||
          iframeOrigin === location.origin ||
          iframeOrigin === '*' ||
          iframeOrigin === 'null' ||
          callerOrigin === 'null' ||
          callerOrigin.startsWith('http') ||
          callerOrigin.startsWith('file:')
        ) {
          isValidSecret = true;
        }
      }

      // If token is missing or invalid: challenge the iframe once by generating a fresh token and sending hello
      if (!isValidSecret) {
        const targetRef = iframeEl || event.source;
        const attempts = (targetRef ? retryChallengeAttempts.get(targetRef) : 0) || 0;

        if (attempts >= 1) {
          // Iframe has already been challenged once and still failed -> Blacklist!
          console_warn(`[sremote:security] Handshake challenge failed for iframe '${instanceId}'. Blacklisting to prevent further abuse.`);
          if (iframeEl) blacklistedIframes.add(iframeEl);
          if (event.source) blacklistedSources.add(event.source);
          return;
        }

        // Record attempt (allow 1 retry challenge)
        if (targetRef) retryChallengeAttempts.set(targetRef, attempts + 1);

        console_log(`%c[SRemote:handshake] Accept received without valid token from '${instanceId}'. Issuing one-time hello challenge...`, 'color: #f59e0b; font-weight: bold;');

        // Generate dedicated handshake credentials for this iframe
        const challengeHandshakeId = generateInstanceId('hs');
        const challengeHandshakeToken = generateInstanceId('tok');
        setHandshakeSecret(challengeHandshakeId, challengeHandshakeToken);

        const currentSeq = Number(Storage.get('sremote:hello_seq', 0)) || 0;
        const latestHandshake = Storage.get('sremote:latest_handshake') || {};

        const helloPayload = {
          type: `${NS}hello`,
          source: 'parent',
          handshakeId: challengeHandshakeId,
          handshakeToken: challengeHandshakeToken,
          seq: currentSeq,
          hasParentAdapter: parentAdaptersMap.size > 0,
          adapterIds: Array.from(parentAdaptersMap.keys()),
          ...(latestHandshake.css ? { css: latestHandshake.css } : {}),
          ...(typeof latestHandshake.treatAlmostEndAsEnd === 'boolean' ? { treatAlmostEndAsEnd: latestHandshake.treatAlmostEndAsEnd } : {}),
          assignedInstanceId: instanceId,
        };

        try {
          event.source.postMessage(helloPayload, '*');
        } catch (err) {
          console_warn('[sremote] Failed to send hello challenge to iframe:', err);
        }
        return;
      }

      // Successful verification: clear any retry attempts
      if (iframeEl) retryChallengeAttempts.delete(iframeEl);
      if (event.source) retryChallengeAttempts.delete(event.source);

      if (event.ports && event.ports.length > 0) {
        const port = event.ports[0];
        setupPortForInstance(instanceId, port, iframeLoc, iframeOrigin, iframeEl);
        const inst = instances.get(instanceId);
        if (inst) {
          inst.authenticated = true;
          if (pendingConsumeHandshakeId) {
            inst.pendingConsumeHandshakeId = pendingConsumeHandshakeId;
          }
          instanceManager.setCurrentActiveInstanceId(instanceId);
          if (data.state) inst.state = data.state;
          if (data.mediaType) inst.mediaType = data.mediaType;
          if (data.capabilities) inst.capabilities = data.capabilities;
          inst.lastSeen = Date.now();
        }
        notifyMediaCountChange();

        try {
          port.postMessage({ type: `${NS}ping`, source: 'parent', handshakeVerify: true });
        } catch {}

        emitGlobalEvent('accept', { ...data, instanceId });
      } else if (event.source) {
        console_log(`%c[SRemote:port] Accept received without port for '${instanceId}'. Proactively renegotiating MessagePort...`, 'color: #f59e0b; font-weight: bold;');
        const channel = new MessageChannel();
        setupPortForInstance(instanceId, channel.port1, iframeLoc, iframeOrigin, iframeEl, 'connecting');
        const inst = instances.get(instanceId);
        if (inst) {
          inst.authenticated = true;
          if (pendingConsumeHandshakeId) {
            inst.pendingConsumeHandshakeId = pendingConsumeHandshakeId;
          }
          instanceManager.setCurrentActiveInstanceId(instanceId);
          if (data.state) inst.state = data.state;
          if (data.mediaType) inst.mediaType = data.mediaType;
          if (data.capabilities) inst.capabilities = data.capabilities;
          inst.lastSeen = Date.now();
        }
        notifyMediaCountChange();

        try {
          event.source.postMessage({ type: `${NS}handshake_port`, source: 'parent', instanceId }, iframeOrigin && iframeOrigin !== 'null' ? iframeOrigin : '*', [channel.port2]);
          channel.port1.postMessage({ type: `${NS}ping`, source: 'parent', handshakeVerify: true });
        } catch (err) {
          console_warn('[sremote] Failed to transfer proactive MessagePort to iframe:', err);
        }

        emitGlobalEvent('accept', { ...data, instanceId });
      }
      return;
    }

    if (lowerAction === 'request_permission' || lowerAction === 'requestpermission') {
      const targetOrigin = data.origin || callerOrigin || location.origin;
      if (instanceManager.isSessionDenied) {
        if (event.source) {
          try {
            event.source.postMessage({ type: `${NS}permission_response`, source: 'parent', allowed: false, parentOrigin: location.origin }, '*');
          } catch {}
        }
        return;
      }

      createPermissionDialog({
        origin: targetOrigin,
        isTop: true,
        onDecision: allowed => {
          if (!allowed) {
            instanceManager.setSessionDenied(true);
          }
          if (event.source) {
            try {
              event.source.postMessage({ type: `${NS}permission_response`, source: 'parent', allowed: !!allowed, parentOrigin: location.origin }, '*');
            } catch {}
          }
        },
      });
      return;
    }
  };

  window.addEventListener('message', onWindowMessage);

  return {
    setupPortForInstance,
    destroy: () => {
      window.removeEventListener('message', onWindowMessage);
    },
  };
}

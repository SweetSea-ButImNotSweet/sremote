import { NS, console_log, console_debug, console_warn } from '../config.js';
import { Storage, setHandshakeSecret, checkHandshakeSecret, consumeHandshakeSecret } from '../core/storage.js';
import { getOriginStorageKeys, generateInstanceId } from '../core/utils.js';
import { createPermissionDialog } from '../ui/permission-dialog.js';
import { flushPendingCommands, pendingRpcRequests } from './queue.js';

/**
 * Transport Connection State Enum
 */
export const TRANSPORT_STATE = Object.freeze({ DISCONNECTED: 'DISCONNECTED', CONNECTING: 'CONNECTING', CONNECTED: 'CONNECTED', TERMINATED: 'TERMINATED' });

/**
 * Clean & Resilient Parent Transport Manager.
 * Handles:
 * 1. Handshake Secret Verification
 * 2. One-Time Challenge & Anti-Abuse Blacklist (WeakSet)
 * 3. Dedicated MessagePort Lifecycle per Instance
 * 4. DOM Detach Grace Period (300ms) for React Strict Mode / Remount
 * 5. Ping/Pong Heartbeat Sweeper
 */
export function createParentTransportManager({ instanceManager, onMediaMessage = () => {}, onMediaStateChange = () => {}, onBridgeMessage = () => {} }) {
  const { instances, assignedIframeIdMap, iframeToAssignedIdMap, isMultiModeActive, removeInstance, notifyMediaCountChange, emitGlobalEvent, pauseOthersExcept } = instanceManager;

  const blacklistedIframes = new WeakSet();
  const blacklistedSources = new WeakSet();
  const retryChallengeAttempts = new WeakMap();
  const pendingReapTimers = new Map(); // instanceId -> timeoutId
  const GRACE_PERIOD_MS = 300;

  // --- Helper: Find Iframe Element from Window Source ---
  function findIframeElementBySource(sourceWindow, root = document) {
    if (!sourceWindow || !root) return null;
    try {
      const iframes = root.querySelectorAll ? root.querySelectorAll('iframe') : [];
      for (let i = 0; i < iframes.length; i++) {
        if (iframes[i].contentWindow === sourceWindow) {
          return iframes[i];
        }
        try {
          const childDoc = iframes[i].contentDocument || iframes[i].contentWindow?.document;
          if (childDoc) {
            const nested = findIframeElementBySource(sourceWindow, childDoc);
            if (nested) return nested;
          }
        } catch {}
      }

      // Check window.frames index if available
      if (root === document && typeof window !== 'undefined' && window.frames) {
        for (let i = 0; i < window.frames.length; i++) {
          if (window.frames[i] === sourceWindow) {
            if (iframes[i]) return iframes[i];
          }
        }
      }
    } catch {}
    return null;
  }

  // --- 1. Port Setup & Channel Management ---
  function setupPortForInstance(instanceId, port, initialLocation, initialOrigin, iframeEl = null, initialTransportState = TRANSPORT_STATE.CONNECTED) {
    // Single Mode: cleanup older instance safely, EXCEPT if it belongs to the same iframe or container
    if (!isMultiModeActive() && instances.size > 0) {
      for (const [oldId, oldInst] of Array.from(instances.entries())) {
        if (oldId !== instanceId) {
          const oldIframe = oldInst?.iframeEl || assignedIframeIdMap.get(oldId);
          if (iframeEl && oldIframe && (oldIframe === iframeEl || oldIframe.contains?.(iframeEl) || iframeEl.contains?.(oldIframe))) {
            continue;
          }
          console_log(`%c[SRemote:transport] Single mode: replacing older instance ${oldId} -> ${instanceId}`, 'color: #f59e0b;');
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
      status: initialTransportState === TRANSPORT_STATE.CONNECTED ? 'ready' : 'connecting',
      transportState: initialTransportState,
      iframeEl: iframeEl || assignedIframeIdMap.get(instanceId) || null,
      authenticated: false,
      hasMedia: false,
    };
    instances.set(instanceId, item);

    if (item.status === 'ready') {
      flushPendingCommands(instanceId, port, isMultiModeActive);
    }

    port.onmessage = e => {
      const data = e.data;
      if (!data || typeof data !== 'object') return;
      const type = String(data.type || '');
      if (!type.startsWith(NS)) return;

      item.lastSeen = Date.now();
      const action = type.slice(NS.length);
      const lowerAction = action.toLowerCase();

      if (lowerAction !== 'ping' && lowerAction !== 'pong') {
        console_debug(`%c[SRemote:transport] Parent received (port) -> ${action}`, 'color: #10b981;', { instanceId, data });
      }

      // RPC Handling
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

      // Heartbeat Pong
      if (lowerAction === 'pong') {
        if (item.pendingConsumeHandshakeId) {
          consumeHandshakeSecret(item.pendingConsumeHandshakeId);
          item.pendingConsumeHandshakeId = null;
        }
        if (item.transportState === TRANSPORT_STATE.CONNECTING) {
          item.transportState = TRANSPORT_STATE.CONNECTED;
          item.status = 'ready';
          flushPendingCommands(instanceId, port, isMultiModeActive);
        }
        if (data.state) item.state = data.state;
        if (data.mediaType) item.mediaType = data.mediaType;
        if (data.capabilities) item.capabilities = data.capabilities;
        return;
      }

      // Terminal Transport Disconnect (Iframe completely unloaded)
      if (lowerAction === 'disconnect' || lowerAction === 'unload') {
        terminateInstance(instanceId, lowerAction);
        return;
      }

      // MEDIA STATE CHANGE: When media drops or is detached, DO NOT terminate port!
      if (lowerAction === 'nomedia' || lowerAction === 'mediadisconnected') {
        console_log(`%c[SRemote:media] Instance '${instanceId}' has no active media. Port preserved.`, 'color: #f59e0b;');
        item.hasMedia = false;
        if (item.state && typeof item.state === 'object') {
          item.state = { ...item.state, paused: true };
        }
        onMediaStateChange({ instanceId, hasMedia: false, action: lowerAction });
        emitGlobalEvent('noMedia', { instanceId, hasMedia: false, reason: data.reason || 'detached' });
        notifyMediaCountChange();
        return;
      }

      // Handshake Mutual Accept on Port
      if (lowerAction === 'accept') {
        if (item.authenticated) return;
        let isValid = false;
        if (data.handshakeId && data.handshakeToken) {
          isValid = checkHandshakeSecret(data.handshakeId, data.handshakeToken);
        } else {
          isValid = true;
        }
        if (!isValid) {
          console_warn(`[sremote] Spoof detected on port for instance ${instanceId}! Closing port.`);
          terminateInstance(instanceId, 'spoof_detected');
          return;
        }
        item.authenticated = true;
        item.transportState = TRANSPORT_STATE.CONNECTED;
        item.status = 'ready';
        item.hasMedia = Boolean(data.hasMedia);
        if (data.state) item.state = data.state;
        if (data.mediaType) item.mediaType = data.mediaType;
        if (data.capabilities) item.capabilities = data.capabilities;
        notifyMediaCountChange();
        emitGlobalEvent('accept', data);
        return;
      }

      // Media State Updates
      if (typeof data.hasMedia === 'boolean') item.hasMedia = data.hasMedia;
      if (data.state) item.state = data.state;
      if (data.mediaType) item.mediaType = data.mediaType;
      if (data.capabilities) item.capabilities = data.capabilities;

      if (lowerAction === 'play' || lowerAction === 'playing') {
        instanceManager.setCurrentActiveInstanceId(instanceId);
        const exclusiveMode = instanceManager.exclusiveMode;
        if (exclusiveMode === 'auto' || exclusiveMode === true) {
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
        onBridgeMessage(bridgePayload);
        return;
      }

      const forwardedPayload =
        typeof data === 'object' && data !== null
          ? { instanceId, source: data.source || 'iframe', mediaType: data.mediaType || item.mediaType, ...data }
          : { instanceId, source: 'iframe', mediaType: item.mediaType, value: data };
      emitGlobalEvent(action, forwardedPayload);
      onMediaMessage(action, forwardedPayload);
    };

    notifyMediaCountChange();
  }

  // --- 2. Instance Termination with Cleanup ---
  function terminateInstance(instanceId, reason = 'disconnected') {
    const item = instances.get(instanceId);
    if (!item) return;
    item.transportState = TRANSPORT_STATE.TERMINATED;
    try {
      item.port?.close();
    } catch {}
    removeInstance(instanceId, reason);
  }

  // --- 3. Cross-Frame Window Message Listener ---
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
      let preAssignedId = (iframeEl && (iframeEl.getAttribute('data-sremote-id') || iframeToAssignedIdMap.get(iframeEl))) || null;
      if (!preAssignedId && iframeEl?.closest) {
        const closestParentWithId = iframeEl.closest('[data-sremote-id]');
        if (closestParentWithId) {
          preAssignedId = closestParentWithId.getAttribute('data-sremote-id');
        }
      }
      const instanceId = preAssignedId || data.instanceId || generateInstanceId();
      const iframeLoc = data.location || '';
      const iframeOrigin = event.origin && event.origin !== 'null' ? event.origin : data.origin || '*';

      console_log(`%c[SRemote:transport] Parent received cross-frame signal -> ${action}`, 'color: #6366f1; font-weight: bold;', {
        origin: callerOrigin,
        instanceId,
        data: { ...data, instanceId },
      });

      if (iframeEl && instanceId) {
        assignedIframeIdMap.set(instanceId, iframeEl);
        iframeToAssignedIdMap.set(iframeEl, instanceId);
      }

      // Check Blacklist
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

      // Origin Whitelist & Local Domain Fallback
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

      // One-Time Challenge & Blacklist Routine
      if (!isValidSecret) {
        const targetRef = iframeEl || event.source;
        const attempts = (targetRef ? retryChallengeAttempts.get(targetRef) : 0) || 0;

        if (attempts >= 1) {
          console_warn(`[sremote:security] Handshake challenge failed for iframe '${instanceId}'. Blacklisting to prevent abuse.`);
          if (iframeEl) blacklistedIframes.add(iframeEl);
          if (event.source) blacklistedSources.add(event.source);
          return;
        }

        if (targetRef) retryChallengeAttempts.set(targetRef, attempts + 1);
        console_log(`%c[SRemote:transport] Accept without valid token from '${instanceId}'. Issuing one-time hello challenge...`, 'color: #f59e0b; font-weight: bold;');

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

      // Verified: Clear challenge attempts
      if (iframeEl) retryChallengeAttempts.delete(iframeEl);
      if (event.source) retryChallengeAttempts.delete(event.source);

      // Port established
      if (event.ports && event.ports.length > 0) {
        const port = event.ports[0];
        setupPortForInstance(instanceId, port, iframeLoc, iframeOrigin, iframeEl, TRANSPORT_STATE.CONNECTED);
        const inst = instances.get(instanceId);
        if (inst) {
          inst.authenticated = true;
          if (pendingConsumeHandshakeId) inst.pendingConsumeHandshakeId = pendingConsumeHandshakeId;
          instanceManager.setCurrentActiveInstanceId(instanceId);
          inst.hasMedia = Boolean(data.hasMedia);
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
        // Proactive port transfer
        console_log(`%c[SRemote:transport] Accept without port for '${instanceId}'. Proactively establishing MessagePort...`, 'color: #f59e0b; font-weight: bold;');
        const channel = new MessageChannel();
        setupPortForInstance(instanceId, channel.port1, iframeLoc, iframeOrigin, iframeEl, TRANSPORT_STATE.CONNECTING);
        const inst = instances.get(instanceId);
        if (inst) {
          inst.authenticated = true;
          if (pendingConsumeHandshakeId) inst.pendingConsumeHandshakeId = pendingConsumeHandshakeId;
          instanceManager.setCurrentActiveInstanceId(instanceId);
          inst.hasMedia = Boolean(data.hasMedia);
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
          if (!allowed) instanceManager.setSessionDenied(true);
          if (event.source) {
            try {
              event.source.postMessage({ type: `${NS}permission_response`, source: 'parent', allowed: !!allowed, parentOrigin: location.origin }, '*');
            } catch {}
          }
        },
      });
    }
  };

  // --- 4. Grace Period Liveness & Heartbeat Sweeper ---
  function scheduleReapInstance(assignedId) {
    if (!assignedId || !instances.has(assignedId)) return;
    if (pendingReapTimers.has(assignedId)) {
      clearTimeout(pendingReapTimers.get(assignedId));
    }
    const timer = setTimeout(() => {
      pendingReapTimers.delete(assignedId);
      const inst = instances.get(assignedId);
      if (inst?.iframeEl && !inst.iframeEl.isConnected) {
        console_log(`%c[SRemote:lifecycle] Iframe confirmed removed after grace period: ${assignedId}`, 'color: #ef4444;');
        terminateInstance(assignedId, 'dom_removed');
      }
    }, GRACE_PERIOD_MS);
    pendingReapTimers.set(assignedId, timer);
  }

  function cancelReapInstance(assignedId) {
    if (pendingReapTimers.has(assignedId)) {
      clearTimeout(pendingReapTimers.get(assignedId));
      pendingReapTimers.delete(assignedId);
      console_log(`%c[SRemote:lifecycle] Iframe re-attached within grace period: ${assignedId}. Preserving connection.`, 'color: #10b981;');
    }
  }

  const parentIframeObserver = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        for (let i = 0; i < m.addedNodes.length; i++) {
          const node = m.addedNodes[i];
          if (node.nodeType === 1) {
            if (node.tagName === 'IFRAME') {
              const assignedId = iframeToAssignedIdMap.get(node) || node.getAttribute?.('data-sremote-id');
              if (assignedId) cancelReapInstance(assignedId);
            } else if (node.querySelectorAll) {
              const subIframes = node.querySelectorAll('iframe');
              for (let j = 0; j < subIframes.length; j++) {
                const assignedId = iframeToAssignedIdMap.get(subIframes[j]) || subIframes[j].getAttribute?.('data-sremote-id');
                if (assignedId) cancelReapInstance(assignedId);
              }
            }
          }
        }
      }

      if (m.removedNodes.length > 0) {
        for (let i = 0; i < m.removedNodes.length; i++) {
          const node = m.removedNodes[i];
          if (node.nodeType === 1) {
            if (node.tagName === 'IFRAME') {
              const assignedId = iframeToAssignedIdMap.get(node) || node.getAttribute?.('data-sremote-id');
              if (assignedId && instances.has(assignedId)) {
                scheduleReapInstance(assignedId);
              }
            } else if (node.querySelectorAll) {
              const subIframes = node.querySelectorAll('iframe');
              for (let j = 0; j < subIframes.length; j++) {
                const subIfr = subIframes[j];
                const assignedId = iframeToAssignedIdMap.get(subIfr) || subIfr.getAttribute?.('data-sremote-id');
                if (assignedId && instances.has(assignedId)) {
                  scheduleReapInstance(assignedId);
                }
              }
            }
          }
        }
      }
    }
  });

  const mountTarget = document.documentElement || document;
  if (mountTarget) {
    try {
      parentIframeObserver.observe(mountTarget, { childList: true, subtree: true });
    } catch {}
  }

  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    const PING_THRESHOLD = 2000;
    const DEAD_TIMEOUT = 5000;

    for (const [id, item] of instances.entries()) {
      if (item.iframeEl && !item.iframeEl.isConnected) {
        scheduleReapInstance(id);
        continue;
      }
      const elapsed = now - (item.lastSeen || 0);
      if (elapsed > DEAD_TIMEOUT) {
        console_warn(`[sremote] Transport instance '${id}' timed out (${elapsed}ms). Terminating...`);
        terminateInstance(id, 'timeout');
      } else if (elapsed > PING_THRESHOLD) {
        try {
          item.port?.postMessage({ type: `${NS}ping`, source: 'parent' });
        } catch {
          terminateInstance(id, 'port_error');
        }
      }
    }
  }, 1500);

  window.addEventListener('message', onWindowMessage);

  return {
    destroy: () => {
      window.removeEventListener('message', onWindowMessage);
      clearInterval(heartbeatInterval);
      parentIframeObserver.disconnect();
      for (const t of pendingReapTimers.values()) clearTimeout(t);
      pendingReapTimers.clear();
    },
  };
}

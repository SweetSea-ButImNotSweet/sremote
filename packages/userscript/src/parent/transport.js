import { NS, logger } from '../config.js';
import { Storage } from '../core/storage.js';
import { generateInstanceId } from '../core/utils.js';
import { createPermissionDialog } from '../ui/permission-dialog.js';
import { flushPendingCommands, pendingRpcRequests } from './queue.js';

/**
 * Transport Connection State Enum
 */
export const TRANSPORT_STATE = Object.freeze({ DISCONNECTED: 'DISCONNECTED', CONNECTING: 'CONNECTING', CONNECTED: 'CONNECTED', TERMINATED: 'TERMINATED' });

/**
 * Clean & Resilient Parent Transport Manager.
 * Handles:
 * 1. Dedicated MessagePort Lifecycle per Instance (TCP 1-to-1 SYN/SYN-ACK/ACK)
 * 2. Dedicated MessagePort Lifecycle per Instance
 * 3. DOM Detach Grace Period (300ms) for React Strict Mode / Remount
 * 4. Ping/Pong Heartbeat Sweeper
 */
export function createParentTransportManager({
  instanceManager,
  tabSessionId = null,
  isHelloInitiated = () => false,
  onIframeReady = null,
  onMediaMessage = () => {},
  onMediaStateChange = () => {},
  onBridgeMessage = () => {},
}) {
  const { instances, assignedIframeIdMap, iframeToAssignedIdMap, isMultiModeActive, removeInstance, notifyMediaCountChange, emitGlobalEvent, pauseOthersExcept } = instanceManager;

  const blacklistedIframes = new WeakSet();
  const blacklistedSources = new WeakSet();
  const pendingReapTimers = new Map(); // instanceId -> timeoutId
  const pendingSynQueue = new Map(); // instanceId -> { event, data, processFn }
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

  function getDomainOrOrigin(urlOrOrigin) {
    if (!urlOrOrigin) return '';
    try {
      const parsed = new URL(urlOrOrigin, typeof location !== 'undefined' ? location.href : 'http://localhost');
      return parsed.hostname.toLowerCase();
    } catch {
      return String(urlOrOrigin)
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .toLowerCase();
    }
  }

  // --- 1. Port Setup & Channel Management ---
  function setupPortForInstance(instanceId, port, initialLocation, initialOrigin, iframeEl = null, initialTransportState = TRANSPORT_STATE.CONNECTED) {
    const newLocationOrOrigin = initialLocation || initialOrigin || '';

    // Check for Service / Domain Switch: ONLY evict if the EXACT same iframe DOM element navigated
    if (instances.size > 0 && newLocationOrOrigin && iframeEl) {
      for (const [oldId, oldInst] of Array.from(instances.entries())) {
        if (oldId !== instanceId) {
          const oldIframe = oldInst?.iframeEl || assignedIframeIdMap.get(oldId);
          // Only evict if this is confirmed to be the exact same DOM node navigating to a new URL/origin
          if (oldIframe && oldIframe === iframeEl) {
            logger
              .scope('transport')
              .log(
                `Same iframe DOM node re-navigated (${getDomainOrOrigin(oldInst?.location || oldInst?.origin)} -> ${getDomainOrOrigin(newLocationOrOrigin)}): evicting old instance ${oldId}`,
              );
            try {
              oldInst?.port?.close();
            } catch {}
            removeInstance(oldId, 'iframe_navigated');
          }
        }
      }
    }

    // Single Mode: only strictly evict older instances if explicitly forced by multiModeConfig === false
    if (instanceManager.multiModeConfig === false && instances.size > 0) {
      for (const [oldId, oldInst] of Array.from(instances.entries())) {
        if (oldId !== instanceId) {
          logger.scope('transport').log(`Forced single mode: replacing older instance ${oldId} -> ${instanceId}`);
          try {
            oldInst?.port?.close();
          } catch {}
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
        logger.scope('transport').debug(`Parent received (port) -> ${action}`, { instanceId, data });
      }

      // RPC Handling
      if (lowerAction === 'rpc_response' && data.rpcId) {
        const req = pendingRpcRequests.get(data.rpcId);
        if (req) {
          clearTimeout(req.timer);
          pendingRpcRequests.delete(data.rpcId);
          if (data.result?.success === false && data.result?.error) {
            req.resolve?.({ success: false, error: data.result.error, message: data.result.message || 'RPC execution failed', instanceId });
          } else {
            req.resolve(typeof data.result === 'object' && data.result !== null ? { instanceId, ...data.result } : { success: true, instanceId, data: data.result });
          }
        }
        return;
      }

      // Heartbeat Pong
      if (lowerAction === 'pong') {
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
        logger.scope('media').log(`Instance '${instanceId}' has no active media. Port preserved.`);
        item.hasMedia = false;
        if (item.state && typeof item.state === 'object') {
          item.state = { ...item.state, paused: true };
        }
        onMediaStateChange({ instanceId, hasMedia: false, event: lowerAction });
        emitGlobalEvent('noMedia', { instanceId, hasMedia: false, reason: data.reason || 'detached', event: 'noMedia' });
        notifyMediaCountChange();
        return;
      }

      // TCP Handshake ACK on Port
      if (lowerAction === 'ack' || lowerAction === 'accept') {
        item.authenticated = true;
        item.transportState = TRANSPORT_STATE.CONNECTED;
        item.status = 'ready';
        if (typeof data.hasMedia === 'boolean') item.hasMedia = data.hasMedia;
        if (data.state) item.state = data.state;
        if (data.mediaType) item.mediaType = data.mediaType;
        if (data.capabilities) item.capabilities = data.capabilities;
        flushPendingCommands(instanceId, port, isMultiModeActive);
        notifyMediaCountChange();
        emitGlobalEvent('accept', { ...data, instanceId, event: 'accept' });
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
          ? { instanceId, source: data.source || 'iframe', mediaType: data.mediaType || item.mediaType, ...data, event: action }
          : { instanceId, source: 'iframe', mediaType: item.mediaType, value: data, event: action };
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

    if (lowerAction === 'iframe_ready' || lowerAction === 'iframeready') {
      try {
        onIframeReady?.(event.source, callerOrigin);
      } catch {}
      return;
    }

    // --- TCP Handshake: 1-to-1 SYN from Iframe ---
    if (lowerAction === 'syn') {
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
      const synChallenge = data.synChallenge;

      const synLog = logger.scope('handshake');
      synLog.log(`Parent received 'syn' from iframe -> ${iframeOrigin}`, { instanceId, synChallenge, data });

      if (iframeEl && instanceId) {
        assignedIframeIdMap.set(instanceId, iframeEl);
        iframeToAssignedIdMap.set(iframeEl, instanceId);
      }

      if (iframeEl && blacklistedIframes.has(iframeEl)) {
        synLog.warn(`Dropped syn from blacklisted iframe element: ${instanceId}`);
        return;
      }
      if (event.source && blacklistedSources.has(event.source)) {
        synLog.warn(`Dropped syn from blacklisted window source: ${instanceId}`);
        return;
      }

      const completeSynAck = () => {
        const channel = new MessageChannel();
        setupPortForInstance(instanceId, channel.port1, iframeLoc, iframeOrigin, iframeEl, TRANSPORT_STATE.CONNECTING);
        const inst = instances.get(instanceId);
        if (inst) {
          inst.authenticated = false; // Will be set to true on ACK
          instanceManager.setCurrentActiveInstanceId(instanceId);
          inst.hasMedia = Boolean(data.hasMedia);
          if (data.state) inst.state = data.state;
          if (data.mediaType) inst.mediaType = data.mediaType;
          if (data.capabilities) inst.capabilities = data.capabilities;
          inst.lastSeen = Date.now();
        }
        notifyMediaCountChange();

        const latestHandshake = (tabSessionId ? Storage.get(`sremote:latest_handshake:${tabSessionId}`) : null) || {};
        const synAckPayload = {
          type: `${NS}syn_ack`,
          source: 'parent',
          synChallenge,
          allowed: true,
          parentOrigin: location.origin,
          assignedInstanceId: instanceId,
          ...(latestHandshake.css ? { css: latestHandshake.css } : {}),
          ...(typeof latestHandshake.treatAlmostEndAsEnd === 'boolean' ? { treatAlmostEndAsEnd: latestHandshake.treatAlmostEndAsEnd } : {}),
        };

        try {
          event.source.postMessage(synAckPayload, iframeOrigin && iframeOrigin !== 'null' ? iframeOrigin : '*', [channel.port2]);
          channel.port1.postMessage({ type: `${NS}ping`, source: 'parent', handshakeVerify: true });
        } catch (err) {
          synLog.warn('Failed to transfer MessagePort in syn_ack:', err);
        }
      };

      const rejectSyn = () => {
        try {
          event.source.postMessage(
            { type: `${NS}syn_ack`, source: 'parent', synChallenge, allowed: false, parentOrigin: location.origin },
            iframeOrigin && iframeOrigin !== 'null' ? iframeOrigin : '*',
          );
        } catch {}
      };

      const processSyn = () => {
        // Check permissions via Dialog (which checks isSessionBlocked, isSessionAllowed, Storage, and batches UI)
        createPermissionDialog({
          parentOrigin: location.origin,
          iframeOrigin,
          origin: iframeOrigin,
          isTop: true,
          onDecision: allowed => {
            if (allowed) {
              completeSynAck();
            } else {
              rejectSyn();
            }
          },
        });
      };

      // On-Demand Handshake: If the top page / SDK hasn't called hello() yet,
      // hold the SYN in pendingSynQueue so we DO NOT bother users with unprompted dialogs!
      if (!isHelloInitiated()) {
        synLog.log(`Deferred 'syn' from ${iframeOrigin} until top window calls sremote.hello()`);
        pendingSynQueue.set(instanceId, { processSyn, completeSynAck, rejectSyn });
        return;
      }

      processSyn();
      return;
    }

    // Legacy Fallback: accept without syn
    if (lowerAction === 'accept') {
      const iframeEl = findIframeElementBySource(event.source);
      const instanceId = data.instanceId || generateInstanceId();
      const iframeLoc = data.location || '';
      const iframeOrigin = event.origin && event.origin !== 'null' ? event.origin : data.origin || '*';

      if (event.ports && event.ports.length > 0) {
        const port = event.ports[0];
        setupPortForInstance(instanceId, port, iframeLoc, iframeOrigin, iframeEl, TRANSPORT_STATE.CONNECTED);
        const inst = instances.get(instanceId);
        if (inst) {
          inst.authenticated = true;
          instanceManager.setCurrentActiveInstanceId(instanceId);
          inst.hasMedia = Boolean(data.hasMedia);
          if (data.state) inst.state = data.state;
          if (data.mediaType) inst.mediaType = data.mediaType;
          if (data.capabilities) inst.capabilities = data.capabilities;
          inst.lastSeen = Date.now();
        }
        notifyMediaCountChange();
        emitGlobalEvent('accept', { ...data, instanceId });
      }
      return;
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
        logger.scope('lifecycle').log(`Iframe confirmed removed after grace period: ${assignedId}`);
        terminateInstance(assignedId, 'dom_removed');
      }
    }, GRACE_PERIOD_MS);
    pendingReapTimers.set(assignedId, timer);
  }

  function cancelReapInstance(assignedId) {
    if (pendingReapTimers.has(assignedId)) {
      clearTimeout(pendingReapTimers.get(assignedId));
      pendingReapTimers.delete(assignedId);
      logger.scope('lifecycle').log(`Iframe re-attached within grace period: ${assignedId}. Preserving connection.`);
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
        logger.scope('transport').warn(`Transport instance '${id}' timed out (${elapsed}ms). Terminating...`);
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

  function flushPendingSyns() {
    if (pendingSynQueue.size === 0) return;
    const synLog = logger.scope('handshake');
    synLog.log(`Flushing ${pendingSynQueue.size} pending SYN handshake(s) as hello() was called.`);
    const items = Array.from(pendingSynQueue.values());
    pendingSynQueue.clear();
    items.forEach(item => {
      try {
        item.processSyn();
      } catch (err) {
        synLog.warn('Failed to process deferred syn:', err);
      }
    });
  }

  return {
    flushPendingSyns,
    destroy: () => {
      window.removeEventListener('message', onWindowMessage);
      clearInterval(heartbeatInterval);
      parentIframeObserver.disconnect();
      for (const t of pendingReapTimers.values()) clearTimeout(t);
      pendingReapTimers.clear();
      pendingSynQueue.clear();
    },
  };
}

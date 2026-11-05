import { NS } from '../const.js';
import { logger } from '../config.js';
import { createPermissionDialog } from '../ui/permission-dialog.js';
import { flushPendingCommands, pendingRpcRequests, pendingCmds } from './queue.js';
import {
  createEnvelope,
  createCmd,
  parseEnvelope,
  PACKET_TYPE,
  createFSM,
  TransportState,
  MediaState,
  generateInstanceId,
  createHandshakePacket,
  HANDSHAKE_STEPS,
  isHandshakePacket,
} from '@sremote/shared';

/**
 * Transport Connection State Enum
 */
export const TRANSPORT_STATE = Object.freeze({ DISCONNECTED: 'DISCONNECTED', CONNECTING: 'CONNECTING', CONNECTED: 'CONNECTED', TERMINATED: 'TERMINATED' });

/**
 * Clean & Resilient Parent Transport Manager (SRemote Handshake v4).
 * Handles:
 * 1. Dedicated MessagePort Lifecycle per Instance (Deterministic 3-Way Handshake)
 * 2. Idempotent connection negotiation & in-memory handshake config
 * 3. DOM Detach Grace Period (300ms) for React Strict Mode / Remount
 * 4. Ping/Pong Heartbeat Sweeper & Unified DOM Scanner
 */
export function createParentTransport({ instanceManager, isHelloInitiated = () => false, onMediaMessage = () => {}, onMediaStateChange = () => {}, onBridgeMessage = () => {} }) {
  const { instances, assignedIframeIdMap, iframeToAssignedIdMap, isMultiModeActive, removeInstance, notifyMediaCountChange, emitGlobalEvent, pauseOthersExcept } = instanceManager;

  const portToInstanceMap = new WeakMap(); // MessagePort -> instanceId (O(1) direct port lookup)
  const sourceWindowToInstanceMap = new WeakMap(); // Window -> instanceId
  const blacklistedIframes = new WeakSet();
  const blacklistedSources = new WeakSet();
  const pendingReapTimers = new Map(); // instanceId -> timeoutId
  const pendingSynQueue = new Map(); // sessionId -> { event, data, processSyn }
  const GRACE_PERIOD_MS = 300;

  // In-Memory Handshake Config (Eliminating persistent Storage.raw dependency)
  const handshakeConfig = { css: null, treatAlmostEndAsEnd: null };

  let scanDebounceTimer = null;

  function updateHandshakeConfig(cfg = {}) {
    if (typeof cfg.css === 'string' || cfg.css === null) {
      handshakeConfig.css = cfg.css;
    }
    if (typeof cfg.treatAlmostEndAsEnd === 'boolean' || cfg.treatAlmostEndAsEnd === null) {
      handshakeConfig.treatAlmostEndAsEnd = cfg.treatAlmostEndAsEnd;
    }
  }

  function getHandshakeConfig() {
    return { ...handshakeConfig };
  }

  // --- Helper: Find Iframe Element from Window Source ---
  function findIframeElementBySource(sourceWindow, root = document) {
    if (!sourceWindow || !root) return null;

    // Fast path: O(1) WeakMap lookup for known source window
    if (root === document) {
      const cachedId = sourceWindowToInstanceMap.get(sourceWindow);
      if (cachedId) {
        const cachedEl = assignedIframeIdMap.get(cachedId) || instances.get(cachedId)?.iframeEl;
        if (cachedEl?.isConnected) return cachedEl;
      }
    }

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
  function setupPortForInstance(instanceId, port, initialLocation, initialOrigin, iframeEl = null, initialTransportState = TRANSPORT_STATE.CONNECTED, sessionId = null) {
    const newLocationOrOrigin = initialLocation || initialOrigin || '';

    // Check for Service / Domain Switch: ONLY evict if the EXACT same iframe DOM element navigated
    if (instances.size > 0 && newLocationOrOrigin && iframeEl) {
      for (const [oldId, oldInst] of Array.from(instances.entries())) {
        if (oldId !== instanceId) {
          const oldIframe = oldInst?.iframeEl || assignedIframeIdMap.get(oldId);
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

    // O(1) Direct Port Mapping
    if (port) {
      portToInstanceMap.set(port, instanceId);
    }

    // Attach deterministic FSM
    const fsm = createFSM({ transportState: initialTransportState === TRANSPORT_STATE.CONNECTED ? TransportState.CONNECTED : TransportState.CONNECTING });

    const item = {
      port,
      location: initialLocation,
      origin: initialOrigin,
      sessionId,
      note: '',
      state: null,
      mediaType: null,
      capabilities: null,
      lastSeen: Date.now(),
      status: initialTransportState === TRANSPORT_STATE.CONNECTED ? 'ready' : 'connecting',
      transportState: initialTransportState,
      fsm,
      iframeEl: iframeEl || assignedIframeIdMap.get(instanceId) || null,
      authenticated: false,
      hasMedia: false,
    };
    instances.set(instanceId, item);

    if (item.status === 'ready') {
      flushPendingCommands(instanceId, port, isMultiModeActive);
    }

    port.onmessage = e => {
      const rawData = e.data;
      if (!rawData || typeof rawData !== 'object') return;

      // Micro-Kernel Protocol Envelope Parser (Supports Handshake v4 + Native Envelopes)
      const envelope = parseEnvelope(rawData, NS);
      if (!envelope) return;

      const action = envelope.action;
      const lowerAction = action.toLowerCase();
      const data = envelope.payload && typeof envelope.payload === 'object' ? envelope.payload : {};
      const envelopeType = envelope.type;

      item.lastSeen = Date.now();

      if (lowerAction !== 'ping' && lowerAction !== 'pong') {
        logger.scope('transport').debug(`Parent received (port envelope) -> [${envelopeType}] ${action}`, { instanceId, envelope });
      }

      // 1. RPC Response Handling
      if (envelopeType === PACKET_TYPE.RPC_RESPONSE || (lowerAction === 'rpc_response' && envelope.id)) {
        const rpcId = envelope.id || data.rpcId;
        const req = pendingRpcRequests.get(rpcId);
        if (req) {
          clearTimeout(req.timer);
          pendingRpcRequests.delete(rpcId);
          const resPayload = data.result !== undefined ? data.result : data;
          if (resPayload?.success === false && resPayload?.error) {
            req.resolve?.({ success: false, error: resPayload.error, message: resPayload.message || 'RPC execution failed', instanceId });
          } else {
            req.resolve(typeof resPayload === 'object' && resPayload !== null ? { instanceId, ...resPayload } : { success: true, instanceId, data: resPayload });
          }
        }
        return;
      }

      // 1.5. Command ACK Handling
      if (envelopeType === PACKET_TYPE.COMMAND_ACK || (lowerAction === 'command_ack' && envelope.id)) {
        const cmdId = envelope.id || data.cmdId;
        const req = pendingCmds.get(cmdId);
        if (req) {
          clearTimeout(req.timer);
          pendingCmds.delete(cmdId);
          const resPayload = data.result !== undefined ? data.result : data;
          if (resPayload?.state) item.state = resPayload.state;
          const isOk = data.success !== false && resPayload?.success !== false && !data.error;
          if (!isOk) {
            req.resolve?.({ success: false, error: data.error || 'COMMAND_FAILED', message: data.message || 'Command execution failed', instanceId, action: req.action });
          } else {
            req.resolve?.({ success: true, instanceId, action: req.action, data: resPayload, state: item.state });
          }
        }
        return;
      }

      // 2. Heartbeat Pong
      if (lowerAction === 'pong' || envelopeType === PACKET_TYPE.HEARTBEAT) {
        if (item.transportState === TRANSPORT_STATE.CONNECTING) {
          item.transportState = TRANSPORT_STATE.CONNECTED;
          item.status = 'ready';
          fsm.transitionTransport(TransportState.CONNECTED);
          flushPendingCommands(instanceId, port, isMultiModeActive);
        }
        if (data.state) item.state = data.state;
        if (data.mediaType) item.mediaType = data.mediaType;
        if (data.capabilities) item.capabilities = data.capabilities;
        return;
      }

      // 3. Terminal Transport Disconnect
      if (lowerAction === 'disconnect' || lowerAction === 'unload') {
        fsm.transitionTransport(TransportState.TERMINATED);
        terminateInstance(instanceId, lowerAction);
        return;
      }

      // 4. Media State Change: nomedia
      if (lowerAction === 'nomedia' || lowerAction === 'mediadisconnected') {
        logger.scope('media').log(`Instance '${instanceId}' has no active media. Port preserved.`);
        item.hasMedia = false;
        fsm.transitionMedia(MediaState.NO_MEDIA);
        if (item.state && typeof item.state === 'object') {
          item.state = { ...item.state, paused: true };
        }
        onMediaStateChange({ instanceId, hasMedia: false, event: lowerAction });
        emitGlobalEvent('noMedia', { instanceId, hasMedia: false, reason: data.reason || 'detached', event: 'noMedia' });
        notifyMediaCountChange();
        return;
      }

      // 5. Handshake v4 ACK on Port
      if (lowerAction === 'ack' || lowerAction === 'accept') {
        item.authenticated = true;
        item.transportState = TRANSPORT_STATE.CONNECTED;
        item.status = 'ready';
        fsm.transitionTransport(TransportState.CONNECTED);
        if (typeof data.hasMedia === 'boolean') {
          item.hasMedia = data.hasMedia;
          if (data.hasMedia) fsm.transitionMedia(MediaState.READY);
        }
        if (data.state) item.state = data.state;
        if (data.mediaType) item.mediaType = data.mediaType;
        if (data.capabilities) item.capabilities = data.capabilities;
        flushPendingCommands(instanceId, port, isMultiModeActive);
        notifyMediaCountChange();
        emitGlobalEvent('accept', { ...data, instanceId, event: 'accept' });
        return;
      }

      // 6. Media State Updates
      if (typeof data.hasMedia === 'boolean') {
        item.hasMedia = data.hasMedia;
        if (data.hasMedia && fsm.mediaState === MediaState.NO_MEDIA) {
          fsm.transitionMedia(MediaState.READY);
        }
      }
      if (data.state) item.state = data.state;
      if (data.mediaType) item.mediaType = data.mediaType;
      if (data.capabilities) item.capabilities = data.capabilities;

      if (lowerAction === 'play' || lowerAction === 'playing') {
        fsm.transitionMedia(MediaState.PLAYING);
        instanceManager.setCurrentActiveInstanceId(instanceId);
        const exclusiveMode = instanceManager.exclusiveMode;
        if (exclusiveMode === 'auto' || exclusiveMode === true) {
          pauseOthersExcept(instanceId);
        } else if (exclusiveMode && exclusiveMode !== instanceId) {
          port.postMessage(createCmd('pause', null, { source: 'parent', instanceId }));
          return;
        }
      } else if (lowerAction === 'pause') {
        fsm.transitionMedia(MediaState.PAUSED);
      } else if (lowerAction === 'ended') {
        fsm.transitionMedia(MediaState.ENDED);
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
          ? { instanceId, source: envelope.meta?.source || data.source || 'iframe', mediaType: data.mediaType || item.mediaType, ...data, event: action }
          : { instanceId, source: 'iframe', mediaType: item.mediaType, value: data, event: action };
      emitGlobalEvent(action, forwardedPayload);
      onMediaMessage(action, forwardedPayload);
    };

    notifyMediaCountChange();
  }

  // --- 2. Instance Termination with Cleanup ---
  function terminateInstance(instanceId, reason = 'disconnected') {
    if (pendingReapTimers.has(instanceId)) {
      clearTimeout(pendingReapTimers.get(instanceId));
      pendingReapTimers.delete(instanceId);
    }
    const item = instances.get(instanceId);
    if (!item) return;
    item.transportState = TRANSPORT_STATE.TERMINATED;
    try {
      item.port?.postMessage(createEnvelope({ type: PACKET_TYPE.CONTROL, action: 'disconnect', payload: { reason, instanceId }, meta: { source: 'parent', instanceId } }));
    } catch {}
    try {
      item.port?.close();
    } catch {}
    removeInstance(instanceId, reason);
  }

  // --- 3. Cross-Frame Window Message Listener (Handshake v4) ---
  const onWindowMessage = event => {
    if (event.source === window) return;

    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // A. SRemote Handshake v4 Standardized SYN Packet
    const isHandshake = isHandshakePacket(data);
    const isLegacySyn = typeof data.type === 'string' && data.type.startsWith(NS) && data.type.slice(NS.length).toLowerCase() === 'syn';

    if (isHandshake || isLegacySyn) {
      const step = isHandshake ? data.step : 'SYN';
      if (step !== HANDSHAKE_STEPS.SYN && step !== 'SYN') {
        return;
      }

      const sessionId = data.sessionId || data.synChallenge || generateInstanceId('sess');
      const payload = data.payload || data;
      const iframeEl = findIframeElementBySource(event.source);

      let preAssignedId = (iframeEl && (iframeEl.getAttribute('data-sremote-id') || iframeToAssignedIdMap.get(iframeEl))) || null;
      if (!preAssignedId && iframeEl?.id) {
        preAssignedId = iframeEl.id;
      }
      if (!preAssignedId && iframeEl?.name && typeof iframeEl.name === 'string') {
        const nameMatch = iframeEl.name.match(/(?:sremote_id|data-sremote-id)=([^&;\s]+)/i);
        if (nameMatch) preAssignedId = decodeURIComponent(nameMatch[1]);
      }
      if (!preAssignedId && iframeEl?.closest) {
        const closestParentWithId = iframeEl.closest('[data-sremote-id]');
        if (closestParentWithId) {
          preAssignedId = closestParentWithId.getAttribute('data-sremote-id');
        }
      }

      const instanceId = preAssignedId || data.instanceId || generateInstanceId();
      const iframeLoc = payload.location || '';
      const iframeOrigin = event.origin && event.origin !== 'null' ? event.origin : payload.origin || '*';

      const synLog = logger.scope('handshake');
      synLog.log(`Parent received SYN (Handshake v4) from ${iframeOrigin}`, { instanceId, sessionId });

      if (iframeEl && instanceId) {
        assignedIframeIdMap.set(instanceId, iframeEl);
        iframeToAssignedIdMap.set(iframeEl, instanceId);
        if (iframeEl.id && iframeEl.id !== instanceId) {
          assignedIframeIdMap.set(iframeEl.id, iframeEl);
        }
      }

      if (iframeEl && blacklistedIframes.has(iframeEl)) {
        synLog.warn(`Dropped SYN from blacklisted iframe element: ${instanceId}`);
        return;
      }
      if (event.source && blacklistedSources.has(event.source)) {
        synLog.warn(`Dropped SYN from blacklisted window source: ${instanceId}`);
        return;
      }

      if (event.source && typeof event.source === 'object') {
        try {
          sourceWindowToInstanceMap.set(event.source, instanceId);
        } catch {}
      }

      // Idempotency: If this instance already has an established session with identical sessionId, skip recreation
      const existingInst = instances.get(instanceId);
      if (existingInst && existingInst.sessionId === sessionId && existingInst.transportState === TRANSPORT_STATE.CONNECTED) {
        synLog.log(`Instance '${instanceId}' already connected with sessionId '${sessionId}'. Re-handshake skipped.`);
        return;
      }

      const completeSynAck = () => {
        // Cleanly close prior port if any
        if (existingInst?.port) {
          try {
            existingInst.port.close();
          } catch {}
        }

        const channel = new MessageChannel();
        setupPortForInstance(instanceId, channel.port1, iframeLoc, iframeOrigin, iframeEl, TRANSPORT_STATE.CONNECTING, sessionId);

        const inst = instances.get(instanceId);
        if (inst) {
          inst.authenticated = false; // Will be set to true on ACK
          inst.sessionId = sessionId;
          instanceManager.setCurrentActiveInstanceId(instanceId);
          inst.hasMedia = Boolean(payload.hasMedia);
          if (payload.state) inst.state = payload.state;
          if (payload.mediaType) inst.mediaType = payload.mediaType;
          if (payload.capabilities) inst.capabilities = payload.capabilities;
          inst.lastSeen = Date.now();
        }
        notifyMediaCountChange();

        const synAckPacket = createHandshakePacket({
          step: HANDSHAKE_STEPS.SYN_ACK,
          sessionId,
          instanceId,
          payload: { allowed: true, parentOrigin: location.origin, config: { css: handshakeConfig.css || null, treatAlmostEndAsEnd: handshakeConfig.treatAlmostEndAsEnd } },
        });

        try {
          event.source.postMessage(synAckPacket, iframeOrigin && iframeOrigin !== 'null' ? iframeOrigin : '*', [channel.port2]);
          channel.port1.postMessage(createEnvelope({ type: PACKET_TYPE.HEARTBEAT, action: 'ping', payload: { handshakeVerify: true }, meta: { source: 'parent', instanceId } }));
        } catch (err) {
          synLog.warn('Failed to transfer MessagePort in SYN_ACK:', err);
        }
      };

      const rejectSyn = () => {
        try {
          const rejectPacket = createHandshakePacket({ step: HANDSHAKE_STEPS.SYN_ACK, sessionId, instanceId, payload: { allowed: false, parentOrigin: location.origin } });
          event.source.postMessage(rejectPacket, iframeOrigin && iframeOrigin !== 'null' ? iframeOrigin : '*');
        } catch {}
      };

      const processSyn = () => {
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
      // hold the SYN in pendingSynQueue
      if (!isHelloInitiated()) {
        synLog.log(`Deferred SYN from ${iframeOrigin} until top window calls sremote.hello()`);
        const now = Date.now();
        for (const [sId, item] of pendingSynQueue.entries()) {
          if (item.timestamp && now - item.timestamp > 60000) {
            pendingSynQueue.delete(sId);
          }
        }
        pendingSynQueue.set(sessionId, { processSyn, completeSynAck, rejectSyn, timestamp: now });
        return;
      }

      processSyn();
    }
  };

  // --- 4. Grace Period Liveness & Unified DOM Scanner ---
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

  function discover(targetWindow = null) {
    const discoverPacket = createHandshakePacket({
      step: 'RESET', // or DISCOVER
      sessionId: generateInstanceId('disc'),
      payload: { parentOrigin: location.origin, config: { css: handshakeConfig.css || null, treatAlmostEndAsEnd: handshakeConfig.treatAlmostEndAsEnd } },
    });

    if (targetWindow && typeof targetWindow.postMessage === 'function') {
      try {
        targetWindow.postMessage(discoverPacket, '*');
      } catch {}
      return;
    }

    try {
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        try {
          iframes[i].contentWindow?.postMessage(discoverPacket, '*');
        } catch {}
      }
    } catch {}

    try {
      if (typeof window !== 'undefined' && window.frames) {
        for (let i = 0; i < window.frames.length; i++) {
          try {
            window.frames[i].postMessage(discoverPacket, '*');
          } catch {}
        }
      }
    } catch {}
  }

  // Unified DOM MutationObserver (Handles additions, dynamic discovery, and reaps)
  const unifiedDomObserver = new MutationObserver(mutations => {
    let hasNewIframe = false;

    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        for (let i = 0; i < m.addedNodes.length; i++) {
          const node = m.addedNodes[i];
          if (node.nodeType === 1) {
            if (node.tagName === 'IFRAME') {
              hasNewIframe = true;
              const assignedId = iframeToAssignedIdMap.get(node) || node.getAttribute?.('data-sremote-id');
              if (assignedId) cancelReapInstance(assignedId);
            } else if (node.querySelectorAll) {
              const subIframes = node.querySelectorAll('iframe');
              if (subIframes.length > 0) {
                hasNewIframe = true;
                for (let j = 0; j < subIframes.length; j++) {
                  const assignedId = iframeToAssignedIdMap.get(subIframes[j]) || subIframes[j].getAttribute?.('data-sremote-id');
                  if (assignedId) cancelReapInstance(assignedId);
                }
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

    if (hasNewIframe && isHelloInitiated()) {
      if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
      scanDebounceTimer = setTimeout(() => {
        logger.scope('lifecycle').log('New iframe detected in DOM. Auto-scanning with discover...');
        discover();
      }, 50);
    }
  });

  const mountTarget = document.documentElement || document;
  if (mountTarget) {
    try {
      unifiedDomObserver.observe(mountTarget, { childList: true, subtree: true });
    } catch {}
  }

  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    const PING_THRESHOLD = 2000;
    const DEAD_TIMEOUT = 30000;
    const isHidden = typeof document !== 'undefined' && document.hidden;

    for (const [id, item] of instances.entries()) {
      if (item.iframeEl && !item.iframeEl.isConnected) {
        scheduleReapInstance(id);
        continue;
      }
      const elapsed = now - (item.lastSeen || 0);
      if (elapsed > DEAD_TIMEOUT && !isHidden) {
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
        synLog.warn('Failed to process deferred SYN:', err);
      }
    });
  }

  return {
    updateHandshakeConfig,
    getHandshakeConfig,
    discover,
    flushPendingSyns,
    terminateInstance,
    destroy: () => {
      window.removeEventListener('message', onWindowMessage);
      clearInterval(heartbeatInterval);
      if (scanDebounceTimer) clearTimeout(scanDebounceTimer);
      unifiedDomObserver.disconnect();
      for (const t of pendingReapTimers.values()) clearTimeout(t);
      pendingReapTimers.clear();
      pendingSynQueue.clear();
    },
  };
}

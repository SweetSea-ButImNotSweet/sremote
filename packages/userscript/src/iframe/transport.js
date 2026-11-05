import { VERSION } from '../const.js';
import { logger } from '../config.js';
import { generateInstanceId, createHandshakePacket, HANDSHAKE_STEPS } from '@sremote/shared';
import { showConnectedIndicator } from '../ui/indicator-badge.js';
import { IframeStyleEngine } from './style-engine.js';
import { getVideoState, getIframeCapabilities } from './controller.js';

/**
 * Transport Connection State for Iframe
 */
export const IFRAME_TRANSPORT_STATE = Object.freeze({ DISCONNECTED: 'DISCONNECTED', CONNECTING: 'CONNECTING', CONNECTED: 'CONNECTED' });

/**
 * Clean & Resilient Iframe Transport Manager (SRemote Handshake v4).
 * Implements deterministic 3-way handshake:
 * 1. sendSyn(): Generates unique sessionId, sends 'SYN' to window.top.
 * 2. handleSynAck(): Validates (event.source === window.top && sessionId match).
 *    Binds dedicated MessagePort, applies initial configs, sends 'ACK' directly over MessagePort.
 * 3. Idempotent: Ignores duplicate SYN requests when already CONNECTED.
 */
export function createIframeTransport(options) {
  const {
    ctx,
    instanceIdGetter = ctx ? () => ctx.instanceId : options.instanceIdGetter,
    setInstanceId = ctx ? id => (ctx.instanceId = id) : options.setInstanceId,
    resolver = ctx?.resolver || options.resolver,
    bindPort = ctx?.bindPort || options.bindPort,
    closeMediaPort = ctx?.closeMediaPort || options.closeMediaPort,
    notifyState = ctx?.notifyState || options.notifyState,
    treatAlmostEndSetter = ctx ? val => (ctx.treatAlmostEndAsEnd = val) : options.treatAlmostEndSetter,
    treatAlmostEndAsEndSetter = treatAlmostEndSetter || (ctx ? val => (ctx.treatAlmostEndAsEnd = val) : options.treatAlmostEndAsEndSetter),
  } = options;

  let primaryAuthorizedOrigin = null;
  let transportState = IFRAME_TRANSPORT_STATE.DISCONNECTED;
  let currentSessionId = generateInstanceId('sess');
  let synTimer = null;
  let synRetryCount = 0;

  function sendSyn(force = false) {
    if (typeof window === 'undefined' || !window.top || window.top === window) {
      return;
    }

    if (transportState === IFRAME_TRANSPORT_STATE.CONNECTED && !force) {
      return;
    }

    transportState = IFRAME_TRANSPORT_STATE.CONNECTING;
    if (force || !currentSessionId) {
      currentSessionId = generateInstanceId('sess');
    }

    resolver.resolveActiveMedia();
    const hasActiveMedia = Boolean(resolver.getActiveMedia());

    const synPacket = createHandshakePacket({
      step: HANDSHAKE_STEPS.SYN,
      sessionId: currentSessionId,
      instanceId: instanceIdGetter() || null,
      payload: {
        origin: location.origin,
        location: location.href,
        version: VERSION,
        hasMedia: hasActiveMedia,
        mediaType: resolver.getMediaType() || (hasActiveMedia ? 'video' : 'idle'),
        capabilities: getIframeCapabilities(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
        state: getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
      },
    });

    const log = logger.scope('handshake');
    log.log(`Iframe sending SYN (Handshake v4) ->`, { sessionId: currentSessionId, instanceId: instanceIdGetter() });

    try {
      window.top.postMessage(synPacket, '*');
    } catch (err) {
      log.warn('Failed to post SYN to window.top:', err);
    }

    // Retransmit SYN if no SYN_ACK after 3.0s and still CONNECTING (max 3 retries)
    if (synTimer) clearTimeout(synTimer);
    synTimer = setTimeout(() => {
      if (transportState === IFRAME_TRANSPORT_STATE.CONNECTING && synRetryCount < 3) {
        synRetryCount++;
        log.log(`Retrying SYN (attempt ${synRetryCount}/3)...`);
        sendSyn(false);
      } else if (transportState === IFRAME_TRANSPORT_STATE.CONNECTING) {
        log.warn('Handshake SYN timed out after max retries.');
        synRetryCount = 0;
        transportState = IFRAME_TRANSPORT_STATE.DISCONNECTED;
      }
    }, 3000);
  }

  function handleSynAck(event, data) {
    const log = logger.scope('handshake');
    const secLog = logger.scope('security');

    // 1. Strict Anti-Spoofing: Must be from window.top
    if (typeof window !== 'undefined' && event.source !== window.top) {
      secLog.warn('Dropped SYN_ACK: sender is not window.top.');
      return;
    }

    // 2. Strict Session Verification: Must match currentSessionId
    const incomingSessionId = data.sessionId || data.synChallenge;
    if (!currentSessionId || incomingSessionId !== currentSessionId) {
      secLog.warn('Dropped SYN_ACK: invalid or expired sessionId.', { expected: currentSessionId, received: incomingSessionId });
      return;
    }

    if (synTimer) {
      clearTimeout(synTimer);
      synTimer = null;
    }

    // 3. Check permission decision if provided
    const payload = data.payload || data;
    if (payload.allowed === false) {
      transportState = IFRAME_TRANSPORT_STATE.DISCONNECTED;
      log.warn('Connection rejected by top parent.');
      return;
    }

    if (!event.ports || event.ports.length === 0) {
      log.warn('SYN_ACK received without MessagePort.');
      return;
    }

    const callerOrigin = event.origin || payload.parentOrigin || 'unknown_parent';
    primaryAuthorizedOrigin = callerOrigin;

    const assignedId = data.instanceId || data.assignedInstanceId;
    if (assignedId && typeof assignedId === 'string') {
      setInstanceId(assignedId);
    }

    const config = payload.config || payload;
    if (config.css && typeof config.css === 'string') {
      IframeStyleEngine.setDynamicCSS(config.css);
    }

    if (typeof config.treatAlmostEndAsEnd === 'boolean') {
      treatAlmostEndAsEndSetter(config.treatAlmostEndAsEnd);
    }

    // Bind dedicated private MessagePort
    closeMediaPort();
    const port = event.ports[0];
    bindPort(port);

    // Send ACK directly through the private MessagePort
    try {
      const ackPacket = createHandshakePacket({
        step: HANDSHAKE_STEPS.ACK,
        sessionId: currentSessionId,
        instanceId: instanceIdGetter() || null,
        payload: { status: 'ESTABLISHED', hasMedia: Boolean(resolver.getActiveMedia()), state: getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia) },
      });
      port.postMessage(ackPacket);
    } catch (err) {
      log.warn('Failed to post ACK over MessagePort:', err);
    }

    synRetryCount = 0;
    transportState = IFRAME_TRANSPORT_STATE.CONNECTED;
    notifyState();
    showConnectedIndicator(callerOrigin, primaryAuthorizedOrigin);

    log.log(`Handshake v4 ESTABLISHED (MessagePort) with parent [${callerOrigin}]`);
  }

  function resetConnection(reason = 'disconnected') {
    const log = logger.scope('handshake');
    if (synTimer) {
      clearTimeout(synTimer);
      synTimer = null;
    }
    closeMediaPort();
    transportState = IFRAME_TRANSPORT_STATE.DISCONNECTED;
    synRetryCount = 0;
    currentSessionId = null;
    notifyState();
    log.log(`Transport connection reset (${reason}).`);
  }

  return {
    get primaryAuthorizedOrigin() {
      return primaryAuthorizedOrigin;
    },
    get transportState() {
      return transportState;
    },
    get currentSessionId() {
      return currentSessionId;
    },
    sendSyn,
    handleSynAck,
    resetConnection,
  };
}

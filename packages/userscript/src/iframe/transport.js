import { VERSION, NS, logger } from '../config.js';
import { generateInstanceId } from '../core/utils.js';
import { showConnectedIndicator } from '../ui/indicator-badge.js';
import { IframeStyleEngine } from './style-engine.js';
import { getVideoState, getIframeCapabilities } from './controller.js';

/**
 * Transport Connection State for Iframe
 */
export const IFRAME_TRANSPORT_STATE = { DISCONNECTED: 'DISCONNECTED', CONNECTING: 'CONNECTING', CONNECTED: 'CONNECTED' };

/**
 * Clean & Resilient Iframe Transport Manager.
 * Implements 1-to-1 TCP-style handshake:
 * 1. sendSyn(): Iframe creates unique synChallenge and transmits 'syn' directly to window.top.
 * 2. handleSynAck(): Validates (event.source === window.top && event.data.synChallenge === currentSynChallenge).
 *    Attaches dedicated MessagePort and sends 'ack' back via the port.
 * 3. Autonomous connection survival across media detachment / video reload.
 */
export function createIframeTransportManager({ instanceIdGetter, setInstanceId, resolver, bindPort, closeMediaPort, notifyState, treatAlmostEndAsEndSetter }) {
  let primaryAuthorizedOrigin = null;
  let transportState = IFRAME_TRANSPORT_STATE.DISCONNECTED;
  let currentSynChallenge = null;
  let synTimer = null;

  function sendSyn() {
    if (typeof window === 'undefined' || !window.top || window.top === window) {
      return;
    }

    if (transportState === IFRAME_TRANSPORT_STATE.CONNECTED) {
      return;
    }

    transportState = IFRAME_TRANSPORT_STATE.CONNECTING;
    currentSynChallenge = generateInstanceId('syn');

    resolver.resolveActiveMedia();
    const hasActiveMedia = Boolean(resolver.getActiveMedia());

    const synPayload = {
      type: `${NS}syn`,
      source: 'iframe',
      synChallenge: currentSynChallenge,
      instanceId: instanceIdGetter(),
      location: location.href,
      origin: location.origin,
      version: VERSION,
      hasMedia: hasActiveMedia,
      mediaType: resolver.getMediaType() || (hasActiveMedia ? 'video' : 'idle'),
      capabilities: getIframeCapabilities(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
      state: getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
    };

    const log = logger.scope('handshake');

    log.log(`Iframe sending 'syn' (TCP Handshake) ->`, { synChallenge: currentSynChallenge, instanceId: instanceIdGetter() });

    try {
      window.top.postMessage(synPayload, '*');
    } catch (err) {
      log.warn('Failed to post SYN to window.top:', err);
    }

    // Retransmit SYN if no SYN-ACK after 2.5s and still CONNECTING
    if (synTimer) clearTimeout(synTimer);
    synTimer = setTimeout(() => {
      if (transportState === IFRAME_TRANSPORT_STATE.CONNECTING) {
        sendSyn();
      }
    }, 2500);
  }

  function handleSynAck(event, data) {
    const log = logger.scope('handshake');
    const secLog = logger.scope('security');

    // 1. Strict Anti-Spoofing: Must be from window.top
    if (typeof window !== 'undefined' && event.source !== window.top) {
      secLog.warn('Dropped syn_ack: sender is not window.top.');
      return;
    }

    // 2. Strict Challenge Verification: Must match currentSynChallenge
    if (!currentSynChallenge || data.synChallenge !== currentSynChallenge) {
      secLog.warn('Dropped syn_ack: invalid or expired synChallenge.', { expected: currentSynChallenge, received: data?.synChallenge });
      return;
    }

    if (synTimer) {
      clearTimeout(synTimer);
      synTimer = null;
    }
    currentSynChallenge = null;

    if (data.allowed === false) {
      transportState = IFRAME_TRANSPORT_STATE.DISCONNECTED;
      log.warn('Connection rejected by top parent.');
      return;
    }

    if (!event.ports || event.ports.length === 0) {
      log.warn('syn_ack received without MessagePort.');
      return;
    }

    const callerOrigin = event.origin || data.parentOrigin || 'unknown_parent';
    primaryAuthorizedOrigin = callerOrigin;

    if (data.assignedInstanceId && typeof data.assignedInstanceId === 'string') {
      setInstanceId(data.assignedInstanceId);
    }

    if (data.css && typeof data.css === 'string') {
      IframeStyleEngine.setDynamicCSS(data.css);
    }

    if (typeof data.treatAlmostEndAsEnd === 'boolean') {
      treatAlmostEndAsEndSetter(data.treatAlmostEndAsEnd);
    }

    // Bind dedicated private MessagePort
    closeMediaPort();
    const port = event.ports[0];
    bindPort(port);

    // Send ACK back through the established private pipe
    try {
      port.postMessage({ type: `${NS}ack`, source: 'iframe', instanceId: instanceIdGetter(), status: 'ESTABLISHED' });
    } catch {}

    transportState = IFRAME_TRANSPORT_STATE.CONNECTED;
    notifyState();
    showConnectedIndicator(callerOrigin, primaryAuthorizedOrigin);

    log.log(`TCP Handshake ESTABLISHED (1-to-1) with parent [${callerOrigin}]`);
  }

  // Legacy fallback support for older parent userscripts sending 'hello'
  function handleHelloMessage(event, data) {
    if (event.source === window) return;
    if (transportState === IFRAME_TRANSPORT_STATE.CONNECTED) return;

    if (data.assignedInstanceId && typeof data.assignedInstanceId === 'string') {
      setInstanceId(data.assignedInstanceId);
    }
    if (data.css && typeof data.css === 'string') {
      IframeStyleEngine.setDynamicCSS(data.css);
    }
    if (typeof data.treatAlmostEndAsEnd === 'boolean') {
      treatAlmostEndAsEndSetter(data.treatAlmostEndAsEnd);
    }

    // If parent sent hello, respond by starting SYN flow
    sendSyn();
  }

  return {
    get primaryAuthorizedOrigin() {
      return primaryAuthorizedOrigin;
    },
    get transportState() {
      return transportState;
    },
    sendSyn,
    handleSynAck,
    handleHelloMessage,
  };
}

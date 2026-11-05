/**
 * Standardized Handshake Contract (SRemote Handshake v4)
 *
 * Implements deterministic 3-way handshake packet structures for cross-origin
 * initialization:
 *   Iframe -> Parent: SYN (via window.postMessage)
 *   Parent -> Iframe: SYN_ACK (via window.postMessage, transferring MessagePort)
 *   Iframe -> Parent: ACK (sent directly over the private MessagePort)
 */

export const HANDSHAKE_PROTOCOL = 'sremote';
export const HANDSHAKE_VERSION = 4;

export const HANDSHAKE_STEPS = Object.freeze({ SYN: 'SYN', SYN_ACK: 'SYN_ACK', ACK: 'ACK', RESET: 'RESET' });

/**
 * Creates a standardized handshake packet.
 *
 * @param {Object} options
 * @param {string} options.step - 'SYN' | 'SYN_ACK' | 'ACK' | 'RESET'
 * @param {string} options.sessionId - Unique session identifier
 * @param {string} [options.instanceId] - Target or assigned instance ID
 * @param {Object} [options.payload=null] - Additional metadata or payload
 * @returns {Object}
 */
export function createHandshakePacket({ step, sessionId, instanceId = null, payload = null }) {
  const normalizedStep = String(step || '').toUpperCase();
  if (!HANDSHAKE_STEPS[normalizedStep]) {
    throw new Error(`[SRemote:Handshake] Invalid handshake step: ${step}`);
  }

  return {
    protocol: HANDSHAKE_PROTOCOL,
    version: HANDSHAKE_VERSION,
    type: 'HANDSHAKE',
    step: normalizedStep,
    sessionId: String(sessionId || ''),
    ...(instanceId ? { instanceId: String(instanceId) } : {}),
    ...(payload && typeof payload === 'object' ? { payload } : {}),
  };
}

/**
 * Validates whether an incoming message is an SRemote v4 Handshake packet.
 *
 * @param {*} data
 * @returns {boolean}
 */
export function isHandshakePacket(data) {
  return Boolean(
    data &&
      typeof data === 'object' &&
      data.protocol === HANDSHAKE_PROTOCOL &&
      data.version === HANDSHAKE_VERSION &&
      data.type === 'HANDSHAKE' &&
      typeof data.step === 'string' &&
      HANDSHAKE_STEPS[data.step.toUpperCase()] &&
      typeof data.sessionId === 'string' &&
      data.sessionId.length > 0,
  );
}

/**
 * Parses and returns normalized handshake packet, or null if invalid.
 *
 * @param {*} data
 * @returns {Object|null}
 */
export function parseHandshakePacket(data) {
  if (!isHandshakePacket(data)) return null;
  return {
    protocol: data.protocol,
    version: data.version,
    type: data.type,
    step: data.step.toUpperCase(),
    sessionId: data.sessionId,
    instanceId: data.instanceId || null,
    payload: data.payload || {},
  };
}

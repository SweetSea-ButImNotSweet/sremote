/**
 * Micro-Kernel Protocol Envelope Contract & Utilities
 *
 * Provides an immutable envelope contract decoupling the physical transport
 * layer (MessagePort / postMessage) from application business logic:
 *   { id, type, action, payload, meta }
 */

export const PACKET_TYPE = Object.freeze({ RPC_REQUEST: 'RPC_REQUEST', RPC_RESPONSE: 'RPC_RESPONSE', EVENT: 'EVENT', HANDSHAKE: 'HANDSHAKE', HEARTBEAT: 'HEARTBEAT' });

let packetCounter = 0;

/**
 * Generates an immutable, standardized protocol envelope.
 *
 * @param {Object} options
 * @param {string} options.type - PACKET_TYPE member
 * @param {string} options.action - Action name or event name (e.g. 'play', 'seek', 'timeupdate')
 * @param {*} [options.payload=null] - Serialized data payload
 * @param {string} [options.id] - Optional unique packet ID (generated if omitted)
 * @param {Object} [options.meta={}] - Metadata (source, timestamp, instanceId, etc.)
 * @returns {Object} Immutable envelope packet
 */
export function createEnvelope({ type, action, payload = null, id = null, meta = {} }) {
  packetCounter = (packetCounter + 1) & 0x7fffffff;
  const packetId = id || `pkt_${Date.now().toString(36)}_${packetCounter.toString(36)}`;

  return Object.freeze({
    id: packetId,
    type: String(type || PACKET_TYPE.EVENT).toUpperCase(),
    action: String(action || '').toLowerCase(),
    payload,
    meta: Object.freeze({ timestamp: Date.now(), source: meta.source || 'unknown', instanceId: meta.instanceId || null, ...meta }),
  });
}

/**
 * Creates an RPC request envelope.
 * @param {string} action
 * @param {*} [params=null]
 * @param {Object} [meta={}]
 * @returns {Object}
 */
export function createRpcRequestEnvelope(action, params = null, meta = {}) {
  return createEnvelope({ type: PACKET_TYPE.RPC_REQUEST, action, payload: params, meta });
}

/**
 * Creates an RPC response envelope.
 * @param {string} rpcId
 * @param {*} [result=null]
 * @param {*} [error=null]
 * @param {Object} [meta={}]
 * @returns {Object}
 */
export function createRpcResponseEnvelope(rpcId, result = null, error = null, meta = {}) {
  return createEnvelope({
    type: PACKET_TYPE.RPC_RESPONSE,
    action: 'rpc_response',
    id: rpcId,
    payload: { success: !error, result, error: error ? (typeof error === 'object' ? error.message || error.error || String(error) : String(error)) : null },
    meta,
  });
}

/**
 * Creates a media or lifecycle event envelope.
 * @param {string} eventName
 * @param {*} [payload=null]
 * @param {Object} [meta={}]
 * @returns {Object}
 */
export function createEventEnvelope(eventName, payload = null, meta = {}) {
  return createEnvelope({ type: PACKET_TYPE.EVENT, action: eventName, payload, meta });
}

/**
 * Validates and decodes any incoming packet into a unified envelope.
 * Supports dual-mode backwards compatibility: transparently parses both
 * native envelopes and legacy \{ type: 'sremote:*', ... }\ packets.
 *
 * @param {*} raw
 * @param {string} [namespace='sremote:']
 * @returns {Object|null} Standardized envelope or null if not an SRemote packet
 */
export function parseEnvelope(raw, namespace = 'sremote:') {
  if (!raw || typeof raw !== 'object') return null;

  // 1. Native Micro-Kernel Envelope
  if (typeof raw.type === 'string' && typeof raw.action === 'string' && raw.meta && typeof raw.meta === 'object') {
    const rawType = raw.type.toUpperCase();
    if (PACKET_TYPE[rawType]) {
      return {
        id: raw.id || `pkt_${Date.now().toString(36)}`,
        type: rawType,
        action: raw.action.toLowerCase(),
        payload: raw.payload !== undefined ? raw.payload : null,
        meta: raw.meta,
      };
    }
  }

  // 2. Legacy Envelope / Flat Packet ({ type: 'sremote:*' })
  const typeStr = String(raw.type || '');
  if (!typeStr.startsWith(namespace)) {
    return null;
  }

  const rawAction = typeStr.slice(namespace.length).toLowerCase();
  const instanceId = raw.instanceId || raw.assignedInstanceId || null;
  const source = raw.source || 'unknown';

  // Discern packet type from legacy action
  let inferredType = PACKET_TYPE.EVENT;
  if (rawAction === 'rpc_request') {
    inferredType = PACKET_TYPE.RPC_REQUEST;
  } else if (rawAction === 'rpc_response') {
    inferredType = PACKET_TYPE.RPC_RESPONSE;
  } else if (rawAction === 'syn' || rawAction === 'syn_ack' || rawAction === 'ack' || rawAction === 'hello' || rawAction === 'accept') {
    inferredType = PACKET_TYPE.HANDSHAKE;
  } else if (rawAction === 'ping' || rawAction === 'pong') {
    inferredType = PACKET_TYPE.HEARTBEAT;
  }

  return {
    id: raw.rpcId || raw.id || `pkt_legacy_${Date.now().toString(36)}`,
    type: inferredType,
    action: rawAction === 'rpc_request' ? String(raw.action || '').toLowerCase() : rawAction,
    payload: raw.payload !== undefined ? raw.payload : raw.params !== undefined ? raw.params : raw.result !== undefined ? raw.result : raw,
    meta: { timestamp: Date.now(), source, instanceId, rawLegacy: raw },
  };
}

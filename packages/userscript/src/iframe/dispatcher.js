import { NS } from '../const.js';
import { logger } from '../config.js';
import { getVideoState, getIframeCapabilities } from './controller.js';
import { parseEnvelope, createEnvelope, PACKET_TYPE, isHandshakePacket, HANDSHAKE_STEPS } from '@sremote/shared';

export const MEDIA_COMMANDS = new Set(['play', 'pause', 'toggle', 'stop', 'seek', 'seekto', 'currenttime', 'volume', 'muted', 'speed', 'rate']);

/**
 * Creates the unified message dispatcher for both MessagePort and Window fallback channels.
 */
export function createIframeDispatcher(options) {
  const {
    ctx,
    instanceIdGetter = ctx ? () => ctx.instanceId : options.instanceIdGetter,
    resolver = ctx?.resolver || options.resolver,
    rpcRegistry = ctx?.rpcRegistry || options.rpcRegistry,
    executeControl = ctx?.executeControl || options.executeControl,
    emitToParent = ctx?.emitToParent || options.emitToParent,
    mockMediaSessionInstance = options.mockMediaSessionInstance,
    handshake = options.handshake,
  } = options;
  async function handleIncomingControl(action, value) {
    const handled = await executeControl(action, value);
    if (!handled) {
      logger.warn(`[sremote] Command '${action}' failed: No media element or MediaSession handler found in frame.`);
      emitToParent('noMedia', { action, reason: 'NO_MEDIA_FOUND', message: `No media element or MediaSession handler found for command '${action}'` });
    }
    return handled;
  }

  async function dispatchPortMessage(event, port) {
    const rawData = event.data;
    if (!rawData || typeof rawData !== 'object') return;

    const envelope = parseEnvelope(rawData, NS);
    if (!envelope) return;

    const action = envelope.action;
    const lowerAction = action.toLowerCase();
    const data = envelope.payload && typeof envelope.payload === 'object' ? envelope.payload : {};
    const envelopeType = envelope.type;
    const instanceId = instanceIdGetter();

    if (lowerAction !== 'ping' && lowerAction !== 'pong') {
      logger.log(`%c[SRemote:command] Iframe received command (port envelope) -> [${envelopeType}] ${action}`, 'color: #8b5cf6; font-weight: bold;', envelope);
    }

    switch (lowerAction) {
      case 'resendblobobject': {
        if (data.blob) {
          try {
            const localBlobUrl = URL.createObjectURL(data.blob);
            if (mockMediaSessionInstance.metadata) {
              const arts = mockMediaSessionInstance.metadata.artwork || [];
              arts.push({ src: localBlobUrl });
              mockMediaSessionInstance.metadata.artwork = arts;
              if (navigator.mediaSession && typeof MediaMetadata !== 'undefined') {
                navigator.mediaSession.metadata = new MediaMetadata(mockMediaSessionInstance.metadata);
              }
            }
          } catch (err) {
            logger.warn('[sremote] Error creating local object URL for blob:', err);
          }
        }
        return;
      }

      case 'bridge_post': {
        const payload = data.payload;
        const targetOrigin = data.targetOrigin || '*';
        try {
          window.postMessage(payload, targetOrigin);
        } catch (err) {
          logger.warn('[sremote] Error executing bridge postMessage in iframe:', err);
        }
        return;
      }

      case 'ping': {
        resolver.resolveActiveMedia();
        const state = getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia);
        const capabilities = getIframeCapabilities(null, resolver.getActiveMedia(), resolver.resolveActiveMedia);
        try {
          port.postMessage({
            type: `${NS}pong`,
            source: 'iframe',
            instanceId,
            mediaType: resolver.getMediaType(),
            hasMedia: Boolean(resolver.getActiveMedia()),
            capabilities,
            state,
          });
        } catch {}
        return;
      }

      case 'disconnect':
        return;

      default: {
        // Handle RPC requests
        if (envelopeType === PACKET_TYPE.RPC_REQUEST || lowerAction === 'rpc_request') {
          const rpcId = envelope.id || data.rpcId;
          const targetAction = data.action || action;
          const targetParams = data.params !== undefined ? data.params : envelope.payload;
          try {
            const res = await rpcRegistry.executeRpc(targetAction, targetParams);
            port.postMessage(
              createEnvelope({
                type: PACKET_TYPE.RPC_RESPONSE,
                action: 'rpc_response',
                id: rpcId,
                payload: { success: true, instanceId, data: res },
                meta: { source: 'iframe', instanceId },
              }),
            );
          } catch (err) {
            const isNotFound = String(err).includes('not found');
            port.postMessage(
              createEnvelope({
                type: PACKET_TYPE.RPC_RESPONSE,
                action: 'rpc_response',
                id: rpcId,
                payload: { success: false, error: isNotFound ? 'METHOD_NOT_FOUND' : 'RPC_ERROR', message: String(err), instanceId },
                meta: { source: 'iframe', instanceId },
              }),
            );
          }
          return;
        }

        // Handle standard media playback controls
        if (MEDIA_COMMANDS.has(lowerAction)) {
          await handleIncomingControl(action, data.value);
        }
      }
    }
  }

  async function dispatchWindowMessage(event, mediaPort) {
    const data = event.data;

    // 1. Standardized Handshake v4 Packets
    if (isHandshakePacket(data)) {
      if (data.step === HANDSHAKE_STEPS.SYN_ACK) {
        handshake.handleSynAck(event, data);
        return;
      }
      if (data.step === 'DISCOVER' || data.step === 'RESET') {
        handshake.sendSyn(true);
        return;
      }
      return;
    }

    // Forward non-SRemote messages to parent if requested
    const isSRemote = data && typeof data === 'object' && typeof data.type === 'string' && data.type.startsWith(NS);
    if (!isSRemote) {
      if (mediaPort && event.source !== window.top) {
        try {
          mediaPort.postMessage({ type: `${NS}bridge_message`, source: 'iframe', data, origin: event.origin });
        } catch {}
      }
      return;
    }

    if (event.source === window || data.source === 'iframe') return;

    const action = data.type.slice(NS.length);
    const lowerAction = action.toLowerCase();
    const callerOrigin = event.origin || 'unknown_parent';

    logger.log(`%c[SRemote:command] Iframe received command/message (window) -> ${action}`, 'color: #ec4899; font-weight: bold;', { origin: callerOrigin, data });

    switch (lowerAction) {
      case 'syn_ack':
      case 'synack':
        handshake.handleSynAck(event, data);
        return;

      case 'hello':
        handshake.sendSyn();
        return;

      default:
        if (MEDIA_COMMANDS.has(lowerAction)) {
          await handleIncomingControl(action, data.value);
        }
    }
  }

  return { dispatchPortMessage, dispatchWindowMessage, handleIncomingControl };
}

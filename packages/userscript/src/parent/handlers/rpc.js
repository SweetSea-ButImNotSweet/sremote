import { generateInstanceId } from '../../core/utils.js';
import { pendingRpcRequests } from '../queue.js';

/**
 * Creates RPC and cross-frame messaging handlers for parent API.
 */
export function createRpcHandlers({ instanceManager, validateDomainAccess, getIframeElement, logger, NS }) {
  const { instances, getLatestActiveInstanceId } = instanceManager;

  const rpcCall = (action, params, instanceId, key) => {
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
    if (!target?.port) {
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
        resolve({ success: false, error: 'TIMEOUT', message: `RPC call '${action}' timed out after 5000ms`, action, instanceId: targetId });
      }, 5000);
      pendingRpcRequests.set(rpcId, { resolve, timer });
      try {
        target.port.postMessage({ type: `${NS}rpc_request`, source: 'parent', rpcId, action, params });
      } catch (err) {
        clearTimeout(timer);
        pendingRpcRequests.delete(rpcId);
        resolve({ success: false, error: 'PORT_ERROR', message: String(err), action, instanceId: targetId });
      }
    });
  };

  const postWindowMessage = (message, targetOrigin = '*', instanceId = null, from = 'parent', key = null) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked postWindowMessage()! Valid Passkey is required.');
      return false;
    }
    const targetId = instanceId || getLatestActiveInstanceId();
    const origin = typeof targetOrigin === 'string' ? targetOrigin : '*';
    const fromSource = String(from || 'parent').toLowerCase();

    if (fromSource === 'parent') {
      const iframeEl = getIframeElement(targetId, key);
      if (iframeEl?.contentWindow && typeof iframeEl.contentWindow.postMessage === 'function') {
        try {
          iframeEl.contentWindow.postMessage(message, origin);
          return true;
        } catch (err) {
          logger.scope('rpc').warn('Error posting message from parent to iframe window:', err);
          return false;
        }
      }
    }

    const target = targetId ? instances.get(targetId) : null;
    if (!target?.port) {
      logger.scope('rpc').warn(`Cannot post message: No active connection for instance '${targetId || 'unknown'}'`);
      return false;
    }
    try {
      target.port.postMessage({ type: `${NS}bridge_post`, source: 'parent', payload: message, targetOrigin: origin });
      return true;
    } catch (err) {
      logger.scope('rpc').warn('Error in postWindowMessage via MessagePort bridge:', err);
      return false;
    }
  };

  return { rpcCall, postWindowMessage };
}

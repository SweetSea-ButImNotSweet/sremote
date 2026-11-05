import { logger } from '../config.js';
import { createCmd, generateInstanceId } from '@sremote/shared';

export const pendingCommandQueue = []; // [{ action, value, targetInstanceId, timestamp, resolve }]
export const pendingRpcRequests = new Map(); // rpcId -> { resolve, reject, timer }
export const pendingCmds = new Map(); // cmdId -> { resolve, timer, action, instanceId }

/**
 * Tracks and dispatches a command with a deterministic Command-ACK promise.
 */
export function trackCmd(action, value, targetId, port, iframeEl = null, timeoutMs = 3000) {
  const cmdId = generateInstanceId('cmd');
  const env = createCmd(action, value, { source: 'parent', instanceId: targetId }, cmdId);

  return new Promise(resolve => {
    const timer = setTimeout(() => {
      pendingCmds.delete(cmdId);
      logger.warn(`[sremote:cmd] Command '${action}' timed out waiting for ACK from '${targetId}' (${timeoutMs}ms)`);
      resolve({ success: false, error: 'TIMEOUT', message: `Command '${action}' timed out after ${timeoutMs}ms`, instanceId: targetId, action });
    }, timeoutMs);

    pendingCmds.set(cmdId, { resolve, timer, action, instanceId: targetId });

    try {
      port.postMessage(env);
    } catch (err) {
      clearTimeout(timer);
      pendingCmds.delete(cmdId);
      logger.warn(`[sremote] Error posting command '${action}' to port for '${targetId}':`, err);
      if (iframeEl?.contentWindow && typeof iframeEl.contentWindow.postMessage === 'function') {
        try {
          iframeEl.contentWindow.postMessage(env, '*');
          return resolve({ success: true, instanceId: targetId, action, fallback: 'window' });
        } catch {}
      }
      resolve({ success: false, error: 'PORT_DISCONNECTED', message: String(err), instanceId: targetId });
    }
  });
}

export function flushPendingCommands(forInstanceId, port, isMultiModeActive) {
  if (!port || pendingCommandQueue.length === 0) return;
  const now = Date.now();
  const MAX_AGE = 10000; // 10s TTL expiration for queued commands
  const remaining = [];
  const dedupedMap = new Map();

  for (const cmd of pendingCommandQueue) {
    if (now - cmd.timestamp > MAX_AGE) {
      cmd.resolve?.({ success: false, error: 'TIMEOUT', message: 'Command timed out waiting for iframe handshake', instanceId: cmd.targetInstanceId, action: cmd.action });
      continue; // Drop expired command
    }
    if (!cmd.targetInstanceId || cmd.targetInstanceId === forInstanceId || !isMultiModeActive()) {
      const act = String(cmd.action || '').toLowerCase();
      // Mutually exclusive playback commands: latest decision wins, previous resolves
      if (act === 'play' || act === 'pause' || act === 'toggle' || act === 'stop') {
        const old = dedupedMap.get('playback');
        if (old) old.resolve?.({ success: true, superseded: true, instanceId: forInstanceId });
        dedupedMap.set('playback', cmd);
      } else {
        dedupedMap.set(act, cmd);
      }
    } else {
      remaining.push(cmd);
    }
  }

  // Prioritize: configure parameters (volume, seek, mute) first, then trigger playback (play/pause/stop)
  const sortedActions = Array.from(dedupedMap.values()).sort((a, b) => {
    const isPlayA = ['play', 'pause', 'toggle', 'stop'].includes(String(a.action || '').toLowerCase());
    const isPlayB = ['play', 'pause', 'toggle', 'stop'].includes(String(b.action || '').toLowerCase());
    return isPlayA - isPlayB;
  });

  for (const cmd of sortedActions) {
    trackCmd(cmd.action, cmd.value, forInstanceId, port)
      .then(res => {
        cmd.resolve?.(res);
        logger.log(`%c[SRemote:queue] Flushed command ACK received -> ${cmd.action}`, 'color: #10b981; font-weight: bold;', res);
      })
      .catch(err => {
        cmd.resolve?.({ success: false, error: 'COMMAND_ERROR', message: String(err), instanceId: forInstanceId });
      });
  }

  pendingCommandQueue.length = 0;
  for (const r of remaining) pendingCommandQueue.push(r);
}

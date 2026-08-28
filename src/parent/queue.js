import { NS, console_log, console_warn } from '../config.js';

export const pendingCommandQueue = []; // [{ action, value, targetInstanceId, timestamp, resolve }]
export const pendingRpcRequests = new Map(); // rpcId -> { resolve, reject, timer }

export function flushPendingCommands(forInstanceId, port, isMultiModeActive) {
  if (!port || pendingCommandQueue.length === 0) return;
  const now = Date.now();
  const MAX_AGE = 10000; // 10s TTL expiration for queued commands
  const remaining = [];
  const dedupedMap = new Map();

  for (const cmd of pendingCommandQueue) {
    if (now - cmd.timestamp > MAX_AGE) {
      cmd.resolve?.({
        success: false,
        error: 'TIMEOUT',
        message: 'Command timed out waiting for iframe handshake',
        instanceId: cmd.targetInstanceId,
        action: cmd.action,
      });
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
    try {
      port.postMessage({ type: `${NS}${cmd.action}`, source: 'parent', value: cmd.value });
      cmd.resolve?.({ success: true, instanceId: forInstanceId, action: cmd.action });
      console_log(`%c[SRemote:queue] Flushed deduplicated command -> ${cmd.action}`, 'color: #10b981; font-weight: bold;', {
        value: cmd.value,
        instanceId: forInstanceId,
      });
    } catch (e) {
      console_warn('[sremote:queue] Error flushing command:', e);
      cmd.resolve?.({ success: false, error: 'PORT_ERROR', message: String(e), instanceId: forInstanceId });
    }
  }

  pendingCommandQueue.length = 0;
  for (const r of remaining) pendingCommandQueue.push(r);
}

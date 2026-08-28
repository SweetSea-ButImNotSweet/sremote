import { NS, console_log, console_warn } from '../config.js';
import { pendingCommandQueue } from './queue.js';

export function setupLivenessReaper(instances, removeInstance, iframeToAssignedIdMap) {
  // 1. Periodic Heartbeat Sweep
  const reaperInterval = setInterval(() => {
    const now = Date.now();
    const PING_THRESHOLD = 2000; // If idle for > 2s, send ping check
    const DEAD_TIMEOUT = 4500; // If no signal for > 4.5s, reap ghost instance

    for (const [id, item] of instances.entries()) {
      // If the associated iframe is disconnected from DOM, reap immediately
      if (item.iframeEl && !item.iframeEl.isConnected) {
        console_log(`%c[SRemote:lifecycle] Iframe DOM detached for instance '${id}'. Reaping immediately.`, 'color: #ef4444;');
        removeInstance(id, 'iframe_dom_detached');
        continue;
      }

      const elapsed = now - (item.lastSeen || 0);
      if (elapsed > DEAD_TIMEOUT) {
        console_warn(`[sremote] Instance '${id}' timed out (${elapsed}ms without signal). Reaping...`);
        removeInstance(id, 'timeout');
      } else if (elapsed > PING_THRESHOLD) {
        try {
          item.port?.postMessage({ type: `${NS}ping`, source: 'parent' });
        } catch {
          removeInstance(id, 'port_error');
        }
      }
    }

    // Clean up expired commands in pending queue (10s TTL)
    if (pendingCommandQueue.length > 0) {
      const remainingCmds = [];
      for (const cmd of pendingCommandQueue) {
        if (now - cmd.timestamp > 10000) {
          cmd.resolve?.({
            success: false,
            error: 'TIMEOUT',
            message: 'Command timed out waiting for iframe handshake',
            instanceId: cmd.targetInstanceId,
            action: cmd.action,
          });
        } else {
          remainingCmds.push(cmd);
        }
      }
      pendingCommandQueue.length = 0;
      for (const r of remainingCmds) pendingCommandQueue.push(r);
    }
  }, 1500);

  // 2. Parent DOM MutationObserver for removed iframes (Instant Cleanup)
  const parentIframeObserver = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.removedNodes.length > 0) {
        for (let i = 0; i < m.removedNodes.length; i++) {
          const node = m.removedNodes[i];
          if (node.nodeType === 1) {
            // Direct iframe removal
            if (node.tagName === 'IFRAME') {
              const assignedId = iframeToAssignedIdMap.get(node) || node.getAttribute?.('data-sremote-id');
              if (assignedId && instances.has(assignedId)) {
                console_log(`%c[SRemote:lifecycle] Iframe node removed from DOM: ${assignedId}`, 'color: #ef4444;');
                removeInstance(assignedId, 'dom_removed');
              }
            } else if (node.querySelectorAll) {
              const subIframes = node.querySelectorAll('iframe');
              for (let j = 0; j < subIframes.length; j++) {
                const subIfr = subIframes[j];
                const assignedId = iframeToAssignedIdMap.get(subIfr) || subIfr.getAttribute?.('data-sremote-id');
                if (assignedId && instances.has(assignedId)) {
                  removeInstance(assignedId, 'dom_removed');
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
    parentIframeObserver.observe(mountTarget, { childList: true, subtree: true });
  }

  return {
    destroy: () => {
      clearInterval(reaperInterval);
      parentIframeObserver.disconnect();
    },
  };
}

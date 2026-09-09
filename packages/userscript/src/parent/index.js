import { VERSION, NS, ENABLE_DEBUG_API, logger, console_log, console_warn, console_error } from '../config.js';
import { Storage, GM } from '../core/storage.js';
import { getOriginStorageKeys } from '../core/utils.js';
import { executeAdapterAction } from '../core/adapter-runner.js';
import { t } from '../core/i18n.js';
import { registerMenuCommands } from './menu.js';
import { pendingCommandQueue } from './queue.js';
import { createExportedApi } from './api.js';
import { createInstanceManager } from './instance-manager.js';
import { createParentTransportManager } from './transport.js';
import { setupTopMediaTracker } from './top-media.js';
import { hasMediaSource } from '@sremote/shared';

export function initParentController() {
  const currentOrigin = location.origin;
  const { allowKey, denyKey, hideBadgeKey } = getOriginStorageKeys(currentOrigin);

  if (denyKey && Storage.get(denyKey) === '1') {
    console_log(
      `%c[SRemote] THIS PAGE IS BLOCKED PERMANENTLY!%c\nOrigin '${currentOrigin}' is in the permanent deny list. SRemote execution is aborted.\nUse the Tampermonkey menu to reset permissions if needed.`,
      'background: #ef4444; color: #ffffff; font-size: 24px; font-weight: 900; padding: 6px 12px; border-radius: 4px;',
      'color: #f87171; font-size: 13px; font-weight: bold;',
    );

    // Register emergency unlock/reset menu items
    try {
      if (GM.register) {
        GM.register(t('menuReset', { target: location.origin }), () => {
          [allowKey, denyKey, hideBadgeKey].forEach(k => k && Storage.remove(k));
          alert(t('alertResetDone', { origin: currentOrigin }));
        });
        GM.register(t('menuClearAll'), () => {
          if (!confirm(t('confirmClearAll'))) return;
          Storage.clearAllsremoteData();
          alert(t('alertClearDone'));
        });
      }
    } catch {}
    return;
  }

  console_log(`%c[sremote v${VERSION}] Parent Controller Initialized`, 'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 2px 6px;');

  // Reset GM hello sequence on top window boot
  Storage.set('sremote:hello_seq', 0);
  Storage.set('sremote:parent_origin', location.origin);

  // Sync log level from storage to logger if configured
  try {
    const storedLogLevel = Storage.get('sremote:log_level', null);
    if (storedLogLevel !== null && storedLogLevel !== undefined && storedLogLevel !== '') {
      const parsedLevel = Number(storedLogLevel);
      if (!Number.isNaN(parsedLevel) && parsedLevel >= -1) {
        logger.setLevel(parsedLevel);
      }
    }
  } catch {}

  const instanceManager = createInstanceManager();
  const { instances, parentAdaptersMap, assignedIframeIdMap, isMultiModeActive, getLatestActiveInstanceId, broadcastToPorts } = instanceManager;

  let broadcastHelloRef = null;

  // Wakeup: Khi có lệnh dispatch mà chưa có instance hoặc đang pending, lập tức đánh thức iframe
  const triggerPendingWakeup = () => {
    try {
      if (typeof broadcastHelloRef === 'function') {
        broadcastHelloRef();
      }
    } catch {}
  };

  // Setup Top DOM Media Tracker (video/audio on top window)
  const topMediaTracker = setupTopMediaTracker(instanceManager);

  function validateDomainAccess(providedKey = null) {
    if (ENABLE_DEBUG_API && providedKey === '__DEBUG_BYPASS__') return true;
    const hostDomain = location.hostname || 'this_domain';
    const domainLockStorage = `sremote:locked:${hostDomain}`;
    const isDomainPersistentlyLocked = Storage.get(domainLockStorage) === '1';
    const isLocked = instanceManager.isSessionLocked || isDomainPersistentlyLocked;
    if (!isLocked) return true;

    const domainKeyStorage = `sremote:passkey:${hostDomain}`;
    const expectedKey = Storage.get(domainKeyStorage);
    const cleanKey = providedKey ? String(providedKey).trim() : null;

    return Boolean(expectedKey && cleanKey && cleanKey === expectedKey);
  }

  // Register Menu Commands
  registerMenuCommands();

  function emitWhereIsInstanceIdError(cmd) {
    const msg = `[sremote] Multiple medias detected but no instanceId was specified for command '${cmd}'. Pass an instanceId or 'all'.`;
    console_error(msg);
    const payload = { type: `${NS}whereIsInstanceID`, source: 'parent', command: cmd, message: msg };
    console_log(`%c[SRemote:signal] Emit -> whereIsInstanceID (source: parent)`, 'color: #ef4444;', payload);
    window.postMessage(payload, '*');
  }

  function executeParentAdapterAction(action, value, targetInstanceId = null) {
    let targetId = targetInstanceId;
    if (!targetId) {
      if (parentAdaptersMap.size === 1 || !isMultiModeActive()) {
        targetId = Array.from(parentAdaptersMap.keys())[parentAdaptersMap.size - 1];
      } else if (parentAdaptersMap.has(instanceManager.currentActiveInstanceId)) {
        targetId = instanceManager.currentActiveInstanceId;
      }
    }
    // If targetId was resolved to an iframe/other instance not in parentAdaptersMap, but we are in Single Mode with an adapter:
    if ((!targetId || !parentAdaptersMap.has(targetId)) && !isMultiModeActive() && parentAdaptersMap.size > 0) {
      targetId = Array.from(parentAdaptersMap.keys())[parentAdaptersMap.size - 1];
    }

    if (!targetId || !parentAdaptersMap.has(targetId)) return false;

    const adapter = parentAdaptersMap.get(targetId);
    return executeAdapterAction(adapter, action, value);
  }

  async function executeTopMediaAction(mediaEl, action, value) {
    if (!mediaEl) return false;
    const hasSource = hasMediaSource(mediaEl);
    const norm = String(action || '').toLowerCase();
    logger.scope('action').log(`Top DOM executing -> ${action}`, { action, value });
    try {
      switch (norm) {
        case 'play':
          if (!hasSource) return false;
          await mediaEl.play?.();
          return true;
        case 'pause':
          mediaEl.pause?.();
          return true;
        case 'toggle':
          if (!hasSource && mediaEl.paused) return false;
          if (mediaEl.paused) await mediaEl.play?.();
          else mediaEl.pause?.();
          return true;
        case 'stop':
          mediaEl.pause?.();
          if (hasSource) mediaEl.currentTime = 0;
          return true;
        case 'seek':
          if (!hasSource) return false;
          if (value !== undefined && value !== null) {
            mediaEl.currentTime = Math.max(0, (mediaEl.currentTime || 0) + Number(value));
          }
          return true;
        case 'currenttime':
        case 'seekto':
          if (value !== undefined && value !== null) {
            mediaEl.currentTime = Math.max(0, Number(value));
          }
          return true;
        case 'volume':
          if (value !== undefined && value !== null) {
            mediaEl.volume = Math.max(0, Math.min(1, Number(value)));
            mediaEl.muted = false;
          }
          return true;
        case 'muted':
        case 'mute':
          if (value !== undefined && value !== null) {
            mediaEl.muted = Boolean(value);
          }
          return true;
        case 'speed':
          if (value !== undefined && value !== null) {
            mediaEl.playbackRate = Number(value) || 1;
          }
          return true;
        case 'repeat':
          if (value !== undefined && value !== null) {
            mediaEl.loop = value === true || value === 'one';
          }
          return true;
        case 'pip':
        case 'enterpip':
          if (typeof document !== 'undefined') {
            if (document.pictureInPictureElement === mediaEl) {
              await document.exitPictureInPicture?.();
            } else if (mediaEl.requestPictureInPicture) {
              await mediaEl.requestPictureInPicture();
            }
          }
          return true;
        case 'exitpip':
          if (typeof document !== 'undefined' && document.pictureInPictureElement) {
            await document.exitPictureInPicture?.();
          }
          return true;
        default:
          return false;
      }
    } catch (e) {
      console_warn(`[sremote] Error executing top media action '${action}':`, e);
      return false;
    }
  }

  async function dispatchCommand(action, value, targetInstanceId = null, key = null) {
    if (!validateDomainAccess(key)) {
      const errMsg = `[SRemote:auth] Blocked command '${action}'! Valid Passkey is required.`;
      console_error(`%c${errMsg}`, 'color: #ef4444; font-weight: bold;');
      return Promise.resolve({
        success: false,
        error: 'AUTH_FAILED',
        message: `Access denied. Valid Passkey is required for command '${action}'`,
        action,
        instanceId: targetInstanceId,
      });
    }

    let targetId = targetInstanceId || getLatestActiveInstanceId();
    let target = targetId ? instances.get(targetId) : null;

    if (!target && !targetInstanceId && !isMultiModeActive() && instances.size === 1) {
      targetId = Array.from(instances.keys())[0];
      target = instances.get(targetId);
    }

    logger.scope('action').log(`(Wrapper) Dispatching -> ${action}`, { action, value, targetInstanceId: targetId || targetInstanceId || 'auto' });

    // 1. TOP PRIORITY: Custom Adapters (Adapter > DOM Media > MediaSession > Iframe Port)
    if (parentAdaptersMap.size > 0) {
      // In Single Mode or if targetInstanceId is not specified, always direct to the registered adapter
      let adapterTargetId = targetInstanceId;
      if (!adapterTargetId) {
        adapterTargetId = Array.from(parentAdaptersMap.keys())[parentAdaptersMap.size - 1];
      } else if (!parentAdaptersMap.has(adapterTargetId) && !isMultiModeActive()) {
        adapterTargetId = Array.from(parentAdaptersMap.keys())[parentAdaptersMap.size - 1];
      }

      if (adapterTargetId && parentAdaptersMap.has(adapterTargetId)) {
        const handled = await executeParentAdapterAction(action, value, adapterTargetId);
        // If an adapter is registered for this target, always resolve as handled by adapter (never fall through to wait for port)
        return Promise.resolve({ success: Boolean(handled !== false), instanceId: adapterTargetId, source: 'adapter', action });
      }
    }

    // 2. SECOND PRIORITY: Direct execution on Top DOM Media Elements
    if (target?.isTopMedia && target.mediaElement) {
      return executeTopMediaAction(target.mediaElement, action, value).then(ok => ({ success: ok, instanceId: targetId, source: 'top-dom', action }));
    }

    const multi = isMultiModeActive();
    if (multi && instances.size > 1 && !targetInstanceId) {
      emitWhereIsInstanceIdError(action);
      return Promise.resolve({ success: false, error: 'WHERE_IS_INSTANCE_ID', message: `Multiple medias detected; instanceId is required for command '${action}'`, action });
    }

    if (targetInstanceId === 'all') {
      broadcastToPorts({ type: `${NS}${action}`, source: 'parent', value });
      for (const item of instances.values()) {
        if (item.isTopMedia && item.mediaElement) {
          executeTopMediaAction(item.mediaElement, action, value);
        }
      }
      return Promise.resolve({ success: true, instanceId: 'all', action });
    }

    const isAssignedPending = targetId && (assignedIframeIdMap.has(targetId) || (target && target.status === 'connecting'));

    if (target?.port && target.status !== 'connecting') {
      try {
        target.port.postMessage({ type: `${NS}${action}`, source: 'parent', value });
        return Promise.resolve({ success: true, instanceId: targetId, action });
      } catch (err) {
        console_warn(`[sremote] Error posting command '${action}' to port for '${targetId}':`, err);
        const ifr = target.iframeEl || (targetId ? assignedIframeIdMap.get(targetId) : null);
        if (ifr?.contentWindow && typeof ifr.contentWindow.postMessage === 'function') {
          try {
            ifr.contentWindow.postMessage({ type: `${NS}${action}`, source: 'parent', value }, '*');
            console_log(`%c[SRemote:command] Fallback command '${action}' sent via contentWindow.postMessage to '${targetId}'`, 'color: #10b981;');
            return Promise.resolve({ success: true, instanceId: targetId, action, fallback: 'window' });
          } catch (winErr) {
            console_warn(`[sremote] Fallback contentWindow.postMessage failed for '${targetId}':`, winErr);
          }
        }
        return Promise.resolve({ success: false, error: 'PORT_DISCONNECTED', message: String(err), instanceId: targetId });
      }
    }

    if (targetInstanceId && !target && !isAssignedPending) {
      console_warn(`[sremote] Target instance '${targetInstanceId}' does not exist.`);
      return Promise.resolve({ success: false, error: 'INSTANCE_NOT_FOUND', message: `Instance '${targetInstanceId}' not found`, instanceId: targetInstanceId });
    }

    console_log(`%c[SRemote:queue] Instance '${targetId || 'pending'}' is connecting or pending port. Queueing '${action}'...`, 'color: #f59e0b;');
    triggerPendingWakeup();
    return new Promise(resolve => {
      pendingCommandQueue.push({ action, value, targetInstanceId: targetId, timestamp: Date.now(), resolve });
    });
  }

  function queryMediaInstancesViaGM() {
    const queryToken = `query_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    Storage.set(`sremote:query_req`, queryToken);

    const keys = Storage.list();
    const found = [];
    for (const k of keys) {
      if (k && k.startsWith('sremote:report:')) {
        const raw = Storage.get(k);
        try {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (data && data.hasMedia) {
            found.push(data);
          }
        } catch {}
        Storage.remove(k);
      }
    }
    return found;
  }

  // Initialize Clean Transport Manager (MessagePort, Handshake, Challenge, Heartbeat & Grace Period)
  const transportManager = createParentTransportManager({ instanceManager });

  // Auto-Heal: Theo dõi các thẻ <iframe> được chèn động (React remount, dynamic route, v.v.)
  try {
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      const iframeObserver = new MutationObserver(mutations => {
        let hasNewIframe = false;
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) {
              if (node.tagName === 'IFRAME') {
                hasNewIframe = true;
              } else if (node.querySelector && node.querySelector('iframe')) {
                hasNewIframe = true;
              }
            }
          }
        }
        if (hasNewIframe) {
          console_log(`%c[SRemote:autoheal] New iframe detected in DOM. Auto-negotiating hello...`, 'color: #06b6d4; font-weight: bold;');
          triggerPendingWakeup();
        }
      });
      const targetMount = document.documentElement || document.body || document;
      if (targetMount) {
        iframeObserver.observe(targetMount, { childList: true, subtree: true });
      }
    }
  } catch {}

  // Initialize and Export window.sremote
  const api = createExportedApi({ instanceManager, dispatchCommand, validateDomainAccess, queryMediaInstancesViaGM, topMediaTracker, transportManager });
  if (api && typeof api.hello === 'function') {
    broadcastHelloRef = api.hello;
  }
}

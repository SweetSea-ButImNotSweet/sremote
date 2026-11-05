import { VERSION, NS, ENABLE_DEBUG_API } from '../const.js';
import { logger } from '../config.js';
import { Storage, GM } from '../core/storage.js';
import { normalizeOrigin } from '../core/utils.js';
import { t } from '../core/i18n.js';
import { registerMenuCommands } from './menu.js';
import { pendingCommandQueue, trackCmd } from './queue.js';
import { createExportedApi } from './api.js';
import { createParentTransport } from './transport.js';
import { setupTopMediaTracker } from './top-media.js';
import { actions, dom, instance, pipeline, createCmd } from '@sremote/shared';

export function initParentController() {
  const currentOrigin = location.origin;
  const normOrigin = normalizeOrigin(currentOrigin);

  // Check if page blocked via Storage.permissions
  const isBlockedInStore = Storage.permissions.get(normOrigin, '*') === 0 || Storage.permissions.get('*', normOrigin) === 0;

  if (isBlockedInStore) {
    logger.log(
      `%c[SRemote] THIS PAGE IS BLOCKED PERMANENTLY!%c\nOrigin '${currentOrigin}' is in the permanent deny list. SRemote execution is aborted.\nUse the Tampermonkey menu to reset permissions if needed.`,
      'background: #ef4444; color: #ffffff; font-size: 24px; font-weight: 900; padding: 6px 12px; border-radius: 4px;',
      'color: #f87171; font-size: 13px; font-weight: bold;',
    );

    // Register emergency unlock/reset menu items
    try {
      if (GM.register) {
        GM.register(t('menuReset', { target: location.origin }), () => {
          Storage.permissions.remove(normOrigin);
          Storage.preferences.setBadgeHidden(normOrigin, false);
          alert(t('alertResetDone', { origin: currentOrigin }));
        });
        GM.register(t('menuClearAll'), () => {
          if (!confirm(t('confirmClearAll'))) return;
          Storage.clearAll();
          alert(t('alertClearDone'));
        });
      }
    } catch {}
    return;
  }

  logger.log(`%c[sremote v${VERSION}] Parent Controller Initialized`, 'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 2px 6px;');

  // Sync log level from storage to logger if configured
  try {
    const storedLogLevel = Storage.preferences.getLogLevel();
    if (storedLogLevel !== null && storedLogLevel !== undefined && storedLogLevel !== '') {
      const parsedLevel = Number(storedLogLevel);
      if (!Number.isNaN(parsedLevel) && parsedLevel >= -1) {
        logger.setLevel(parsedLevel);
      }
    }
  } catch {}

  const instanceManager = instance.createManager();
  const { instances, assignedIframeIdMap, iframeToAssignedIdMap, isMultiModeActive, getLatestActiveInstanceId, broadcastToPorts } = instanceManager;

  let hasInitiatedHello = false;

  // Wakeup: Đánh thức iframe (toàn bộ hoặc đích danh targetWindow)
  const triggerPendingWakeup = (targetWindow = null) => {
    hasInitiatedHello = true;
    try {
      transportManager.flushPendingSyns();
      transportManager.discover(targetWindow);
    } catch {}
  };

  // Setup Top DOM Media Tracker (video/audio on top window)
  const topMediaTracker = setupTopMediaTracker(instanceManager);

  function validateDomainAccess(providedKey = null) {
    if (ENABLE_DEBUG_API && providedKey === '__DEBUG_BYPASS__') return true;
    const hostDomain = location.hostname || 'this_domain';
    const authConfig = Storage.auth.get(hostDomain);
    const isLocked = instanceManager.isSessionLocked || authConfig.locked;
    if (!isLocked) return true;

    const expectedKey = authConfig.passkey;
    const cleanKey = providedKey ? String(providedKey).trim() : null;

    return Boolean(expectedKey && cleanKey && cleanKey === expectedKey);
  }

  // Register Menu Commands
  registerMenuCommands();

  function emitWhereIsInstanceIdError(cmd) {
    const msg = `[sremote] Multiple medias detected but no instanceId was specified for command '${cmd}'. Pass an instanceId or 'all'.`;
    logger.error(msg);
    const payload = { type: `${NS}whereIsInstanceID`, source: 'parent', command: cmd, message: msg };
    logger.log(`%c[SRemote:signal] Emit -> whereIsInstanceID (source: parent)`, 'color: #ef4444;', payload);
    window.postMessage(payload, '*');
  }

  async function executeTopMediaAction(mediaEl, action, value) {
    if (!mediaEl) return false;
    const hasSource = dom.hasSource(mediaEl);
    const norm = String(action || '').toLowerCase();
    if (['play', 'seek', 'stop'].includes(norm) && !hasSource) return false;

    logger.scope('action').log(`Top DOM executing -> ${action}`, { action, value });
    try {
      return actions.execute(mediaEl, action, value, { instanceId: mediaEl.id || 'top-media', transactionTracker: pipeline.getTracker(), logger });
    } catch (e) {
      logger.warn(`[sremote] Error executing top media action '${action}':`, e);
      return false;
    }
  }

  async function dispatchCommand(action, value, targetInstanceId = null, key = null) {
    if (!validateDomainAccess(key)) {
      const errMsg = `[SRemote:auth] Blocked command '${action}'! Valid Passkey is required.`;
      logger.error(`%c${errMsg}`, 'color: #ef4444; font-weight: bold;');
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

    // Smart fallback if target was not found by targetId:
    if (!target && targetInstanceId) {
      // 1. Check if the targetInstanceId was associated with an iframe element
      const mappedIframe = assignedIframeIdMap.get(targetInstanceId);
      if (mappedIframe) {
        const liveId = iframeToAssignedIdMap.get(mappedIframe);
        if (liveId && instances.has(liveId)) {
          targetId = liveId;
          target = instances.get(liveId);
          logger.scope('action').log(`Smart-routed command '${action}' from stale id '${targetInstanceId}' -> live id '${liveId}'`);
        }
      }
      // 2. In single-mode or if exactly 1 instance is registered, route to the only active instance
      if (!target && (!isMultiModeActive() || instances.size === 1)) {
        const onlyId = Array.from(instances.keys())[0];
        if (onlyId && instances.has(onlyId)) {
          targetId = onlyId;
          target = instances.get(onlyId);
          logger.scope('action').log(`Single-mode smart-routed command '${action}' from '${targetInstanceId}' -> active '${onlyId}'`);
        }
      }
    }

    if (!target && !targetInstanceId && !isMultiModeActive() && instances.size === 1) {
      targetId = Array.from(instances.keys())[0];
      target = instances.get(targetId);
    }

    logger.scope('action').log(`(Userscript) Dispatching -> ${action}`, { action, value, targetInstanceId: targetId || targetInstanceId || 'auto' });

    // 1. FIRST PRIORITY: Direct execution on Top DOM Media Elements
    if (target?.isTopMedia && target.mediaElement) {
      return executeTopMediaAction(target.mediaElement, action, value).then(ok => ({ success: ok, instanceId: targetId, source: 'top-dom', action }));
    }

    const multi = isMultiModeActive();
    if (multi && instances.size > 1 && !targetInstanceId) {
      emitWhereIsInstanceIdError(action);
      return Promise.resolve({ success: false, error: 'WHERE_IS_INSTANCE_ID', message: `Multiple medias detected; instanceId is required for command '${action}'`, action });
    }

    if (targetInstanceId === 'all') {
      const allCmd = createCmd(action, value, { source: 'parent', instanceId: 'all' });
      broadcastToPorts(allCmd);
      for (const item of instances.values()) {
        if (item.isTopMedia && item.mediaElement) {
          executeTopMediaAction(item.mediaElement, action, value);
        }
      }
      return Promise.resolve({ success: true, instanceId: 'all', action });
    }

    const isAssignedPending = targetId && (assignedIframeIdMap.has(targetId) || target?.status === 'connecting');

    if (target?.port) {
      return trackCmd(action, value, targetId, target.port, target.iframeEl || assignedIframeIdMap.get(targetId));
    }

    if (targetInstanceId && !target && !isAssignedPending) {
      logger.warn(`[sremote] Target instance '${targetInstanceId}' does not exist.`);
      return Promise.resolve({ success: false, error: 'INSTANCE_NOT_FOUND', message: `Instance '${targetInstanceId}' not found`, instanceId: targetInstanceId });
    }

    logger.log(`%c[SRemote:queue] Instance '${targetId || 'pending'}' is connecting or pending port. Queueing '${action}'...`, 'color: #f59e0b;');
    triggerPendingWakeup();
    return new Promise(resolve => {
      pendingCommandQueue.push({ action, value, targetInstanceId: targetId, timestamp: Date.now(), resolve });
    });
  }

  function queryMediaInstancesViaGM() {
    const queryToken = `query_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    Storage.raw.set(`sremote:ipc:query_req`, queryToken);

    const keys = Storage.raw.list();
    const found = [];
    for (const k of keys) {
      if (k?.startsWith('sremote:ipc:report:')) {
        const raw = Storage.raw.get(k);
        try {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (data?.hasMedia) {
            found.push(data);
          }
        } catch {}
        Storage.raw.remove(k);
      }
    }
    return found;
  }

  // Initialize Clean Transport Manager (Handshake v4, MessagePort, Heartbeat & Grace Period)
  const transportManager = createParentTransport({ instanceManager, isHelloInitiated: () => hasInitiatedHello });

  // Initialize and Export window.sremote
  createExportedApi({
    instanceManager,
    dispatchCommand,
    validateDomainAccess,
    queryMediaInstancesViaGM,
    topMediaTracker,
    transportManager,
    onHelloInitiated: () => {
      hasInitiatedHello = true;
      try {
        transportManager.flushPendingSyns();
      } catch {}
    },
  });
}

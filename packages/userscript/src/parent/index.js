import { VERSION, NS, ENABLE_DEBUG_API, console_log, console_warn, console_error } from '../config.js';
import { Storage, GM } from '../core/storage.js';
import { getOriginStorageKeys } from '../core/utils.js';
import { executeAdapterAction } from '../core/adapter-runner.js';
import { t } from '../core/i18n.js';
import { registerMenuCommands } from './menu.js';
import { pendingCommandQueue } from './queue.js';
import { setupLivenessReaper } from './liveness.js';
import { createExportedApi } from './api.js';
import { createInstanceManager } from './instance-manager.js';
import { setupParentHandshake } from './handshake.js';

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

  const instanceManager = createInstanceManager();
  const { instances, parentAdaptersMap, assignedIframeIdMap, iframeToAssignedIdMap, isMultiModeActive, getLatestActiveInstanceId, broadcastToPorts, removeInstance } =
    instanceManager;

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
      if (parentAdaptersMap.size === 1) {
        targetId = Array.from(parentAdaptersMap.keys())[0];
      } else if (parentAdaptersMap.has(instanceManager.currentActiveInstanceId)) {
        targetId = instanceManager.currentActiveInstanceId;
      }
    }
    if (!targetId || !parentAdaptersMap.has(targetId)) return false;

    const adapter = parentAdaptersMap.get(targetId);
    return executeAdapterAction(adapter, action, value);
  }

  function dispatchCommand(action, value, targetInstanceId = null, key = null) {
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

    console_log(`%c[SRemote:command] Parent dispatching -> ${action}`, 'color: #3b82f6; font-weight: bold;', {
      action,
      value,
      targetInstanceId: targetId || targetInstanceId || 'auto',
    });

    if (parentAdaptersMap.size > 0) {
      const handled = executeParentAdapterAction(action, value, targetId || targetInstanceId);
      if (handled) return Promise.resolve({ success: true, instanceId: targetId || targetInstanceId, source: 'adapter', action });
    }

    const multi = isMultiModeActive();
    if (multi && instances.size > 1 && !targetInstanceId) {
      emitWhereIsInstanceIdError(action);
      return Promise.resolve({ success: false, error: 'WHERE_IS_INSTANCE_ID', message: `Multiple medias detected; instanceId is required for command '${action}'`, action });
    }

    if (targetInstanceId === 'all') {
      broadcastToPorts({ type: `${NS}${action}`, source: 'parent', value });
      return Promise.resolve({ success: true, instanceId: 'all', action });
    }

    const isAssignedPending = targetId && (assignedIframeIdMap.has(targetId) || (target && target.status === 'connecting'));

    if (target?.port && target.status !== 'connecting') {
      try {
        target.port.postMessage({ type: `${NS}${action}`, source: 'parent', value });
        return Promise.resolve({ success: true, instanceId: targetId, action });
      } catch (err) {
        console_warn(`[sremote] Error posting command '${action}' to port for '${targetId}':`, err);
        return Promise.resolve({ success: false, error: 'PORT_DISCONNECTED', message: String(err), instanceId: targetId });
      }
    }

    if (targetInstanceId && !target && !isAssignedPending) {
      console_warn(`[sremote] Target instance '${targetInstanceId}' does not exist.`);
      return Promise.resolve({ success: false, error: 'INSTANCE_NOT_FOUND', message: `Instance '${targetInstanceId}' not found`, instanceId: targetInstanceId });
    }

    console_log(`%c[SRemote:queue] Instance '${targetId || 'pending'}' is connecting or pending port. Queueing '${action}'...`, 'color: #f59e0b;');
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

  // Setup Handshake Listener
  setupParentHandshake(instanceManager);

  // Setup Liveness Reaper
  setupLivenessReaper(instances, removeInstance, iframeToAssignedIdMap);

  // Initialize and Export window.sremote
  createExportedApi({ instanceManager, dispatchCommand, validateDomainAccess, queryMediaInstancesViaGM });
}

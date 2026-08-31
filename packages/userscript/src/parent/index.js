import { VERSION, NS, ENABLE_DEBUG_API, console_log, console_warn, console_error } from '../config.js';
import { Storage, GM } from '../core/storage.js';
import { getOriginStorageKeys } from '../core/utils.js';
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
    const norm = action.toLowerCase();
    try {
      if (norm === 'play' && typeof adapter.play === 'function') {
        adapter.play();
        return true;
      }
      if (norm === 'pause' && typeof adapter.pause === 'function') {
        adapter.pause();
        return true;
      }
      if (norm === 'toggle') {
        if (typeof adapter.toggle === 'function') {
          adapter.toggle();
          return true;
        }
        if (typeof adapter.play === 'function' && typeof adapter.pause === 'function') {
          const isPaused = typeof adapter.paused === 'function' ? adapter.paused() : (typeof adapter.paused === 'boolean' ? adapter.paused : true);
          if (isPaused) {
            adapter.play();
          } else {
            adapter.pause();
          }
          return true;
        }
      }
      if (norm === 'seek' && typeof adapter.seek === 'function') {
        adapter.seek(Number(value));
        return true;
      }
      if (norm === 'seek' && typeof adapter.seekTo === 'function' && typeof adapter.getCurrentTime === 'function') {
        const cur = Number(adapter.getCurrentTime() || 0);
        adapter.seekTo(Math.max(0, cur + Number(value)));
        return true;
      }
      if ((norm === 'currenttime' || norm === 'seekto') && typeof adapter.seekTo === 'function') {
        adapter.seekTo(Number(value));
        return true;
      }
      if (norm === 'volume' && typeof adapter.setVolume === 'function') {
        adapter.setVolume(Number(value));
        return true;
      }
      if ((norm === 'muted' || norm === 'mute') && typeof adapter.setMuted === 'function') {
        adapter.setMuted(Boolean(value));
        return true;
      }
      if ((norm === 'speed' || norm === 'rate' || norm === 'playbackrate') && typeof adapter.setPlaybackRate === 'function') {
        adapter.setPlaybackRate(Number(value) || 1);
        return true;
      }
      if (norm === 'quality' && typeof adapter.setQuality === 'function') {
        adapter.setQuality(value);
        return true;
      }
      if (norm === 'subtitle' && typeof adapter.setSubtitle === 'function') {
        adapter.setSubtitle(value);
        return true;
      }
      if (norm === 'shuffle' && typeof adapter.setShuffle === 'function') {
        adapter.setShuffle(value);
        return true;
      }
      if (norm === 'repeat' && typeof adapter.setRepeat === 'function') {
        adapter.setRepeat(value);
        return true;
      }
      if (norm === 'next' && typeof adapter.next === 'function') {
        adapter.next();
        return true;
      }
      if (norm === 'previous' && typeof adapter.previous === 'function') {
        adapter.previous();
        return true;
      }
      if (norm === 'pip' || norm === 'enterpip' || norm === 'exitpip') {
        if (typeof adapter.pip === 'function') {
          adapter.pip(value);
          return true;
        }
        if (typeof adapter.requestPip === 'function') {
          adapter.requestPip(value);
          return true;
        }
      }
      if (norm === 'load') {
        if (typeof adapter.load === 'function') {
          adapter.load(value);
          return true;
        }
        console_warn('[SRemote] load() is primarily designed for custom adapters and is not implemented by default. Implement it via sremote.useAdapter().');
        return true;
      }
      if (norm === 'stop') {
        if (typeof adapter.stop === 'function') adapter.stop();
        else {
          if (typeof adapter.pause === 'function') adapter.pause();
          if (typeof adapter.seekTo === 'function') adapter.seekTo(0);
        }
        return true;
      }
    } catch (e) {
      console_warn(`[sremote] Error invoking parent adapter action for '${targetId}':`, e);
      return true; // Still handled by adapter
    }
    return false;
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

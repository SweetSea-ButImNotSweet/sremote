import { VERSION, NS, ENABLE_DEBUG_API, console_log, console_debug, console_warn, console_error } from '../config.js';
import { Storage, GM, verifyHandshakeSecret, checkHandshakeSecret, consumeHandshakeSecret } from '../core/storage.js';
import { getOriginStorageKeys, generateInstanceId } from '../core/utils.js';
import { t } from '../core/i18n.js';
import { createPermissionDialog } from '../ui/permission-dialog.js';
import { registerMenuCommands } from './menu.js';
import { flushPendingCommands, pendingCommandQueue, pendingRpcRequests } from './queue.js';
import { setupLivenessReaper } from './liveness.js';
import { createExportedApi } from './api.js';

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

  const instances = new Map(); // instanceId -> { port, location, origin, note, state, mediaType, lastSeen, status, iframeEl }
  const parentAdaptersMap = new Map(); // adapterKey -> adapterObject
  const assignedIframeIdMap = new Map(); // instanceId -> HTMLIFrameElement
  const iframeToAssignedIdMap = new WeakMap(); // HTMLIFrameElement -> instanceId
  const globalEventListeners = new Map();

  let exclusiveMode = null; // null | 'auto' | instanceId
  let multiModeConfig = null; // null (auto-detect) | true (force multi) | false (force single)
  let currentActiveInstanceId = null; // Strictly tracks the latest authenticated active instance
  let isSessionLocked = false;
  let lastAcceptedData = null;

  function validateDomainAccess(providedKey = null) {
    if (ENABLE_DEBUG_API && providedKey === '__DEBUG_BYPASS__') return true;
    const hostDomain = location.hostname || 'this_domain';
    const domainLockStorage = `sremote:locked:${hostDomain}`;
    const isDomainPersistentlyLocked = Storage.get(domainLockStorage) === '1';
    const isLocked = isSessionLocked || isDomainPersistentlyLocked;
    if (!isLocked) return true;

    const domainKeyStorage = `sremote:passkey:${hostDomain}`;
    const expectedKey = Storage.get(domainKeyStorage);
    const cleanKey = providedKey ? String(providedKey).trim() : null;

    return Boolean(expectedKey && cleanKey && cleanKey === expectedKey);
  }

  function isMultiModeActive() {
    if (typeof multiModeConfig === 'boolean') return multiModeConfig;
    try {
      const liveIframes = document.querySelectorAll('iframe');
      if (liveIframes.length <= 1 && instances.size <= 1) return false;
    } catch {}
    return instances.size > 1;
  }

  function getLatestActiveInstanceId() {
    if (currentActiveInstanceId && instances.has(currentActiveInstanceId)) {
      return currentActiveInstanceId;
    }
    let latestId = null;
    let latestTime = -1;
    for (const [id, item] of instances.entries()) {
      const seen = item.lastSeen || 0;
      if (seen > latestTime) {
        latestTime = seen;
        latestId = id;
      }
    }
    currentActiveInstanceId = latestId || Array.from(instances.keys())[instances.size - 1] || null;
    return currentActiveInstanceId;
  }

  // Register Menu Commands
  registerMenuCommands();

  function broadcastToPorts(payload, excludeInstanceId = null) {
    for (const [id, item] of instances.entries()) {
      if (id === excludeInstanceId) continue;
      try {
        item.port?.postMessage(payload);
      } catch {}
    }
  }

  function notifyMediaCountChange() {
    const activeInstances = Array.from(instances.entries()).map(([id, item]) => ({
      instanceId: id,
      location: item.location,
      note: item.note,
      mediaType: item.mediaType,
    }));
    const count = activeInstances.length;

    if (count > 1) {
      const payload = { type: `${NS}multipleMediaDetected`, source: 'parent', count, instances: activeInstances };
      console_debug(`%c[SRemote:signal] Emit -> multipleMediaDetected (source: parent)`, 'color: #06b6d4;', payload);
      window.postMessage(payload, '*');
    } else if (count === 1) {
      const payload = { type: `${NS}singleMediaDetected`, source: 'parent', count: 1, instance: activeInstances[0] };
      console_debug(`%c[SRemote:signal] Emit -> singleMediaDetected (source: parent)`, 'color: #06b6d4;', payload);
      window.postMessage(payload, '*');
    }
  }

  function emitWhereIsInstanceIdError(cmd) {
    const msg = `[sremote] Multiple medias detected but no instanceId was specified for command '${cmd}'. Pass an instanceId or 'all'.`;
    console_error(msg);
    const payload = { type: `${NS}whereIsInstanceID`, source: 'parent', command: cmd, message: msg };
    console_debug(`%c[SRemote:signal] Emit -> whereIsInstanceID (source: parent)`, 'color: #ef4444;', payload);
    window.postMessage(payload, '*');
  }

  async function cloneBlobFromParent(blobUrl, instanceId) {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const item = instances.get(instanceId);
      if (item?.port) item.port.postMessage({ type: `${NS}resendBlobObject`, originalUrl: blobUrl, blob });
    } catch (err) {
      console_warn(`[sremote] Failed to clone blob '${blobUrl}' for instance '${instanceId}':`, err);
    }
  }

  function emitGlobalEvent(event, payload = {}) {
    const ev = String(event || '').toLowerCase();
    if (ev === 'accept' && payload?.instanceId) {
      lastAcceptedData = payload;
    } else if (ev === 'disconnect' && payload?.instanceId && lastAcceptedData?.instanceId === payload.instanceId) {
      lastAcceptedData = null;
    }

    const specificListeners = globalEventListeners.get(ev);
    if (specificListeners) {
      for (const fn of specificListeners) {
        try {
          fn(payload);
        } catch (e) {
          console_warn('[sremote] Error in event listener:', e);
        }
      }
    }

    const wildcardListeners = globalEventListeners.get('*');
    if (wildcardListeners) {
      const starPayload = typeof payload === 'object' && payload !== null ? { action: ev, ...payload } : { action: ev, value: payload };
      for (const fn of wildcardListeners) {
        try {
          fn(starPayload);
        } catch (e) {
          console_warn('[sremote] Error in wildcard listener:', e);
        }
      }
    }
  }

  function pauseOthersExcept(activeInstanceId) {
    for (const [id, item] of instances.entries()) {
      if (id !== activeInstanceId) {
        try {
          item.port?.postMessage({ type: `${NS}pause` });
        } catch {}
      }
    }
  }

  function handleUseAdapter(adapterVal, instanceId = null) {
    if (!adapterVal || typeof adapterVal !== 'object') return null;
    const targetId = instanceId || generateInstanceId('adapter');

    if (!isMultiModeActive() && parentAdaptersMap.size > 0) {
      for (const oldId of Array.from(parentAdaptersMap.keys())) {
        if (oldId !== targetId) {
          console_log(`%c[SRemote:adapter] Replacing stale adapter in Single Mode: ${oldId} -> ${targetId}`, 'color: #f59e0b;');
          parentAdaptersMap.delete(oldId);
        }
      }
    }

    adapterVal.emit = (event, payload = {}) => {
      const ev = String(event || '').toLowerCase();
      const fullPayload = {
        source: 'adapter',
        instanceId: targetId,
        mediaType: 'adapter',
        ...(typeof payload === 'object' && payload !== null ? payload : { value: payload }),
      };

      if (ev === 'play' || ev === 'playing') {
        if (exclusiveMode === 'auto') {
          pauseOthersExcept(targetId);
        }
      }

      emitGlobalEvent(ev, fullPayload);
    };

    parentAdaptersMap.set(targetId, adapterVal);
    currentActiveInstanceId = targetId;
    console_log(`%c[SRemote:adapter] Registered custom adapter for instance '${targetId}'`, 'color: #06b6d4; font-weight: bold;');

    const acceptPayload = {
      source: 'adapter',
      instanceId: targetId,
      mediaType: 'adapter',
      location: location.href,
      origin: location.origin,
    };
    emitGlobalEvent('accept', acceptPayload);

    return targetId;
  }

  function handleRemoveAdapter(instanceId = null) {
    if (instanceId) {
      const deleted = parentAdaptersMap.delete(instanceId);
      if (deleted && currentActiveInstanceId === instanceId) {
        currentActiveInstanceId = null;
      }
      return deleted;
    }
    parentAdaptersMap.clear();
    currentActiveInstanceId = null;
    return true;
  }

  function executeParentAdapterAction(action, value, targetInstanceId = null) {
    let targetId = targetInstanceId;
    if (!targetId) {
      if (parentAdaptersMap.size === 1) {
        targetId = Array.from(parentAdaptersMap.keys())[0];
      } else if (parentAdaptersMap.has(currentActiveInstanceId)) {
        targetId = currentActiveInstanceId;
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
      if (norm === 'toggle' && typeof adapter.toggle === 'function') {
        adapter.toggle();
        return true;
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
      if ((norm === 'pip' || norm === 'enterpip' || norm === 'exitpip') && typeof adapter.pip === 'function') {
        adapter.pip(value);
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
      return Promise.resolve({
        success: false,
        error: 'WHERE_IS_INSTANCE_ID',
        message: `Multiple medias detected; instanceId is required for command '${action}'`,
        action,
      });
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
      return Promise.resolve({
        success: false,
        error: 'INSTANCE_NOT_FOUND',
        message: `Instance '${targetInstanceId}' not found`,
        instanceId: targetInstanceId,
      });
    }

    console_log(`%c[SRemote:queue] Instance '${targetId || 'pending'}' is connecting or pending port. Queueing '${action}'...`, 'color: #f59e0b;');
    return new Promise(resolve => {
      pendingCommandQueue.push({
        action,
        value,
        targetInstanceId: targetId,
        timestamp: Date.now(),
        resolve,
      });
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

  function removeInstance(instanceId, reason = 'disconnected') {
    const item = instances.get(instanceId);
    if (!item) return;
    console_log(`%c[SRemote:lifecycle] Instance removed: ${instanceId} (reason: ${reason})`, 'color: #ef4444; font-weight: bold;');
    try {
      item.port?.close();
    } catch {}
    instances.delete(instanceId);
    if (currentActiveInstanceId === instanceId) {
      currentActiveInstanceId = null;
    }
    notifyMediaCountChange();
    emitGlobalEvent('disconnect', { instanceId, reason });
  }

  function setupPortForInstance(instanceId, port, initialLocation, initialOrigin, iframeEl = null) {
    if (!isMultiModeActive() && instances.size > 0) {
      for (const oldId of Array.from(instances.keys())) {
        if (oldId !== instanceId) {
          console_log(`%c[SRemote:lifecycle] Replacing stale instance in Single Mode: ${oldId} -> ${instanceId}`, 'color: #f59e0b;');
          removeInstance(oldId, 'replaced_by_new_instance');
        }
      }
    }

    currentActiveInstanceId = instanceId;

    const item = {
      port,
      location: initialLocation,
      origin: initialOrigin,
      note: '',
      state: null,
      mediaType: null,
      lastSeen: Date.now(),
      status: 'ready',
      iframeEl: iframeEl || assignedIframeIdMap.get(instanceId) || null,
    };
    instances.set(instanceId, item);
    flushPendingCommands(instanceId, port, isMultiModeActive);

    port.onmessage = e => {
      const data = e.data;
      if (!data || typeof data !== 'object') return;
      const type = String(data.type || '');
      if (!type.startsWith(NS)) return;

      item.lastSeen = Date.now();
      currentActiveInstanceId = instanceId;

      const action = type.slice(NS.length);
      const lowerAction = action.toLowerCase();

      if (lowerAction !== 'ping' && lowerAction !== 'pong') {
        console_debug(`%c[SRemote:signal] Parent received from iframe (port) -> ${action}`, 'color: #10b981;', { instanceId, data });
      }

      if (lowerAction === 'rpc_response' && data.rpcId) {
        const req = pendingRpcRequests.get(data.rpcId);
        if (req) {
          clearTimeout(req.timer);
          pendingRpcRequests.delete(data.rpcId);
          if (data.result && data.result.success === false && data.result.error) {
            req.resolve?.({
              success: false,
              error: data.result.error,
              message: data.result.message || 'RPC execution failed',
              instanceId,
            });
          } else {
            req.resolve(
              typeof data.result === 'object' && data.result !== null
                ? { instanceId, ...data.result }
                : { success: true, instanceId, data: data.result }
            );
          }
        }
        return;
      }

      if (lowerAction === 'pong') {
        if (item.pendingConsumeHandshakeId) {
          console_log(
            `%c[SRemote:handshake] Mutual Ping-Pong confirmed on port for '${instanceId}'. Consuming token '${item.pendingConsumeHandshakeId}'.`,
            'color: #10b981;',
          );
          consumeHandshakeSecret(item.pendingConsumeHandshakeId);
          item.pendingConsumeHandshakeId = null;
        }
        if (data.state) item.state = data.state;
        if (data.mediaType) item.mediaType = data.mediaType;
        return;
      }

      if (lowerAction === 'disconnect' || lowerAction === 'mediadisconnected' || lowerAction === 'unload') {
        removeInstance(instanceId, lowerAction);
        return;
      }

      if (lowerAction === 'accept') {
        if (item.authenticated) return;

        let isValid = false;
        if (data.handshakeId && data.handshakeToken) {
          isValid = verifyHandshakeSecret(data.handshakeId, data.handshakeToken);
        } else {
          isValid = true;
        }
        if (!isValid) {
          console_warn(`[sremote] SPOOF DETECTED on port for instance ${instanceId}! Closing port immediately.`);
          removeInstance(instanceId, 'spoof_detected');
          return;
        }
        item.authenticated = true;
        item.status = 'ready';
        currentActiveInstanceId = instanceId;
        if (data.state) item.state = data.state;
        if (data.mediaType) item.mediaType = data.mediaType;
        notifyMediaCountChange();

        emitGlobalEvent('accept', data);
        return;
      }

      if (data.state) item.state = data.state;
      if (data.mediaType) item.mediaType = data.mediaType;

      if (lowerAction === 'play' || lowerAction === 'playing') {
        if (exclusiveMode === 'auto') {
          pauseOthersExcept(instanceId);
        } else if (exclusiveMode && exclusiveMode !== instanceId) {
          port.postMessage({ type: `${NS}pause`, source: 'parent' });
          return;
        }
      }

      if (lowerAction === 'bridge_message') {
        const bridgePayload = {
          source: 'iframe',
          instanceId,
          data: data.data,
          origin: data.origin,
          location: item.location,
        };
        emitGlobalEvent('iframe:message', bridgePayload);
        emitGlobalEvent('message', bridgePayload);
        return;
      }

      if (lowerAction === 'requestblobclone' && data.blobUrl) {
        cloneBlobFromParent(data.blobUrl, instanceId);
        return;
      }

      if (lowerAction === 'nomedia') {
        console_warn(`[sremote] Iframe '${instanceId}' reported noMedia for action '${data.action || 'unknown'}':`, data.message || data.reason);
        emitGlobalEvent('nomedia', { instanceId, ...data });
        emitGlobalEvent('noMedia', { instanceId, ...data });
        return;
      }

      emitGlobalEvent(action, typeof data === 'object' && data !== null ? { instanceId, ...data } : { instanceId, value: data });
    };

    notifyMediaCountChange();
  }

  function findIframeElementBySource(sourceWindow) {
    if (!sourceWindow) return null;
    try {
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        if (iframes[i].contentWindow === sourceWindow) {
          return iframes[i];
        }
      }
    } catch {}
    return null;
  }

  // Cross-Frame Handshake Listener
  window.addEventListener('message', event => {
    if (event.source === window) return;

    const data = event.data;
    if (!data || typeof data !== 'object') return;
    const type = String(data.type || '');
    if (!type.startsWith(NS)) return;

    const action = type.slice(NS.length);
    const lowerAction = action.toLowerCase();
    const callerOrigin = event.origin || 'unknown_origin';

    if (lowerAction === 'accept') {
      const iframeEl = findIframeElementBySource(event.source);
      const preAssignedId = (iframeEl && (iframeEl.getAttribute('data-sremote-id') || iframeToAssignedIdMap.get(iframeEl))) || null;
      const instanceId = preAssignedId || data.instanceId || generateInstanceId();
      const iframeLoc = data.location || '';
      const iframeOrigin = event.origin && event.origin !== 'null' ? event.origin : data.origin || '*';

      console_log(`%c[SRemote:signal] Parent received cross-frame signal -> ${action}`, 'color: #6366f1; font-weight: bold;', {
        origin: callerOrigin,
        instanceId,
        data: { ...data, instanceId },
      });

      if (iframeEl && instanceId) {
        assignedIframeIdMap.set(instanceId, iframeEl);
        iframeToAssignedIdMap.set(iframeEl, instanceId);
      }

      let isValidSecret = false;
      let pendingConsumeHandshakeId = null;
      if (data.handshakeId && data.handshakeToken) {
        isValidSecret = checkHandshakeSecret(data.handshakeId, data.handshakeToken);
        if (isValidSecret) {
          pendingConsumeHandshakeId = data.handshakeId;
        }
      }

      if (!isValidSecret && event.ports && event.ports.length > 0) {
        const { allowKey: parentAllowKey } = getOriginStorageKeys(location.origin);
        const { allowKey: iframeAllowKey } = getOriginStorageKeys(iframeOrigin);
        const isPersisted = (parentAllowKey && Storage.get(parentAllowKey) === '1') || (iframeAllowKey && Storage.get(iframeAllowKey) === '1');
        if (
          isPersisted ||
          iframeOrigin === location.origin ||
          iframeOrigin === '*' ||
          iframeOrigin === 'null' ||
          callerOrigin === 'null' ||
          callerOrigin.startsWith('http') ||
          callerOrigin.startsWith('file:')
        ) {
          isValidSecret = true;
        }
      }

      if (!isValidSecret) {
        console_warn(`[sremote] Dropped unverified accept for instance: ${instanceId}`);
        return;
      }

      if (event.ports && event.ports.length > 0) {
        const port = event.ports[0];
        setupPortForInstance(instanceId, port, iframeLoc, iframeOrigin, iframeEl);
        const inst = instances.get(instanceId);
        if (inst) {
          inst.authenticated = true;
          if (pendingConsumeHandshakeId) {
            inst.pendingConsumeHandshakeId = pendingConsumeHandshakeId;
          }
          currentActiveInstanceId = instanceId;
          if (data.state) inst.state = data.state;
          if (data.mediaType) inst.mediaType = data.mediaType;
          inst.lastSeen = Date.now();
        }
        notifyMediaCountChange();

        try {
          port.postMessage({ type: `${NS}ping`, source: 'parent', handshakeVerify: true });
        } catch {}

        emitGlobalEvent('accept', { ...data, instanceId });
      } else if (event.source) {
        console_log(
          `%c[SRemote:port] Accept received without port for '${instanceId}'. Proactively renegotiating MessagePort...`,
          'color: #f59e0b; font-weight: bold;',
        );
        const channel = new MessageChannel();
        setupPortForInstance(instanceId, channel.port1, iframeLoc, iframeOrigin, iframeEl);
        const inst = instances.get(instanceId);
        if (inst) {
          inst.authenticated = true;
          if (pendingConsumeHandshakeId) {
            inst.pendingConsumeHandshakeId = pendingConsumeHandshakeId;
          }
          currentActiveInstanceId = instanceId;
          if (data.state) inst.state = data.state;
          if (data.mediaType) inst.mediaType = data.mediaType;
          inst.lastSeen = Date.now();
        }
        notifyMediaCountChange();

        try {
          event.source.postMessage(
            {
              type: `${NS}handshake_port`,
              source: 'parent',
              instanceId,
            },
            iframeOrigin && iframeOrigin !== 'null' ? iframeOrigin : '*',
            [channel.port2],
          );
        } catch (err) {
          console_warn('[sremote] Failed to transfer proactive MessagePort to iframe:', err);
        }

        emitGlobalEvent('accept', { ...data, instanceId });
      }
      return;
    }

    if (lowerAction === 'request_permission' || lowerAction === 'requestpermission') {
      createPermissionDialog({
        origin: location.origin,
        isTop: true,
        onDecision: allowed => {
          if (event.source) {
            try {
              event.source.postMessage(
                {
                  type: `${NS}permission_response`,
                  source: 'parent',
                  allowed: !!allowed,
                  parentOrigin: location.origin,
                },
                '*',
              );
            } catch {}
          }
        },
      });
      return;
    }
  });

  // Setup Liveness Reaper
  setupLivenessReaper(instances, removeInstance, iframeToAssignedIdMap);

  // Initialize and Export window.sremote
  createExportedApi({
    instances,
    parentAdaptersMap,
    assignedIframeIdMap,
    iframeToAssignedIdMap,
    dispatchCommand,
    handleUseAdapter,
    handleRemoveAdapter,
    isMultiModeActive,
    getLatestActiveInstanceId,
    currentActiveInstanceIdGetter: () => currentActiveInstanceId,
    multiModeConfigSetter: mode => {
      multiModeConfig = mode;
    },
    exclusiveModeSetter: mode => {
      exclusiveMode = mode;
    },
    pauseOthersExcept,
    queryMediaInstancesViaGM,
    globalEventListeners,
    lastAcceptedDataGetter: () => lastAcceptedData,
    validateDomainAccess,
    setSessionLocked: val => {
      isSessionLocked = val;
    },
  });
}

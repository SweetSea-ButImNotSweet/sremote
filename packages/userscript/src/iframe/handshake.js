import { VERSION, NS, console_log, console_warn } from '../config.js';
import { Storage } from '../core/storage.js';
import { getOriginStorageKeys } from '../core/utils.js';
import { createPermissionDialog } from '../ui/permission-dialog.js';
import { showConnectedIndicator } from '../ui/indicator-badge.js';
import { IframeStyleEngine } from './style-engine.js';
import { getVideoState, getIframeCapabilities } from './controller.js';

export function createIframeHandshake({
  instanceIdGetter,
  setInstanceId,
  resolver,
  bindPort,
  notifyState,
  closeMediaPort,
  treatAlmostEndAsEndSetter,
  currentHandshakeSetter,
  currentHandshakeGetter,
}) {
  let primaryAuthorizedOrigin = null;
  let permissionPopup = null;
  const authorizedOrigins = new Set();
  const sessionDeniedOrigins = new Set();

  function grantAccess(origin) {
    primaryAuthorizedOrigin = origin;
    if (origin) authorizedOrigins.add(origin);

    closeMediaPort();

    const channel = new MessageChannel();
    bindPort(channel.port1);
    const transferredPort = channel.port2;

    const hsInfo = typeof currentHandshakeGetter === 'function' ? currentHandshakeGetter() : {};

    const payload = {
      type: `${NS}accept`,
      event: 'accept',
      source: 'iframe',
      instanceId: instanceIdGetter(),
      location: location.href,
      origin: location.origin,
      version: VERSION,
      mediaType: resolver.getMediaType(),
      capabilities: getIframeCapabilities(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
      state: getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
      ...(hsInfo.handshakeId ? { handshakeId: hsInfo.handshakeId } : {}),
      ...(hsInfo.handshakeToken ? { handshakeToken: hsInfo.handshakeToken } : {}),
    };

    console_log(`%c[SRemote:handshake] Iframe sending 'accept' to parent ->`, 'color: #10b981; font-weight: bold;', {
      origin,
      instanceId: instanceIdGetter(),
      hasPort: Boolean(transferredPort),
      payload,
    });

    try {
      if (transferredPort) {
        window.top.postMessage(payload, origin || '*', [transferredPort]);
      } else {
        window.top.postMessage(payload, origin || '*');
      }
    } catch (err) {
      console_warn('[sremote] Error posting accept to top window with targetOrigin:', err);
      if (transferredPort) {
        window.top.postMessage(payload, '*', [transferredPort]);
      } else {
        window.top.postMessage(payload, '*');
      }
    }

    notifyState();
    showConnectedIndicator(origin, primaryAuthorizedOrigin);
  }

  function showPermissionPopup(source, origin) {
    if (permissionPopup) return;
    if (sessionDeniedOrigins.has(origin)) return;

    const { allowKey, denyKey } = getOriginStorageKeys(origin);
    if (Storage.get(denyKey) === '1') return;
    if (Storage.get(allowKey) === '1') {
      grantAccess(origin);
      return;
    }

    if (window.top && window.top !== window) {
      try {
        window.top.postMessage({ type: `${NS}request_permission`, source: 'iframe', origin: location.origin }, origin || '*');
        permissionPopup = {
          isDelegating: true,
          close: () => {
            permissionPopup = null;
          },
        };
        return;
      } catch {}
    }

    permissionPopup = createPermissionDialog({
      origin,
      isTop: false,
      onDecision: allowed => {
        permissionPopup = null;
        if (allowed) {
          grantAccess(origin);
        } else {
          sessionDeniedOrigins.add(origin);
        }
      },
    });
  }

  function handleHelloMessage(event, data) {
    const callerOrigin = event.origin || 'unknown_parent';
    if (event.source === window) return;

    if (data.css && typeof data.css === 'string') {
      IframeStyleEngine.setDynamicCSS(data.css);
    }

    if (typeof data.treatAlmostEndAsEnd === 'boolean') {
      treatAlmostEndAsEndSetter(data.treatAlmostEndAsEnd);
    }

    if (data.assignedInstanceId && typeof data.assignedInstanceId === 'string') {
      setInstanceId(data.assignedInstanceId);
      console_log(`%c[SRemote:assignId] Iframe accepted assigned instanceId -> ${data.assignedInstanceId}`, 'color: #10b981;');
    }

    if (event.ports && event.ports.length > 0) {
      bindPort(event.ports[0]);
    }

    if (data.handshakeId && data.handshakeToken) {
      currentHandshakeSetter(data.handshakeId, data.handshakeToken);
    }

    if (sessionDeniedOrigins.has(callerOrigin)) return;

    const { allowKey, denyKey } = getOriginStorageKeys(callerOrigin);
    if (allowKey && Storage.get(denyKey) === '1') return;

    const isAlreadyAccepted = authorizedOrigins.has(callerOrigin);
    if (isAlreadyAccepted) {
      grantAccess(callerOrigin);
      return;
    }

    if (allowKey && Storage.get(allowKey) === '1') {
      grantAccess(callerOrigin);
      return;
    }

    if (permissionPopup) return;
    showPermissionPopup(event.source, callerOrigin);
  }

  async function checkPendingHelloFromGM() {
    try {
      const helloSeq = Number(Storage.get('sremote:hello_seq', 0)) || 0;
      if (helloSeq <= 0) return;

      const latestHandshake = Storage.get('sremote:latest_handshake');
      if (!latestHandshake) return;

      if (typeof latestHandshake.treatAlmostEndAsEnd === 'boolean') {
        treatAlmostEndAsEndSetter(latestHandshake.treatAlmostEndAsEnd);
      }

      const parentOrigin = latestHandshake.parentOrigin || 'unknown_parent';
      if (latestHandshake.handshakeId && latestHandshake.handshakeToken) {
        currentHandshakeSetter(latestHandshake.handshakeId, latestHandshake.handshakeToken);
      }

      console_log(`%c[SRemote:boot] Iframe detected active hello_seq (${helloSeq}) from Parent (${parentOrigin})`, 'color: #06b6d4; font-weight: bold;');

      if (sessionDeniedOrigins.has(parentOrigin)) return;

      const { allowKey, denyKey } = getOriginStorageKeys(parentOrigin);
      if (allowKey && Storage.get(denyKey) === '1') return;

      if (authorizedOrigins.has(parentOrigin)) {
        grantAccess(parentOrigin);
        return;
      }

      if (allowKey && Storage.get(allowKey) === '1') {
        grantAccess(parentOrigin);
        return;
      }

      if (permissionPopup) return;
      showPermissionPopup(window.parent, parentOrigin);
    } catch (err) {
      console_warn('[sremote] Error in checkPendingHelloFromGM:', err);
    }
  }

  function handlePermissionResponse(data, callerOrigin) {
    if (permissionPopup) {
      permissionPopup.close?.();
      permissionPopup = null;
    }
    if (data.allowed) {
      grantAccess(data.parentOrigin || callerOrigin);
    } else {
      const deniedTarget = data.parentOrigin || callerOrigin;
      if (deniedTarget) sessionDeniedOrigins.add(deniedTarget);
    }
  }

  function handleHandshakePort(event, data, callerOrigin) {
    if (data.instanceId) setInstanceId(data.instanceId);
    closeMediaPort();
    bindPort(event.ports[0]);
    primaryAuthorizedOrigin = callerOrigin;
    authorizedOrigins.add(callerOrigin);
    notifyState();
    showConnectedIndicator(callerOrigin, primaryAuthorizedOrigin);
  }

  return {
    get primaryAuthorizedOrigin() {
      return primaryAuthorizedOrigin;
    },
    grantAccess,
    handleHelloMessage,
    checkPendingHelloFromGM,
    handlePermissionResponse,
    handleHandshakePort,
  };
}

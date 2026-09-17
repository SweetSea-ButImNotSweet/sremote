import { Storage } from '../../core/storage.js';
import { generateInstanceId } from '../../core/utils.js';

/**
 * Creates lifecycle, event and metadata handlers for parent API.
 */
export function createLifecycleHandlers({ instanceManager, validateDomainAccess, dispatchCommand, topMediaTracker, tabSessionId, logger, NS }) {
  const { instances, iframeToAssignedIdMap, globalEventListeners } = instanceManager;

  let tabHelloSeq = 0;
  let lastHelloTimestamp = 0;
  let activeHandshakeId = null;
  let activeHandshakeToken = null;

  const onEvent = (event, handler, key) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked on()! Valid Passkey is required.');
      return () => {};
    }
    const ev = String(event || '').toLowerCase();
    if (!globalEventListeners.has(ev)) globalEventListeners.set(ev, new Set());
    globalEventListeners.get(ev).add(handler);

    // Sticky replay
    const lastAcceptedData = instanceManager.lastAcceptedData;
    if ((ev === 'accept' || ev === '*') && lastAcceptedData && instances.has(lastAcceptedData.instanceId)) {
      try {
        const payload = ev === '*' ? { ...lastAcceptedData, event: 'accept' } : lastAcceptedData;
        setTimeout(() => {
          try {
            handler(payload);
          } catch {}
        }, 0);
      } catch {}
    }

    return () => offEvent(ev, handler);
  };

  const offEvent = (event, handler) => {
    const ev = String(event || '').toLowerCase();
    globalEventListeners.get(ev)?.delete(handler);
  };

  const lockSession = () => {
    instanceManager.setSessionLocked(true);
    logger.scope('lock').log('SRemote is now session-locked for this page');
    return true;
  };

  const broadcastHello = (options = {}, target = null) => {
    let targetIframeWindow = target;
    let providedKey = null;
    let customCss = null;
    let treatAlmostEndAsEnd = null;

    if (options && typeof options === 'object') {
      if (typeof options.multiMode === 'boolean' || options.multiMode === null) {
        instanceManager.setMultiModeConfig(options.multiMode);
      }
      if (typeof options.treatAlmostEndAsEnd === 'boolean') {
        treatAlmostEndAsEnd = options.treatAlmostEndAsEnd;
      }
      if (!targetIframeWindow && options.target) {
        targetIframeWindow = options.target;
      }
      if (options.key) {
        providedKey = String(options.key).trim();
      }
      if (options.css && typeof options.css === 'string') {
        customCss = options.css;
      }
      if (typeof options.trackParent === 'boolean' && topMediaTracker) {
        if (options.trackParent) {
          topMediaTracker.start();
        } else {
          topMediaTracker.stop();
        }
      }
    }

    if (!validateDomainAccess(providedKey)) {
      const hostDomain = location.hostname || 'this_domain';
      logger.scope('auth').error(`Blocked hello() on locked domain '${hostDomain}'! Valid Passkey is required in hello({ key: '...' }).`);
      return false;
    }

    logger.scope('auth').log(`Access authorized for domain '${location.hostname}'`);

    const now = Date.now();
    // React Strict Mode & Rapid Call Coalescing:
    // If hello() is called repeatedly within 150ms without target change, reuse the active handshake secrets
    const isRapidRepeat = now - lastHelloTimestamp < 150 && activeHandshakeId && activeHandshakeToken && !targetIframeWindow;
    lastHelloTimestamp = now;

    let handshakeId;
    let handshakeToken;

    if (isRapidRepeat) {
      handshakeId = activeHandshakeId;
      handshakeToken = activeHandshakeToken;
      logger.scope('hello').log('Coalescing rapid hello call (Strict Mode safe)');
    } else {
      handshakeId = generateInstanceId('hs');
      handshakeToken = generateInstanceId('tok');
      activeHandshakeId = handshakeId;
      activeHandshakeToken = handshakeToken;
    }

    const nextSeq = isRapidRepeat ? tabHelloSeq : ++tabHelloSeq;

    const handshakeRecord = {
      seq: nextSeq,
      handshakeId,
      handshakeToken,
      parentOrigin: location.origin,
      css: customCss,
      ...(treatAlmostEndAsEnd !== null ? { treatAlmostEndAsEnd } : {}),
      ...(tabSessionId ? { tabSessionId } : {}),
      timestamp: Date.now(),
    };

    // Scoped storage per tab session to eliminate multi-tab interference
    if (tabSessionId) {
      Storage.raw.set(`sremote:ipc:latest_handshake:${tabSessionId}`, handshakeRecord);
    }

    const createHelloPayload = assignedInstanceId => ({
      type: `${NS}hello`,
      source: 'parent',
      handshakeId,
      handshakeToken,
      seq: nextSeq,
      ...(customCss ? { css: customCss } : {}),
      ...(treatAlmostEndAsEnd !== null ? { treatAlmostEndAsEnd } : {}),
      ...(assignedInstanceId ? { assignedInstanceId } : {}),
      ...(tabSessionId ? { tabSessionId } : {}),
    });

    logger
      .scope('hello')
      .log(`Parent sending hello (seq: ${nextSeq}) ->`, { hasTarget: !!targetIframeWindow, handshakeId, seq: nextSeq, hasCss: Boolean(customCss), tabSessionId });

    if (targetIframeWindow && typeof targetIframeWindow.postMessage === 'function') {
      try {
        let assignedId = null;
        try {
          const iframes = document.querySelectorAll('iframe');
          for (let i = 0; i < iframes.length; i++) {
            if (iframes[i].contentWindow === targetIframeWindow) {
              assignedId = iframes[i].getAttribute('data-sremote-id') || iframeToAssignedIdMap.get(iframes[i]) || null;
              break;
            }
          }
        } catch {}
        targetIframeWindow.postMessage(createHelloPayload(assignedId), '*');
      } catch (err) {
        logger.scope('hello').warn('Error posting hello to target iframe:', err);
      }
      return true;
    }

    try {
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        try {
          const ifr = iframes[i];
          const assignedId = ifr.getAttribute('data-sremote-id') || iframeToAssignedIdMap.get(ifr) || null;
          ifr.contentWindow?.postMessage(createHelloPayload(assignedId), '*');
        } catch {}
      }
    } catch {}

    try {
      for (let i = 0; i < window.frames.length; i++) {
        try {
          window.frames[i].postMessage(createHelloPayload(null), '*');
        } catch {}
      }
    } catch {}

    return true;
  };

  const bindMetadata = (meta, instanceId, key) => dispatchCommand('bindMetadata', meta, instanceId, key);

  return { onEvent, offEvent, lockSession, broadcastHello, bindMetadata };
}

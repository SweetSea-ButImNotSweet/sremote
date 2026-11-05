/**
 * Creates lifecycle, event and metadata handlers for parent API (SRemote Handshake v4).
 */
export function createLifecycleHandlers({ instanceManager, validateDomainAccess, dispatchCommand, topMediaTracker, transportManager, logger }) {
  const { instances, globalEventListeners } = instanceManager;

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

    const lastStateData = instanceManager.lastStateData;
    if (ev === 'state' && lastStateData && instances.has(lastStateData.instanceId)) {
      try {
        const payload = { ...lastStateData, event: 'state' };
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

  const lockSession = (passkey = null) => {
    instanceManager.setSessionLocked(true, passkey);
    logger.scope('lock').log('SRemote is now session-locked for this page', { hasKey: Boolean(passkey) });
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

    // In-memory update for dynamic configurations
    if (transportManager) {
      transportManager.updateHandshakeConfig({ css: customCss, treatAlmostEndAsEnd });
      transportManager.flushPendingSyns();
      transportManager.discover(targetIframeWindow);
    }

    logger.scope('hello').log('Parent initiated hello discovery (Handshake v4) ->', { hasTarget: !!targetIframeWindow, hasCss: Boolean(customCss) });

    return true;
  };

  const bindMetadata = (meta, instanceId, key) => dispatchCommand('bindMetadata', meta, instanceId, key);

  return { onEvent, offEvent, lockSession, broadcastHello, bindMetadata };
}

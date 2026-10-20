import { logger, descriptors } from '../config.js';
import { VERSION, NS, ENABLE_DEBUG_API } from '../const.js';
import { Storage } from '../core/storage.js';
import { checkOriginPairPermission, generateInstanceId, safeSetProp, normalizeOrigin } from '../core/utils.js';
import { showConnectedIndicator, hideConnectedIndicator } from '../ui/indicator-badge.js';
import { IframeStyleEngine } from './style-engine.js';
import { mockMediaSessionInstance, hookMediaSession } from './media-session.js';
import { createMediaResolver, findAllMedia } from './media-hunter.js';
import { setupMediaHooks } from './hooks.js';
import { getVideoState, getIframeCapabilities, createMediaController } from './controller.js';
import { createIframeDebugApi } from '../debug/iframe-debug.js';
import { createRpcRegistry } from './rpc.js';
import { createIframeTransportManager } from './transport.js';
import { createMediaEventEmitter } from './event-emitter.js';
import { createIframeDispatcher } from './dispatcher.js';

export function initIframeAgent() {
  // ==========================================
  // PHASE 1: Environment, Security & State Setup
  // ==========================================
  let topOrigin = null;
  try {
    if (window.top?.location?.origin) {
      topOrigin = window.top.location.origin;
    }
  } catch {}

  if (!topOrigin && location.ancestorOrigins && location.ancestorOrigins.length > 0) {
    topOrigin = location.ancestorOrigins[location.ancestorOrigins.length - 1];
  }

  if (!topOrigin && document.referrer) {
    try {
      topOrigin = new URL(document.referrer).origin;
    } catch {}
  }

  const normTop = normalizeOrigin(topOrigin);

  // Check if top window permanently blocked in Storage.permissions
  const isTopBlocked = normTop ? Storage.permissions.get(normTop, '*') === 0 || Storage.permissions.get('*', normTop) === 0 : false;
  if (isTopBlocked) {
    return;
  }

  if (topOrigin) {
    const pairPerm = checkOriginPairPermission(topOrigin, location.origin);
    if (pairPerm.isDenied) {
      return;
    }
  }

  logger.log(`%c[sremote v${VERSION}] Injected into frame:`, 'background: #0284c7; color: #fff; font-weight: bold; padding: 2px 6px;', location.href);

  let selfAssignedId = null;
  try {
    if (window.name && typeof window.name === 'string') {
      const nameMatch = window.name.match(/(?:sremote_id|data-sremote-id)=([^&;\s]+)/i);
      if (nameMatch) selfAssignedId = decodeURIComponent(nameMatch[1]);
    }
    if (!selfAssignedId && location.hash) {
      const hashMatch = location.hash.match(/[#&]sremote_id=([^&]+)/i);
      if (hashMatch) selfAssignedId = decodeURIComponent(hashMatch[1]);
    }
    if (!selfAssignedId && location.search) {
      const searchMatch = location.search.match(/[?&]sremote_id=([^&]+)/i);
      if (searchMatch) selfAssignedId = decodeURIComponent(searchMatch[1]);
    }
  } catch {}

  let instanceId = selfAssignedId || generateInstanceId();
  let mediaPort = null;
  let configuredVolume = null;
  let configuredMuted = null;
  const mediaWaiters = [];
  const createdMediaPool = new WeakSet();
  let treatAlmostEndAsEnd = false;
  let programmaticActionTimestamp = 0;
  let originalMediaSrcBeforeDebug = null;
  let observer = null;
  let livenessScheduled = null;
  let gmQueryTimer = null;

  IframeStyleEngine.init('');

  // ==========================================
  // PHASE 2: Base Communication & Notification Core
  // ==========================================
  function closeMediaPort() {
    if (mediaPort) {
      try {
        mediaPort.close();
      } catch {}
      mediaPort = null;
    }
  }

  function emitToParent(eventOrAction, payload = {}) {
    const lowerEvt = String(eventOrAction || '').toLowerCase();
    if (!handshake.primaryAuthorizedOrigin && lowerEvt !== 'accept' && lowerEvt !== 'requestblobclone') {
      return;
    }

    const msg = { type: `${NS}${eventOrAction}`, event: eventOrAction, source: 'iframe', instanceId, location: location.href, origin: location.origin, ...payload };
    logger.debug(`%c[SRemote:signal] Iframe emit -> ${eventOrAction} (source: iframe)`, 'color: #10b981;', msg);

    if (mediaPort) {
      try {
        mediaPort.postMessage(msg);
      } catch {}
    }
  }

  function sendMediaSessionState(action, specificValue) {
    const ms = navigator.mediaSession || mockMediaSessionInstance;
    const payload = {
      playbackState: ms?.playbackState,
      metadata: ms?.metadata ? { title: ms.metadata.title, artist: ms.metadata.artist, album: ms.metadata.album, artwork: ms.metadata.artwork || [] } : null,
      supportedActions: Array.from(mockMediaSessionInstance._handlers.keys()),
      isProgrammatic: Date.now() - programmaticActionTimestamp < 500,
    };
    if (action) payload.event = action;
    if (specificValue !== undefined) payload.value = specificValue;
    emitToParent(action || 'mediaSessionState', payload);
  }

  function notifyState(action, specificValue) {
    const isProgrammatic = Date.now() - programmaticActionTimestamp < 500;
    const mediaType = resolver.getMediaType();
    switch (mediaType) {
      case 'adapter':
      case 'video':
      case 'audio':
        emitToParent(action || 'state', {
          ...(action ? { event: action } : {}),
          ...(specificValue !== undefined ? { value: specificValue } : {}),
          isProgrammatic,
          state: getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
        });
        break;
      default:
        sendMediaSessionState(action, specificValue);
    }
  }

  // ==========================================
  // PHASE 3: Resolver, Controller & RPC Registry
  // ==========================================
  const { bindVideoEvents } = createMediaEventEmitter({
    resolver: {
      getActiveMedia: () => resolver.getActiveMedia(),
      resolveActiveMedia: () => resolver.resolveActiveMedia(),
      setActiveMedia: m => resolver.setActiveMedia(m),
      setMediaType: t => resolver.setMediaType(t),
      getMediaType: () => resolver.getMediaType(),
    },
    emitToParent,
    instanceIdGetter: () => instanceId,
    treatAlmostEndAsEndGetter: () => treatAlmostEndAsEnd,
    programmaticActionTimestampGetter: () => programmaticActionTimestamp,
  });

  const resolver = createMediaResolver(createdMediaPool, bindVideoEvents);
  mockMediaSessionInstance.setResolver(resolver);

  const executeControl = createMediaController({
    activeMediaGetter: resolver.getActiveMedia,
    mediaTypeGetter: resolver.getMediaType,
    resolveActiveMedia: resolver.resolveActiveMedia,
    notifyState,
    sendMediaSessionState,
    configuredVolumeGetter: () => configuredVolume,
    configuredVolumeSetter: v => {
      configuredVolume = v;
    },
    configuredMutedSetter: m => {
      configuredMuted = m;
    },
    programmaticActionTimestampSetter: ts => {
      programmaticActionTimestamp = ts;
    },
    emitToParent,
    instanceId,
  });

  const rpcRegistry = createRpcRegistry({
    resolver,
    instanceId,
    emitToParent,
    sendMediaSessionState,
    notifyState,
    getOriginalMediaSrc: () => originalMediaSrcBeforeDebug,
    setOriginalMediaSrc: src => {
      originalMediaSrcBeforeDebug = src;
    },
  });

  // ==========================================
  // PHASE 4: Transport & Dispatcher Wiring
  // ==========================================
  function bindPort(port) {
    mediaPort = port;
    port.onmessage = e => dispatcher.dispatchPortMessage(e, port);
  }

  const handshake = createIframeTransportManager({
    instanceIdGetter: () => instanceId,
    setInstanceId: id => {
      instanceId = id;
    },
    resolver,
    bindPort,
    notifyState,
    closeMediaPort,
    treatAlmostEndAsEndSetter: val => {
      treatAlmostEndAsEnd = val;
    },
  });

  const dispatcher = createIframeDispatcher({
    instanceIdGetter: () => instanceId,
    resolver,
    rpcRegistry,
    executeControl,
    emitToParent,
    mockMediaSessionInstance,
    handshake,
  });

  // ==========================================
  // PHASE 5: Media Detection, Observer & Lifecycle
  // ==========================================
  function onMediaAvailable() {
    const activeMedia = resolver.getActiveMedia();
    const mediaType = resolver.getMediaType();
    if ((mediaType === 'video' || mediaType === 'audio') && activeMedia) {
      bindVideoEvents(activeMedia);
    }
    notifyState();
    if (handshake.primaryAuthorizedOrigin) {
      showConnectedIndicator(handshake.primaryAuthorizedOrigin, handshake.primaryAuthorizedOrigin);
    }
    const waiters = mediaWaiters.splice(0, mediaWaiters.length);
    for (const w of waiters) w(true);
  }

  function trackMediaElement(el) {
    if (!el) return;
    createdMediaPool.add(el);
    if (configuredVolume !== null) safeSetProp(el, descriptors.volume, 'volume', configuredVolume);
    if (configuredMuted !== null) safeSetProp(el, descriptors.muted, 'muted', configuredMuted);
    bindVideoEvents(el);
    if (!resolver.getActiveMedia()) {
      resolver.resolveActiveMedia();
      if (resolver.getActiveMedia()) onMediaAvailable();
    }
  }

  // Hook constructors & MediaSession early
  hookMediaSession();
  setupMediaHooks({
    trackMediaElement,
    onElementAdded: () => {
      checkActiveMediaLiveness();
    },
  });

  function scheduleActiveMediaLiveness() {
    if (livenessScheduled) return;
    const scheduleFn = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : fn => setTimeout(fn, 16);
    livenessScheduled = scheduleFn(() => {
      livenessScheduled = null;
      checkActiveMediaLiveness();
    });
  }

  function checkActiveMediaLiveness() {
    IframeStyleEngine.maintainStyles();

    const had = Boolean(resolver.getActiveMedia());
    const oldType = resolver.getMediaType();
    const activeMedia = resolver.getActiveMedia();
    const isCurrentAttached = activeMedia && (activeMedia.isConnected || createdMediaPool.has(activeMedia));

    if (!isCurrentAttached || !resolver.resolveActiveMedia()) {
      if (had) {
        logger.log(`%c[SRemote:media] Active media detached / changed in iframe. Preserving MessagePort.`, 'color: #f59e0b;');
        if (!resolver.resolveActiveMedia()) {
          resolver.setActiveMedia(null);
          resolver.setMediaType(null);
          emitToParent('noMedia', { instanceId, hasMedia: false, reason: 'media_detached' });
          return;
        }
      }
    }

    if (resolver.resolveActiveMedia() && (!had || oldType !== resolver.getMediaType())) {
      onMediaAvailable();
    }
  }

  // Active GM-based Query Poller
  function listenToGMQueries() {
    let lastQueryToken = null;
    gmQueryTimer = setInterval(() => {
      try {
        const queryReq = Storage.raw.get('sremote:ipc:query_req');
        if (queryReq && queryReq !== lastQueryToken) {
          lastQueryToken = queryReq;
          resolver.resolveActiveMedia();

          const reportData = {
            instanceId,
            location: location.href,
            origin: location.origin,
            title: document.title,
            hasMedia: Boolean(resolver.getActiveMedia()),
            mediaType: resolver.getMediaType(),
            lastActive: Date.now(),
          };
          Storage.raw.set(`sremote:ipc:report:${instanceId}`, reportData);
        }
      } catch {}
    }, 800);
  }

  listenToGMQueries();

  // Listen to Window PostMessages
  window.addEventListener('message', event => dispatcher.dispatchWindowMessage(event, mediaPort));

  function boot() {
    if (resolver.resolveActiveMedia()) onMediaAvailable();

    if (!observer) {
      try {
        observer = new MutationObserver(scheduleActiveMediaLiveness);
        const mountTarget = document.documentElement || document.body || document;
        if (mountTarget) {
          observer.observe(mountTarget, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'currentSrc'] });
        }
      } catch {}
    }

    IframeStyleEngine.maintainStyles();

    let teardownDone = false;
    const handleTeardown = ev => {
      if (teardownDone) return;
      teardownDone = true;
      if (gmQueryTimer) {
        clearInterval(gmQueryTimer);
        gmQueryTimer = null;
      }
      if (livenessScheduled) {
        if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(livenessScheduled);
        livenessScheduled = null;
      }
      try {
        if (observer) observer.disconnect();
      } catch {}
      try {
        hideConnectedIndicator();
        emitToParent('disconnect', { instanceId, reason: ev?.type || 'page_unload' });
        closeMediaPort();
      } catch {}
    };

    try {
      window.addEventListener('pagehide', handleTeardown, { capture: true });
    } catch {}
  }

  if (ENABLE_DEBUG_API) {
    const iframeDebugApi = createIframeDebugApi({
      activeMediaGetter: resolver.getActiveMedia,
      resolveActiveMedia: resolver.resolveActiveMedia,
      findAllMedia,
      getVideoState: () => getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
      getIframeCapabilities: () => getIframeCapabilities(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
      mockMediaSessionInstance,
      originalMediaSrcBeforeDebugGetter: () => originalMediaSrcBeforeDebug,
      originalMediaSrcBeforeDebugSetter: src => {
        originalMediaSrcBeforeDebug = src;
      },
    });

    try {
      if (typeof globalThis !== 'undefined') {
        globalThis[Symbol.for('__sremote_iframe_debug__')] = iframeDebugApi;
      }
    } catch {}
  }

  const announceReadyToParent = () => {
    try {
      if (window.top && window.top !== window) {
        window.top.postMessage({ type: `${NS}iframe_ready`, source: 'iframe', origin: location.origin }, '*');
      }
    } catch {}
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        boot();
        announceReadyToParent();
      },
      { once: true },
    );
  } else {
    boot();
    announceReadyToParent();
  }
}

import { VERSION, NS, ENABLE_DEBUG_API, console_log, console_debug, console_warn, pageWindow, MEDIA_EVENTS, descriptors } from '../config.js';
import { Storage } from '../core/storage.js';
import { getOriginStorageKeys, generateInstanceId, safeSetProp, safeGetProp } from '../core/utils.js';
import { showConnectedIndicator, hideConnectedIndicator } from '../ui/indicator-badge.js';
import { IframeStyleEngine } from './style-engine.js';
import { mockMediaSessionInstance, hookMediaSession } from './media-session.js';
import { createMediaResolver, findAllMedia } from './media-hunter.js';
import { setupMediaHooks } from './hooks.js';
import { getVideoState, getIframeCapabilities, createMediaController } from './controller.js';
import { createIframeDebugApi } from '../debug/iframe-debug.js';
import { createRpcRegistry } from './rpc.js';
import { createIframeHandshake } from './handshake.js';

export function initIframeAgent() {
  let topOrigin = null;
  try {
    if (window.top && window.top !== window.self) {
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

  const selfDenyKey = getOriginStorageKeys(location.origin).denyKey;
  const topDenyKey = topOrigin ? getOriginStorageKeys(topOrigin).denyKey : null;

  if ((selfDenyKey && Storage.get(selfDenyKey) === '1') || (topDenyKey && Storage.get(topDenyKey) === '1')) {
    return; // Silently abort
  }

  console_log(`%c[sremote v${VERSION}] Injected into frame:`, 'background: #0284c7; color: #fff; font-weight: bold; padding: 2px 6px;', location.href);

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
  const boundMediaElements = new WeakSet();
  const createdMediaPool = new WeakSet();
  let currentHandshakeId = null;
  let currentHandshakeToken = null;
  let treatAlmostEndAsEnd = false;
  let programmaticActionTimestamp = 0;
  let originalMediaSrcBeforeDebug = null;

  // Check GM Storage for early hello CSS immediately on document-start
  let initialBootstrapCss = '';
  try {
    const latestHandshake = Storage.get('sremote:latest_handshake');
    if (latestHandshake && latestHandshake.css && typeof latestHandshake.css === 'string') {
      initialBootstrapCss = latestHandshake.css;
    }
  } catch {}

  IframeStyleEngine.init(initialBootstrapCss);

  function bindVideoEvents(video) {
    if (!video || boundMediaElements.has(video)) return;
    boundMediaElements.add(video);

    let hasEmittedAlmostEnd = false;

    for (const evtName of MEDIA_EVENTS) {
      video.addEventListener(evtName, () => {
        resolver.setActiveMedia(video);
        resolver.setMediaType(video.tagName ? video.tagName.toLowerCase() : 'video');

        if (evtName === 'timeupdate') {
          const dur = Number.isFinite(video.duration) ? video.duration : null;
          const curTime = safeGetProp(video, descriptors.currentTime, 'currentTime') ?? video.currentTime ?? 0;
          if (dur && dur > 3 && curTime >= dur - 0.8 && curTime <= dur) {
            if (!hasEmittedAlmostEnd) {
              hasEmittedAlmostEnd = true;
              emitToParent(treatAlmostEndAsEnd ? 'ended' : 'almostend', { state: getVideoState(video, resolver.getActiveMedia(), resolver.resolveActiveMedia) });
            }
          } else if (dur && curTime < dur - 1.5) {
            hasEmittedAlmostEnd = false;
          }
        }

        if (evtName === 'ended') {
          hasEmittedAlmostEnd = false;
          const dur = Number.isFinite(video.duration) ? video.duration : null;
          const curTime = safeGetProp(video, descriptors.currentTime, 'currentTime') ?? video.currentTime ?? 0;
          if (dur && dur > 0 && Math.abs(dur - curTime) > 1.5) return;
        }

        const isProgrammatic = Date.now() - programmaticActionTimestamp < 500;
        emitToParent(evtName, { isProgrammatic, state: getVideoState(video, resolver.getActiveMedia(), resolver.resolveActiveMedia) });
      });
    }
  }

  const resolver = createMediaResolver(createdMediaPool, bindVideoEvents);

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

  // Hook constructors & MediaSession
  hookMediaSession();
  setupMediaHooks({ trackMediaElement });

  function sendMediaSessionState(action, specificValue) {
    const ms = navigator.mediaSession || mockMediaSessionInstance;
    const payload = {
      playbackState: ms?.playbackState,
      metadata: ms?.metadata ? { title: ms.metadata.title, artist: ms.metadata.artist, album: ms.metadata.album, artwork: ms.metadata.artwork || [] } : null,
      supportedActions: Array.from(mockMediaSessionInstance._handlers.keys()),
    };
    if (action) payload.action = action;
    if (specificValue !== undefined) payload.value = specificValue;

    emitToParent(action || 'mediaSessionState', payload);
  }

  function emitToParent(eventOrAction, payload = {}) {
    const lowerEvt = String(eventOrAction || '').toLowerCase();
    if (!handshake.primaryAuthorizedOrigin && lowerEvt !== 'accept' && lowerEvt !== 'requestblobclone') {
      return;
    }

    const msg = { type: `${NS}${eventOrAction}`, event: eventOrAction, source: 'iframe', instanceId, location: location.href, origin: location.origin, ...payload };

    console_debug(`%c[SRemote:signal] Iframe emit -> ${eventOrAction} (source: iframe)`, 'color: #10b981;', msg);

    if (mediaPort) {
      try {
        mediaPort.postMessage(msg);
      } catch {}
    }
  }

  function notifyState(action, specificValue) {
    const isProgrammatic = Date.now() - programmaticActionTimestamp < 500;
    const mediaType = resolver.getMediaType();
    switch (mediaType) {
      case 'adapter':
      case 'video':
      case 'audio':
        emitToParent(action || 'state', {
          ...(action ? { action } : {}),
          ...(specificValue !== undefined ? { value: specificValue } : {}),
          isProgrammatic,
          state: getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
        });
        break;
      default:
        sendMediaSessionState(action, specificValue);
    }
  }

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

  function closeMediaPort() {
    if (mediaPort) {
      try {
        mediaPort.close();
      } catch {}
      mediaPort = null;
    }
  }

  function bindPort(port) {
    mediaPort = port;
    port.onmessage = async e => {
      const data = e.data;
      if (!data || typeof data !== 'object') return;
      const type = String(data.type || '');
      if (!type.startsWith(NS)) return;

      const action = type.slice(NS.length);
      const lowerAction = action.toLowerCase();

      if (lowerAction !== 'ping' && lowerAction !== 'pong') {
        console_log(`%c[SRemote:command] Iframe received command (port) -> ${action}`, 'color: #8b5cf6; font-weight: bold;', data);
      }

      if (lowerAction === 'resendblobobject' && data.blob) {
        try {
          const localBlobUrl = URL.createObjectURL(data.blob);
          if (mockMediaSessionInstance.metadata) {
            const arts = mockMediaSessionInstance.metadata.artwork || [];
            arts.push({ src: localBlobUrl });
            mockMediaSessionInstance.metadata.artwork = arts;
            if (navigator.mediaSession && typeof MediaMetadata !== 'undefined') {
              navigator.mediaSession.metadata = new MediaMetadata(mockMediaSessionInstance.metadata);
            }
          }
        } catch (err) {
          console_warn('[sremote] Error creating local object URL for blob:', err);
        }
        return;
      }

      if (lowerAction === 'bridge_post') {
        const payload = data.payload;
        const targetOrigin = data.targetOrigin || '*';
        try {
          window.postMessage(payload, targetOrigin);
        } catch (err) {
          console_warn('[sremote] Error executing bridge postMessage in iframe:', err);
        }
        return;
      }

      if (lowerAction === 'rpc_request' && data.rpcId && data.action) {
        try {
          const res = await rpcRegistry.executeRpc(data.action, data.params);
          port.postMessage({ type: `${NS}rpc_response`, source: 'iframe', rpcId: data.rpcId, result: { success: true, instanceId, data: res } });
        } catch (err) {
          const isNotFound = String(err).includes('not found');
          port.postMessage({
            type: `${NS}rpc_response`,
            source: 'iframe',
            rpcId: data.rpcId,
            result: { success: false, instanceId, error: isNotFound ? 'ACTION_NOT_FOUND' : 'EXECUTION_ERROR', message: String(err) },
          });
        }
        return;
      }

      if (lowerAction === 'ping') {
        resolver.resolveActiveMedia();
        const state = getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia);
        const capabilities = getIframeCapabilities(null, resolver.getActiveMedia(), resolver.resolveActiveMedia);
        try {
          port.postMessage({
            type: `${NS}pong`,
            source: 'iframe',
            instanceId,
            mediaType: resolver.getMediaType(),
            hasMedia: Boolean(resolver.getActiveMedia()),
            capabilities,
            state,
          });
        } catch {}
        return;
      }

      if (
        lowerAction === 'singlemediadetected' ||
        lowerAction === 'multiplemediadetected' ||
        lowerAction === 'whereisinstanceid' ||
        lowerAction === 'accept' ||
        lowerAction === 'disconnect'
      ) {
        return;
      }

      const handled = await executeControl(action, data.value);
      if (!handled) {
        console_warn(`[sremote] Command '${action}' failed: No media element or MediaSession handler found in frame.`);
        emitToParent('noMedia', { action, reason: 'NO_MEDIA_FOUND', message: `No media element or MediaSession handler found for command '${action}'` });
      }
    };
  }

  const handshake = createIframeHandshake({
    instanceIdGetter: () => instanceId,
    setInstanceId: id => {
      instanceId = id;
    },
    resolver,
    bindPort,
    notifyState,
    getMediaPort: () => mediaPort,
    closeMediaPort,
    treatAlmostEndAsEndSetter: val => {
      treatAlmostEndAsEnd = val;
    },
    currentHandshakeSetter: (id, token) => {
      currentHandshakeId = id;
      currentHandshakeToken = token;
    },
    currentHandshakeGetter: () => ({ handshakeId: currentHandshakeId, handshakeToken: currentHandshakeToken }),
  });

  function onMediaAvailable() {
    const activeMedia = resolver.getActiveMedia();
    const mediaType = resolver.getMediaType();
    if ((mediaType === 'video' || mediaType === 'audio') && activeMedia) {
      bindVideoEvents(activeMedia);
    }
    notifyState();
    if (handshake.primaryAuthorizedOrigin) showConnectedIndicator(handshake.primaryAuthorizedOrigin, handshake.primaryAuthorizedOrigin);
    const waiters = mediaWaiters.splice(0, mediaWaiters.length);
    for (const w of waiters) w(true);
  }

  // Active GM-based Query Poller
  function listenToGMQueries() {
    let lastQueryToken = null;
    setInterval(() => {
      try {
        const queryReq = Storage.get('sremote:query_req');
        if (queryReq && queryReq !== lastQueryToken) {
          lastQueryToken = queryReq;
          resolver.resolveActiveMedia();

          const reportKey = `sremote:report:${instanceId}`;
          Storage.set(reportKey, {
            instanceId,
            location: location.href,
            origin: location.origin,
            title: document.title,
            hasMedia: Boolean(resolver.getActiveMedia()),
            mediaType: resolver.getMediaType(),
            lastActive: Date.now(),
          });
        }
      } catch {}
    }, 800);
  }

  listenToGMQueries();

  // Listen to Window PostMessages
  window.addEventListener('message', async event => {
    const data = event.data;

    // Check if this message is an internal SRemote protocol message
    const isSRemote = data && typeof data === 'object' && typeof data.type === 'string' && data.type.startsWith(NS);

    if (!isSRemote) {
      // Forward arbitrary window message to Parent via private MessagePort
      if (mediaPort && event.source !== window.top) {
        try {
          mediaPort.postMessage({ type: `${NS}bridge_message`, source: 'iframe', data: data, origin: event.origin });
        } catch {}
      }
      return;
    }

    if (event.source === window || data.source === 'iframe') return;

    const action = data.type.slice(NS.length);
    const lowerAction = action.toLowerCase();
    const callerOrigin = event.origin || 'unknown_parent';

    console_log(`%c[SRemote:command] Iframe received command/message (window) -> ${action}`, 'color: #ec4899; font-weight: bold;', { origin: callerOrigin, data });

    if (lowerAction === 'handshake_port' && event.ports && event.ports.length > 0) {
      handshake.handleHandshakePort(event, data, callerOrigin);
      return;
    }

    if (lowerAction === 'permission_response') {
      handshake.handlePermissionResponse(data, callerOrigin);
      return;
    }

    if (lowerAction === 'hello') {
      handshake.handleHelloMessage(event, data);
      return;
    }
  });

  function boot() {
    if (resolver.resolveActiveMedia()) onMediaAvailable();

    const checkActiveMediaLiveness = () => {
      IframeStyleEngine.maintainStyles();

      const had = Boolean(resolver.getActiveMedia());
      const oldType = resolver.getMediaType();
      const activeMedia = resolver.getActiveMedia();
      const isCurrentAttached = activeMedia && (activeMedia.isConnected || createdMediaPool.has(activeMedia));

      if (!isCurrentAttached || !resolver.resolveActiveMedia()) {
        if (had) {
          console_log(`%c[SRemote:media] Active media detached / dropped in iframe`, 'color: #f59e0b;');
          if (!resolver.resolveActiveMedia()) {
            resolver.setActiveMedia(null);
            resolver.setMediaType(null);
            emitToParent('mediaDisconnected', { instanceId, hasMedia: false });
            return;
          }
        }
      }

      if (resolver.resolveActiveMedia() && (!had || oldType !== resolver.getMediaType())) {
        onMediaAvailable();
      }
    };

    const observer = new MutationObserver(checkActiveMediaLiveness);
    const mountTarget = document.documentElement || document;
    if (mountTarget) {
      observer.observe(mountTarget, { childList: true, subtree: true });
    }

    const poolCheckInterval = setInterval(checkActiveMediaLiveness, 1000);

    let huntAttempts = 0;
    const huntTimer = setInterval(() => {
      huntAttempts++;
      IframeStyleEngine.maintainStyles();
      if (resolver.resolveActiveMedia()) {
        onMediaAvailable();
        if (resolver.getActiveMedia()) clearInterval(huntTimer);
      } else if (huntAttempts > 20) {
        clearInterval(huntTimer);
      }
    }, 250);

    let teardownDone = false;
    const handleTeardown = ev => {
      if (teardownDone) return;
      teardownDone = true;
      clearInterval(huntTimer);
      clearInterval(poolCheckInterval);
      try {
        observer.disconnect();
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

    handshake.checkPendingHelloFromGM();
  }

  handshake.checkPendingHelloFromGM();

  if (ENABLE_DEBUG_API) {
    const iframeDebugApi = createIframeDebugApi({
      activeMediaGetter: resolver.getActiveMedia,
      resolveActiveMedia: resolver.resolveActiveMedia,
      findAllMedia,
      getVideoState: () => getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
      getIframeCapabilities: () => getIframeCapabilities(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
      mockMediaSessionInstance,
      IframeStyleEngine,
      originalMediaSrcBeforeDebugGetter: () => originalMediaSrcBeforeDebug,
      originalMediaSrcBeforeDebugSetter: src => {
        originalMediaSrcBeforeDebug = src;
      },
    });

    try {
      Object.defineProperty(pageWindow, 'sremote_debug', { value: iframeDebugApi, writable: false, configurable: true, enumerable: true });
    } catch {
      pageWindow.sremote_debug = iframeDebugApi;
    }
    console_log(`%c[sremote] window.sremote_debug is ready inside iframe`, 'background: #065f46; color: #34d399; font-weight: bold;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
}

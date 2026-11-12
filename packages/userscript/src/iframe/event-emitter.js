import { MEDIA_EVENTS, descriptors } from '../config.js';
import { safeGetProp } from '../core/utils.js';
import { getVideoState } from './controller.js';
import { isProgrammatic, getActiveActionScope, TIMEUPDATE_THROTTLE_MS, PROGRESS_THROTTLE_MS } from '@sremote/shared';

/**
 * Creates the media event listener and rVFC frame-loop manager for video elements inside the iframe.
 */
export function createMediaEventEmitter(options) {
  const {
    ctx,
    emitToParent = ctx?.emitToParent || options.emitToParent,
    instanceIdGetter = ctx ? () => ctx.instanceId : options.instanceIdGetter,
    treatAlmostEndAsEndGetter = ctx ? () => ctx.treatAlmostEndAsEnd : options.treatAlmostEndAsEndGetter,
  } = options;
  const getResolver = () => ctx?.resolver || options.resolver;
  const boundMediaElements = new WeakSet();

  function bindVideoEvents(video) {
    if (!video || boundMediaElements.has(video)) return;
    boundMediaElements.add(video);

    let hasEmittedAlmostEnd = false;
    let lastTimeupdate = 0;
    let lastProgress = 0;

    const hasRVFC = typeof HTMLVideoElement !== 'undefined' && 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
    let rvfcHandle = null;

    const stopRVFCLoop = () => {
      if (rvfcHandle !== null && typeof video.cancelVideoFrameCallback === 'function') {
        try {
          video.cancelVideoFrameCallback(rvfcHandle);
        } catch {}
        rvfcHandle = null;
      }
    };

    const emitFrameUpdate = (now, mediaTime) => {
      if (now - lastTimeupdate < TIMEUPDATE_THROTTLE_MS) return;
      lastTimeupdate = now;

      const activeResolver = getResolver();
      const currentState = getVideoState(video, activeResolver?.getActiveMedia(), activeResolver?.resolveActiveMedia);
      const activeScope = getActiveActionScope();
      const isProg = isProgrammatic({ eventName: 'timeupdate', instanceId: instanceIdGetter() });
      const causedBy = activeScope?.cmdId || null;
      const dur = currentState?.duration || (Number.isFinite(video.duration) ? video.duration : null);
      const curTime = mediaTime ?? safeGetProp(video, descriptors.currentTime, 'currentTime') ?? video.currentTime ?? 0;

      if (dur && dur > 3 && curTime >= dur - 0.8 && curTime <= dur) {
        if (!hasEmittedAlmostEnd) {
          hasEmittedAlmostEnd = true;
          emitToParent(treatAlmostEndAsEndGetter() ? 'ended' : 'almostend', { isProgrammatic: isProg, ...(causedBy ? { causedBy } : {}), state: currentState });
        }
      } else if (dur && curTime < dur - 1.5) {
        hasEmittedAlmostEnd = false;
      }

      emitToParent('timeupdate', { isProgrammatic: isProg, ...(causedBy ? { causedBy } : {}), state: currentState });
    };

    const startRVFCLoop = () => {
      if (!hasRVFC || !(video instanceof HTMLVideoElement) || rvfcHandle !== null) return;
      const onFrame = (now, metadata) => {
        rvfcHandle = null;
        if (video.paused || video.ended || !video.isConnected) return;
        emitFrameUpdate(now, metadata?.mediaTime);
        if (!video.paused && !video.ended) {
          try {
            rvfcHandle = video.requestVideoFrameCallback(onFrame);
          } catch {
            rvfcHandle = null;
          }
        }
      };
      try {
        rvfcHandle = video.requestVideoFrameCallback(onFrame);
      } catch {
        rvfcHandle = null;
      }
    };

    for (const evtName of MEDIA_EVENTS) {
      video.addEventListener(evtName, () => {
        const activeResolver = getResolver();
        activeResolver?.setActiveMedia(video);
        activeResolver?.setMediaType(video.tagName ? video.tagName.toLowerCase() : 'video');

        const now = Date.now();
        const activeScope = getActiveActionScope();
        const instId = instanceIdGetter();
        const isProg = isProgrammatic({ eventName: evtName, instanceId: instId });
        const causedBy = activeScope?.cmdId || null;

        const currentState = getVideoState(video, activeResolver?.getActiveMedia(), activeResolver?.resolveActiveMedia);

        if (evtName === 'play' || evtName === 'pause') {
          try {
            if (typeof console !== 'undefined' && typeof console.groupCollapsed === 'function') {
              const tagText = isProg ? '[SRemote Programmatic]' : '[External: SponsorBlock/Player]';
              const tagStyle = isProg ? 'color: #10b981; font-weight: bold;' : 'color: #ef4444; font-weight: bold; font-size: 1.05em;';
              console.groupCollapsed(
                `%c[SRemote:Iframe:event] %c${evtName.toUpperCase()}%c | %c${tagText}%c 🔍 (Expand for event stack tree)`,
                'color: #8b5cf6; font-weight: bold;',
                'color: #ec4899; font-weight: bold; font-size: 1.1em;',
                'color: inherit;',
                tagStyle,
                'color: #64748b; font-style: italic;',
              );
              console.log('Event:', evtName);
              console.log('isProgrammatic:', isProg);
              if (causedBy) console.log('causedBy:', causedBy);
              console.log('currentTime:', currentState?.currentTime);
              console.log('paused:', currentState?.paused);
              if (typeof console.trace === 'function') {
                console.trace('Event Stack Tree:');
              }
              console.groupEnd();
            }
          } catch {}
        }

        if (evtName === 'play' || evtName === 'playing') {
          startRVFCLoop();
        } else if (evtName === 'pause' || evtName === 'ended' || evtName === 'emptied') {
          stopRVFCLoop();
        }

        if (evtName === 'timeupdate') {
          if (hasRVFC && video instanceof HTMLVideoElement && !video.paused && rvfcHandle !== null) {
            return;
          }
          emitFrameUpdate(now);
          return;
        }

        if (evtName === 'progress') {
          if (now - lastProgress < PROGRESS_THROTTLE_MS) {
            return;
          }
          lastProgress = now;
        }

        if (evtName === 'ended') {
          hasEmittedAlmostEnd = false;
          const dur = currentState?.duration || (Number.isFinite(video.duration) ? video.duration : null);
          const curTime = safeGetProp(video, descriptors.currentTime, 'currentTime') ?? video.currentTime ?? 0;
          if (dur && dur > 0 && Math.abs(dur - curTime) > 1.5) return;
        }

        emitToParent(evtName, { isProgrammatic: isProg, ...(causedBy ? { causedBy } : {}), state: currentState });
      });
    }

    if (!video.paused && !video.ended) {
      startRVFCLoop();
    }
  }

  return { bindVideoEvents };
}

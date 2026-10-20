import { MEDIA_EVENTS, descriptors } from '../config.js';
import { safeGetProp } from '../core/utils.js';
import { getVideoState } from './controller.js';
import { pipeline } from '@sremote/shared';

/**
 * Creates the media event listener and rVFC frame-loop manager for video elements inside the iframe.
 */
export function createMediaEventEmitter({ resolver, emitToParent, instanceIdGetter, treatAlmostEndAsEndGetter, programmaticActionTimestampGetter }) {
  const boundMediaElements = new WeakSet();

  function bindVideoEvents(video) {
    if (!video || boundMediaElements.has(video)) return;
    boundMediaElements.add(video);

    let hasEmittedAlmostEnd = false;
    let lastTimeupdate = 0;
    let lastProgress = 0;
    const TIMEUPDATE_THROTTLE_MS = 250;
    const PROGRESS_THROTTLE_MS = 500;

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

      const currentState = getVideoState(video, resolver.getActiveMedia(), resolver.resolveActiveMedia);
      const isProgrammatic = Date.now() - programmaticActionTimestampGetter() < 500;
      const dur = currentState?.duration || (Number.isFinite(video.duration) ? video.duration : null);
      const curTime = mediaTime ?? safeGetProp(video, descriptors.currentTime, 'currentTime') ?? video.currentTime ?? 0;

      if (dur && dur > 3 && curTime >= dur - 0.8 && curTime <= dur) {
        if (!hasEmittedAlmostEnd) {
          hasEmittedAlmostEnd = true;
          emitToParent(treatAlmostEndAsEndGetter() ? 'ended' : 'almostend', { isProgrammatic, state: currentState });
        }
      } else if (dur && curTime < dur - 1.5) {
        hasEmittedAlmostEnd = false;
      }

      emitToParent('timeupdate', { isProgrammatic, state: currentState });
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
        resolver.setActiveMedia(video);
        resolver.setMediaType(video.tagName ? video.tagName.toLowerCase() : 'video');

        const now = Date.now();
        let isProgrammatic = false;
        const tracker = pipeline.getTracker();
        if (tracker && typeof tracker.matchAndConsume === 'function') {
          isProgrammatic = tracker.matchAndConsume(evtName, { instanceId: instanceIdGetter(), video }).isProgrammatic;
        }
        if (!isProgrammatic) {
          isProgrammatic = now - programmaticActionTimestampGetter() < 500;
        }

        const currentState = getVideoState(video, resolver.getActiveMedia(), resolver.resolveActiveMedia);

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

        emitToParent(evtName, { isProgrammatic, state: currentState });
      });
    }

    if (!video.paused && !video.ended) {
      startRVFCLoop();
    }
  }

  return { bindVideoEvents };
}

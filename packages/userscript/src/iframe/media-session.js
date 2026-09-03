import { console_warn, pageWindow } from '../config.js';

export class MockMediaMetadata {
  constructor(init = {}) {
    this.title = init.title || '';
    this.artist = init.artist || '';
    this.album = init.album || '';
    this.artwork = Array.isArray(init.artwork) ? Object.freeze([...init.artwork]) : Object.freeze([]);
  }
}

if (typeof MediaMetadata === 'undefined') {
  try {
    window.MediaMetadata = MockMediaMetadata;
  } catch {}
}

export class MockMediaSession {
  constructor() {
    this.metadata = null;
    this.playbackState = 'none';
    this._handlers = new Map();
    this._resolver = null;
  }

  setResolver(resolver) {
    this._resolver = resolver;
  }

  setActionHandler(action, handler) {
    if (typeof handler === 'function') {
      this._handlers.set(action, handler);
    } else {
      this._handlers.delete(action);
    }
  }

  setPositionState(state) {
    this.positionState = state;
  }

  hasHandler(action) {
    if (this._handlers.has(action)) return true;
    const media = this._resolver?.getActiveMedia?.();
    if (media && (media.tagName === 'VIDEO' || media.tagName === 'AUDIO')) {
      return ['play', 'pause', 'stop', 'seekto', 'seekforward', 'seekbackward', 'previoustrack', 'nexttrack'].includes(action);
    }
    return false;
  }

  async invoke(action, details = {}) {
    const handler = this._handlers.get(action);
    if (typeof handler === 'function') {
      try {
        await handler({ action, ...details });
        return true;
      } catch (e) {
        console_warn(`[sremote] MockMediaSession handler for ${action} error:`, e);
      }
    }

    // Auto-fallback: Execute on native HTMLMediaElement if available
    const media = this._resolver?.getActiveMedia?.();
    if (media && (media.tagName === 'VIDEO' || media.tagName === 'AUDIO')) {
      try {
        switch (action) {
          case 'play':
            if (typeof media.play === 'function') await media.play();
            return true;
          case 'pause':
            if (typeof media.pause === 'function') media.pause();
            return true;
          case 'stop':
            if (typeof media.pause === 'function') media.pause();
            media.currentTime = 0;
            return true;
          case 'seekto':
            if (typeof details.seekTime === 'number') {
              media.currentTime = details.seekTime;
              return true;
            }
            break;
          case 'seekforward': {
            const offset = details.seekOffset || 10;
            media.currentTime = (media.currentTime || 0) + offset;
            return true;
          }
          case 'seekbackward': {
            const offset = details.seekOffset || 10;
            media.currentTime = Math.max(0, (media.currentTime || 0) - offset);
            return true;
          }
        }
      } catch (err) {
        console_warn(`[sremote] MockMediaSession fallback ${action} error:`, err);
      }
    }

    return false;
  }
}

export const mockMediaSessionInstance = new MockMediaSession();
export const activeMediaSession = navigator?.mediaSession || mockMediaSessionInstance;

export function hookMediaSession() {
  try {
    const ms = pageWindow.navigator?.mediaSession || navigator?.mediaSession;
    if (!ms) return;
    const proto = Object.getPrototypeOf(ms);
    const originalSet = proto?.setActionHandler || ms.setActionHandler;
    if (!originalSet) return;

    const wrappedSet = function (action, handler) {
      mockMediaSessionInstance.setActionHandler(action, handler);
      return originalSet.call(this, action, handler);
    };

    if (proto) proto.setActionHandler = wrappedSet;
    try {
      ms.setActionHandler = wrappedSet;
    } catch {}
  } catch (e) {
    console_warn('[sremote] MediaSession hook warning:', e);
  }
}

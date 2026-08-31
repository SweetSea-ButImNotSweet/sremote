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

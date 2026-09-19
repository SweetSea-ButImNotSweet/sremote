/**
 * Zero-Dependency Hierarchical Finite State Machine Engine
 *
 * Implements a deterministic two-level state hierarchy:
 * 1. Root Transport State: DISCONNECTED -> CONNECTING -> CONNECTED -> TERMINATED
 * 2. Nested Media State (active only when Transport is CONNECTED):
 *    NO_MEDIA (idle / detached) <-> HAS_MEDIA (READY / PLAYING / PAUSED / ENDED)
 */

export const TransportState = Object.freeze({ DISCONNECTED: 'DISCONNECTED', CONNECTING: 'CONNECTING', CONNECTED: 'CONNECTED', TERMINATED: 'TERMINATED' });

export const MediaState = Object.freeze({ NONE: 'NONE', NO_MEDIA: 'NO_MEDIA', READY: 'READY', PLAYING: 'PLAYING', PAUSED: 'PAUSED', ENDED: 'ENDED' });

const VALID_TRANSPORT_TRANSITIONS = {
  [TransportState.DISCONNECTED]: [TransportState.CONNECTING, TransportState.TERMINATED],
  [TransportState.CONNECTING]: [TransportState.CONNECTED, TransportState.DISCONNECTED, TransportState.TERMINATED],
  [TransportState.CONNECTED]: [TransportState.DISCONNECTED, TransportState.TERMINATED],
  [TransportState.TERMINATED]: [],
};

const VALID_MEDIA_TRANSITIONS = {
  [MediaState.NONE]: [MediaState.NO_MEDIA, MediaState.READY],
  [MediaState.NO_MEDIA]: [MediaState.READY],
  [MediaState.READY]: [MediaState.PLAYING, MediaState.PAUSED, MediaState.NO_MEDIA],
  [MediaState.PLAYING]: [MediaState.PAUSED, MediaState.ENDED, MediaState.READY, MediaState.NO_MEDIA],
  [MediaState.PAUSED]: [MediaState.PLAYING, MediaState.ENDED, MediaState.READY, MediaState.NO_MEDIA],
  [MediaState.ENDED]: [MediaState.PLAYING, MediaState.READY, MediaState.NO_MEDIA],
};

export class HierarchicalFSM {
  constructor(initialOptions = {}) {
    this.transportState = initialOptions.transportState || TransportState.DISCONNECTED;
    this.mediaState = this.transportState === TransportState.CONNECTED ? initialOptions.mediaState || MediaState.NO_MEDIA : MediaState.NONE;
    this._listeners = new Set();
  }

  get state() {
    return {
      transport: this.transportState,
      media: this.mediaState,
      isReady: this.transportState === TransportState.CONNECTED && this.mediaState !== MediaState.NO_MEDIA && this.mediaState !== MediaState.NONE,
      isConnected: this.transportState === TransportState.CONNECTED,
    };
  }

  canTransitionTransport(nextState) {
    if (this.transportState === nextState) return false;
    const allowed = VALID_TRANSPORT_TRANSITIONS[this.transportState] || [];
    return allowed.includes(nextState);
  }

  canTransitionMedia(nextState) {
    if (this.transportState !== TransportState.CONNECTED) return false;
    if (this.mediaState === nextState) return false;
    const allowed = VALID_MEDIA_TRANSITIONS[this.mediaState] || [];
    return allowed.includes(nextState);
  }

  transitionTransport(nextState, meta = {}) {
    if (!this.canTransitionTransport(nextState)) return false;
    const prev = this.transportState;
    this.transportState = nextState;

    if (nextState !== TransportState.CONNECTED) {
      this.mediaState = MediaState.NONE;
    } else if (this.mediaState === MediaState.NONE) {
      this.mediaState = MediaState.NO_MEDIA;
    }

    this._notify({ type: 'transport', from: prev, to: nextState, meta });
    return true;
  }

  transitionMedia(nextState, meta = {}) {
    if (!this.canTransitionMedia(nextState)) return false;
    const prev = this.mediaState;
    this.mediaState = nextState;

    this._notify({ type: 'media', from: prev, to: nextState, meta });
    return true;
  }

  canExecute(action) {
    if (this.transportState !== TransportState.CONNECTED) return false;
    // Commands requiring an active media element
    const playbackActions = ['play', 'pause', 'toggle', 'seek', 'seekTo', 'volume', 'mute', 'speed', 'playbackRate'];
    if (playbackActions.includes(action)) {
      return this.mediaState === MediaState.READY || this.mediaState === MediaState.PLAYING || this.mediaState === MediaState.PAUSED || this.mediaState === MediaState.ENDED;
    }
    return true;
  }

  onChange(listener) {
    if (typeof listener !== 'function') return () => {};
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify(changeEvent) {
    const current = this.state;
    for (const listener of Array.from(this._listeners)) {
      try {
        listener(current, changeEvent);
      } catch (err) {
        if (typeof console !== 'undefined') console.error('[SRemote:FSM] Listener error:', err);
      }
    }
  }

  destroy() {
    this._listeners.clear();
    this.transportState = TransportState.TERMINATED;
    this.mediaState = MediaState.NONE;
  }
}

export function createFSM(initialOptions) {
  return new HierarchicalFSM(initialOptions);
}

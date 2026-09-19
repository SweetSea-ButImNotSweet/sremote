import { HierarchicalFSM, TransportState, MediaState } from '../state/fsm.js';

/**
 * ConnectionManager
 *
 * Decouples transport handshaking, readiness detection, and liveness monitoring
 * from high-level client business logic using a Hierarchical FSM.
 */
export class ConnectionManager {
  constructor(options = {}) {
    this.options = { timeout: 2000, fallbackToDom: true, passkey: null, ...options };

    this.logger = options.logger || null;
    this.fsm = options.fsm || new HierarchicalFSM();
    this._readyPromise = null;
    this._listeners = new Set();
  }

  get state() {
    return this.fsm.state;
  }

  get isConnected() {
    return this.fsm.state.isConnected;
  }

  get isReady() {
    return this.fsm.state.isReady;
  }

  /**
   * Starts connection handshake detection.
   * @param {Object} context - Handshake detection probes (e.g. checkUserscriptAvailable, checkAdapterAvailable)
   * @returns {Promise<boolean>} Resolves when connected or fallen back.
   */
  async connect(context = {}) {
    if (this.fsm.transportState === TransportState.CONNECTED) {
      return true;
    }

    if (this._readyPromise) return this._readyPromise;

    this.fsm.transitionTransport(TransportState.CONNECTING);

    this._readyPromise = new Promise(resolve => {
      const { checkUserscriptAvailable, checkAdapterAvailable } = context;

      const completeConnection = (mode, reason) => {
        this.fsm.transitionTransport(TransportState.CONNECTED, { mode, reason });
        if (this.logger?.scope) {
          this.logger.scope('connection').log(reason);
        }
        resolve(true);
      };

      // 1. Immediate check: userscript or custom adapter
      if (typeof checkUserscriptAvailable === 'function' && checkUserscriptAvailable()) {
        completeConnection('userscript', 'Userscript bridge detected immediately');
        return;
      }

      if (typeof checkAdapterAvailable === 'function' && checkAdapterAvailable()) {
        completeConnection('dom-direct', 'Local adapter detected immediately');
        return;
      }

      // 2. Event-driven handshake
      let resolved = false;
      let timer = null;

      const onReadyEvent = evt => {
        if (resolved) return;
        resolved = true;
        cleanup();
        completeConnection('userscript', `Received announce/ready event: ${evt?.type || 'ready'}`);
      };

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (typeof window !== 'undefined') {
          window.removeEventListener('sremote:driver:ready', onReadyEvent);
          window.removeEventListener('sremote:ready', onReadyEvent);
          window.removeEventListener('sremote:bridge:announce', onReadyEvent);
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('sremote:driver:ready', onReadyEvent, { once: true });
        window.addEventListener('sremote:ready', onReadyEvent, { once: true });
        window.addEventListener('sremote:bridge:announce', onReadyEvent, { once: true });
      }

      // 3. Fallback timeout
      timer = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        cleanup();

        if (typeof checkUserscriptAvailable === 'function' && checkUserscriptAvailable()) {
          completeConnection('userscript', 'Userscript detected after wait timeout');
        } else if (this.options.fallbackToDom) {
          completeConnection('dom-direct', 'Userscript not detected. Falling back to Mode: dom-direct');
        } else {
          this.fsm.transitionTransport(TransportState.TERMINATED, { reason: 'Handshake timeout' });
          if (this.logger?.warn) {
            this.logger.warn('Connection handshake timed out and fallback disabled');
          }
          resolve(false);
        }
      }, this.options.timeout);
    });

    return this._readyPromise;
  }

  notifyMediaChange(hasMedia, mediaState = MediaState.READY) {
    if (this.fsm.transportState !== TransportState.CONNECTED) return;
    if (hasMedia) {
      this.fsm.transitionMedia(mediaState);
    } else {
      this.fsm.transitionMedia(MediaState.NO_MEDIA);
    }
  }

  disconnect() {
    this._readyPromise = null;
    this.fsm.transitionTransport(TransportState.DISCONNECTED);
  }

  terminate() {
    this._readyPromise = null;
    this.fsm.transitionTransport(TransportState.TERMINATED);
  }
}

export function createConnectionManager(options) {
  return new ConnectionManager(options);
}

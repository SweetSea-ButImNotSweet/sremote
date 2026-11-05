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

      let resolved = false;
      let timer = null;

      const onReadyEvent = evt => {
        completeConnection('userscript', `Received announce/ready event: ${evt?.type || 'ready'}`);
      };

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        this._completeConnection = null;
        if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
          window.removeEventListener('sremote:driver:ready', onReadyEvent);
          window.removeEventListener('sremote:ready', onReadyEvent);
          window.removeEventListener('sremote:bridge:announce', onReadyEvent);
        }
      };

      const completeConnection = (mode, reason) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        this.fsm.transitionTransport(TransportState.CONNECTED, { mode, reason });
        if (this.logger?.scope) {
          this.logger.scope('connection').log(reason);
        }
        resolve(true);
      };

      this._completeConnection = completeConnection;

      // 1. Immediate check: userscript or custom adapter
      if (typeof checkUserscriptAvailable === 'function' && checkUserscriptAvailable()) {
        completeConnection('userscript', 'Userscript bridge detected immediately');
        return;
      }

      if (typeof checkAdapterAvailable === 'function' && checkAdapterAvailable()) {
        completeConnection('dom-direct', 'Local adapter detected immediately');
        return;
      }

      // 2. Event-driven handshake with active ping
      if (typeof window !== 'undefined') {
        window.addEventListener('sremote:driver:ready', onReadyEvent, { once: true });
        window.addEventListener('sremote:ready', onReadyEvent, { once: true });
        window.addEventListener('sremote:bridge:announce', onReadyEvent, { once: true });

        // Ping Userscript if it loaded before SDK
        try {
          const pingEvt = typeof CustomEvent === 'function' ? new CustomEvent('sremote:client:ping') : new Event('sremote:client:ping');
          window.dispatchEvent(pingEvt);
        } catch {}
      }

      // 3. Fallback timeout
      timer = setTimeout(() => {
        if (typeof checkUserscriptAvailable === 'function' && checkUserscriptAvailable()) {
          completeConnection('userscript', 'Userscript detected after wait timeout');
        } else if (this.options.fallbackToDom) {
          completeConnection('dom-direct', 'Userscript not detected. Falling back to Mode: dom-direct');
        } else {
          resolved = true;
          cleanup();
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

  /**
   * Notifies the connection manager that a local adapter has been registered,
   * immediately completing the handshake without waiting for userscript timeout.
   * @param {string} [reason='Local adapter registered']
   */
  notifyAdapterAvailable(reason = 'Local adapter registered') {
    if (this.fsm.transportState === TransportState.CONNECTED) {
      return;
    }
    if (typeof this._completeConnection === 'function') {
      this._completeConnection('dom-direct', reason);
    } else {
      this.fsm.transitionTransport(TransportState.CONNECTED, { mode: 'dom-direct', reason });
    }
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
    this._completeConnection = null;
    this.fsm.transitionTransport(TransportState.DISCONNECTED);
  }

  terminate() {
    this._readyPromise = null;
    this._completeConnection = null;
    this.fsm.transitionTransport(TransportState.TERMINATED);
  }
}

export function createConnectionManager(options) {
  return new ConnectionManager(options);
}

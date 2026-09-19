import { dom, state, capabilities, actions, events, instance, pipeline } from '@sremote/shared';

export class DomDriver {
  constructor(options = {}) {
    this.options = { passkey: null, ...options };
    this.logger = options.logger || null;
    this.transactionTracker = options.transactionTracker || pipeline.getTracker();

    this.instanceManager =
      options.instanceManager ||
      instance.createManager({ ns: 'sremote:', logger: this.logger, getIframeCount: () => (typeof document !== 'undefined' ? document.querySelectorAll('iframe').length : 0) });

    if (this.instanceManager?.on) {
      this.instanceManager.on('*', payload => {
        const event = payload?.event;
        if (event) {
          this.emit(event, payload);
        }
      });
    }

    this.trackedMediaElements = new WeakSet();
    this.treatAlmostEndAsEnd = Boolean(options.treatAlmostEndAsEnd);
    this._listeners = new Map();

    // Auto-discover existing media in document
    if (typeof document !== 'undefined') {
      this.initDomAutoTracking();
    }
  }

  getPasskey(key) {
    return key || this.options.passkey || null;
  }

  get multiMode() {
    return this.instanceManager.isMultiModeActive();
  }

  get exclusiveMode() {
    return this.instanceManager.exclusiveMode;
  }

  get lastActiveInstanceId() {
    return this.instanceManager.currentActiveInstanceId;
  }

  set lastActiveInstanceId(id) {
    this.instanceManager.setCurrentActiveInstanceId(id);
  }

  initDomAutoTracking() {
    this._mediaWatcher = dom.watch(
      mediaEl => {
        this.trackMediaElement(mediaEl);
      },
      { doc: typeof document !== 'undefined' ? document : null },
    );
  }

  trackMediaElement(mediaEl) {
    if (!mediaEl || this.trackedMediaElements.has(mediaEl)) return;

    try {
      if (mediaEl[Symbol.for('__sremote_adapter__')]) {
        return;
      }
    } catch {}

    this.trackedMediaElements.add(mediaEl);
    const instId = mediaEl.id || mediaEl.getAttribute('data-sremote-id') || 'dom-media';
    if (this.logger?.debug) {
      this.logger.debug(`DOM auto-tracking attached to media element:`, mediaEl, `(id: ${instId})`);
    }

    events.bind(
      mediaEl,
      (evtName, payload) => {
        this.emit(evtName, payload);
      },
      { instanceId: instId, source: 'dom', treatAlmostEndAsEnd: this.treatAlmostEndAsEnd, transactionTracker: this.transactionTracker },
    );
  }

  setMultiMode(mode) {
    this.instanceManager.setMultiModeConfig(mode);
  }

  isMultiMode() {
    return this.instanceManager.isMultiModeActive();
  }

  setExclusive(mode) {
    this.instanceManager.setExclusiveMode(mode);
  }

  list() {
    const list = [];
    if (typeof document !== 'undefined') {
      const mediaElements = dom.findAll();
      for (const el of mediaElements) {
        const id = el.id || el.getAttribute('data-sremote-id') || 'dom-media';
        const mediaState = state.get(el);
        list.push({
          instanceId: id,
          mediaType: el.tagName ? el.tagName.toLowerCase() : 'video',
          capabilities: capabilities.get(el),
          status: 'ready',
          state: mediaState,
          source: 'dom',
        });
      }
    }
    return list;
  }

  resolveMediaElement(target) {
    return dom.resolve(target);
  }

  resolveTarget(target) {
    const el = dom.resolve(target);
    if (el) return { type: 'element', instance: el };
    return null;
  }

  /**
   * Unified Driver Execution Contract
   * @param {string} actionName - Action name
   * @param {*} payload - Action parameter/payload
   * @param {Object} context - Execution context { targetId, passkey, source, timestamp }
   * @returns {Promise<any>}
   */
  async execute(actionName, payload, context = {}) {
    const target = context?.targetId ?? null;
    const resolved = this.resolveTarget(target);
    if (!resolved) return false;
    const instId = resolved.instance?.id || 'dom-media';
    const tagName = resolved.instance?.tagName ? resolved.instance.tagName.toLowerCase() : 'element';

    if (this.logger?.scope) {
      this.logger.scope('action').log(`(DomDriver) Executing '${actionName}' via In-Page DOM <${tagName}> [${instId}]`, { payload, instanceId: instId });
    }

    let mappedAction = actionName;
    if (actionName === 'seekTo') mappedAction = 'currenttime';
    if (actionName === 'speed' || actionName === 'playbackRate') mappedAction = 'rate';
    if (actionName === 'mute') mappedAction = 'muted';
    if (actionName === 'pip') mappedAction = payload ? 'pip' : 'exitpip';

    return actions.execute(resolved.instance, mappedAction, payload, { transactionTracker: this.transactionTracker, instanceId: instId, logger: this.logger });
  }

  async status(target) {
    const el = this.resolveMediaElement(target);
    if (!el) return null;
    return state.get(el);
  }

  async capabilities(target) {
    const el = this.resolveMediaElement(target);
    if (!el) return null;
    return capabilities.get(el);
  }

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(callback);
    }
  }

  emit(event, payload) {
    if (this._listeners.has(event)) {
      for (const cb of this._listeners.get(event)) {
        try {
          cb(payload);
        } catch {}
      }
    }
    if (this._listeners.has('*')) {
      for (const cb of this._listeners.get('*')) {
        try {
          cb({ ...payload, event });
        } catch {}
      }
    }
  }

  destroy() {
    if (this._mediaWatcher) {
      try {
        this._mediaWatcher.disconnect();
      } catch {}
      this._mediaWatcher = null;
    }
    this._listeners.clear();
  }
}

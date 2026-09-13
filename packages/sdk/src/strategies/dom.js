import {
  createInstanceManager,
  extractMediaState,
  evaluateCapabilities,
  bindMediaEvents,
  executeMediaAction,
  resolveMediaElement,
  getGlobalTransactionTracker,
} from '@sremote/shared';

export class DomDriver {
  constructor(options = {}) {
    this.options = { passkey: null, ...options };
    this.logger = options.logger || null;
    this.transactionTracker = options.transactionTracker || getGlobalTransactionTracker();

    this.instanceManager =
      options.instanceManager ||
      createInstanceManager({ ns: 'sremote:', logger: this.logger, getIframeCount: () => (typeof document !== 'undefined' ? document.querySelectorAll('iframe').length : 0) });

    if (this.instanceManager?.on) {
      this.instanceManager.on('*', payload => {
        const action = payload?.action;
        if (action) {
          this.emit(action, payload);
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
    try {
      const mediaList = document.querySelectorAll('video, audio');
      for (const el of mediaList) {
        this.trackMediaElement(el);
      }

      if (typeof MutationObserver !== 'undefined') {
        this._domObserver = new MutationObserver(mutations => {
          for (const m of mutations) {
            for (const node of m.addedNodes) {
              if (node.nodeType === 1) {
                if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
                  this.trackMediaElement(node);
                } else if (node.querySelectorAll) {
                  const nested = node.querySelectorAll('video, audio');
                  for (const n of nested) this.trackMediaElement(n);
                }
              }
            }
          }
        });
        this._domObserver.observe(document.documentElement || document.body, { childList: true, subtree: true });
      }
    } catch {}
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

    bindMediaEvents(
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
      const mediaElements = document.querySelectorAll('video, audio');
      for (const el of mediaElements) {
        const id = el.id || el.getAttribute('data-sremote-id') || 'dom-media';
        const state = extractMediaState(el);
        list.push({ instanceId: id, mediaType: el.tagName ? el.tagName.toLowerCase() : 'video', capabilities: evaluateCapabilities(el), status: 'ready', state, source: 'dom' });
      }
    }
    return list;
  }

  resolveMediaElement(target) {
    return resolveMediaElement(target);
  }

  resolveTarget(target) {
    const el = resolveMediaElement(target);
    if (el) return { type: 'element', instance: el };
    return null;
  }

  async _execAction(action, target, value) {
    const resolved = this.resolveTarget(target);
    if (!resolved) return false;
    const instId = resolved.instance?.id || 'dom-media';
    const tagName = resolved.instance?.tagName ? resolved.instance.tagName.toLowerCase() : 'element';

    if (this.logger?.scope) {
      this.logger.scope('action').log(`(DomDriver) Executing '${action}' via In-Page DOM <${tagName}> [${instId}]`, { value, instanceId: instId });
    }

    return executeMediaAction(resolved.instance, action, value, { transactionTracker: this.transactionTracker, instanceId: instId, logger: this.logger });
  }

  async play(target) {
    return this._execAction('play', target);
  }
  async pause(target) {
    return this._execAction('pause', target);
  }
  async toggle(target) {
    return this._execAction('toggle', target);
  }
  async stop(target) {
    return this._execAction('stop', target);
  }
  async seek(offset, target) {
    return this._execAction('seek', target, offset);
  }
  async seekTo(time, target) {
    return this._execAction('currenttime', target, time);
  }
  async volume(vol, target) {
    return this._execAction('volume', target, vol);
  }
  async mute(muted, target) {
    return this._execAction('muted', target, muted);
  }
  async speed(rate, target) {
    return this._execAction('rate', target, rate);
  }
  async pip(enable, target) {
    return this._execAction(enable ? 'pip' : 'exitpip', target);
  }
  async load(source, target) {
    return this._execAction('load', target, source);
  }
  async quality(level, target) {
    return this._execAction('quality', target, level);
  }
  async subtitle(track, target) {
    return this._execAction('subtitle', target, track);
  }
  async shuffle(enable, target) {
    return this._execAction('shuffle', target, enable);
  }
  async repeat(mode, target) {
    return this._execAction('repeat', target, mode);
  }
  async next(target) {
    return this._execAction('next', target);
  }
  async previous(target) {
    return this._execAction('previous', target);
  }

  async status(target) {
    const el = this.resolveMediaElement(target);
    if (!el) return null;
    return extractMediaState(el);
  }

  async capabilities(target) {
    const el = this.resolveMediaElement(target);
    if (!el) return null;
    return evaluateCapabilities(el);
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
          cb({ event, ...payload });
        } catch {}
      }
    }
  }

  destroy() {
    if (this._domObserver) {
      try {
        this._domObserver.disconnect();
      } catch {}
      this._domObserver = null;
    }
    this._listeners.clear();
  }
}

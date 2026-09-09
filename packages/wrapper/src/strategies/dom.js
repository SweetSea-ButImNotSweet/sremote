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

    this.instanceManager = createInstanceManager({
      ns: 'sremote:',
      logger: this.logger,
      getIframeCount: () => (typeof document !== 'undefined' ? document.querySelectorAll('iframe').length : 0),
    });

    // Forward events emitted by instanceManager (e.g. from registered adapters) to DomDriver listeners
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

  get adaptersMap() {
    return this.instanceManager.parentAdaptersMap;
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
    for (const [id, ad] of this.instanceManager.parentAdaptersMap.entries()) {
      const state = extractMediaState(ad);
      list.push({ instanceId: id, mediaType: 'adapter', capabilities: this.getCapabilities(id), status: 'ready', state });
    }
    return list;
  }

  useAdapter(rawAdapter, customInstanceId = null) {
    return this.instanceManager.handleUseAdapter(rawAdapter, customInstanceId);
  }

  pauseOthersExcept(activeInstanceId) {
    this.instanceManager.pauseOthersExcept(activeInstanceId);
  }

  removeAdapter(instanceId) {
    return this.instanceManager.handleRemoveAdapter(instanceId);
  }

  getCustomAdapter(instanceId) {
    return this.instanceManager.getCustomAdapter(instanceId);
  }

  _findConnectedAdapter(preferredId = null) {
    const map = this.instanceManager.parentAdaptersMap;
    if (map.size === 0) return null;

    const isSingle = !this.isMultiMode();

    if (preferredId && map.has(preferredId)) {
      const ad = map.get(preferredId);
      const el = ad?.mediaElement || ad?.element;
      if (!el || typeof el.isConnected === 'undefined' || el.isConnected) {
        return { type: 'adapter', instance: ad, instanceId: preferredId };
      }
    }

    const entries = Array.from(map.entries());
    if (isSingle && entries.length > 0) {
      const [latestId, latestAd] = entries[entries.length - 1];
      return { type: 'adapter', instance: latestAd, instanceId: latestId };
    }

    for (let i = entries.length - 1; i >= 0; i--) {
      const [id, ad] = entries[i];
      const el = ad?.mediaElement || ad?.element;
      if (!el || typeof el.isConnected === 'undefined' || el.isConnected) {
        return { type: 'adapter', instance: ad, instanceId: id };
      }
    }

    const latestEntry = entries[entries.length - 1];
    return { type: 'adapter', instance: latestEntry[1], instanceId: latestEntry[0] };
  }

  resolveTarget(target) {
    const map = this.instanceManager.parentAdaptersMap;

    if (typeof target === 'string' && map.has(target)) {
      return { type: 'adapter', instance: map.get(target), instanceId: target };
    }

    if (!target && map.size > 0) {
      const activeId = this.instanceManager.getLatestActiveInstanceId?.() || this.instanceManager.currentActiveInstanceId;
      return this._findConnectedAdapter(activeId);
    }

    const el = resolveMediaElement(target);
    if (el) return { type: 'element', instance: el };

    if (map.size > 0) {
      const activeId = this.instanceManager.getLatestActiveInstanceId?.() || this.instanceManager.currentActiveInstanceId;
      return this._findConnectedAdapter(activeId);
    }

    return null;
  }

  resolveMediaElement(target) {
    return resolveMediaElement(target);
  }

  async _execAction(action, target, value) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error(`[SRemote:DomDriver] Media target not found for '${action}'`);
    const instId = resolved.instanceId || resolved.instance?.id || 'dom-media';

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
    return this._execAction('seekTo', target, time);
  }

  async volume(vol, target) {
    return this._execAction('volume', target, vol);
  }

  async mute(muted, target) {
    return this._execAction('mute', target, muted);
  }

  async speed(rate, target) {
    return this._execAction('speed', target, rate);
  }

  async pip(enable, target) {
    return this._execAction('pip', target, enable);
  }

  async load(source, target) {
    return this._execAction('load', target, source);
  }

  async quality(level, target) {
    return this._execAction('quality', target, level);
  }

  async getQualities(target) {
    return this._execAction('getQualities', target);
  }

  async subtitle(track, target) {
    return this._execAction('subtitle', target, track);
  }

  async getSubtitles(target) {
    return this._execAction('getSubtitles', target);
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

  getCapabilities(target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) return null;
    return evaluateCapabilities(resolved.instance);
  }

  on(event, handler) {
    const ev = String(event || '').toLowerCase();
    if (!this._listeners.has(ev)) this._listeners.set(ev, new Set());
    this._listeners.get(ev).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const ev = String(event || '').toLowerCase();
    this._listeners.get(ev)?.delete(handler);
  }

  emit(event, payload) {
    const ev = String(event || '').toLowerCase();
    const set = this._listeners.get(ev);
    if (set) {
      for (const h of set) {
        try {
          h(payload);
        } catch {}
      }
    }
    const wildcard = this._listeners.get('*');
    if (wildcard) {
      for (const h of wildcard) {
        try {
          h(payload);
        } catch {}
      }
    }
  }

  destroy() {
    this._listeners.clear();
    if (this._domObserver) {
      try {
        this._domObserver.disconnect();
      } catch {}
    }
  }
}

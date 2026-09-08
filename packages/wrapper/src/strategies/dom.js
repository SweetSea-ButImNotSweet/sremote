import { BaseDriver } from './base.js';
import { createInstanceManager, extractMediaState, createEventPayload, evaluateCapabilities, bindMediaEvents } from '@sremote/shared';
import { resolveMediaElement, HtmlMediaController } from './dom-media.js';

export class DomDriver extends BaseDriver {
  constructor(options = {}) {
    super(options);
    this.logger = options.logger || null;
    this.instanceManager = createInstanceManager({
      ns: 'sremote:',
      logger: this.logger,
      getIframeCount: () => (typeof document !== 'undefined' ? document.querySelectorAll('iframe').length : 0),
    });

    this.trackedMediaElements = new WeakSet();
    this.treatAlmostEndAsEnd = Boolean(options.treatAlmostEndAsEnd);

    // Auto-discover existing media in document
    if (typeof document !== 'undefined') {
      this.initDomAutoTracking();
    }
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

      // Observe DOM mutations to auto-bind dynamically added media
      if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(mutations => {
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
        observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
      }
    } catch {}
  }

  trackMediaElement(mediaEl) {
    if (!mediaEl || this.trackedMediaElements.has(mediaEl)) return;

    try {
      // If the element is already managed by an adapter, let the adapter handle it via wrapCustomAdapter
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
      { instanceId: instId, source: 'dom', treatAlmostEndAsEnd: this.treatAlmostEndAsEnd },
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

  /**
   * Helper to find a connected adapter, prioritizing an active ID if connected,
   * otherwise falling back to the latest connected adapter in the registry.
   * @private
   */
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

    // In Single Mode, if an adapter was registered, prioritize the latest registered adapter
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

    // Explicit adapter instance ID match
    if (typeof target === 'string' && map.has(target)) {
      return { type: 'adapter', instance: map.get(target), instanceId: target };
    }

    // Default target: Prioritize active/latest connected adapter
    if (!target && map.size > 0) {
      const activeId = this.instanceManager.getLatestActiveInstanceId?.() || this.instanceManager.currentActiveInstanceId;
      return this._findConnectedAdapter(activeId);
    }

    // Direct DOM media match
    const el = this.resolveMediaElement(target);
    if (el) return { type: 'element', instance: el };

    // Fallback to adapter registry if selector didn't match DOM element
    if (map.size > 0) {
      const activeId = this.instanceManager.getLatestActiveInstanceId?.() || this.instanceManager.currentActiveInstanceId;
      return this._findConnectedAdapter(activeId);
    }

    return null;
  }

  resolveMediaElement(target) {
    return resolveMediaElement(target);
  }

  async play(target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') {
      const res = await resolved.instance.play?.();
      resolved.instance.emit?.('play', { programmatic: true });
      return res;
    }
    return HtmlMediaController.play(resolved.instance);
  }

  async pause(target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') {
      const res = await resolved.instance.pause?.();
      resolved.instance.emit?.('pause', { programmatic: true });
      return res;
    }
    HtmlMediaController.pause(resolved.instance);
  }

  async toggle(target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') {
      let res;
      if (typeof resolved.instance.toggle === 'function') {
        res = await resolved.instance.toggle();
      } else {
        const isPaused = typeof resolved.instance.paused === 'function' ? resolved.instance.paused() : resolved.instance.paused;
        res = isPaused ? await resolved.instance.play?.() : await resolved.instance.pause?.();
      }
      const isPausedAfter = typeof resolved.instance.paused === 'function' ? resolved.instance.paused() : resolved.instance.paused;
      if (typeof isPausedAfter === 'boolean') {
        resolved.instance.emit?.(isPausedAfter ? 'pause' : 'play', { programmatic: true });
      } else {
        resolved.instance.emit?.('toggle', { programmatic: true });
      }
      return res;
    }
    return HtmlMediaController.toggle(resolved.instance);
  }

  async stop(target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') {
      const res = await resolved.instance.stop?.();
      resolved.instance.emit?.('pause', { programmatic: true });
      resolved.instance.emit?.('stop', { programmatic: true });
      return res;
    }
    HtmlMediaController.stop(resolved.instance);
  }

  async seek(offset, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') {
      if (typeof resolved.instance.seek === 'function') return resolved.instance.seek(offset);
      const cur = resolved.instance.getCurrentTime?.() || 0;
      return resolved.instance.setCurrentTime?.(cur + offset);
    }
    HtmlMediaController.seek(resolved.instance, offset);
  }

  async seekTo(time, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') {
      if (typeof resolved.instance.seekTo === 'function') return resolved.instance.seekTo(time);
      return resolved.instance.setCurrentTime?.(time);
    }
    HtmlMediaController.seekTo(resolved.instance, time);
  }

  async volume(vol, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') return resolved.instance.setVolume?.(vol);
    HtmlMediaController.volume(resolved.instance, vol);
  }

  async mute(muted, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') return resolved.instance.setMuted?.(muted);
    HtmlMediaController.mute(resolved.instance, muted);
  }

  async speed(rate, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') return resolved.instance.setPlaybackRate?.(rate);
    HtmlMediaController.speed(resolved.instance, rate);
  }

  async pip(enable, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') return resolved.instance.requestPip?.(enable);
    return HtmlMediaController.pip(resolved.instance, enable);
  }

  async load(source, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') {
      if (typeof resolved.instance.load === 'function') {
        return resolved.instance.load(source);
      }
      console.warn('[SRemote] load() is primarily designed for custom adapters and is not implemented by default. Implement it via sremote.useAdapter().');
      return;
    }
    HtmlMediaController.load(resolved.instance, source);
  }

  async quality(level, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) return;
    if (resolved.type === 'adapter') return resolved.instance.setQuality?.(level);
  }

  async getQualities(target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) return [];
    if (resolved.type === 'adapter') return resolved.instance.getQualities?.() || [];
    return [];
  }

  async subtitle(track, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) return;
    if (resolved.type === 'adapter') return resolved.instance.setSubtitle?.(track);
    HtmlMediaController.subtitle(resolved.instance, track);
  }

  async getSubtitles(target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) return [];
    if (resolved.type === 'adapter') return resolved.instance.getSubtitles?.() || [];
    return HtmlMediaController.getSubtitles(resolved.instance);
  }

  async shuffle(enable, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) return;
    if (resolved.type === 'adapter') return resolved.instance.setShuffle?.(enable);
  }

  async repeat(mode, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) return;
    if (resolved.type === 'adapter') return resolved.instance.setRepeat?.(mode);
    HtmlMediaController.repeat(resolved.instance, mode);
  }

  async next(target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) return;
    if (resolved.type === 'adapter') return resolved.instance.next?.();
  }

  getCapabilities(target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) return null;
    return evaluateCapabilities(resolved.instance);
  }

  emit(event, payload) {
    this.instanceManager.emitGlobalEvent(event, payload);
  }

  on(event, handler) {
    if (typeof handler !== 'function') return () => {};
    const unbindManager = this.instanceManager.on(event, handler);
    const domEventName = String(event || '')
      .toLowerCase()
      .replace(/^sremote:/, '');

    // Register native DOM listener (for direct HTML5 media tags on the page)
    let domListener = null;
    if (typeof document !== 'undefined') {
      domListener = e => {
        const mediaEl = e.target;
        if (!mediaEl || (mediaEl.tagName !== 'VIDEO' && mediaEl.tagName !== 'AUDIO')) return;
        const state = extractMediaState(mediaEl);
        handler(
          createEventPayload(domEventName, {
            instanceId: mediaEl.id || mediaEl.getAttribute('data-sremote-id') || 'dom-media',
            source: 'dom',
            mediaType: mediaEl.tagName ? mediaEl.tagName.toLowerCase() : 'video',
            state,
            originalEvent: e,
          }),
        );
      };
      document.addEventListener(domEventName, domListener, true);
    }

    return () => {
      unbindManager();
      if (domListener && typeof document !== 'undefined') {
        document.removeEventListener(domEventName, domListener, true);
      }
    };
  }

  off(event, handler) {
    this.instanceManager.off(event, handler);
  }
}

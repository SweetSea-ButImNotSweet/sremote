import { BaseDriver } from './base.js';
import { createInstanceManager, extractMediaState, createEventPayload, evaluateCapabilities, bindMediaEvents } from '@sremote/shared';

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
      if (
        mediaEl.getAttribute?.('data-sremote-ignore-events') === 'true' ||
        mediaEl.hasAttribute?.('data-sremote-claimed') ||
        mediaEl[Symbol.for('__sremote_claimed__')] ||
        mediaEl[Symbol.for('__sremote_ignore_events__')] ||
        mediaEl[Symbol.for('__sremote_adapter__')]
      ) {
        return;
      }
      if (typeof mediaEl.closest === 'function') {
        const parentClaimed = mediaEl.closest('[data-sremote-claimed="true"], [data-sremote-ignore-events="true"]');
        if (parentClaimed) return;
      }
    } catch {}

    this.trackedMediaElements.add(mediaEl);

    bindMediaEvents(
      mediaEl,
      (evtName, payload) => {
        this.emit(evtName, payload);
      },
      { instanceId: mediaEl.id || mediaEl.getAttribute('data-sremote-id') || 'dom-media', source: 'dom', treatAlmostEndAsEnd: this.treatAlmostEndAsEnd },
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

  resolveTarget(target) {
    if (typeof target === 'string' && this.instanceManager.parentAdaptersMap.has(target)) {
      return { type: 'adapter', instance: this.instanceManager.parentAdaptersMap.get(target), instanceId: target };
    }
    if (!target && this.instanceManager.parentAdaptersMap.size > 0) {
      const firstEntry = this.instanceManager.parentAdaptersMap.entries().next().value;
      return { type: 'adapter', instance: firstEntry[1], instanceId: firstEntry[0] };
    }
    const el = this.resolveMediaElement(target);
    if (el) return { type: 'element', instance: el };
    if (this.instanceManager.parentAdaptersMap.size > 0) {
      const firstEntry = this.instanceManager.parentAdaptersMap.entries().next().value;
      return { type: 'adapter', instance: firstEntry[1], instanceId: firstEntry[0] };
    }
    return null;
  }

  resolveMediaElement(target) {
    if (typeof document === 'undefined') return null;

    if (!target) {
      return document.querySelector('video, audio');
    }

    if (typeof target === 'string') {
      const el = document.querySelector(target);
      if (!el) return null;
      if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') return el;
      if (el.tagName === 'IFRAME') {
        try {
          return el.contentDocument?.querySelector('video, audio') || null;
        } catch {
          return null;
        }
      }
      return el.querySelector('video, audio');
    }

    if (target.nodeType === 1) {
      if (target.tagName === 'VIDEO' || target.tagName === 'AUDIO') return target;
      if (target.tagName === 'IFRAME') {
        try {
          return target.contentDocument?.querySelector('video, audio') || null;
        } catch {
          return null;
        }
      }
      return target.querySelector('video, audio');
    }

    return null;
  }

  async play(target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') return resolved.instance.play?.();
    return resolved.instance.play();
  }

  async pause(target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') return resolved.instance.pause?.();
    resolved.instance.pause();
  }

  async toggle(target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') {
      if (typeof resolved.instance.toggle === 'function') return resolved.instance.toggle();
      const isPaused = typeof resolved.instance.paused === 'function' ? resolved.instance.paused() : resolved.instance.paused;
      return isPaused ? resolved.instance.play?.() : resolved.instance.pause?.();
    }
    const el = resolved.instance;
    if (el.paused) return el.play();
    el.pause();
  }

  async stop(target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') return resolved.instance.stop?.();
    const el = resolved.instance;
    el.pause();
    el.currentTime = 0;
  }

  async seek(offset, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') {
      if (typeof resolved.instance.seek === 'function') return resolved.instance.seek(offset);
      const cur = resolved.instance.getCurrentTime?.() || 0;
      return resolved.instance.setCurrentTime?.(cur + offset);
    }
    const el = resolved.instance;
    el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + offset));
  }

  async seekTo(time, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') {
      if (typeof resolved.instance.seekTo === 'function') return resolved.instance.seekTo(time);
      return resolved.instance.setCurrentTime?.(time);
    }
    const el = resolved.instance;
    el.currentTime = Math.max(0, Math.min(el.duration || 0, time));
  }

  async volume(vol, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') return resolved.instance.setVolume?.(vol);
    const el = resolved.instance;
    el.volume = Math.max(0, Math.min(1, vol));
    el.muted = false;
  }

  async mute(muted, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') return resolved.instance.setMuted?.(muted);
    const el = resolved.instance;
    el.muted = typeof muted === 'boolean' ? muted : !el.muted;
  }

  async speed(rate, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') return resolved.instance.setPlaybackRate?.(rate);
    resolved.instance.playbackRate = rate;
  }

  async pip(enable, target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) throw new Error('[SRemote:DomDriver] Media target not found');
    if (resolved.type === 'adapter') return resolved.instance.requestPip?.(enable);
    const el = resolved.instance;
    if (!el || el.tagName !== 'VIDEO') throw new Error('[SRemote:DomDriver] Video element not found');
    if (enable === true || (enable === undefined && document.pictureInPictureElement !== el)) {
      return el.requestPictureInPicture?.();
    }
    if (document.pictureInPictureElement === el) {
      return document.exitPictureInPicture?.();
    }
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
    const el = resolved.instance;
    if (typeof source === 'string' && source) {
      el.src = source;
      if (typeof el.load === 'function') {
        el.load();
      }
    } else {
      console.warn('[SRemote] load() is primarily designed for custom adapters and is not implemented by default. Implement it via sremote.useAdapter().');
    }
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
    const el = resolved.instance;
    if (el?.textTracks) {
      const targetLang = track === null || track === 'off' || track === false ? null : String(track).toLowerCase();
      for (let i = 0; i < el.textTracks.length; i++) {
        const t = el.textTracks[i];
        if (!targetLang) {
          t.mode = 'disabled';
        } else if (t.id === targetLang || (t.language && t.language.toLowerCase() === targetLang) || (t.label && t.label.toLowerCase() === targetLang)) {
          t.mode = 'showing';
        } else {
          t.mode = 'disabled';
        }
      }
    }
  }

  async getSubtitles(target) {
    const resolved = this.resolveTarget(target);
    if (!resolved) return [];
    if (resolved.type === 'adapter') return resolved.instance.getSubtitles?.() || [];
    const el = resolved.instance;
    if (el?.textTracks) {
      const tracks = [];
      for (let i = 0; i < el.textTracks.length; i++) {
        const t = el.textTracks[i];
        tracks.push({ id: t.id || String(i), label: t.label || t.language || `Track ${i + 1}`, language: t.language });
      }
      return tracks;
    }
    return [];
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
    const el = resolved.instance;
    if (el) {
      if (typeof mode === 'string') {
        el.loop = mode === 'one' || mode === 'all';
      } else if (typeof mode === 'boolean') {
        el.loop = mode;
      } else {
        el.loop = !el.loop;
      }
    }
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

import { BaseDriver } from './base.js';
import { extractMediaState, createEventPayload, evaluateCapabilities, bindMediaEvents, wrapCustomAdapter } from '@sremote/shared';

export class DomDriver extends BaseDriver {
  constructor(options = {}) {
    super(options);
    this.adaptersMap = new Map();
    this.eventListeners = new Map();
    this.trackedMediaElements = new WeakSet();
    this.adapterPollTimers = new Map(); // instanceId -> intervalTimer
    this.almostEndFlags = new Map(); // instanceId -> boolean
    this.multiMode = false;
    this.exclusiveMode = 'auto'; // 'auto' | true | false
    this.lastActiveInstanceId = null;
    this.treatAlmostEndAsEnd = Boolean(options.treatAlmostEndAsEnd);

    // Auto-discover existing media in document
    if (typeof document !== 'undefined') {
      this.initDomAutoTracking();
    }
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
    this.trackedMediaElements.add(mediaEl);

    bindMediaEvents(
      mediaEl,
      (evtName, payload) => {
        this.emit(evtName, payload);
      },
      { instanceId: mediaEl.id || mediaEl.getAttribute('data-sremote-id') || 'dom-media', source: 'dom', treatAlmostEndAsEnd: this.treatAlmostEndAsEnd },
    );
  }

  startAdapterStatePolling(instanceId, adapter) {
    this.stopAdapterStatePolling(instanceId);
    if (!adapter) return;

    let hasEmittedAlmostEnd = false;

    const timer = setInterval(() => {
      if (!this.adaptersMap.has(instanceId)) {
        this.stopAdapterStatePolling(instanceId);
        return;
      }

      const state = extractMediaState(adapter);
      if (!state) return;

      const dur = Number.isFinite(state.duration) ? state.duration : null;
      const curTime = state.currentTime || 0;

      // Smart almostend detection
      if (dur && dur > 3 && curTime >= dur - 0.8 && curTime <= dur) {
        if (!hasEmittedAlmostEnd) {
          hasEmittedAlmostEnd = true;
          const endEvt = this.treatAlmostEndAsEnd ? 'ended' : 'almostend';
          this.emit(endEvt, createEventPayload(endEvt, { source: 'adapter', instanceId, mediaType: 'adapter', state }));
        }
      } else if (dur && curTime < dur - 1.5) {
        hasEmittedAlmostEnd = false;
      }

      // Periodic timeupdate emit
      this.emit('timeupdate', createEventPayload('timeupdate', { source: 'adapter', instanceId, mediaType: 'adapter', state }));

      // If finished, stop polling
      if (state.ended || (dur && dur > 0 && curTime >= dur - 0.1)) {
        this.stopAdapterStatePolling(instanceId);
      }
    }, 250);

    this.adapterPollTimers.set(instanceId, timer);
  }

  stopAdapterStatePolling(instanceId) {
    if (this.adapterPollTimers.has(instanceId)) {
      clearInterval(this.adapterPollTimers.get(instanceId));
      this.adapterPollTimers.delete(instanceId);
    }
  }

  setMultiMode(mode) {
    this.multiMode = Boolean(mode);
  }

  isMultiMode() {
    return this.multiMode;
  }

  setExclusive(mode) {
    this.exclusiveMode = mode;
  }

  list() {
    const list = [];
    for (const [id, ad] of this.adaptersMap.entries()) {
      const state = extractMediaState(ad);
      list.push({ instanceId: id, mediaType: 'adapter', capabilities: this.getCapabilities(id), status: 'ready', state });
    }
    return list;
  }

  useAdapter(rawAdapter, customInstanceId = null) {
    if (!rawAdapter || typeof rawAdapter !== 'object') return null;
    const instanceId = customInstanceId || `adapter-${Math.random().toString(36).slice(2, 9)}`;

    // Wrap adapter safely using shared helper
    const wrappedAdapter = wrapCustomAdapter(rawAdapter, {
      instanceId,
      source: 'adapter',
      onEmit: (ev, fullPayload) => {
        if (ev === 'play' || ev === 'playing') {
          this.lastActiveInstanceId = instanceId;
          if (this.exclusiveMode === 'auto' || this.exclusiveMode === true) {
            this.pauseOthersExcept(instanceId);
          }
          this.startAdapterStatePolling(instanceId, wrappedAdapter);
        } else if (ev === 'pause' || ev === 'ended' || ev === 'stop') {
          this.stopAdapterStatePolling(instanceId);
        }

        this.emit(ev, fullPayload);
      },
    });

    this.adaptersMap.set(instanceId, wrappedAdapter);
    this.lastActiveInstanceId = instanceId;
    return instanceId;
  }

  pauseOthersExcept(activeInstanceId) {
    for (const [id, ad] of this.adaptersMap.entries()) {
      if (id !== activeInstanceId) {
        try {
          ad.pause?.();
        } catch {}
        this.stopAdapterStatePolling(id);
      }
    }
  }

  removeAdapter(instanceId) {
    if (!instanceId) return false;
    this.stopAdapterStatePolling(instanceId);
    return this.adaptersMap.delete(instanceId);
  }

  getCustomAdapter(instanceId) {
    if (instanceId) return this.adaptersMap.get(instanceId) || null;
    return this.adaptersMap.values().next().value || null;
  }

  resolveTarget(target) {
    if (typeof target === 'string' && this.adaptersMap.has(target)) {
      return { type: 'adapter', instance: this.adaptersMap.get(target), instanceId: target };
    }
    if (!target && this.adaptersMap.size > 0) {
      const firstEntry = this.adaptersMap.entries().next().value;
      return { type: 'adapter', instance: firstEntry[1], instanceId: firstEntry[0] };
    }
    const el = this.resolveMediaElement(target);
    if (el) return { type: 'element', instance: el };
    if (this.adaptersMap.size > 0) {
      const firstEntry = this.adaptersMap.entries().next().value;
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
    const fullEvent = event.startsWith('sremote:') ? event : `sremote:${event}`;
    const rawEvent = event.replace(/^sremote:/, '');

    const dispatchTo = evName => {
      const handlersMap = this.eventListeners.get(evName);
      if (handlersMap) {
        for (const [handler] of handlersMap) {
          try {
            handler(payload);
          } catch {}
        }
      }
    };

    dispatchTo(fullEvent);
    dispatchTo(rawEvent);
    dispatchTo('*');
  }

  on(event, handler) {
    if (typeof handler !== 'function') return () => {};
    const fullEvent = event.startsWith('sremote:') ? event : `sremote:${event}`;
    const domEventName = event.replace(/^sremote:/, '');

    // 1. Register onto DomDriver internal event bus (for adapter emits)
    const registerBusListener = evKey => {
      if (!this.eventListeners.has(evKey)) {
        this.eventListeners.set(evKey, new Map());
      }
      this.eventListeners.get(evKey).set(handler, true);
    };

    registerBusListener(fullEvent);
    registerBusListener(domEventName);

    // 2. Register native DOM listener (for direct HTML5 media tags on the page)
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

    return () => this.off(event, handler);
  }

  off(event, handler) {
    const fullEvent = event.startsWith('sremote:') ? event : `sremote:${event}`;
    const domEventName = event.replace(/^sremote:/, '');

    const unregisterBus = evKey => {
      const handlersMap = this.eventListeners.get(evKey);
      if (handlersMap) {
        if (handler) handlersMap.delete(handler);
        else this.eventListeners.delete(evKey);
      }
    };

    unregisterBus(fullEvent);
    unregisterBus(domEventName);
  }
}

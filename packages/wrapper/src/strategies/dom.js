import { BaseDriver } from './base.js';
import { extractMediaState, createEventPayload, evaluateCapabilities } from '@sremote/shared';

export class DomDriver extends BaseDriver {
  constructor(options = {}) {
    super(options);
    this.adaptersMap = new Map();
    this.eventListeners = new Map();
    this.multiMode = false;
    this.exclusiveMode = 'auto'; // 'auto' | true | false
    this.lastActiveInstanceId = null;
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
      list.push({
        instanceId: id,
        mediaType: 'adapter',
        capabilities: this.getCapabilities(id),
        status: 'ready',
        state,
      });
    }
    return list;
  }

  useAdapter(adapter, customInstanceId = null) {
    if (!adapter || typeof adapter !== 'object') return null;
    const instanceId = customInstanceId || `adapter-${Math.random().toString(36).slice(2, 9)}`;
    
    // Wire adapter emit to DomDriver emit so sremote.on() receives it
    const handleEmit = (event, payload = {}) => {
      const ev = String(event || '').toLowerCase();
      const fullPayload = createEventPayload(ev, {
        source: 'adapter',
        instanceId,
        mediaType: 'adapter',
        ...(typeof payload === 'object' && payload !== null ? payload : { value: payload }),
      });
      
      if (ev === 'play' || ev === 'playing') {
        this.lastActiveInstanceId = instanceId;
        if (this.exclusiveMode === 'auto' || this.exclusiveMode === true) {
          this.pauseOthersExcept(instanceId);
        }
      }
      this.emit(ev, fullPayload);
    };

    if (!adapter.emit) {
      adapter.emit = handleEmit;
    } else {
      const origEmit = adapter.emit;
      adapter.emit = (event, payload = {}) => {
        try {
          origEmit(event, payload);
        } catch {}
        handleEmit(event, payload);
      };
    }

    this.adaptersMap.set(instanceId, adapter);
    this.lastActiveInstanceId = instanceId;
    return instanceId;
  }

  pauseOthersExcept(activeInstanceId) {
    for (const [id, ad] of this.adaptersMap.entries()) {
      if (id !== activeInstanceId) {
        try {
          ad.pause?.();
        } catch {}
      }
    }
  }

  removeAdapter(instanceId) {
    if (!instanceId) return false;
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
    if (typeof document === 'undefined' || typeof handler !== 'function') return () => {};
    const domEventName = event.replace(/^sremote:/, '');
    const listener = e => {
      const mediaEl = e.target;
      if (!mediaEl) return;
      const state = extractMediaState(mediaEl);
      handler(createEventPayload(domEventName, {
        instanceId: 'dom-media',
        source: 'dom',
        mediaType: mediaEl.tagName ? mediaEl.tagName.toLowerCase() : 'video',
        state,
      }));
    };

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Map());
    }
    this.eventListeners.get(event).set(handler, { domEventName, listener });

    document.addEventListener(domEventName, listener, true);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (typeof document === 'undefined') return;
    const handlersMap = this.eventListeners.get(event);
    if (!handlersMap) return;

    if (handler) {
      const entry = handlersMap.get(handler);
      if (entry) {
        document.removeEventListener(entry.domEventName, entry.listener, true);
        handlersMap.delete(handler);
      }
    } else {
      // Remove all listeners for this event
      for (const [, entry] of handlersMap) {
        document.removeEventListener(entry.domEventName, entry.listener, true);
      }
      this.eventListeners.delete(event);
    }
  }
}


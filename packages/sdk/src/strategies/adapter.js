import { state, capabilities, actions, instance, pipeline } from '@sremote/shared';

export class AdapterDriver {
  constructor(options = {}) {
    this.options = { passkey: null, ...options };
    this.logger = options.logger || null;
    this.instanceManager = options.instanceManager || null;
    this.transactionTracker = options.transactionTracker || pipeline.getTracker();
    this.adaptersMap = new Map();
  }

  isAvailable() {
    return this.adaptersMap.size > 0;
  }

  has(instanceId) {
    if (!instanceId) return false;
    return this.adaptersMap.has(instanceId);
  }

  get(instanceId) {
    if (instanceId) return this.adaptersMap.get(instanceId) || null;
    if (this.adaptersMap.size === 1) return Array.from(this.adaptersMap.values())[0] || null;
    return Array.from(this.adaptersMap.values())[this.adaptersMap.size - 1] || null;
  }

  list() {
    const result = [];
    for (const [id, ad] of this.adaptersMap.entries()) {
      const mediaState = state.get(ad);
      result.push({
        instanceId: id,
        mediaType: 'adapter',
        name: ad?.name || id,
        adapter: ad,
        source: 'adapter',
        capabilities: this.getCapabilities(id),
        status: 'ready',
        state: mediaState,
      });
    }
    return result;
  }

  register(rawAdapter, customInstanceId = null) {
    if (!rawAdapter || typeof rawAdapter !== 'object') return null;
    const targetId = customInstanceId || instance.generateId('adapter');

    const wrapped = actions.wrapAdapter(rawAdapter, { instanceId: targetId, transactionTracker: this.transactionTracker, logger: this.logger });

    this.adaptersMap.set(targetId, wrapped);

    if (this.instanceManager?.registerInstance) {
      try {
        this.instanceManager.registerInstance(targetId, wrapped, { isAdapter: true, capabilities: capabilities.get(wrapped) });
      } catch {}
    }

    if (this.logger?.scope) {
      this.logger.scope('adapter').log(`Registered Adapter [${wrapped.name || targetId}]`, { instanceId: targetId });
    }

    return targetId;
  }

  unregister(instanceId) {
    if (instanceId) {
      const deleted = this.adaptersMap.delete(instanceId);
      if (this.instanceManager?.unregisterInstance) {
        try {
          this.instanceManager.unregisterInstance(instanceId);
        } catch {}
      }
      return deleted;
    }
    this.adaptersMap.clear();
    return true;
  }

  getCapabilities(instanceId) {
    const ad = this.get(instanceId);
    if (!ad) return null;
    return capabilities.get(ad);
  }

  getState(instanceId) {
    const ad = this.get(instanceId);
    if (!ad) return null;
    return state.get(ad);
  }

  _findConnectedAdapter(preferredId = null) {
    const map = this.adaptersMap;
    if (map.size === 0) return null;

    // Prune detached DOM nodes
    for (const [id, ad] of Array.from(map.entries())) {
      const el = ad?.mediaElement || ad?.element;
      if (typeof el?.isConnected !== 'undefined' && !el.isConnected) {
        map.delete(id);
      }
    }

    if (map.size === 0) return null;

    const isSingle = this.instanceManager ? !this.instanceManager.isMultiModeActive() : true;

    if (preferredId && map.has(preferredId)) {
      const ad = map.get(preferredId);
      const el = ad?.mediaElement || ad?.element;
      if (typeof el?.isConnected === 'undefined' || el.isConnected) {
        return { instance: ad, instanceId: preferredId };
      }
    }

    const entries = Array.from(map.entries());
    if (isSingle && entries.length > 0) {
      const [latestId, latestAd] = entries[entries.length - 1];
      const el = latestAd?.mediaElement || latestAd?.element;
      if (typeof el?.isConnected === 'undefined' || el.isConnected) {
        return { instance: latestAd, instanceId: latestId };
      }
    }

    for (let i = entries.length - 1; i >= 0; i--) {
      const [id, ad] = entries[i];
      const el = ad?.mediaElement || ad?.element;
      if (typeof el?.isConnected === 'undefined' || el.isConnected) {
        return { instance: ad, instanceId: id };
      }
    }

    const latestEntry = entries[entries.length - 1];
    return { instance: latestEntry[1], instanceId: latestEntry[0] };
  }

  resolveTarget(target) {
    if (typeof target === 'string' && this.adaptersMap.has(target)) {
      return { instance: this.adaptersMap.get(target), instanceId: target };
    }
    if (!target && this.adaptersMap.size > 0) {
      const activeId = this.instanceManager?.getLatestActiveInstanceId?.() || this.instanceManager?.currentActiveInstanceId;
      return this._findConnectedAdapter(activeId);
    }
    return null;
  }

  async _execAction(action, target, value) {
    const resolved = this.resolveTarget(target);
    if (!resolved) return false;
    const instId = resolved.instanceId || 'adapter';
    const adapterName = resolved.instance?.name || instId;

    if (this.logger?.scope) {
      this.logger.scope('action').log(`(AdapterDriver) Executing '${action}' via Adapter [${adapterName}]`, { value, instanceId: instId });
    }

    return actions.execute(resolved.instance, action, value, { transactionTracker: this.transactionTracker, instanceId: instId, logger: this.logger });
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
    return this._execAction('seekto', target, time);
  }
  async volume(vol, target) {
    return this._execAction('volume', target, vol);
  }
  async mute(muted, target) {
    return this._execAction('muted', target, muted);
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
}

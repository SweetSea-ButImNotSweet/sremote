import { resolveElement } from './dom-utils.js';
import { createRemoteProxy } from './remote-proxy.js';
import { createMediaSwapper } from './media-swapper.js';

let providerCounter = 0;

/**
 * Resolves SRemote client instance from options or global environment without polling or dynamic imports.
 * @param {Object} [opts]
 * @returns {any}
 */
function resolveSRemote(opts = {}) {
  if (opts.sremote && typeof opts.sremote === 'object' && opts.sremote.adapters) {
    return opts.sremote;
  }
  if (typeof globalThis !== 'undefined') {
    const symbolClient = globalThis[Symbol.for('__sremote_client__')];
    if (symbolClient) return symbolClient;
    if (globalThis.sremote?.adapters) return globalThis.sremote;
  }
  if (typeof window !== 'undefined' && window.sremote?.adapters) {
    return window.sremote;
  }
  return null;
}

/**
 * Creates an event bus and attaches event methods (on, off, emit) to the adapter if missing.
 * @param {Object|null} adapter
 * @returns {{ emit: (event: string, payload?: any) => void }}
 */
function attachEventBus(adapter) {
  const listeners = new Map();

  const emit = (event, payload = {}) => {
    const ev = String(event || '').toLowerCase();
    const handlers = listeners.get(ev);
    if (handlers) {
      for (const fn of handlers) {
        try {
          fn(payload);
        } catch {}
      }
    }
    const wildcard = listeners.get('*');
    if (wildcard) {
      for (const fn of wildcard) {
        try {
          fn({ ...payload, event: ev });
        } catch {}
      }
    }
  };

  if (adapter) {
    if (typeof adapter.emit !== 'function') {
      adapter.emit = emit;
    }
    if (typeof adapter.on !== 'function') {
      adapter.on = (ev, fn) => {
        const key = String(ev || '').toLowerCase();
        let set = listeners.get(key);
        if (!set) {
          set = new Set();
          listeners.set(key, set);
        }
        set.add(fn);
        return () => listeners.get(key)?.delete(fn);
      };
    }
    if (typeof adapter.off !== 'function') {
      adapter.off = (ev, fn) => {
        const key = String(ev || '').toLowerCase();
        if (fn) {
          listeners.get(key)?.delete(fn);
        } else {
          listeners.delete(key);
        }
      };
    }
  }

  return { emit };
}

/**
 * Attaches SRemote DOM metadata attributes and adapter reference to the element.
 * @param {HTMLElement|null} element
 * @param {string} instanceId
 * @param {string} providerName
 * @param {Object|null} adapter
 * @param {boolean} [bare=false]
 */
function annotateElement(element, instanceId, providerName, adapter, bare = false) {
  if (!element) return;
  element.setAttribute('data-sremote-id', instanceId);
  element.setAttribute('data-sremote-provider', providerName);
  if (adapter) {
    try {
      element[Symbol.for('__sremote_adapter__')] = adapter;
    } catch {}
  }
  if (bare) {
    try {
      element.style.width = '';
      element.style.height = '';
    } catch {}
  }
}

/**
 * Base abstract class for ready-to-use SRemote player providers.
 */
export class BaseProvider {
  /**
   * @param {string} name - Unique identifier for the provider (e.g. 'youtube', 'vimeo')
   */
  constructor(name) {
    this.name = name || 'generic-provider';
  }

  /**
   * Optional hook to load third-party player SDK script.
   * Subclasses can override this.
   * @returns {Promise<any>}
   */
  async loadSdk() {
    return Promise.resolve();
  }

  /**
   * Generates a unique SRemote instance ID.
   * @param {string} [customId]
   * @returns {string}
   */
  generateInstanceId(customId) {
    if (customId && typeof customId === 'string') return customId.trim();
    return `${this.name}-player-${++providerCounter}-${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Abstract method: Initializes the underlying native player.
   * Must be implemented by subclasses.
   *
   * @abstract
   * @param {Object} options Configuration options
   * @param {string} instanceId Generated instance ID
   * @returns {Promise<{ player: any, element: HTMLElement, iframe?: HTMLIFrameElement, destroy?: () => void }>}
   */
  async initPlayer(_options, _instanceId) {
    throw new Error(`[${this.constructor.name}] initPlayer() must be implemented by subclass`);
  }

  /**
   * Abstract method: Builds the SRemote custom adapter for the native player.
   * Must be implemented by subclasses.
   *
   * @abstract
   * @param {any} player Native player instance
   * @param {Object} context Context object containing element, instanceId, options, etc.
   * @returns {Object} SRemoteCustomAdapter
   */
  createAdapter(_player, _context) {
    throw new Error(`[${this.constructor.name}] createAdapter() must be implemented by subclass`);
  }

  /**
   * Evaluates or retrieves the capabilities of the adapter created by this provider.
   * @param {Object} [adapter]
   * @returns {import('@sremote/shared').SRemoteCapabilities}
   */
  getCapabilities(adapter = null) {
    if (adapter?.capabilities && typeof adapter.capabilities === 'object') {
      return { ...adapter.capabilities };
    }
    const hasFn = fnName => typeof adapter?.[fnName] === 'function';
    return {
      play: hasFn('play'),
      pause: hasFn('pause'),
      toggle: hasFn('toggle') || (hasFn('play') && hasFn('pause')),
      stop: hasFn('stop') || hasFn('pause'),
      seek: hasFn('seek') || hasFn('seekTo') || hasFn('setCurrentTime'),
      volume: hasFn('setVolume'),
      muted: hasFn('setMuted'),
      speed: hasFn('setPlaybackRate'),
      playbackRate: hasFn('setPlaybackRate'),
      pip: hasFn('requestPip') || hasFn('pip'),
      quality: hasFn('setQuality'),
      subtitles: hasFn('setSubtitle') || hasFn('getSubtitles'),
      shuffle: hasFn('setShuffle'),
      repeat: hasFn('repeat'),
      next: hasFn('next'),
      previous: hasFn('previous'),
      load: hasFn('load'),
      hasAdapter: true,
      hasNative: false,
      hasMediaSession: false,
    };
  }

  /**
   * Internal helper to normalize options parameter.
   * @protected
   */
  _normalizeOptions(options) {
    return typeof options === 'string' ? { videoId: options } : { ...options };
  }

  /**
   * Core initialization pipeline shared by create() and mount().
   * @private
   */
  async _instantiate(options, container = null) {
    const opts = this._normalizeOptions(options);
    const instanceId = this.generateInstanceId(opts.instanceId);

    // Resolve SRemote Client early to allow lifecycle dispatch
    let sremoteClient = null;
    if (opts.register !== false && opts.autoRegister !== false) {
      sremoteClient = resolveSRemote(opts);
    }

    const emitLifecycle = (eventName, payload = {}) => {
      try {
        if (sremoteClient && typeof sremoteClient.emit === 'function') {
          sremoteClient.emit(eventName, payload);
        }
      } catch {}
    };

    emitLifecycle('provider:loading', { provider: this.name, instanceId, options: opts });

    let player = null;
    let element = null;
    let iframe = null;
    let customDestroy = null;

    try {
      // 1. Ensure provider SDK is ready
      await this.loadSdk();

      // 2. Initialize native player
      const initOptions = container ? { ...opts, container } : opts;
      const res = await this.initPlayer(initOptions, instanceId);
      player = res.player;
      element = res.element;
      iframe = res.iframe;
      customDestroy = res.destroy;
    } catch (err) {
      emitLifecycle('provider:error', { provider: this.name, instanceId, error: err, diagnostics: { message: err?.message, name: err?.name } });
      throw err;
    }

    const targetElement = iframe || element;
    const resolvedIframe = iframe || (targetElement?.tagName === 'IFRAME' ? targetElement : null);

    // 3. Mount into target container if provided
    if (container && targetElement && targetElement.parentNode !== container) {
      container.appendChild(targetElement);
    }

    // 4. Create custom adapter with built-in event dispatcher
    // First setup the dispatcher so we can pass emit to createAdapter context
    let boundEmit;
    const adapter = this.createAdapter(player, { options: opts, instanceId, element: targetElement, iframe: resolvedIframe, emit: (event, payload) => boundEmit(event, payload) });

    const eventBus = attachEventBus(adapter);
    boundEmit = eventBus.emit;

    if (adapter && !adapter.capabilities) {
      adapter.capabilities = this.getCapabilities(adapter);
    }

    const capabilities = adapter?.capabilities || this.getCapabilities(null);

    // 5. Annotate DOM element with SRemote metadata
    annotateElement(targetElement, instanceId, this.name, adapter, opts.bare);

    // 6. Automatically register into SRemote Client if available
    if (sremoteClient && adapter && typeof sremoteClient?.adapters?.register === 'function') {
      sremoteClient.adapters.register(adapter, instanceId);
    }

    // Context for in-place media swapping
    const mountContext = { container, currentProvider: this, currentResult: null, instanceId, sremoteClient, commonOptions: opts };
    const swapper = createMediaSwapper(mountContext);

    // 7. Create unified remote control
    const remote = createRemoteProxy(adapter, sremoteClient, instanceId, swapper);

    // 8. Lifecycle cleanup / destroy function
    let isDestroyed = false;
    const destroy = () => {
      if (isDestroyed) return;
      isDestroyed = true;

      // Eager unregister from SRemote client & bridge
      try {
        if (typeof sremoteClient?.instances?.remove === 'function') {
          sremoteClient.instances.remove(instanceId);
        } else if (typeof sremoteClient?.adapters?.unregister === 'function') {
          sremoteClient.adapters.unregister(instanceId);
        }
      } catch {}

      // Call adapter destroy hook if available
      try {
        if (typeof adapter?.destroy === 'function') {
          adapter.destroy();
        }
      } catch {}

      // Call player destroy hook
      try {
        if (typeof customDestroy === 'function') {
          customDestroy();
        } else if (typeof player?.destroy === 'function') {
          player.destroy();
        }
      } catch {}

      // Remove element from DOM
      try {
        targetElement?.parentNode?.removeChild(targetElement);
      } catch {}
    };

    const result = { element: targetElement, iframe: resolvedIframe, adapter, remote, player, instanceId, capabilities, destroy, swap: swapper };

    mountContext.currentResult = result;
    emitLifecycle('provider:ready', { provider: this.name, instanceId, capabilities, element: targetElement });

    return result;
  }

  /**
   * Creates the player, iframe/element, remote control, and custom adapter without attaching to DOM.
   *
   * @param {Object|string} [options={}]
   * @returns {Promise<{ element: HTMLElement, iframe?: HTMLIFrameElement, adapter: Object, remote: Object, player: any, instanceId: string, capabilities: import('@sremote/shared').SRemoteCapabilities, destroy: () => void }>}
   */
  async create(options = {}) {
    return this._instantiate(options, null);
  }

  /**
   * Mounts the player directly into a DOM container and returns remote controls.
   *
   * @param {string|HTMLElement} container - Target DOM element or CSS selector
   * @param {Object|string} [options={}] - Provider configuration options
   * @returns {Promise<{ element: HTMLElement, iframe?: HTMLIFrameElement, adapter: Object, remote: Object, player: any, instanceId: string, capabilities: import('@sremote/shared').SRemoteCapabilities, destroy: () => void }>}
   */
  async mount(container, options = {}) {
    const targetContainer = resolveElement(container);
    if (!targetContainer) {
      throw new Error(`[SRemote:${this.name}] Target container '${container}' not found in DOM`);
    }
    return this._instantiate(options, targetContainer);
  }
}

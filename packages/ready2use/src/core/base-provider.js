import { resolveElement } from './dom-utils.js';
import { createRemoteProxy } from './remote-proxy.js';

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
  if (typeof globalThis !== 'undefined' && globalThis[Symbol.for('__sremote_client__')]) {
    return globalThis[Symbol.for('__sremote_client__')];
  }
  if (typeof window !== 'undefined' && window.sremote && !window.sremote.isDummy && window.sremote.adapters) {
    return window.sremote;
  }
  if (typeof globalThis !== 'undefined' && globalThis.sremote && !globalThis.sremote.isDummy && globalThis.sremote.adapters) {
    return globalThis.sremote;
  }
  return null;
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
  async initPlayer(options, instanceId) {
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
  createAdapter(player, context) {
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
    const hasFn = fnName => Boolean(adapter && typeof adapter[fnName] === 'function');
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
      repeat: hasFn('setRepeat'),
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

    // 1. Ensure provider SDK is ready
    await this.loadSdk();

    // 2. Initialize native player
    const initOptions = container ? { ...opts, container } : opts;
    const { player, element, iframe, destroy: customDestroy } = await this.initPlayer(initOptions, instanceId);

    const targetElement = iframe || element;

    // 3. Mount into target container if provided
    if (container && targetElement && targetElement.parentNode !== container) {
      container.appendChild(targetElement);
    }

    // 4. Create custom adapter
    const adapter = this.createAdapter(player, {
      options: opts,
      instanceId,
      element: targetElement,
      iframe: iframe || (targetElement?.tagName === 'IFRAME' ? targetElement : null),
    });

    if (adapter && !adapter.capabilities) {
      adapter.capabilities = this.getCapabilities(adapter);
    }

    const capabilities = adapter?.capabilities || this.getCapabilities(null);

    // 5. Annotate DOM element with SRemote metadata
    if (targetElement) {
      targetElement.setAttribute('data-sremote-id', instanceId);
      targetElement.setAttribute('data-sremote-provider', this.name);
      if (adapter) {
        try {
          targetElement[Symbol.for('__sremote_adapter__')] = adapter;
        } catch {}
      }
    }

    // 6. Automatically register into SRemote Client if available
    let sremoteClient = null;
    if (adapter && opts.register !== false && opts.autoRegister !== false) {
      sremoteClient = resolveSRemote(opts);
      if (sremoteClient?.adapters && typeof sremoteClient.adapters.register === 'function') {
        sremoteClient.adapters.register(adapter, instanceId);
      }
    }

    // 7. Create unified remote control
    const remote = createRemoteProxy(adapter, sremoteClient, instanceId);

    // 8. Lifecycle cleanup / destroy function
    let isDestroyed = false;
    const destroy = () => {
      if (isDestroyed) return;
      isDestroyed = true;

      // Unregister from SRemote client
      try {
        if (sremoteClient?.adapters && typeof sremoteClient.adapters.unregister === 'function') {
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
        } else if (player && typeof player.destroy === 'function') {
          player.destroy();
        }
      } catch {}

      // Remove element from DOM
      try {
        if (targetElement?.parentNode) {
          targetElement.parentNode.removeChild(targetElement);
        }
      } catch {}
    };

    return { element: targetElement, iframe: iframe || (targetElement?.tagName === 'IFRAME' ? targetElement : null), adapter, remote, player, instanceId, capabilities, destroy };
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

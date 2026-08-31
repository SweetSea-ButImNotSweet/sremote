import { resolveElement } from './dom-utils.js';

let providerCounter = 0;

let cachedSRemote = null;

/**
 * Resolves SRemote client instance from options, globals, or optional dynamic import.
 * @param {Object} [opts]
 * @returns {Promise<any>}
 */
async function resolveSRemote(opts = {}) {
  if (opts.sremote && typeof opts.sremote === 'object' && opts.sremote.adapters) {
    return opts.sremote;
  }
  if (typeof window !== 'undefined' && window.sremote && window.sremote.adapters) {
    return window.sremote;
  }
  if (typeof globalThis !== 'undefined' && globalThis.sremote && globalThis.sremote.adapters) {
    return globalThis.sremote;
  }
  if (cachedSRemote) {
    return cachedSRemote;
  }
  try {
    const wrapper = await import('@sremote/wrapper');
    cachedSRemote = wrapper?.sremote || wrapper?.default?.sremote || wrapper?.default || null;
    return cachedSRemote;
  } catch {
    return null;
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
   * Optional hook to load third-party player SDK script
   * @returns {Promise<any>}
   */
  async loadSdk() {
    return Promise.resolve();
  }

  /**
   * Generates a unique SRemote instance ID
   * @protected
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
  /* eslint-disable no-unused-vars */
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
  /* eslint-enable no-unused-vars */

  /**
   * Evaluates or retrieves the capabilities of the adapter created by this provider.
   * @param {Object} [adapter]
   * @returns {import('@sremote/shared').SRemoteCapabilities}
   */
  getCapabilities(adapter = null) {
    if (adapter && adapter.capabilities && typeof adapter.capabilities === 'object') {
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
   * Creates the player, element/iframe, and standard custom adapter without mounting to DOM.
   *
   * @param {Object|string} options
   * @returns {Promise<{ element: HTMLElement, iframe?: HTMLIFrameElement, adapter: Object, player: any, instanceId: string, capabilities: import('@sremote/shared').SRemoteCapabilities, destroy: () => void }>}
   */
  async create(options = {}) {
    const opts = typeof options === 'string' ? { videoId: options } : { ...options };
    const instanceId = this.generateInstanceId(opts.instanceId);

    // 1. Ensure provider SDK is ready
    await this.loadSdk();

    // 2. Initialize native player
    const { player, element, iframe, destroy: customDestroy } = await this.initPlayer(opts, instanceId);

    const targetElement = iframe || element;

    // 3. Build SRemote Custom Adapter
    const adapter = this.createAdapter(player, {
      options: opts,
      instanceId,
      element: targetElement,
      iframe: iframe || (targetElement?.tagName === 'IFRAME' ? targetElement : null),
    });

    const capabilities = this.getCapabilities(adapter);
    if (adapter && !adapter.capabilities) {
      adapter.capabilities = capabilities;
    }

    // 4. Combined destroy handler
    const destroy = () => {
      try {
        if (typeof customDestroy === 'function') {
          customDestroy();
        } else if (player && typeof player.destroy === 'function') {
          player.destroy();
        }
      } catch {}

      try {
        if (targetElement && targetElement.parentNode) {
          targetElement.parentNode.removeChild(targetElement);
        }
      } catch {}
    };

    return { element: targetElement, iframe: iframe || (targetElement?.tagName === 'IFRAME' ? targetElement : null), adapter, player, instanceId, capabilities, destroy };
  }

  /**
   * Mounts the player directly into a DOM container and registers the adapter into SRemote.
   *
   * @param {string|HTMLElement} container - Target DOM element or CSS selector
   * @param {Object|string} options - Provider configuration options
   * @returns {Promise<{ element: HTMLElement, iframe?: HTMLIFrameElement, adapter: Object, player: any, instanceId: string, capabilities: import('@sremote/shared').SRemoteCapabilities, destroy: () => void }>}
   */
  async mount(container, options = {}) {
    const targetContainer = resolveElement(container);
    if (!targetContainer) {
      throw new Error(`[SRemote:${this.name}] Target container '${container}' not found in DOM`);
    }

    const result = await this.create(options);
    targetContainer.appendChild(result.element);

    const opts = typeof options === 'string' ? {} : options;
    const remote = await resolveSRemote(opts);

    if (remote?.adapters) {
      remote.adapters.register(result.adapter, result.instanceId);
    }

    return {
      ...result,
      destroy: () => {
        try {
          if (remote?.adapters) {
            remote.adapters.unregister(result.instanceId);
          }
        } catch {}
        result.destroy();
      },
    };
  }
}


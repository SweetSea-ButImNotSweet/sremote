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
  if (typeof globalThis !== 'undefined' && globalThis[Symbol.for('__sremote_client__')]) {
    return globalThis[Symbol.for('__sremote_client__')];
  }
  if (typeof window !== 'undefined' && window.sremote && !window.sremote.isDummy && window.sremote.adapters) {
    return window.sremote;
  }
  if (typeof globalThis !== 'undefined' && globalThis.sremote && !globalThis.sremote.isDummy && globalThis.sremote.adapters) {
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
   * Internal helper to normalize options parameter.
   * @private
   */
  _normalizeOptions(options) {
    return typeof options === 'string' ? { videoId: options } : { ...options };
  }

  /**
   * Internal helper to enhance adapter with fallback toggle and capabilities.
   * @private
   */
  _setupAdapter(adapter) {
    const safeAdapter = adapter || {};

    let previousVolume = 1;

    // Wrap setVolume to record previous volume and automatically un-mute
    const origSetVolume = safeAdapter.setVolume;
    if (typeof origSetVolume === 'function') {
      safeAdapter.setVolume = async function (vol) {
        const v = Number(vol);
        if (v > 0) previousVolume = v;
        const res = await origSetVolume.call(this, vol);
        if (typeof safeAdapter.setMuted === 'function') {
          try {
            await safeAdapter.setMuted(false);
          } catch {}
        }
        return res;
      };
    }

    // Wrap setMuted to save and restore previous volume if un-muting
    const origSetMuted = safeAdapter.setMuted;
    if (typeof origSetMuted === 'function') {
      safeAdapter.setMuted = async function (muted) {
        const isMute = Boolean(muted);
        if (isMute) {
          if (typeof safeAdapter.getVolume === 'function') {
            try {
              const cur = Number(await safeAdapter.getVolume());
              if (cur > 0) previousVolume = cur;
            } catch {}
          }
        }
        const res = await origSetMuted.call(this, isMute);
        if (!isMute && typeof safeAdapter.getVolume === 'function') {
          try {
            const cur = Number(await safeAdapter.getVolume());
            if (cur === 0 && typeof safeAdapter.setVolume === 'function') {
              await safeAdapter.setVolume(previousVolume || 1);
            }
          } catch {}
        }
        return res;
      };
    } else if (typeof safeAdapter.setVolume === 'function') {
      // Fallback setMuted using setVolume if adapter doesn't provide setMuted
      safeAdapter.setMuted = async function (muted) {
        const isMute = Boolean(muted);
        if (isMute) {
          if (typeof safeAdapter.getVolume === 'function') {
            try {
              const cur = Number(await safeAdapter.getVolume());
              if (cur > 0) previousVolume = cur;
            } catch {}
          }
          return safeAdapter.setVolume(0);
        }
        return safeAdapter.setVolume(previousVolume || 1);
      };
    }

    if (typeof safeAdapter.toggle !== 'function' && typeof safeAdapter.play === 'function' && typeof safeAdapter.pause === 'function') {
      safeAdapter.toggle = function () {
        const isPaused = typeof safeAdapter.paused === 'function' ? safeAdapter.paused() : typeof safeAdapter.paused === 'boolean' ? safeAdapter.paused : true;
        if (isPaused) {
          safeAdapter.play();
        } else {
          safeAdapter.pause();
        }
      };
    }

    if (!safeAdapter.capabilities) {
      safeAdapter.capabilities = this.getCapabilities(safeAdapter);
    }

    return safeAdapter;
  }

  /**
   * Internal helper to build a safe teardown/destroy function.
   * @private
   */
  _buildDestroyHandler({ adapter, customDestroy, player, targetElement, remote, instanceId }) {
    return () => {
      try {
        if (remote?.adapters && instanceId) {
          remote.adapters.unregister(instanceId);
        }
      } catch {}

      try {
        if (typeof adapter?.destroy === 'function') {
          adapter.destroy();
        }
      } catch {}

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
  }

  /**
   * Shared pipeline to initialize player, resolve target element, and construct adapter.
   * @private
   */
  async _instantiate(opts, container = null) {
    const instanceId = this.generateInstanceId(opts.instanceId);

    // 1. Ensure provider SDK is ready
    await this.loadSdk();

    // 2. Initialize native player
    const initOptions = container ? { ...opts, container } : opts;
    const { player, element, iframe, destroy: customDestroy } = await this.initPlayer(initOptions, instanceId);

    const targetElement = iframe || element;

    // Ensure mounted into container if container was provided
    if (container && targetElement && targetElement.parentNode !== container) {
      container.appendChild(targetElement);
    }

    // 3. Build SRemote Custom Adapter
    const rawAdapter = this.createAdapter(player, {
      options: opts,
      instanceId,
      element: targetElement,
      iframe: iframe || (targetElement?.tagName === 'IFRAME' ? targetElement : null),
    });

    const adapter = this._setupAdapter(rawAdapter);
    const capabilities = adapter.capabilities;

    return { player, element: targetElement, iframe: iframe || (targetElement?.tagName === 'IFRAME' ? targetElement : null), adapter, instanceId, capabilities, customDestroy };
  }

  /**
   * Creates the player, element/iframe, and standard custom adapter without mounting to DOM.
   *
   * @param {Object|string} options
   * @returns {Promise<{ element: HTMLElement, iframe?: HTMLIFrameElement, adapter: Object, player: any, instanceId: string, capabilities: import('@sremote/shared').SRemoteCapabilities, destroy: () => void }>}
   */
  async create(options = {}) {
    const opts = this._normalizeOptions(options);
    const result = await this._instantiate(opts);

    const destroy = this._buildDestroyHandler({ adapter: result.adapter, customDestroy: result.customDestroy, player: result.player, targetElement: result.element });

    return {
      element: result.element,
      iframe: result.iframe,
      adapter: result.adapter,
      player: result.player,
      instanceId: result.instanceId,
      capabilities: result.capabilities,
      destroy,
    };
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

    const opts = this._normalizeOptions(options);
    const result = await this._instantiate(opts, targetContainer);

    const remote = await resolveSRemote(opts);
    if (remote?.adapters) {
      remote.adapters.register(result.adapter, result.instanceId);
    }

    const destroy = this._buildDestroyHandler({
      adapter: result.adapter,
      customDestroy: result.customDestroy,
      player: result.player,
      targetElement: result.element,
      remote,
      instanceId: result.instanceId,
    });

    return {
      element: result.element,
      iframe: result.iframe,
      adapter: result.adapter,
      player: result.player,
      instanceId: result.instanceId,
      capabilities: result.capabilities,
      destroy,
    };
  }
}

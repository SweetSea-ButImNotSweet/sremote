import { BaseProvider } from '../core/base-provider.js';
import { createTempNode, applyElementAttributes } from '../core/dom-utils.js';
import { loadSpotifySdk } from '../utils/sdk-loader.js';

/**
 * Provider for Spotify IFrame API (EmbedController)
 */
export class SpotifyProvider extends BaseProvider {
  constructor() {
    super('spotify');
  }

  async loadSdk() {
    return loadSpotifySdk();
  }

  async initPlayer(options, instanceId) {
    const IFrameAPI = await this.loadSdk();
    const width = options.width || '100%';
    const height = options.height || (options.compact ? '152' : '352');
    const uri = options.uri || options.url || 'spotify:track:4cOdK2wGLETKBW3PvgPWqT';

    const { hiddenWrapper, tempNode, cleanup } = createTempNode(instanceId, width, height);

    return new Promise((resolve, reject) => {
      try {
        IFrameAPI.createController(tempNode, { uri, width, height, ...options.controllerOptions }, EmbedController => {
          const iframe = tempNode.querySelector('iframe') || tempNode;
          if (iframe && iframe.parentNode === hiddenWrapper) {
            hiddenWrapper.removeChild(iframe);
          }
          cleanup();

          if (iframe) {
            applyElementAttributes(iframe, width, height, instanceId);
          }

          resolve({
            player: EmbedController,
            element: iframe,
            iframe: iframe?.tagName === 'IFRAME' ? iframe : null,
            destroy: () => {
              try {
                if (EmbedController && typeof EmbedController.destroy === 'function') {
                  EmbedController.destroy();
                }
              } catch {}
              cleanup();
            },
          });
        });
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }

  createAdapter(EmbedController) {
    let isPaused = true;
    let position = 0;
    let duration = 0;

    const adapter = {
      play() {
        if (typeof EmbedController?.resume === 'function') {
          EmbedController.resume();
        } else {
          EmbedController?.play?.();
        }
      },
      pause() {
        EmbedController?.pause?.();
      },
      toggle() {
        if (typeof EmbedController?.togglePlay === 'function') {
          EmbedController.togglePlay();
        } else {
          isPaused ? adapter.play() : adapter.pause();
        }
      },
      stop() {
        if (EmbedController && typeof EmbedController.pause === 'function' && typeof EmbedController.seek === 'function') {
          EmbedController.pause();
          EmbedController.seek(0);
        }
      },
      seek(offset) {
        EmbedController?.seek?.(Math.max(0, position + Number(offset)));
      },
      seekTo(seconds) {
        EmbedController?.seek?.(Number(seconds));
      },
      getCurrentTime() {
        return position;
      },
      getDuration() {
        return duration;
      },
      paused() {
        return isPaused;
      },
      load(uri) {
        EmbedController?.loadUri?.(uri);
      },
      getState() {
        return { paused: isPaused, currentTime: position, duration };
      },
    };

    if (EmbedController && typeof EmbedController.addListener === 'function') {
      EmbedController.addListener('playback_started', e => {
        isPaused = false;
        position = (e?.data?.position || 0) / 1000;
        duration = (e?.data?.duration || 0) / 1000;
        adapter.emit?.('play', { state: { paused: false, currentTime: position, duration } });
        adapter.emit?.('timeupdate', { state: { paused: false, currentTime: position, duration } });
      });

      EmbedController.addListener('playback_update', e => {
        isPaused = Boolean(e?.data?.isPaused);
        position = (e?.data?.position || 0) / 1000;
        duration = (e?.data?.duration || 0) / 1000;
        adapter.emit?.('timeupdate', { state: { paused: isPaused, currentTime: position, duration } });
        if (isPaused) {
          adapter.emit?.('pause', { state: { paused: true, currentTime: position, duration } });
        }
      });
    }

    return adapter;
  }
}

export const spotifyProvider = new SpotifyProvider();

export const spotify = {
  create: options => spotifyProvider.create(options),
  mount: (container, options) => spotifyProvider.mount(container, options),
  provider: spotifyProvider,
};

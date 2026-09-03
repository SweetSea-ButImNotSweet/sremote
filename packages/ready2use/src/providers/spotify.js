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

    let targetNode = null;
    let cleanupTemp = () => {};

    if (options.container) {
      targetNode = document.createElement('div');
      targetNode.id = `sremote-spotify-${instanceId}`;
      applyElementAttributes(targetNode, width, height, instanceId);
      options.container.appendChild(targetNode);
    } else {
      const temp = createTempNode(instanceId, width, height);
      targetNode = temp.tempNode;
      cleanupTemp = temp.cleanup;
    }

    return new Promise((resolve, reject) => {
      let isResolved = false;

      const finish = EmbedController => {
        if (isResolved) return;
        isResolved = true;

        const iframe =
          (targetNode && typeof targetNode.querySelector === 'function' ? targetNode.querySelector('iframe') : null) ||
          document.querySelector(`#sremote-spotify-${instanceId} iframe`) ||
          targetNode;

        if (iframe) {
          applyElementAttributes(iframe, width, height, instanceId);
        }

        resolve({
          player: EmbedController,
          element: targetNode || iframe,
          iframe: iframe?.tagName === 'IFRAME' ? iframe : null,
          destroy: () => {
            try {
              if (EmbedController && typeof EmbedController.destroy === 'function') {
                EmbedController.destroy();
              }
            } catch {}
            cleanupTemp();
          },
        });
      };

      try {
        IFrameAPI.createController(targetNode, { uri, width, height, ...options.controllerOptions }, EmbedController => {
          finish(EmbedController);
        });

        // Safety fallback in case Spotify controller callback is delayed
        setTimeout(() => {
          if (!isResolved) {
            finish(null);
          }
        }, options.timeout || 3500);
      } catch (err) {
        cleanupTemp();
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

export const spotify = { create: options => spotifyProvider.create(options), mount: (container, options) => spotifyProvider.mount(container, options), provider: spotifyProvider };

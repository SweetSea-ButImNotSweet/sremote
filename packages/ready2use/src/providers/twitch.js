import { BaseProvider } from '../core/base-provider.js';
import { createTempNode, applyElementAttributes } from '../core/dom-utils.js';
import { loadTwitchSdk } from '../utils/sdk-loader.js';

/**
 * Provider for Twitch Interactive Player SDK
 */
export class TwitchProvider extends BaseProvider {
  constructor() {
    super('twitch');
  }

  async loadSdk() {
    return loadTwitchSdk();
  }

  async initPlayer(options, instanceId) {
    const Twitch = await this.loadSdk();
    const width = options.width || '100%';
    const height = options.height || '100%';

    const { hiddenWrapper, tempNode, cleanup } = createTempNode(instanceId, width, height);

    const currentHost = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
    const parentList = Array.isArray(options.parent) ? options.parent : [options.parent || currentHost];

    const playerOptions = {
      width: '100%',
      height: '100%',
      channel: options.channel || (!options.video && !options.collection ? 'the8bitdrummer' : undefined),
      video: options.video,
      collection: options.collection,
      parent: parentList,
      autoplay: options.autoplay ?? false,
      muted: options.muted ?? false,
      ...options.playerOptions,
    };

    const player = new Twitch.Player(tempNode.id, playerOptions);

    await new Promise(resolve => {
      player.addEventListener(Twitch.Player.READY, () => resolve(), { once: true });
      setTimeout(resolve, 2500);
    });

    const iframe = tempNode.querySelector('iframe') || tempNode;
    if (iframe && iframe.parentNode === hiddenWrapper) {
      hiddenWrapper.removeChild(iframe);
    }
    cleanup();

    if (iframe) {
      applyElementAttributes(iframe, width, height, instanceId);
    }

    return {
      player,
      element: iframe,
      iframe: iframe?.tagName === 'IFRAME' ? iframe : null,
      destroy: () => {
        try {
          if (player && typeof player.destroy === 'function') {
            player.destroy();
          }
        } catch {}
        cleanup();
      },
    };
  }

  createAdapter(player) {
    const Twitch = typeof window !== 'undefined' ? window.Twitch : null;

    const adapter = {
      play() {
        if (player && typeof player.play === 'function') {
          player.play();
        }
      },
      pause() {
        if (player && typeof player.pause === 'function') {
          player.pause();
        }
      },
      toggle() {
        if (!player || typeof player.isPaused !== 'function') return;
        player.isPaused() ? player.play() : player.pause();
      },
      stop() {
        if (player && typeof player.pause === 'function' && typeof player.seek === 'function') {
          player.pause();
          player.seek(0);
        }
      },
      seek(offset) {
        if (player && typeof player.getCurrentTime === 'function' && typeof player.seek === 'function') {
          player.seek(Math.max(0, (player.getCurrentTime() || 0) + Number(offset)));
        }
      },
      seekTo(seconds) {
        if (player && typeof player.seek === 'function') {
          player.seek(Number(seconds));
        }
      },
      getCurrentTime() {
        return player && typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
      },
      getDuration() {
        return player && typeof player.getDuration === 'function' ? player.getDuration() : 0;
      },
      getVolume() {
        return player && typeof player.getVolume === 'function' ? player.getVolume() : 1;
      },
      setVolume(vol) {
        if (player && typeof player.setVolume === 'function') {
          player.setVolume(Math.min(1, Math.max(0, Number(vol))));
        }
      },
      getMuted() {
        return player && typeof player.getMuted === 'function' ? player.getMuted() : false;
      },
      setMuted(muted) {
        if (player && typeof player.setMuted === 'function') {
          player.setMuted(Boolean(muted));
        }
      },
      paused() {
        return player && typeof player.isPaused === 'function' ? player.isPaused() : true;
      },
      load(source) {
        if (!player) return;
        if (typeof source === 'string') {
          if (typeof player.setChannel === 'function') player.setChannel(source);
        } else if (source?.video && typeof player.setVideo === 'function') {
          player.setVideo(source.video);
        } else if (source?.channel && typeof player.setChannel === 'function') {
          player.setChannel(source.channel);
        }
      },
      getState() {
        return {
          paused: player?.isPaused ? player.isPaused() : true,
          currentTime: player?.getCurrentTime ? player.getCurrentTime() : 0,
          duration: player?.getDuration ? player.getDuration() : 0,
          volume: player?.getVolume ? player.getVolume() : 1,
          muted: player?.getMuted ? player.getMuted() : false,
        };
      },
    };

    if (Twitch && player && typeof player.addEventListener === 'function') {
      player.addEventListener(Twitch.Player.PLAY, () => {
        adapter.emit?.('play', {
          state: { paused: false, currentTime: player.getCurrentTime ? player.getCurrentTime() : 0, duration: player.getDuration ? player.getDuration() : 0 },
        });
      });

      player.addEventListener(Twitch.Player.PAUSE, () => {
        adapter.emit?.('pause', {
          state: { paused: true, currentTime: player.getCurrentTime ? player.getCurrentTime() : 0, duration: player.getDuration ? player.getDuration() : 0 },
        });
      });

      player.addEventListener(Twitch.Player.ENDED, () => {
        adapter.emit?.('ended', {
          state: { paused: true, ended: true, currentTime: player.getDuration ? player.getDuration() : 0, duration: player.getDuration ? player.getDuration() : 0 },
        });
      });
    }

    return adapter;
  }
}

export const twitchProvider = new TwitchProvider();
export const createTwitchPlayer = options => twitchProvider.create(options);
export const mountTwitchPlayer = (container, options) => twitchProvider.mount(container, options);

export const twitch = { create: createTwitchPlayer, mount: mountTwitchPlayer, provider: twitchProvider };

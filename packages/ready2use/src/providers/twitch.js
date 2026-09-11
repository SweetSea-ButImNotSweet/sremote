import { BaseProvider } from '../core/base-provider.js';
import { createTempNode, applyElementAttributes } from '../core/dom-utils.js';
import { toggle, seekTo, Volume } from '../core/polyfill.js';
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
        player?.play?.();
      },
      pause() {
        player?.pause?.();
      },
      stop() {
        if (player && typeof player.pause === 'function' && typeof player.seek === 'function') {
          player.pause();
          player.seek(0);
        }
      },
      seek(offset) {
        if (player && typeof player.getCurrentTime === 'function' && typeof player.seek === 'function') {
          const cur = player.getCurrentTime() || 0;
          const target = Math.max(0, cur + Number(offset));
          const state = { ...adapter.getState(), currentTime: target };
          adapter.emit?.('seeking', { state });
          player.seek(target);
          adapter.emit?.('seeked', { state });
        }
      },
      seekTo(seconds) {
        const target = Number(seconds);
        const state = { ...adapter.getState(), currentTime: target };
        adapter.emit?.('seeking', { state });
        player?.seek?.(target);
        adapter.emit?.('seeked', { state });
      },
      setCurrentTime(seconds) {
        this.seekTo(seconds);
      },
      getCurrentTime() {
        return player?.getCurrentTime ? player.getCurrentTime() : 0;
      },
      getDuration() {
        return player?.getDuration ? player.getDuration() : 0;
      },
      getVolume() {
        return player?.getVolume ? player.getVolume() : 1;
      },
      setVolume(vol) {
        const v = Math.min(1, Math.max(0, Number(vol)));
        player?.setVolume?.(v);
        adapter.emit?.('volumechange', { state: { ...adapter.getState(), volume: v } });
      },
      getMuted() {
        return player?.getMuted ? player.getMuted() : false;
      },
      setMuted(muted) {
        const m = Boolean(muted);
        player?.setMuted?.(m);
        adapter.emit?.('volumechange', { state: { ...adapter.getState(), muted: m } });
      },
      paused() {
        return player?.isPaused ? player.isPaused() : true;
      },
      load(source) {
        if (!player) return;
        if (typeof source === 'string') {
          player.setChannel?.(source);
        } else if (source?.video) {
          player.setVideo?.(source.video);
        } else if (source?.channel) {
          player.setChannel?.(source.channel);
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

    toggle(adapter);
    seekTo(adapter);
    new Volume(adapter.getVolume ? adapter.getVolume() : 1).apply(adapter);

    return adapter;
  }
}

export const twitchProvider = new TwitchProvider();

export const twitch = { create: options => twitchProvider.create(options), mount: (container, options) => twitchProvider.mount(container, options), provider: twitchProvider };

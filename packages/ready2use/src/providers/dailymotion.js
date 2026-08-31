import { BaseProvider } from '../core/base-provider.js';
import { createTempNode, applyElementAttributes } from '../core/dom-utils.js';
import { loadDailymotionSdk } from '../utils/sdk-loader.js';

/**
 * Provider for Dailymotion Player SDK
 */
export class DailymotionProvider extends BaseProvider {
  constructor() {
    super('dailymotion');
  }

  async loadSdk() {
    return loadDailymotionSdk();
  }

  async initPlayer(options, instanceId) {
    const dailymotion = await this.loadSdk();
    const width = options.width || '100%';
    const height = options.height || '100%';
    const video = options.video || options.videoId || 'x7tgad0';

    const { hiddenWrapper, tempNode, cleanup } = createTempNode(instanceId, width, height);

    const playerOptions = { video, params: { autoplay: options.autoplay ?? false, mute: options.mute ?? options.muted ?? false, ...options.params }, ...options.playerOptions };

    const player = await dailymotion.createPlayer(tempNode, playerOptions);

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
    const dailymotion = typeof window !== 'undefined' ? window.dailymotion : null;
    let isPaused = true;
    let duration = 0;
    let currentTime = 0;
    let volume = 1;
    let isMuted = false;

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
        if (!player) return;
        isPaused ? adapter.play() : adapter.pause();
      },
      stop() {
        if (player && typeof player.pause === 'function' && typeof player.seek === 'function') {
          player.pause();
          player.seek(0);
        }
      },
      seek(offset) {
        if (player && typeof player.seek === 'function') {
          player.seek(Math.max(0, currentTime + Number(offset)));
        }
      },
      seekTo(seconds) {
        if (player && typeof player.seek === 'function') {
          player.seek(Number(seconds));
        }
      },
      getCurrentTime() {
        return currentTime;
      },
      getDuration() {
        return duration;
      },
      getVolume() {
        return volume;
      },
      setVolume(vol) {
        volume = Number(vol);
        if (player && typeof player.setVolume === 'function') {
          player.setVolume(Math.min(1, Math.max(0, volume)));
        }
      },
      getMuted() {
        return isMuted;
      },
      setMuted(muted) {
        isMuted = Boolean(muted);
        if (player && typeof player.setMuted === 'function') {
          player.setMuted(isMuted);
        }
      },
      paused() {
        return isPaused;
      },
      setQuality(level) {
        if (player && typeof player.setQuality === 'function') {
          player.setQuality(String(level));
        }
      },
      async getQualities() {
        if (player && typeof player.getQualities === 'function') {
          try {
            const quals = await player.getQualities();
            return Array.isArray(quals) ? quals : [];
          } catch {
            return [];
          }
        }
        return [];
      },
      setSubtitle(track) {
        if (player && typeof player.setSubtitle === 'function') {
          player.setSubtitle(track ? String(track) : 'off');
        }
      },
      async getSubtitles() {
        if (player && typeof player.getSubtitles === 'function') {
          try {
            const subs = await player.getSubtitles();
            return Array.isArray(subs) ? subs : [];
          } catch {
            return [];
          }
        }
        return [];
      },
      load(video) {
        if (player && typeof player.load === 'function') {
          player.load(video);
        }
      },
      getState() {
        return { paused: isPaused, currentTime, duration, volume, muted: isMuted };
      },
    };

    if (player && typeof player.on === 'function') {
      const events = dailymotion?.events || {};

      if (events.PLAYER_PLAY) {
        player.on(events.PLAYER_PLAY, () => {
          isPaused = false;
          adapter.emit?.('play', { state: { paused: false, currentTime, duration } });
        });
      }

      if (events.PLAYER_PAUSE) {
        player.on(events.PLAYER_PAUSE, () => {
          isPaused = true;
          adapter.emit?.('pause', { state: { paused: true, currentTime, duration } });
        });
      }

      if (events.PLAYER_TIMEUPDATE) {
        player.on(events.PLAYER_TIMEUPDATE, state => {
          currentTime = state?.videoTime ?? state?.time ?? currentTime;
          duration = state?.videoDuration ?? state?.duration ?? duration;
          adapter.emit?.('timeupdate', { state: { paused: isPaused, currentTime, duration } });
        });
      }

      if (events.PLAYER_SEEKED) {
        player.on(events.PLAYER_SEEKED, state => {
          currentTime = state?.videoTime ?? state?.time ?? currentTime;
          adapter.emit?.('seeked', { state: { paused: isPaused, currentTime, duration } });
          adapter.emit?.('timeupdate', { state: { paused: isPaused, currentTime, duration } });
        });
      }

      if (events.PLAYER_END) {
        player.on(events.PLAYER_END, () => {
          isPaused = true;
          adapter.emit?.('ended', { state: { paused: true, ended: true, currentTime: duration, duration } });
        });
      }

      if (events.PLAYER_VOLUMECHANGE) {
        player.on(events.PLAYER_VOLUMECHANGE, state => {
          if (state?.volume !== undefined) volume = state.volume;
          if (state?.muted !== undefined) isMuted = state.muted;
          adapter.emit?.('volumechange', { state: { volume, muted: isMuted } });
        });
      }
    }

    return adapter;
  }
}

export const dailymotionProvider = new DailymotionProvider();
export const createDailymotionPlayer = options => dailymotionProvider.create(options);
export const mountDailymotionPlayer = (container, options) => dailymotionProvider.mount(container, options);

export const dailymotion = { create: createDailymotionPlayer, mount: mountDailymotionPlayer, provider: dailymotionProvider };

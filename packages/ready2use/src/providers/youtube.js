import { BaseProvider } from '../core/base-provider.js';
import { createTempNode, applyElementAttributes } from '../core/dom-utils.js';
import { loadYouTubeIframeApi } from '../utils/sdk-loader.js';

/**
 * Provider for YouTube IFrame API
 */
export class YouTubeProvider extends BaseProvider {
  constructor() {
    super('youtube');
  }

  async loadSdk() {
    return loadYouTubeIframeApi();
  }

  async initPlayer(options, instanceId) {
    const YT = await this.loadSdk();
    const width = options.width || '100%';
    const height = options.height || '100%';
    const videoId = options.videoId;

    const { hiddenWrapper, tempNode, cleanup } = createTempNode(instanceId, width, height);

    return new Promise((resolve, reject) => {
      let player = null;
      let iframe = null;

      player = new YT.Player(tempNode.id, {
        width,
        height,
        videoId,
        playerVars: { enablejsapi: 1, origin: typeof window !== 'undefined' ? window.location.origin : undefined, ...options.playerVars },
        events: {
          onReady: () => {
            iframe = player.getIFrame ? player.getIFrame() : document.getElementById(tempNode.id);
            if (iframe && iframe.parentNode === hiddenWrapper) {
              hiddenWrapper.removeChild(iframe);
            }
            cleanup();

            if (iframe) {
              applyElementAttributes(iframe, width, height, instanceId);
            }

            resolve({
              player,
              element: iframe,
              iframe,
              destroy: () => {
                try {
                  if (player && typeof player.destroy === 'function') {
                    player.destroy();
                  }
                } catch {}
                cleanup();
              },
            });
          },
          onError: err => {
            cleanup();
            reject(err);
          },
        },
      });
    });
  }

  createAdapter(player) {
    const YT = typeof window !== 'undefined' ? window.YT : null;

    let lastKnownState = { paused: true, currentTime: 0, duration: 0, volume: 1, muted: false, playbackRate: 1 };
    let timeupdateTimer = null;

    const updateStateSnapshot = () => {
      try {
        if (player && typeof player.getPlayerState === 'function') {
          const state = player.getPlayerState();
          const isPlayingOrBuffering = YT ? state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING : state === 1 || state === 3;
          lastKnownState.paused = !isPlayingOrBuffering;
          lastKnownState.currentTime = player.getCurrentTime ? player.getCurrentTime() : 0;
          lastKnownState.duration = player.getDuration ? player.getDuration() : 0;
          lastKnownState.volume = player.getVolume ? player.getVolume() / 100 : 1;
          lastKnownState.muted = player.isMuted ? player.isMuted() : false;
          lastKnownState.playbackRate = player.getPlaybackRate ? player.getPlaybackRate() : 1;
        }
      } catch {}
      return lastKnownState;
    };

    const startTimeupdate = () => {
      if (timeupdateTimer) return;
      timeupdateTimer = setInterval(() => {
        const state = updateStateSnapshot();
        adapter.emit?.('timeupdate', { state });
      }, 250);
    };

    const stopTimeupdate = () => {
      if (timeupdateTimer) {
        clearInterval(timeupdateTimer);
        timeupdateTimer = null;
      }
    };

    const adapter = {
      play() {
        if (player && typeof player.playVideo === 'function') {
          player.playVideo();
        }
      },
      pause() {
        if (player && typeof player.pauseVideo === 'function') {
          player.pauseVideo();
        }
      },
      toggle() {
        if (!player) return;
        const state = typeof player.getPlayerState === 'function' ? player.getPlayerState() : -1;
        const isPlayingOrBuffering = YT ? state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING : state === 1 || state === 3;
        if (isPlayingOrBuffering) {
          player.pauseVideo();
        } else {
          player.playVideo();
        }
      },
      stop() {
        if (player && typeof player.stopVideo === 'function') {
          player.stopVideo();
        }
      },
      seek(offset) {
        if (player && typeof player.getCurrentTime === 'function' && typeof player.seekTo === 'function') {
          const cur = player.getCurrentTime() || 0;
          player.seekTo(Math.max(0, cur + Number(offset)), true);
        }
      },
      seekTo(seconds) {
        if (player && typeof player.seekTo === 'function') {
          player.seekTo(Number(seconds), true);
        }
      },
      getCurrentTime() {
        return player && typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0;
      },
      getDuration() {
        return player && typeof player.getDuration === 'function' ? player.getDuration() : 0;
      },
      getVolume() {
        return player && typeof player.getVolume === 'function' ? player.getVolume() / 100 : 1;
      },
      setVolume(vol) {
        if (player && typeof player.setVolume === 'function') {
          let v = Number(vol);
          if (v <= 1 && v > 0) v *= 100;
          player.setVolume(Math.min(100, Math.max(0, v)));
        }
      },
      getMuted() {
        return player && typeof player.isMuted === 'function' ? player.isMuted() : false;
      },
      setMuted(muted) {
        if (!player) return;
        if (muted) {
          if (typeof player.mute === 'function') player.mute();
        } else {
          if (typeof player.unMute === 'function') player.unMute();
        }
      },
      getPlaybackRate() {
        return player && typeof player.getPlaybackRate === 'function' ? player.getPlaybackRate() : 1;
      },
      setPlaybackRate(rate) {
        if (player && typeof player.setPlaybackRate === 'function') {
          player.setPlaybackRate(Number(rate));
        }
      },
      paused() {
        if (!player || typeof player.getPlayerState !== 'function') return true;
        const state = player.getPlayerState();
        const isPlayingOrBuffering = YT ? state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING : state === 1 || state === 3;
        return !isPlayingOrBuffering;
      },
      next() {
        if (player && typeof player.nextVideo === 'function') {
          player.nextVideo();
        }
      },
      previous() {
        if (player && typeof player.previousVideo === 'function') {
          player.previousVideo();
        }
      },
      setRepeat(mode) {
        if (player && typeof player.setLoop === 'function') {
          const loop = mode === 'one' || mode === 'all' || mode === true;
          player.setLoop(loop);
        }
      },
      setShuffle(enable) {
        if (player && typeof player.setShuffle === 'function') {
          player.setShuffle(Boolean(enable));
        }
      },
      setSubtitle(track) {
        if (!player) return;
        if (!track || track === 'off') {
          if (typeof player.setOption === 'function') {
            try {
              player.setOption('captions', 'track', {});
              player.setOption('cc', 'track', {});
              player.setOption('captions', 'reload', true);
            } catch {}
          }
          if (typeof player.unloadModule === 'function') {
            try {
              player.unloadModule('captions');
            } catch {}
          }
        } else {
          const lang = String(track);
          if (typeof player.loadModule === 'function') {
            try {
              player.loadModule('captions');
            } catch {}
          }
          if (typeof player.setOption === 'function') {
            try {
              player.setOption('captions', 'track', { languageCode: lang });
              player.setOption('cc', 'track', { languageCode: lang });
              player.setOption('captions', 'reload', true);
            } catch {}
          }
        }
      },
      getSubtitles() {
        if (player && typeof player.getOption === 'function') {
          try {
            const list = player.getOption('captions', 'tracklist');
            if (Array.isArray(list) && list.length > 0) return list;
            const track = player.getOption('captions', 'track');
            return track && Object.keys(track).length > 0 ? [track] : [];
          } catch {
            return [];
          }
        }
        return [];
      },
      load(source) {
        if (!player) return;
        if (typeof source === 'string') {
          if (typeof player.loadVideoById === 'function') {
            player.loadVideoById(source);
          }
        } else if (source && typeof source === 'object') {
          if (typeof player.loadVideoById === 'function') {
            player.loadVideoById(source);
          }
        }
      },
      getState() {
        return updateStateSnapshot();
      },
      destroy() {
        stopTimeupdate();
      },
    };

    if (player && typeof player.addEventListener === 'function') {
      player.addEventListener('onStateChange', event => {
        const state = updateStateSnapshot();
        const stateVal = event.data;

        // YT.PlayerState: PLAYING (1), PAUSED (2), ENDED (0), BUFFERING (3), CUED (5)
        if (stateVal === 1) {
          startTimeupdate();
          adapter.emit?.('play', { state });
        } else if (stateVal === 2) {
          stopTimeupdate();
          adapter.emit?.('pause', { state });
        } else if (stateVal === 0) {
          stopTimeupdate();
          adapter.emit?.('ended', { state: { ...state, paused: true, ended: true } });
        }
      });
    }

    return adapter;
  }
}

export const youtubeProvider = new YouTubeProvider();

export const createYouTubePlayer = options => youtubeProvider.create(options);
export const mountYouTubePlayer = (container, options) => youtubeProvider.mount(container, options);

export const youtube = { create: createYouTubePlayer, mount: mountYouTubePlayer, provider: youtubeProvider };

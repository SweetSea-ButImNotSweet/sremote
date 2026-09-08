import { BaseProvider } from '../core/base-provider.js';
import { createTempNode, applyElementAttributes } from '../core/dom-utils.js';
import { loadYouTubeIframeApi } from '../utils/sdk-loader.js';

/**
 * Checks if the YouTube player state corresponds to playing or buffering.
 * @param {number} state
 * @param {any} [YT]
 * @returns {boolean}
 */
function isStatePlaying(state, YT) {
  return YT ? state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING : state === 1 || state === 3;
}

/**
 * Helper to safely configure YouTube captions / subtitles track.
 * @param {any} player
 * @param {string|null} track
 */
function setCaptions(player, track) {
  if (!player) return;

  const isOff = !track || track === 'off';

  try {
    if (isOff) {
      if (typeof player.setOption === 'function') {
        player.setOption('captions', 'track', {});
        player.setOption('cc', 'track', {});
        player.setOption('captions', 'reload', true);
      }
      if (typeof player.unloadModule === 'function') {
        player.unloadModule('captions');
      }
    } else {
      if (typeof player.loadModule === 'function') {
        player.loadModule('captions');
      }
      if (typeof player.setOption === 'function') {
        const trackObj = { languageCode: String(track) };
        player.setOption('captions', 'track', trackObj);
        player.setOption('cc', 'track', trackObj);
        player.setOption('captions', 'reload', true);
      }
    }
  } catch {}
}

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

    let targetNode = null;
    let cleanupTemp = () => {};

    if (options.container) {
      targetNode = document.createElement('div');
      targetNode.id = `sremote-youtube-${instanceId}`;
      applyElementAttributes(targetNode, width, height, instanceId);
      options.container.appendChild(targetNode);
    } else {
      const temp = createTempNode(instanceId, width, height);
      targetNode = temp.tempNode;
      cleanupTemp = temp.cleanup;
    }

    return new Promise((resolve, reject) => {
      let player = null;

      player = new YT.Player(targetNode.id, {
        width,
        height,
        videoId,
        playerVars: { enablejsapi: 1, origin: typeof window !== 'undefined' ? window.location.origin : undefined, ...options.playerVars },
        events: {
          onReady: () => {
            const iframe = player.getIFrame ? player.getIFrame() : document.getElementById(targetNode.id);
            if (iframe) {
              applyElementAttributes(iframe, width, height, instanceId);
            }

            resolve({
              player,
              element: iframe || targetNode,
              iframe: iframe || (targetNode?.tagName === 'IFRAME' ? targetNode : null),
              destroy: () => {
                try {
                  if (player && typeof player.destroy === 'function') {
                    player.destroy();
                  }
                } catch {}
                cleanupTemp();
              },
            });
          },
          onError: err => {
            cleanupTemp();
            reject(err);
          },
        },
      });
    });
  }

  createAdapter(player) {
    const YT = typeof window !== 'undefined' ? window.YT : null;

    let lastKnownState = { paused: true, ended: false, currentTime: 0, duration: 0, volume: 1, muted: false, playbackRate: 1 };
    let timeupdateTimer = null;
    let isSeeking = false;
    let lastReportedTime = 0;

    const isPlaying = () => {
      if (!player || typeof player.getPlayerState !== 'function') return false;
      return isStatePlaying(player.getPlayerState(), YT);
    };

    const updateStateSnapshot = () => {
      try {
        if (player && typeof player.getPlayerState === 'function') {
          const pState = player.getPlayerState();
          lastKnownState.paused = !isPlaying();
          lastKnownState.ended = pState === 0;
          lastKnownState.currentTime = player.getCurrentTime ? player.getCurrentTime() : 0;
          lastKnownState.duration = player.getDuration ? player.getDuration() : 0;
          lastKnownState.volume = player.getVolume ? player.getVolume() / 100 : 1;
          lastKnownState.muted = player.isMuted ? player.isMuted() : false;
          lastKnownState.playbackRate = player.getPlaybackRate ? player.getPlaybackRate() : 1;
        }
      } catch {}
      return lastKnownState;
    };

    const notifySeeked = state => {
      if (isSeeking) {
        isSeeking = false;
        adapter.emit?.('seeked', { state });
      }
    };

    const startTimeupdate = () => {
      if (timeupdateTimer) return;
      timeupdateTimer = setInterval(() => {
        const state = updateStateSnapshot();
        const cur = state.currentTime || 0;

        // Detect user seeking natively via scrubber (jump > 1.5s)
        if (Math.abs(cur - lastReportedTime) > 1.5 && !isSeeking) {
          adapter.emit?.('seeking', { state });
          adapter.emit?.('seeked', { state });
        } else if (isSeeking) {
          notifySeeked(state);
        }

        lastReportedTime = cur;
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
        if (isPlaying()) {
          player.pauseVideo?.();
        } else {
          player.playVideo?.();
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
          const target = Math.max(0, cur + Number(offset));
          isSeeking = true;
          const state = { ...updateStateSnapshot(), currentTime: target };
          adapter.emit?.('seeking', { state });
          player.seekTo(target, true);
        }
      },
      seekTo(seconds) {
        if (player && typeof player.seekTo === 'function') {
          const target = Number(seconds);
          isSeeking = true;
          const state = { ...updateStateSnapshot(), currentTime: target };
          adapter.emit?.('seeking', { state });
          player.seekTo(target, true);
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
          const bounded = Math.min(100, Math.max(0, v));
          player.setVolume(bounded);
          const state = { ...updateStateSnapshot(), volume: bounded / 100 };
          adapter.emit?.('volumechange', { state });
        }
      },
      getMuted() {
        return player && typeof player.isMuted === 'function' ? player.isMuted() : false;
      },
      setMuted(muted) {
        if (!player) return;
        const isMute = Boolean(muted);
        if (isMute) {
          player.mute?.();
        } else {
          player.unMute?.();
        }
        const state = { ...updateStateSnapshot(), muted: isMute };
        adapter.emit?.('volumechange', { state });
      },
      getPlaybackRate() {
        return player && typeof player.getPlaybackRate === 'function' ? player.getPlaybackRate() : 1;
      },
      setPlaybackRate(rate) {
        if (player && typeof player.setPlaybackRate === 'function') {
          const r = Number(rate);
          player.setPlaybackRate(r);
          const state = { ...updateStateSnapshot(), playbackRate: r };
          adapter.emit?.('ratechange', { state });
        }
      },
      paused() {
        return !isPlaying();
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
        setCaptions(player, track);
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
        if (player && typeof player.loadVideoById === 'function' && source) {
          player.loadVideoById(source);
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
          notifySeeked(state);
          startTimeupdate();
          adapter.emit?.('play', { state });
        } else if (stateVal === 2) {
          notifySeeked(state);
          stopTimeupdate();
          adapter.emit?.('pause', { state });
        } else if (stateVal === 0) {
          notifySeeked(state);
          stopTimeupdate();
          adapter.emit?.('ended', { state: { ...state, paused: true, ended: true } });
        } else if (stateVal === 3) {
          adapter.emit?.('buffering', { state });
        }
      });

      player.addEventListener('onPlaybackRateChange', event => {
        const rate = event?.data ?? (player.getPlaybackRate ? player.getPlaybackRate() : 1);
        const state = { ...updateStateSnapshot(), playbackRate: Number(rate) };
        adapter.emit?.('ratechange', { state });
      });
    }

    return adapter;
  }
}

export const youtubeProvider = new YouTubeProvider();

export const youtube = { create: options => youtubeProvider.create(options), mount: (container, options) => youtubeProvider.mount(container, options), provider: youtubeProvider };

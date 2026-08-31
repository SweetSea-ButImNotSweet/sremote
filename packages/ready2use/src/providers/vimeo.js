import { BaseProvider } from '../core/base-provider.js';
import { createTempNode, applyElementAttributes } from '../core/dom-utils.js';
import { loadVimeoSdk } from '../utils/sdk-loader.js';

/**
 * Provider for Vimeo Player SDK
 */
export class VimeoProvider extends BaseProvider {
  constructor() {
    super('vimeo');
  }

  async loadSdk() {
    return loadVimeoSdk();
  }

  async initPlayer(options, instanceId) {
    const Vimeo = await this.loadSdk();
    const width = options.width || '100%';
    const height = options.height || '100%';
    const videoId = options.videoId || options.id || options.url || '76979871';

    const { hiddenWrapper, tempNode, cleanup } = createTempNode(instanceId, width, height);

    const playerOptions = {
      id: typeof videoId === 'number' ? videoId : undefined,
      url: typeof videoId === 'string' ? (videoId.startsWith('http') ? videoId : `https://player.vimeo.com/video/${videoId}`) : undefined,
      width: typeof width === 'number' ? width : undefined,
      height: typeof height === 'number' ? height : undefined,
      autoplay: options.autoplay ?? false,
      muted: options.muted ?? false,
      ...options.playerOptions,
    };

    const player = new Vimeo.Player(tempNode, playerOptions);

    await player.ready();

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
    let isPaused = true;
    let duration = 0;
    let currentTime = 0;
    let volume = 1;
    let isMuted = false;
    let playbackRate = 1;

    // Prefetch duration
    if (player && typeof player.getDuration === 'function') {
      player
        .getDuration()
        .then(d => {
          duration = d || 0;
        })
        .catch(() => {});
    }

    const adapter = {
      play() {
        if (player && typeof player.play === 'function') {
          player.play().catch(() => {});
        }
      },
      pause() {
        if (player && typeof player.pause === 'function') {
          player.pause().catch(() => {});
        }
      },
      toggle() {
        if (!player) return;
        if (typeof player.getPaused === 'function') {
          player
            .getPaused()
            .then(paused => {
              paused ? player.play().catch(() => {}) : player.pause().catch(() => {});
            })
            .catch(() => {
              isPaused ? player.play().catch(() => {}) : player.pause().catch(() => {});
            });
        } else {
          isPaused ? player.play().catch(() => {}) : player.pause().catch(() => {});
        }
      },
      stop() {
        if (player && typeof player.pause === 'function' && typeof player.setCurrentTime === 'function') {
          player
            .pause()
            .then(() => player.setCurrentTime(0))
            .catch(() => {});
        }
      },
      seek(offset) {
        if (player && typeof player.getCurrentTime === 'function' && typeof player.setCurrentTime === 'function') {
          player
            .getCurrentTime()
            .then(t => {
              player.setCurrentTime(Math.max(0, t + Number(offset))).catch(() => {});
            })
            .catch(() => {});
        }
      },
      seekTo(seconds) {
        if (player && typeof player.setCurrentTime === 'function') {
          player.setCurrentTime(Number(seconds)).catch(() => {});
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
          player.setVolume(Math.min(1, Math.max(0, volume))).catch(() => {});
        }
      },
      getMuted() {
        return isMuted;
      },
      setMuted(muted) {
        isMuted = Boolean(muted);
        if (player && typeof player.setMuted === 'function') {
          player.setMuted(isMuted).catch(() => {});
        }
      },
      getPlaybackRate() {
        return playbackRate;
      },
      setPlaybackRate(rate) {
        playbackRate = Number(rate);
        if (player && typeof player.setPlaybackRate === 'function') {
          player.setPlaybackRate(playbackRate).catch(() => {});
        }
      },
      paused() {
        return isPaused;
      },
      setRepeat(mode) {
        if (player && typeof player.setLoop === 'function') {
          const loop = mode === 'one' || mode === 'all' || mode === true;
          player.setLoop(loop).catch(() => {});
        }
      },
      setQuality(level) {
        if (player && typeof player.setQuality === 'function') {
          player.setQuality(String(level)).catch(() => {});
        }
      },
      async getQualities() {
        if (player && typeof player.getQualities === 'function') {
          try {
            const quals = await player.getQualities();
            return Array.isArray(quals) ? quals.map(q => q.id || q.label || String(q)) : [];
          } catch {
            return [];
          }
        }
        return [];
      },
      setSubtitle(track) {
        if (player && typeof player.enableTextTrack === 'function') {
          if (!track || track === 'off') {
            player.disableTextTrack?.().catch(() => {});
          } else {
            player.enableTextTrack(String(track)).catch(() => {});
          }
        }
      },
      async getSubtitles() {
        if (player && typeof player.getTextTracks === 'function') {
          try {
            const tracks = await player.getTextTracks();
            return Array.isArray(tracks) ? tracks : [];
          } catch {
            return [];
          }
        }
        return [];
      },
      load(videoId) {
        if (player && typeof player.loadVideo === 'function') {
          player.loadVideo(videoId).catch(() => {});
        }
      },
      getState() {
        return { paused: isPaused, currentTime, duration, volume, muted: isMuted, playbackRate };
      },
    };

    if (player && typeof player.on === 'function') {
      player.on('play', () => {
        isPaused = false;
        adapter.emit?.('play', { state: { paused: false, currentTime, duration } });
      });

      player.on('pause', () => {
        isPaused = true;
        adapter.emit?.('pause', { state: { paused: true, currentTime, duration } });
      });

      player.on('timeupdate', data => {
        currentTime = data.seconds || 0;
        duration = data.duration || duration;
        adapter.emit?.('timeupdate', { state: { paused: isPaused, currentTime, duration } });
      });

      player.on('seeked', data => {
        currentTime = data.seconds || 0;
        adapter.emit?.('seeked', { state: { paused: isPaused, currentTime, duration } });
        adapter.emit?.('timeupdate', { state: { paused: isPaused, currentTime, duration } });
      });

      player.on('ended', () => {
        isPaused = true;
        adapter.emit?.('ended', { state: { paused: true, ended: true, currentTime: duration, duration } });
      });

      player.on('volumechange', data => {
        if (typeof data.volume === 'number') volume = data.volume;
        if (typeof data.muted === 'boolean') isMuted = data.muted;
        adapter.emit?.('volumechange', { state: { volume, muted: isMuted } });
      });
    }

    return adapter;
  }
}

export const vimeoProvider = new VimeoProvider();
export const createVimeoPlayer = options => vimeoProvider.create(options);
export const mountVimeoPlayer = (container, options) => vimeoProvider.mount(container, options);

export const vimeo = { create: createVimeoPlayer, mount: mountVimeoPlayer, provider: vimeoProvider };

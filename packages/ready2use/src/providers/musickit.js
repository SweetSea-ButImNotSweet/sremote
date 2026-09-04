import { BaseProvider } from '../core/base-provider.js';
import { loadMusicKitSdk } from '../utils/sdk-loader.js';

/**
 * Provider for Apple MusicKit JS v3 (Full API Controller).
 * Requires Apple Developer Token.
 */
export class AppleMusicKitProvider extends BaseProvider {
  constructor() {
    super('applemusickit');
  }

  async loadSdk() {
    return loadMusicKitSdk();
  }

  async initPlayer(options = {}) {
    const MusicKit = await this.loadSdk();

    if (!options.developerToken) {
      console.warn('[sremote:applemusickit] developerToken is required to configure Apple MusicKit JS.');
    }

    const config = {
      developerToken: options.developerToken || '',
      app: { name: options.appName || 'sremote App', build: options.appBuild || '1.0.0' },
      ...options.musicKitOptions,
    };

    let musicKitInstance;
    try {
      if (MusicKit.getInstance()) {
        musicKitInstance = MusicKit.getInstance();
      } else {
        musicKitInstance = await MusicKit.configure(config);
      }
    } catch {
      musicKitInstance = MusicKit.getInstance() || MusicKit;
    }

    // Auto load initial item/queue if provided
    if (options.song || options.album || options.playlist || options.url || options.id) {
      try {
        const item = options.song || options.album || options.playlist || options.url || options.id;
        if (typeof item === 'string') {
          await musicKitInstance.setQueue({ url: item });
        } else if (typeof item === 'object') {
          await musicKitInstance.setQueue(item);
        }
      } catch (err) {
        console.warn('[sremote:applemusickit] Failed to set initial queue:', err);
      }
    }

    return {
      player: musicKitInstance,
      element: null,
      iframe: null,
      destroy: () => {
        try {
          musicKitInstance?.stop?.();
        } catch {}
      },
    };
  }

  createAdapter(musicKitInstance) {
    const mk = musicKitInstance;
    let isPlaying = false;
    let duration = 0;
    let currentTime = 0;
    let volume = 1;
    let isMuted = false;

    const updateSnapshot = () => {
      try {
        if (mk) {
          isPlaying = Boolean(mk.isPlaying);
          currentTime = Number(mk.currentPlaybackTime) || 0;
          duration = Number(mk.currentPlaybackDuration) || 0;
          volume = typeof mk.volume === 'number' ? mk.volume : 1;
          isMuted = volume === 0;
        }
      } catch {}
      return { paused: !isPlaying, currentTime, duration, volume, muted: isMuted };
    };

    const adapter = {
      async play() {
        return mk?.play?.();
      },
      async pause() {
        return mk?.pause?.();
      },
      async toggle() {
        if (mk?.isPlaying) {
          return mk.pause();
        }
        return mk?.play?.();
      },
      async stop() {
        return mk?.stop?.();
      },
      async seek(offset) {
        if (mk) {
          const cur = Number(mk.currentPlaybackTime) || 0;
          const target = Math.max(0, cur + Number(offset));
          return mk.seekToTime?.(target);
        }
      },
      async seekTo(seconds) {
        return mk?.seekToTime?.(Number(seconds));
      },
      getCurrentTime() {
        return Number(mk?.currentPlaybackTime) || currentTime;
      },
      getDuration() {
        return Number(mk?.currentPlaybackDuration) || duration;
      },
      getVolume() {
        return typeof mk?.volume === 'number' ? mk.volume : volume;
      },
      setVolume(vol) {
        volume = Math.min(1, Math.max(0, Number(vol)));
        if (mk) {
          mk.volume = volume;
        }
      },
      getMuted() {
        return isMuted;
      },
      setMuted(muted) {
        isMuted = Boolean(muted);
        if (mk) {
          mk.volume = isMuted ? 0 : volume || 1;
        }
      },
      async next() {
        return mk?.skipToNextItem?.();
      },
      async previous() {
        return mk?.skipToPreviousItem?.();
      },
      async load(item) {
        if (!mk) return;
        if (typeof item === 'string') {
          return mk.setQueue({ url: item });
        }
        return mk.setQueue(item);
      },
      getState() {
        return updateSnapshot();
      },
      destroy() {
        try {
          if (mk && typeof mk.removeEventListener === 'function') {
            mk.removeEventListener('playbackStateDidChange', onPlaybackStateDidChange);
            mk.removeEventListener('playbackTimeDidChange', onPlaybackTimeDidChange);
          }
        } catch {}
      },
    };

    const onPlaybackStateDidChange = event => {
      isPlaying = Boolean(mk?.isPlaying);
      const state = updateSnapshot();
      if (isPlaying) {
        adapter.emit?.('play', { state, event });
      } else {
        adapter.emit?.('pause', { state, event });
      }
    };

    const onPlaybackTimeDidChange = () => {
      const state = updateSnapshot();
      adapter.emit?.('timeupdate', { state });
    };

    if (mk && typeof mk.addEventListener === 'function') {
      try {
        mk.addEventListener('playbackStateDidChange', onPlaybackStateDidChange);
        mk.addEventListener('playbackTimeDidChange', onPlaybackTimeDidChange);
        mk.addEventListener('playbackDurationDidChange', () => adapter.emit?.('durationchange', { state: updateSnapshot() }));
        mk.addEventListener('queueItemDidChange', event => adapter.emit?.('trackchange', { item: event.item, state: updateSnapshot() }));
      } catch {}
    }

    return adapter;
  }
}

export const appleMusicKitProvider = new AppleMusicKitProvider();

export const applemusickit = {
  create: options => appleMusicKitProvider.create(options),
  mount: (container, options) => appleMusicKitProvider.mount(container, options),
  provider: appleMusicKitProvider,
};

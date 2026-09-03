import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes } from '../core/dom-utils.js';
import { loadSoundCloudSdk } from '../utils/sdk-loader.js';

/**
 * Provider for SoundCloud Widget API
 */
export class SoundCloudProvider extends BaseProvider {
  constructor() {
    super('soundcloud');
  }

  async loadSdk() {
    return loadSoundCloudSdk();
  }

  async initPlayer(options, instanceId) {
    const SC = await this.loadSdk();
    const width = options.width || '100%';
    const height = options.height || (options.visual ? '300' : '166');
    const trackUrl = options.trackUrl || options.url || 'https://api.soundcloud.com/tracks/293';
    const autoPlay = options.autoplay ?? options.auto_play ?? false;
    const visual = options.visual ?? false;

    // Create iframe directly
    const iframe = document.createElement('iframe');
    iframe.id = `sremote-sc-${instanceId}`;
    iframe.allow = 'autoplay';
    iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&color=${encodeURIComponent(options.color || '#ff5500')}&auto_play=${autoPlay}&visual=${visual}&hide_cover=${Boolean(options.hideCover)}&show_teaser=${Boolean(options.showTeaser)}`;

    applyElementAttributes(iframe, width, height, instanceId);

    // SoundCloud Widget initialization
    const widget = SC.Widget(iframe);

    await new Promise(resolve => {
      widget.bind(SC.Widget.Events.READY, () => resolve());
      // Safety timeout in case READY takes too long or fails
      setTimeout(resolve, 2000);
    });

    return {
      player: widget,
      element: iframe,
      iframe,
      destroy: () => {
        try {
          if (widget && typeof widget.unbind === 'function' && SC?.Widget?.Events) {
            const events = [SC.Widget.Events.READY, SC.Widget.Events.PLAY, SC.Widget.Events.PAUSE, SC.Widget.Events.PLAY_PROGRESS, SC.Widget.Events.SEEK, SC.Widget.Events.FINISH];
            events.forEach(ev => widget.unbind(ev));
          }
        } catch {}
      },
    };
  }

  createAdapter(widget) {
    const SC = typeof window !== 'undefined' ? window.SC : null;
    let isPlaying = false;
    let duration = 0;
    let currentTime = 0;
    let volume = 1;
    let isMuted = false;

    if (widget && typeof widget.getDuration === 'function') {
      widget.getDuration(d => {
        duration = (d || 0) / 1000;
      });
    }

    const adapter = {
      play() {
        if (widget && typeof widget.play === 'function') {
          widget.play();
          isPlaying = true;
        }
      },
      pause() {
        if (widget && typeof widget.pause === 'function') {
          widget.pause();
          isPlaying = false;
        }
      },
      toggle() {
        if (widget && typeof widget.toggle === 'function') {
          widget.toggle();
          isPlaying = !isPlaying;
        }
      },
      stop() {
        if (widget && typeof widget.pause === 'function' && typeof widget.seekTo === 'function') {
          widget.pause();
          widget.seekTo(0);
          isPlaying = false;
        }
      },
      seek(offset) {
        if (widget && typeof widget.getPosition === 'function' && typeof widget.seekTo === 'function') {
          widget.getPosition(pos => {
            const targetMs = Math.max(0, (pos || 0) + Number(offset) * 1000);
            widget.seekTo(targetMs);
          });
        }
      },
      seekTo(seconds) {
        if (widget && typeof widget.seekTo === 'function') {
          widget.seekTo(Number(seconds) * 1000);
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
        if (widget && typeof widget.setVolume === 'function') {
          widget.setVolume(Math.min(100, Math.max(0, volume * 100)));
        }
      },
      getMuted() {
        return isMuted;
      },
      setMuted(muted) {
        isMuted = Boolean(muted);
        if (widget && typeof widget.setVolume === 'function') {
          widget.setVolume(isMuted ? 0 : volume * 100);
        }
      },
      paused() {
        return !isPlaying;
      },
      next() {
        if (widget && typeof widget.next === 'function') {
          widget.next();
        }
      },
      previous() {
        if (widget && typeof widget.prev === 'function') {
          widget.prev();
        }
      },
      load(trackUrl, options = {}) {
        if (widget && typeof widget.load === 'function') {
          widget.load(trackUrl, options);
        }
      },
      getState() {
        return { paused: !isPlaying, currentTime, duration, volume, muted: isMuted };
      },
    };

    if (SC && widget && typeof widget.bind === 'function') {
      widget.bind(SC.Widget.Events.PLAY, () => {
        isPlaying = true;
        adapter.emit?.('play', { state: { paused: false, currentTime, duration } });
      });

      widget.bind(SC.Widget.Events.PAUSE, () => {
        isPlaying = false;
        adapter.emit?.('pause', { state: { paused: true, currentTime, duration } });
      });

      widget.bind(SC.Widget.Events.PLAY_PROGRESS, data => {
        currentTime = (data?.currentPosition || 0) / 1000;
        if (data?.duration) duration = data.duration / 1000;
        adapter.emit?.('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
      });

      widget.bind(SC.Widget.Events.SEEK, data => {
        currentTime = (data?.currentPosition || 0) / 1000;
        adapter.emit?.('seeked', { state: { paused: !isPlaying, currentTime, duration } });
        adapter.emit?.('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
      });

      widget.bind(SC.Widget.Events.FINISH, () => {
        isPlaying = false;
        adapter.emit?.('ended', { state: { paused: true, ended: true, currentTime: duration, duration } });
      });
    }

    return adapter;
  }
}

export const soundcloudProvider = new SoundCloudProvider();

export const soundcloud = {
  create: options => soundcloudProvider.create(options),
  mount: (container, options) => soundcloudProvider.mount(container, options),
  provider: soundcloudProvider,
};

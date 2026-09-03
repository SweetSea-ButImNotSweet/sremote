import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes } from '../core/dom-utils.js';
import { loadMixcloudSdk } from '../utils/sdk-loader.js';

/**
 * Provider for Mixcloud Widget API
 */
export class MixcloudProvider extends BaseProvider {
  constructor() {
    super('mixcloud');
  }

  async loadSdk() {
    return loadMixcloudSdk();
  }

  async initPlayer(options, instanceId) {
    const Mixcloud = await this.loadSdk();
    const width = options.width || '100%';
    const height = options.height || (options.mini ? '60' : '120');
    const feed = options.feed || options.url || '/spartacus/party-time/';
    const autoPlay = options.autoplay ?? options.auto_play ?? false;
    const mini = options.mini ?? true;
    const hideCover = options.hideCover ?? true;
    const light = options.light ?? true;

    const iframe = document.createElement('iframe');
    iframe.id = `sremote-mixcloud-${instanceId}`;
    iframe.allow = 'autoplay';
    iframe.src = `https://player-widget.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(feed)}&hide_cover=${hideCover ? 1 : 0}&mini=${mini ? 1 : 0}&light=${light ? 1 : 0}&autoplay=${autoPlay ? 1 : 0}`;

    applyElementAttributes(iframe, width, height, instanceId);

    const widget = Mixcloud.PlayerWidget(iframe);

    if (widget.ready) {
      await Promise.race([widget.ready, new Promise(resolve => setTimeout(resolve, 2500))]);
    }

    return { player: widget, element: iframe, iframe, destroy: () => {} };
  }

  createAdapter(widget) {
    let isPlaying = false;
    let duration = 0;
    let currentTime = 0;

    if (widget && typeof widget.getDuration === 'function') {
      widget
        .getDuration()
        .then(d => {
          duration = d || 0;
        })
        .catch(() => {});
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
        if (widget && typeof widget.togglePlay === 'function') {
          widget.togglePlay();
          isPlaying = !isPlaying;
        } else {
          isPlaying ? adapter.pause() : adapter.play();
        }
      },
      stop() {
        if (widget && typeof widget.pause === 'function' && typeof widget.seek === 'function') {
          widget.pause();
          widget.seek(0);
          isPlaying = false;
        }
      },
      seek(offset) {
        if (widget && typeof widget.seek === 'function') {
          widget.seek(Math.max(0, currentTime + Number(offset)));
        }
      },
      seekTo(seconds) {
        if (widget && typeof widget.seek === 'function') {
          widget.seek(Number(seconds));
        }
      },
      getCurrentTime() {
        return currentTime;
      },
      getDuration() {
        return duration;
      },
      paused() {
        return !isPlaying;
      },
      load(feed) {
        if (widget && typeof widget.load === 'function') {
          widget.load(feed, true);
        }
      },
      getState() {
        return { paused: !isPlaying, currentTime, duration };
      },
    };

    if (widget?.events) {
      widget.events.play?.on?.(() => {
        isPlaying = true;
        adapter.emit?.('play', { state: { paused: false, currentTime, duration } });
      });

      widget.events.pause?.on?.(() => {
        isPlaying = false;
        adapter.emit?.('pause', { state: { paused: true, currentTime, duration } });
      });

      widget.events.progress?.on?.((pos, dur) => {
        currentTime = pos || 0;
        if (dur) duration = dur;
        adapter.emit?.('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
      });

      widget.events.ended?.on?.(() => {
        isPlaying = false;
        adapter.emit?.('ended', { state: { paused: true, ended: true, currentTime: duration, duration } });
      });
    }

    return adapter;
  }
}

export const mixcloudProvider = new MixcloudProvider();

export const mixcloud = {
  create: options => mixcloudProvider.create(options),
  mount: (container, options) => mixcloudProvider.mount(container, options),
  provider: mixcloudProvider,
};

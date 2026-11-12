import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes, waitForIframeLoad } from '../core/dom-utils.js';

/**
 * Provider for NicoNico Player (postMessage protocol)
 */
export class NicoNicoProvider extends BaseProvider {
  constructor() {
    super('niconico');
  }

  async initPlayer(options, instanceId) {
    const width = options.width || '100%';
    const height = options.height || '100%';
    const watchId = options.watchId || options.videoId || options.id || 'so46693656';
    const playerId = `niconico-player-${instanceId}`;

    const iframe = document.createElement('iframe');
    iframe.id = playerId;
    iframe.allow = 'autoplay; encrypted-media; fullscreen';
    iframe.allowFullscreen = true;
    iframe.src = `https://embed.nicovideo.jp/watch/${watchId}?jsapi=1&playerId=${playerId}&autoplay=${options.autoplay ? 1 : 0}`;
    iframe.referrerPolicy = 'no-referrer-when-downgrade';

    applyElementAttributes(iframe, width, height, instanceId);

    await new Promise(resolve => {
      let resolved = false;
      let timer = null;

      const onDone = () => {
        if (resolved) return;
        resolved = true;
        if (timer) clearTimeout(timer);
        if (typeof window !== 'undefined') {
          window.removeEventListener('message', onMsg);
        }
        resolve();
      };

      const onMsg = e => {
        if (e.origin !== 'https://embed.nicovideo.jp') return;
        let data = e.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }
        if (data?.playerId === playerId && (data?.eventName === 'loadComplete' || data?.eventName === 'playerMetadataChange')) {
          onDone();
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('message', onMsg);
      }

      waitForIframeLoad(iframe, options.timeout || 3500).then(onDone);
      timer = setTimeout(onDone, options.timeout || 4000);
    });

    return { player: { iframe, playerId }, element: iframe, iframe, destroy: () => {} };
  }

  createAdapter(playerInfo, context) {
    const iframe = context?.iframe || playerInfo?.iframe;
    const playerId = playerInfo?.playerId || iframe?.id;
    let duration = 0;
    let currentTime = 0;
    let isPlaying = false;
    let volume = 1;
    let repeatMode = 'off';

    function sendToNico(eventName, data = {}) {
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ sourceConnectorType: 1, playerId, eventName, data }, 'https://embed.nicovideo.jp');
      }
    }

    const adapter = {
      interventions: { autoEmit: false },
      play() {
        sendToNico('play');
      },
      pause() {
        sendToNico('pause');
      },
      stop() {
        sendToNico('pause');
        sendToNico('seek', { time: 0 });
      },
      seek(offset) {
        const target = Math.max(0, currentTime + Number(offset));
        this.seekTo(target);
      },
      seekTo(seconds) {
        sendToNico('seek', { time: Number(seconds) * 1000 });
      },
      setCurrentTime(seconds) {
        this.seekTo(seconds);
      },
      getVolume() {
        return volume;
      },
      setVolume(vol) {
        volume = Number(vol);
        sendToNico('volumeChange', { volume });
      },
      setMuted(muted) {
        sendToNico('mute', { mute: Boolean(muted) });
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
      repeat(mode) {
        repeatMode = mode === 'one' || mode === true ? 'one' : mode === 'all' ? 'all' : 'off';
      },
      getState() {
        return { paused: !isPlaying, currentTime, duration, volume };
      },
      destroy() {
        if (typeof window !== 'undefined') {
          window.removeEventListener('message', messageHandler);
        }
      },
    };

    const messageHandler = e => {
      if (e.origin !== 'https://embed.nicovideo.jp') return;
      let msgData = e.data;
      if (typeof msgData === 'string') {
        try {
          msgData = JSON.parse(msgData);
        } catch {
          return;
        }
      }
      if (msgData?.playerId !== playerId) return;

      const { eventName, data } = msgData;

      if (eventName === 'loadComplete') {
        if (data?.videoInfo?.lengthInSeconds) {
          duration = data.videoInfo.lengthInSeconds;
        }
      } else if (eventName === 'playerMetadataChange') {
        if (data?.duration !== undefined) duration = data.duration / 1000;
        if (data?.currentTime !== undefined) {
          currentTime = data.currentTime / 1000;
          adapter.emit?.('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
        }
      } else if (eventName === 'playerStatusChange') {
        if (data?.playerStatus === 2) {
          // Playing
          isPlaying = true;
          adapter.emit?.('play', { state: { paused: false, currentTime, duration } });
        } else if (data?.playerStatus === 3) {
          // Paused
          isPlaying = false;
          adapter.emit?.('pause', { state: { paused: true, currentTime, duration } });
        } else if (data?.playerStatus === 4) {
          if (repeatMode === 'one') {
            adapter.seekTo(0);
            adapter.play();
            return;
          }
          // Ended
          isPlaying = false;
          adapter.emit?.('ended', { state: { paused: true, ended: true, currentTime: duration, duration } });
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('message', messageHandler);
    }

    return adapter;
  }
}

export const niconicoProvider = new NicoNicoProvider();

export const niconico = {
  create: options => niconicoProvider.create(options),
  mount: (container, options) => niconicoProvider.mount(container, options),
  provider: niconicoProvider,
};

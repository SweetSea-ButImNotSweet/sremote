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
        if (e.origin === 'https://embed.nicovideo.jp' && e.data?.playerId === playerId && (e.data?.eventName === 'loadComplete' || e.data?.eventName === 'playerMetadataChange')) {
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

    function sendToNico(eventName, data = {}) {
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ sourceConnectorType: 1, playerId, eventName, data }, 'https://embed.nicovideo.jp');
      }
    }

    const adapter = {
      play() {
        sendToNico('play');
      },
      pause() {
        sendToNico('pause');
      },
      toggle() {
        isPlaying ? sendToNico('pause') : sendToNico('play');
      },
      stop() {
        sendToNico('pause');
        sendToNico('seek', { time: 0 });
      },
      seek(offset) {
        const target = Math.max(0, currentTime + Number(offset));
        sendToNico('seek', { time: target * 1000 });
      },
      seekTo(seconds) {
        sendToNico('seek', { time: Number(seconds) * 1000 });
      },
      getVolume() {
        return volume;
      },
      setVolume(vol) {
        volume = Number(vol);
        sendToNico('volumeChange', { volume: volume });
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
      getState() {
        return { paused: !isPlaying, currentTime, duration, volume };
      },
    };

    const messageHandler = e => {
      if (e.origin !== 'https://embed.nicovideo.jp') return;
      if (e.data?.playerId !== playerId) return;

      const { eventName, data } = e.data;

      if (eventName === 'loadComplete') {
        if (data?.videoInfo?.lengthInSeconds) {
          duration = data.videoInfo.lengthInSeconds / 1000;
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
export const createNicoNicoPlayer = options => niconicoProvider.create(options);
export const mountNicoNicoPlayer = (container, options) => niconicoProvider.mount(container, options);

export const niconico = { create: createNicoNicoPlayer, mount: mountNicoNicoPlayer, provider: niconicoProvider };

import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes, waitForIframeLoad } from '../core/dom-utils.js';

/**
 * Provider for TikTok Official Embed Player API (v1)
 */
export class TikTokProvider extends BaseProvider {
  constructor() {
    super('tiktok');
  }

  async initPlayer(options, instanceId) {
    const width = options.width || '100%';
    const height = options.height || '600px';
    const videoId = options.videoId || options.id || '6718335390845095173';

    const iframe = document.createElement('iframe');
    iframe.id = `sremote-tiktok-${instanceId}`;
    iframe.allow = 'autoplay; fullscreen; encrypted-media';
    iframe.allowFullscreen = true;
    iframe.src = `https://www.tiktok.com/player/v1/${videoId}?music_info=${options.musicInfo !== false ? 1 : 0}&description=${options.description !== false ? 1 : 0}&autoplay=${options.autoplay ? 1 : 0}`;

    applyElementAttributes(iframe, width, height, instanceId);

    // Wait for TikTok postMessage handshake or iframe load
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
        if (e.origin === 'https://www.tiktok.com' && e.data?.['x-tiktok-player']) {
          onDone();
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('message', onMsg);
      }

      waitForIframeLoad(iframe, options.timeout || 3500).then(onDone);
      timer = setTimeout(onDone, options.timeout || 4000);
    });

    return { player: { iframe }, element: iframe, iframe, destroy: () => {} };
  }

  createAdapter(playerInfo, context) {
    const iframe = context?.iframe || playerInfo?.iframe;
    let isPlaying = false;
    let isMuted = false;
    let currentTime = 0;
    let duration = 0;

    function sendToTikTok(type, value) {
      if (iframe?.contentWindow) {
        const payload = { 'x-tiktok-player': true, type };
        if (value !== undefined) payload.value = value;
        iframe.contentWindow.postMessage(payload, 'https://www.tiktok.com');
      }
    }

    const adapter = {
      play() {
        sendToTikTok('play');
      },
      pause() {
        sendToTikTok('pause');
      },
      toggle() {
        isPlaying ? sendToTikTok('pause') : sendToTikTok('play');
      },
      stop() {
        sendToTikTok('pause');
        sendToTikTok('seekTo', 0);
      },
      seek(offset) {
        const target = Math.max(0, currentTime + Number(offset));
        currentTime = target;
        sendToTikTok('seekTo', target);
      },
      seekTo(seconds) {
        currentTime = Number(seconds);
        sendToTikTok('seekTo', currentTime);
      },
      getVolume() {
        return isMuted ? 0 : 1;
      },
      setVolume(vol) {
        if (Number(vol) <= 0) {
          adapter.setMuted(true);
        } else if (isMuted) {
          adapter.setMuted(false);
        }
      },
      getMuted() {
        return isMuted;
      },
      setMuted(m) {
        isMuted = m !== undefined ? Boolean(m) : !isMuted;
        sendToTikTok(isMuted ? 'mute' : 'unMute');
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
        return { paused: !isPlaying, currentTime, duration, muted: isMuted };
      },
      destroy() {
        if (typeof window !== 'undefined') {
          window.removeEventListener('message', messageHandler);
        }
      },
    };

    const messageHandler = e => {
      if (e.origin !== 'https://www.tiktok.com') return;
      if (!e.data || !e.data['x-tiktok-player']) return;

      const { type, value } = e.data;

      if (type === 'onStateChange') {
        // 0: ended, 1: playing, 2: paused, 3: buffering
        if (value === 1) {
          isPlaying = true;
          adapter.emit?.('play', { state: { paused: false, currentTime, duration } });
        } else if (value === 2) {
          isPlaying = false;
          adapter.emit?.('pause', { state: { paused: true, currentTime, duration } });
        } else if (value === 0) {
          isPlaying = false;
          adapter.emit?.('ended', { state: { paused: true, ended: true, currentTime: duration, duration } });
        }
      } else if (type === 'onCurrentTime') {
        if (value) {
          if (typeof value.currentTime === 'number') currentTime = value.currentTime;
          if (typeof value.duration === 'number') duration = value.duration;
          adapter.emit?.('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
        }
      } else if (type === 'onMute') {
        isMuted = Boolean(value);
        adapter.emit?.('volumechange', { state: { muted: isMuted } });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('message', messageHandler);
    }

    return adapter;
  }
}

export const tiktokProvider = new TikTokProvider();

export const tiktok = { create: options => tiktokProvider.create(options), mount: (container, options) => tiktokProvider.mount(container, options), provider: tiktokProvider };

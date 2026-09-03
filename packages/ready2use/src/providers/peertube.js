import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes, createTempNode } from '../core/dom-utils.js';
import { loadPeerTubeSdk } from '../utils/sdk-loader.js';

/**
 * Parses PeerTube embed URL or video URL into an embeddable URL.
 * @param {string} url
 * @returns {string}
 */
function normalizePeerTubeEmbedUrl(url) {
  if (!url) return 'https://peertube.tv/videos/embed/78e0e6aa-d575-4752-9ef8-e047c870233d?api=1';
  let embedUrl = url;
  if (embedUrl.includes('/videos/watch/')) {
    embedUrl = embedUrl.replace('/videos/watch/', '/videos/embed/');
  }
  if (!embedUrl.includes('/videos/embed/')) {
    embedUrl = `https://peertube.tv/videos/embed/${url}`;
  }
  const urlObj = new URL(embedUrl, typeof window !== 'undefined' ? window.location.origin : 'https://peertube.tv');
  urlObj.searchParams.set('api', '1');
  return urlObj.toString();
}

/**
 * Provider for PeerTube Embedded Player
 */
export class PeerTubeProvider extends BaseProvider {
  constructor() {
    super('peertube');
  }

  async loadSdk() {
    return loadPeerTubeSdk();
  }

  async initPlayer(options, instanceId) {
    const PeerTubePlayer = await this.loadSdk();
    const width = options.width || '100%';
    const height = options.height || '100%';
    const videoUrl = options.videoUrl || options.url || options.videoId || 'https://peertube.tv/videos/watch/78e0e6aa-d575-4752-9ef8-e047c870233d';

    const { hiddenWrapper, tempNode, cleanup } = createTempNode(instanceId, width, height);

    const iframe = document.createElement('iframe');
    iframe.id = `sremote-peertube-${instanceId}`;
    iframe.allow = 'autoplay; fullscreen; encrypted-media';
    iframe.allowFullscreen = true;
    iframe.src = normalizePeerTubeEmbedUrl(videoUrl);

    tempNode.appendChild(iframe);

    let player = null;
    if (PeerTubePlayer) {
      player = new PeerTubePlayer(iframe);
      await Promise.race([player.ready, new Promise(resolve => setTimeout(resolve, options.timeout || 3500))]);
    }

    if (iframe.parentNode === hiddenWrapper) {
      hiddenWrapper.removeChild(iframe);
    }
    cleanup();

    applyElementAttributes(iframe, width, height, instanceId);

    return {
      player,
      element: iframe,
      iframe,
      destroy: () => {
        try {
          cleanup();
        } catch {}
      },
    };
  }

  createAdapter(player) {
    let isPlaying = false;
    let duration = 0;
    let currentTime = 0;
    let volume = 1;
    let playbackRate = 1;

    // Prefetch values
    if (player) {
      player
        .getDuration?.()
        .then(d => {
          duration = d || 0;
        })
        .catch(() => {});
      player
        .getVolume?.()
        .then(v => {
          volume = v || 1;
        })
        .catch(() => {});
      player
        .getPlaybackRate?.()
        .then(r => {
          playbackRate = r || 1;
        })
        .catch(() => {});
    }

    const adapter = {
      play() {
        player?.play?.().catch(() => {});
      },
      pause() {
        player?.pause?.().catch(() => {});
      },
      toggle() {
        isPlaying ? adapter.pause() : adapter.play();
      },
      stop() {
        if (player) {
          player.pause?.().catch(() => {});
          player.seek?.(0).catch(() => {});
        }
      },
      seek(offset) {
        if (player) {
          player
            .getCurrentPosition?.()
            .then(pos => {
              player.seek?.(Math.max(0, (pos || 0) + Number(offset))).catch(() => {});
            })
            .catch(() => {});
        }
      },
      seekTo(seconds) {
        player?.seek?.(Number(seconds)).catch(() => {});
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
        player?.setVolume?.(Math.min(1, Math.max(0, volume))).catch(() => {});
      },
      getMuted() {
        return volume === 0;
      },
      setMuted(muted) {
        if (muted) {
          player?.setVolume?.(0).catch(() => {});
        } else {
          player?.setVolume?.(volume || 1).catch(() => {});
        }
      },
      getPlaybackRate() {
        return playbackRate;
      },
      setPlaybackRate(rate) {
        playbackRate = Number(rate);
        player?.setPlaybackRate?.(playbackRate).catch(() => {});
      },
      paused() {
        return !isPlaying;
      },
      getState() {
        return { paused: !isPlaying, currentTime, duration, volume, playbackRate };
      },
    };

    if (player && typeof player.addEventListener === 'function') {
      player.addEventListener('playbackStatusChange', status => {
        if (status === 'playing') {
          isPlaying = true;
          adapter.emit?.('play', { state: { paused: false, currentTime, duration } });
        } else if (status === 'paused') {
          isPlaying = false;
          adapter.emit?.('pause', { state: { paused: true, currentTime, duration } });
        } else if (status === 'ended') {
          isPlaying = false;
          adapter.emit?.('ended', { state: { paused: true, ended: true, currentTime: duration, duration } });
        }
      });

      player.addEventListener('playbackStatusUpdate', data => {
        if (typeof data?.position === 'number') currentTime = data.position;
        if (typeof data?.duration === 'number') duration = data.duration;
        if (typeof data?.volume === 'number') volume = data.volume;
        if (typeof data?.playbackRate === 'number') playbackRate = data.playbackRate;
        adapter.emit?.('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
      });
    }

    return adapter;
  }
}

export const peerTubeProvider = new PeerTubeProvider();

export const peertube = {
  create: options => peerTubeProvider.create(options),
  mount: (container, options) => peerTubeProvider.mount(container, options),
  provider: peerTubeProvider,
};

import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes, createTempNode } from '../core/dom-utils.js';
import { loadFacebookSdk } from '../utils/sdk-loader.js';

/**
 * Provider for Facebook Video Embed & Embedded Video Player API
 * Reference: https://developers.facebook.com/docs/plugins/embedded-video-player/api
 */
export class FacebookProvider extends BaseProvider {
  constructor() {
    super('facebook');
  }

  async loadSdk(appId = '') {
    return loadFacebookSdk(appId);
  }

  async initPlayer(options, instanceId) {
    const width = options.width || '500px';
    const height = options.height || 'auto';
    const videoUrl = options.videoUrl || options.url || 'https://www.facebook.com/facebook/videos/10153231379946729/';
    const fbDomId = `sremote-facebook-video-${instanceId}`;

    const { hiddenWrapper, tempNode, cleanup } = createTempNode(instanceId, width, height);

    const fbVideo = document.createElement('div');
    fbVideo.id = fbDomId;
    fbVideo.className = 'fb-video';
    fbVideo.setAttribute('data-href', videoUrl);
    fbVideo.setAttribute('data-width', typeof width === 'number' ? `${width}` : width);
    fbVideo.setAttribute('data-show-text', options.showText ? 'true' : 'false');
    fbVideo.setAttribute('data-autoplay', options.autoplay ? 'true' : 'false');
    fbVideo.setAttribute('data-allowfullscreen', 'true');
    if (options.controls !== undefined) {
      fbVideo.setAttribute('data-controls', options.controls ? 'true' : 'false');
    }
    if (options.muted) {
      fbVideo.setAttribute('data-muted', 'true');
    }

    tempNode.appendChild(fbVideo);

    const FB = await this.loadSdk(options.appId || '');

    return new Promise(resolve => {
      let resolved = false;
      let playerInstance = null;
      let timer = null;

      const finishInit = (nativePlayer = null) => {
        if (resolved) return;
        resolved = true;
        if (timer) clearTimeout(timer);

        const iframe = tempNode.querySelector('iframe');
        const element = tempNode;

        if (element && element.parentNode === hiddenWrapper) {
          hiddenWrapper.removeChild(element);
        }
        cleanup();

        applyElementAttributes(element, width, height, instanceId);

        resolve({
          player: nativePlayer || playerInstance || { container: element, videoUrl },
          element,
          iframe: iframe || (element?.tagName === 'IFRAME' ? element : null),
          destroy: () => {
            cleanup();
          },
        });
      };

      // Subscribe to xfbml.ready event from Facebook SDK
      if (FB && typeof FB.Event?.subscribe === 'function') {
        const onXfbmlReady = msg => {
          if (msg && msg.type === 'video' && msg.id === fbDomId) {
            playerInstance = msg.instance;
            try {
              FB.Event?.unsubscribe?.('xfbml.ready', onXfbmlReady);
            } catch {}
            finishInit(playerInstance);
          }
        };

        FB.Event.subscribe('xfbml.ready', onXfbmlReady);
      }

      if (FB && typeof FB.XFBML?.parse === 'function') {
        try {
          FB.XFBML.parse(tempNode);
        } catch {
          finishInit(null);
        }
      } else {
        finishInit(null);
      }

      // Safety timeout: in case xfbml.ready takes too long or network blocked
      timer = setTimeout(() => {
        finishInit(playerInstance);
      }, options.timeout || 4000);
    });
  }

  createAdapter(player) {
    let isPlaying = false;
    let duration = 0;
    let currentTime = 0;
    let volume = 1;
    let isMuted = false;
    let timeupdateTimer = null;

    const updateSnapshot = () => {
      try {
        if (player) {
          if (typeof player.isPlaying === 'function') isPlaying = Boolean(player.isPlaying());
          if (typeof player.getCurrentPosition === 'function') currentTime = Number(player.getCurrentPosition()) || 0;
          if (typeof player.getDuration === 'function') duration = Number(player.getDuration()) || 0;
          if (typeof player.getVolume === 'function') volume = Number(player.getVolume()) || 1;
          if (typeof player.isMuted === 'function') isMuted = Boolean(player.isMuted());
        }
      } catch {}
      return {
        paused: !isPlaying,
        currentTime,
        duration,
        volume,
        muted: isMuted,
      };
    };

    const startTimeupdate = () => {
      if (timeupdateTimer) return;
      timeupdateTimer = setInterval(() => {
        const state = updateSnapshot();
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
        player?.play?.();
      },
      pause() {
        player?.pause?.();
      },
      toggle() {
        if (player && typeof player.isPlaying === 'function') {
          player.isPlaying() ? player.pause?.() : player.play?.();
        } else {
          isPlaying ? adapter.pause() : adapter.play();
        }
      },
      stop() {
        if (player && typeof player.pause === 'function' && typeof player.seek === 'function') {
          player.pause();
          player.seek(0);
        }
      },
      seek(offset) {
        if (player && typeof player.seek === 'function') {
          const cur = typeof player.getCurrentPosition === 'function' ? player.getCurrentPosition() : currentTime;
          const target = Math.max(0, (cur || 0) + Number(offset));
          player.seek(target);
        }
      },
      seekTo(seconds) {
        player?.seek?.(Number(seconds));
      },
      getCurrentTime() {
        return typeof player?.getCurrentPosition === 'function' ? player.getCurrentPosition() : currentTime;
      },
      getDuration() {
        return typeof player?.getDuration === 'function' ? player.getDuration() : duration;
      },
      getVolume() {
        return typeof player?.getVolume === 'function' ? player.getVolume() : volume;
      },
      setVolume(vol) {
        volume = Number(vol);
        player?.setVolume?.(Math.min(1, Math.max(0, volume)));
      },
      getMuted() {
        return typeof player?.isMuted === 'function' ? player.isMuted() : isMuted;
      },
      setMuted(muted) {
        isMuted = Boolean(muted);
        if (player) {
          if (isMuted) {
            player.mute?.();
          } else {
            player.unmute?.();
          }
        }
      },
      paused() {
        if (player && typeof player.isPlaying === 'function') {
          return !player.isPlaying();
        }
        return !isPlaying;
      },
      getState() {
        return updateSnapshot();
      },
      destroy() {
        stopTimeupdate();
      },
    };

    // Bind Facebook Player Events
    if (player && typeof player.subscribe === 'function') {
      try {
        player.subscribe('startedPlaying', () => {
          isPlaying = true;
          startTimeupdate();
          const state = updateSnapshot();
          adapter.emit?.('play', { state });
        });

        player.subscribe('paused', () => {
          isPlaying = false;
          stopTimeupdate();
          const state = updateSnapshot();
          adapter.emit?.('pause', { state });
        });

        player.subscribe('finishedPlaying', () => {
          isPlaying = false;
          stopTimeupdate();
          const state = { ...updateSnapshot(), paused: true, ended: true };
          adapter.emit?.('ended', { state });
        });

        player.subscribe('bufferingStarted', () => {
          adapter.emit?.('buffering', { state: updateSnapshot() });
        });

        player.subscribe('bufferingEnded', () => {
          adapter.emit?.('buffered', { state: updateSnapshot() });
        });

        player.subscribe('error', error => {
          adapter.emit?.('error', { error });
        });
      } catch {}
    }

    return adapter;
  }
}

export const facebookProvider = new FacebookProvider();

export const facebook = {
  create: options => facebookProvider.create(options),
  mount: (container, options) => facebookProvider.mount(container, options),
  provider: facebookProvider,
};

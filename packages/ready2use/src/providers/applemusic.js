import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes, createTempNode } from '../core/dom-utils.js';

/**
 * Builds Apple Music Embed URL from raw input (supports song, album, playlist URLs).
 * @param {string} input
 * @returns {string}
 */
function buildAppleMusicEmbedUrl(input) {
  if (!input) return 'https://embed.music.apple.com/us/album/never-gonna-give-you-up/1559523357?i=1559523359';
  const str = String(input).trim();
  if (str.startsWith('https://embed.music.apple.com/')) {
    return str;
  }
  if (str.startsWith('https://music.apple.com/')) {
    return str.replace('https://music.apple.com/', 'https://embed.music.apple.com/');
  }
  return `https://embed.music.apple.com/${str.replace(/^\//, '')}`;
}

/**
 * Provider for Apple Music Embed (Iframe Player).
 * Does not require Apple Developer Token.
 */
export class AppleMusicProvider extends BaseProvider {
  constructor() {
    super('applemusic');
  }

  async loadSdk() {
    return true;
  }

  async initPlayer(options, instanceId) {
    const width = options.width || '100%';
    const height = options.height || '450px';
    const embedSrc = buildAppleMusicEmbedUrl(options.url || options.src || options.albumId || options.playlistId || options.songId);

    const { hiddenWrapper, tempNode, cleanup } = createTempNode(instanceId, width, height);

    const iframe = document.createElement('iframe');
    iframe.id = `sremote-applemusic-${instanceId}`;
    iframe.src = embedSrc;
    iframe.allow = 'autoplay *; encrypted-media *; fullscreen *; clipboard-write';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('sandbox', 'allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.maxWidth = typeof width === 'number' ? `${width}px` : width;
    iframe.style.borderRadius = '12px';

    tempNode.appendChild(iframe);

    return new Promise(resolve => {
      let resolved = false;
      let timer = null;

      const finishInit = () => {
        if (resolved) return;
        resolved = true;
        if (timer) clearTimeout(timer);

        const element = iframe;

        if (element && element.parentNode === hiddenWrapper) {
          hiddenWrapper.removeChild(element);
        }
        cleanup();

        applyElementAttributes(element, width, height, instanceId);

        resolve({
          player: { iframe, src: embedSrc },
          element,
          iframe,
          destroy: () => {
            cleanup();
          },
        });
      };

      iframe.addEventListener('load', () => {
        finishInit();
      });

      timer = setTimeout(() => {
        finishInit();
      }, options.timeout || 4000);
    });
  }

  createAdapter(playerInfo, context) {
    const iframe = context?.iframe || playerInfo?.iframe;
    const element = context?.element || playerInfo?.element || iframe;

    return {
      load(newUrl) {
        if (iframe) {
          iframe.src = buildAppleMusicEmbedUrl(newUrl);
        }
      },
      getState() {
        return { iframe, element, src: iframe?.src || playerInfo?.src };
      },
    };
  }
}

export const appleMusicProvider = new AppleMusicProvider();

export const applemusic = {
  create: options => appleMusicProvider.create(options),
  mount: (container, options) => appleMusicProvider.mount(container, options),
  provider: appleMusicProvider,
};

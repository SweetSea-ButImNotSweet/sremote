import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes, createTempNode } from '../core/dom-utils.js';
import { loadInstagramSdk } from '../utils/sdk-loader.js';

/**
 * Normalizes Instagram URL (post, reel, tv).
 * @param {string} input
 * @returns {string}
 */
function normalizeInstagramUrl(input) {
  if (!input) return 'https://www.instagram.com/p/CUb-r01P9zx/';
  const str = String(input).trim();
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }
  // If shortcode provided
  return `https://www.instagram.com/p/${str}/`;
}

/**
 * Provider for Instagram Post / Reel Embed.
 * Note: Instagram Embed does not offer a two-way JavaScript media playback controller API.
 * The adapter provides lifecycle helpers and container state.
 */
export class InstagramProvider extends BaseProvider {
  constructor() {
    super('instagram');
  }

  async loadSdk() {
    return loadInstagramSdk();
  }

  async initPlayer(options, instanceId) {
    const instgrm = await this.loadSdk();
    const width = options.width || '540px';
    const height = options.height || 'auto';
    const postUrl = normalizeInstagramUrl(options.postUrl || options.url || options.id || options.videoId);

    const { hiddenWrapper, tempNode, cleanup } = createTempNode(instanceId, width, height);

    const blockquote = document.createElement('blockquote');
    blockquote.className = 'instagram-media';
    blockquote.setAttribute('data-instgrm-permalink', postUrl);
    blockquote.setAttribute('data-instgrm-version', '14');
    blockquote.style.background = '#FFF';
    blockquote.style.border = '0';
    blockquote.style.borderRadius = '3px';
    blockquote.style.boxShadow = '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)';
    blockquote.style.margin = '1px';
    blockquote.style.maxWidth = typeof width === 'number' ? `${width}px` : width;
    blockquote.style.minWidth = '326px';
    blockquote.style.padding = '0';
    blockquote.style.width = 'calc(100% - 2px)';

    if (options.captioned) {
      blockquote.setAttribute('data-instgrm-captioned', '');
    }

    const anchor = document.createElement('a');
    anchor.href = postUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = 'View this post on Instagram';
    blockquote.appendChild(anchor);

    tempNode.appendChild(blockquote);

    return new Promise(resolve => {
      let resolved = false;
      let timer = null;

      const finishInit = () => {
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
          player: { postUrl, element, iframe },
          element,
          iframe: iframe || (element?.tagName === 'IFRAME' ? element : null),
          destroy: () => {
            cleanup();
          },
        });
      };

      if (instgrm && instgrm.Embeds && typeof instgrm.Embeds.process === 'function') {
        try {
          instgrm.Embeds.process(tempNode);
        } catch {}
      }

      // Check for rendered iframe periodically or timeout
      const pollInterval = setInterval(() => {
        if (tempNode.querySelector('iframe')) {
          clearInterval(pollInterval);
          finishInit();
        }
      }, 100);

      timer = setTimeout(() => {
        clearInterval(pollInterval);
        finishInit();
      }, options.timeout || 4000);
    });
  }

  createAdapter(playerInfo, context) {
    const element = context?.element || playerInfo?.element;
    const iframe = context?.iframe || playerInfo?.iframe;

    return {
      load(newUrl) {
        if (typeof window !== 'undefined' && window.instgrm?.Embeds && element) {
          const url = normalizeInstagramUrl(newUrl);
          element.innerHTML = `<blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14"><a href="${url}"></a></blockquote>`;
          window.instgrm.Embeds.process(element);
        }
      },
      getState() {
        return { element, iframe, postUrl: playerInfo?.postUrl, supportsDirectControl: false, note: 'Instagram embed does not support direct play/pause controller API.' };
      },
    };
  }
}

export const instagramProvider = new InstagramProvider();

export const instagram = {
  create: options => instagramProvider.create(options),
  mount: (container, options) => instagramProvider.mount(container, options),
  provider: instagramProvider,
};

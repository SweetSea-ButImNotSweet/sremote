import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes, createTempNode } from '../core/dom-utils.js';
import { loadThreadsSdk } from '../utils/sdk-loader.js';

/**
 * Normalizes Threads URL (post).
 * @param {string} input
 * @returns {string}
 */
function normalizeThreadsUrl(input) {
  if (!input) return 'https://www.threads.net/@zuck/post/CuUs5G5rB8P';
  const str = String(input).trim();
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }
  return `https://www.threads.net/post/${str}`;
}

/**
 * Provider for Threads Post / Video Embed.
 * Note: Threads Embed does not offer a two-way JavaScript media playback controller API.
 * The adapter provides lifecycle helpers and container state.
 */
export class ThreadsProvider extends BaseProvider {
  constructor() {
    super('threads');
  }

  async loadSdk() {
    return loadThreadsSdk();
  }

  async initPlayer(options, instanceId) {
    await this.loadSdk();
    const width = options.width || '540px';
    const height = options.height || 'auto';
    const postUrl = normalizeThreadsUrl(options.postUrl || options.url || options.id || options.videoId);

    const { hiddenWrapper, tempNode, cleanup } = createTempNode(instanceId, width, height);

    const blockquote = document.createElement('blockquote');
    blockquote.className = 'text-post-media';
    blockquote.setAttribute('data-text-post-permalink', postUrl);
    blockquote.setAttribute('data-text-post-version', '0');
    blockquote.style.background = '#FFF';
    blockquote.style.border = '0';
    blockquote.style.borderRadius = '8px';
    blockquote.style.boxShadow = '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)';
    blockquote.style.margin = '1px';
    blockquote.style.maxWidth = typeof width === 'number' ? `${width}px` : width;
    blockquote.style.minWidth = '326px';
    blockquote.style.padding = '0';
    blockquote.style.width = 'calc(100% - 2px)';

    const anchor = document.createElement('a');
    anchor.href = postUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = 'Post on Threads';
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

      // Check for rendered iframe or timeout
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
        if (element) {
          const url = normalizeThreadsUrl(newUrl);
          element.innerHTML = `<blockquote class="text-post-media" data-text-post-permalink="${url}" data-text-post-version="0"><a href="${url}"></a></blockquote>`;
          if (typeof window !== 'undefined' && window.threads?.embeds) {
            try {
              window.threads.embeds.process();
            } catch {}
          }
        }
      },
      getState() {
        return { element, iframe, postUrl: playerInfo?.postUrl, supportsDirectControl: false, note: 'Threads embed does not support direct play/pause controller API.' };
      },
    };
  }
}

export const threadsProvider = new ThreadsProvider();

export const threads = { create: options => threadsProvider.create(options), mount: (container, options) => threadsProvider.mount(container, options), provider: threadsProvider };

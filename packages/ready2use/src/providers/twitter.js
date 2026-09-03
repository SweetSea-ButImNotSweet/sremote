import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes, createTempNode } from '../core/dom-utils.js';
import { loadTwitterSdk } from '../utils/sdk-loader.js';

/**
 * Parses tweet ID from URL or string.
 * @param {string|number} input
 * @returns {string}
 */
function extractTweetId(input) {
  if (!input) return '20';
  const str = String(input).trim();
  const match = str.match(/status(?:es)?\/(\d+)/i) || str.match(/^(\d+)$/);
  return match ? match[1] : str;
}

/**
 * Provider for Twitter / X Tweet Embed Video
 */
export class TwitterProvider extends BaseProvider {
  constructor() {
    super('twitter');
  }

  async loadSdk() {
    return loadTwitterSdk();
  }

  async initPlayer(options, instanceId) {
    const twttr = await this.loadSdk();
    const width = options.width || '100%';
    const height = options.height || 'auto';
    const tweetId = extractTweetId(options.tweetId || options.id || options.url || options.videoId || '20');

    const { hiddenWrapper, tempNode, cleanup } = createTempNode(instanceId, width, height);

    const tweetContainer = document.createElement('div');
    tweetContainer.id = `sremote-twitter-${instanceId}`;
    tempNode.appendChild(tweetContainer);

    const tweetOptions = {
      theme: options.theme || 'dark',
      align: options.align || 'center',
      conversation: options.conversation || 'none',
      cards: options.cards || 'visible',
      ...options.tweetOptions,
    };

    return new Promise(resolve => {
      let resolved = false;
      let timer = null;

      const finishInit = (renderedElement = null) => {
        if (resolved) return;
        resolved = true;
        if (timer) clearTimeout(timer);

        const iframe = tempNode.querySelector('iframe');
        const element = renderedElement || iframe || tempNode;

        if (element && element.parentNode === hiddenWrapper) {
          hiddenWrapper.removeChild(element);
        }
        cleanup();

        applyElementAttributes(element, width, height, instanceId);

        resolve({
          player: { tweetId, element, iframe },
          element,
          iframe: iframe || (element?.tagName === 'IFRAME' ? element : null),
          destroy: () => {
            cleanup();
          },
        });
      };

      if (twttr?.widgets?.createTweet) {
        twttr.widgets
          .createTweet(tweetId, tweetContainer, tweetOptions)
          .then(el => {
            finishInit(el);
          })
          .catch(() => finishInit(null));
      } else {
        finishInit(null);
      }

      timer = setTimeout(() => {
        finishInit(null);
      }, options.timeout || 4000);
    });
  }

  createAdapter(playerInfo, context) {
    const element = context?.element || playerInfo?.element;
    const iframe = context?.iframe || playerInfo?.iframe;

    return {
      load(tweetId) {
        if (typeof window !== 'undefined' && window.twttr?.widgets && element) {
          const id = extractTweetId(tweetId);
          element.innerHTML = '';
          window.twttr.widgets.createTweet(id, element);
        }
      },
      getState() {
        return { element, iframe, tweetId: playerInfo?.tweetId };
      },
    };
  }
}

export const twitterProvider = new TwitterProvider();

export const twitter = { create: options => twitterProvider.create(options), mount: (container, options) => twitterProvider.mount(container, options), provider: twitterProvider };

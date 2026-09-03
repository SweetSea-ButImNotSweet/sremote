import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes, waitForIframeLoad } from '../core/dom-utils.js';

/**
 * Normalizes Streamable clip code or URL into an embed URL.
 * @param {string} input
 * @returns {string}
 */
function buildStreamableEmbedUrl(input) {
  if (!input) return 'https://streamable.com/e/moo';
  const str = String(input).trim();
  if (str.startsWith('http')) {
    if (str.includes('/e/')) return str;
    const match = str.match(/streamable\.com\/([a-zA-Z0-9]+)/);
    if (match) return `https://streamable.com/e/${match[1]}`;
    return str;
  }
  return `https://streamable.com/e/${str}`;
}

/**
 * Provider for Streamable Video Player
 */
export class StreamableProvider extends BaseProvider {
  constructor() {
    super('streamable');
  }

  async initPlayer(options, instanceId) {
    const width = options.width || '100%';
    const height = options.height || '100%';
    const shortcode = options.shortcode || options.code || options.url || options.videoId || 'moo';

    const iframe = document.createElement('iframe');
    iframe.id = `sremote-streamable-${instanceId}`;
    iframe.allow = 'autoplay; fullscreen; encrypted-media';
    iframe.allowFullscreen = true;
    iframe.src = buildStreamableEmbedUrl(shortcode);

    applyElementAttributes(iframe, width, height, instanceId);

    await waitForIframeLoad(iframe, options.timeout || 4000);

    return { player: { iframe }, element: iframe, iframe, destroy: () => {} };
  }

  createAdapter(playerInfo, context) {
    const iframe = context?.iframe || playerInfo?.iframe;

    return {
      load(shortcode) {
        if (iframe) {
          iframe.src = buildStreamableEmbedUrl(shortcode);
        }
      },
    };
  }
}

export const streamableProvider = new StreamableProvider();

export const streamable = {
  create: options => streamableProvider.create(options),
  mount: (container, options) => streamableProvider.mount(container, options),
  provider: streamableProvider,
};

import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes, waitForIframeLoad } from '../core/dom-utils.js';

/**
 * Normalizes Odysee video path or URL into an embed URL.
 * @param {string} input
 * @returns {string}
 */
function buildOdyseeEmbedUrl(input) {
  if (!input) return 'https://odysee.com/$/embed/@lbry:3f/lbry-in-a-nutshell:1';
  const str = String(input).trim();
  if (str.startsWith('http')) {
    if (str.includes('/$/embed/')) return str;
    return str.replace('odysee.com/', 'odysee.com/$/embed/');
  }
  return `https://odysee.com/$/embed/${str.replace(/^\//, '')}`;
}

/**
 * Provider for Odysee / LBRY Embed Player
 */
export class OdyseeProvider extends BaseProvider {
  constructor() {
    super('odysee');
  }

  async initPlayer(options, instanceId) {
    const width = options.width || '100%';
    const height = options.height || '100%';
    const video = options.video || options.url || options.claim || '@lbry:3f/lbry-in-a-nutshell:1';

    const iframe = document.createElement('iframe');
    iframe.id = `sremote-odysee-${instanceId}`;
    iframe.allow = 'autoplay; fullscreen';
    iframe.allowFullscreen = true;
    iframe.src = buildOdyseeEmbedUrl(video);

    applyElementAttributes(iframe, width, height, instanceId);

    await waitForIframeLoad(iframe, options.timeout || 4000);

    return { player: { iframe }, element: iframe, iframe, destroy: () => {} };
  }

  createAdapter(playerInfo, context) {
    const iframe = context?.iframe || playerInfo?.iframe;

    return {
      load(video) {
        if (iframe) {
          iframe.src = buildOdyseeEmbedUrl(video);
        }
      },
    };
  }
}

export const odyseeProvider = new OdyseeProvider();

export const odysee = { create: options => odyseeProvider.create(options), mount: (container, options) => odyseeProvider.mount(container, options), provider: odyseeProvider };

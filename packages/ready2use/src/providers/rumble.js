import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes, waitForIframeLoad } from '../core/dom-utils.js';

/**
 * Normalizes Rumble video URL or ID into an embed URL.
 * @param {string} input
 * @returns {string}
 */
function buildRumbleEmbedUrl(input) {
  if (!input) return 'https://rumble.com/embed/v397yeg/';
  const str = String(input).trim();
  if (str.startsWith('http')) {
    if (str.includes('/embed/')) return str;
    const match = str.match(/rumble\.com\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://rumble.com/embed/${match[1]}/`;
    return str;
  }
  return `https://rumble.com/embed/${str}/`;
}

/**
 * Provider for Rumble Embed Player
 * Note: Rumble uses HTML5 video inside iframe (controlled automatically via SRemote userscript).
 */
export class RumbleProvider extends BaseProvider {
  constructor() {
    super('rumble');
  }

  async initPlayer(options, instanceId) {
    const width = options.width || '100%';
    const height = options.height || '400px';
    const video = options.video || options.videoId || options.url || 'v397yeg';

    const iframe = document.createElement('iframe');
    iframe.id = `sremote-rumble-${instanceId}`;
    iframe.allow = 'autoplay; fullscreen';
    iframe.allowFullscreen = true;
    iframe.src = buildRumbleEmbedUrl(video);

    applyElementAttributes(iframe, width, height, instanceId);

    await waitForIframeLoad(iframe, options.timeout || 4000);

    return { player: { iframe }, element: iframe, iframe, destroy: () => {} };
  }

  createAdapter(playerInfo, context) {
    const iframe = context?.iframe || playerInfo?.iframe;

    return {
      load(video) {
        if (iframe) {
          iframe.src = buildRumbleEmbedUrl(video);
        }
      },
    };
  }
}

export const rumbleProvider = new RumbleProvider();

export const rumble = { create: options => rumbleProvider.create(options), mount: (container, options) => rumbleProvider.mount(container, options), provider: rumbleProvider };

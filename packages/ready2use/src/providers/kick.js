import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes, waitForIframeLoad } from '../core/dom-utils.js';

/**
 * Normalizes Kick channel name or embed URL.
 * @param {string} input
 * @returns {string}
 */
function buildKickEmbedUrl(input) {
  if (!input) return 'https://player.kick.com/xqc';
  const str = String(input).trim();
  if (str.startsWith('http')) {
    if (str.includes('player.kick.com/')) return str;
    const match = str.match(/kick\.com\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://player.kick.com/${match[1]}`;
    return str;
  }
  return `https://player.kick.com/${str.replace(/^@/, '')}`;
}

/**
 * Provider for Kick Livestream Player
 * Note: Kick uses native video inside iframe (auto-discovered by SRemote userscript).
 */
export class KickProvider extends BaseProvider {
  constructor() {
    super('kick');
  }

  async initPlayer(options, instanceId) {
    const width = options.width || '100%';
    const height = options.height || '100%';
    const channel = options.channel || options.user || options.username || options.url || 'xqc';

    const iframe = document.createElement('iframe');
    iframe.id = `sremote-kick-${instanceId}`;
    iframe.allow = 'autoplay; fullscreen; encrypted-media';
    iframe.allowFullscreen = true;
    iframe.src = buildKickEmbedUrl(channel);

    applyElementAttributes(iframe, width, height, instanceId);

    await waitForIframeLoad(iframe, options.timeout || 4000);

    return { player: { iframe }, element: iframe, iframe, destroy: () => {} };
  }

  createAdapter(playerInfo, context) {
    const iframe = context?.iframe || playerInfo?.iframe;

    return {
      load(channel) {
        if (iframe) {
          iframe.src = buildKickEmbedUrl(channel);
        }
      },
    };
  }
}

export const kickProvider = new KickProvider();

export const kick = { create: options => kickProvider.create(options), mount: (container, options) => kickProvider.mount(container, options), provider: kickProvider };

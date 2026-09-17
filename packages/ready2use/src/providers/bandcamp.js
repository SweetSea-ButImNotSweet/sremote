import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes, waitForIframeLoad } from '../core/dom-utils.js';

/**
 * Builds Bandcamp embedded player iframe URL.
 * @param {Object} options
 * @returns {string}
 */
function buildBandcampEmbedUrl(options = {}) {
  const opts = typeof options === 'string' ? { trackId: options } : options || {};
  const albumId = opts.albumId || opts.album;
  const trackId = opts.trackId || opts.track;
  const size = opts.size || (opts.artwork === 'none' ? 'small' : 'large');
  const bgcol = opts.bgcol || '333333';
  const linkcol = opts.linkcol || '0f91ff';
  const artwork = opts.artwork || 'small';

  if (albumId) {
    return `https://bandcamp.com/EmbeddedPlayer/album=${albumId}/size=${size}/bgcol=${bgcol}/linkcol=${linkcol}/artwork=${artwork}/transparent=true/`;
  }
  if (trackId) {
    return `https://bandcamp.com/EmbeddedPlayer/track=${trackId}/size=${size}/bgcol=${bgcol}/linkcol=${linkcol}/artwork=${artwork}/transparent=true/`;
  }
  return `https://bandcamp.com/EmbeddedPlayer/album=2747195448/size=${size}/bgcol=${bgcol}/linkcol=${linkcol}/artwork=${artwork}/transparent=true/`;
}

/**
 * Provider for Bandcamp Music Player Widget
 */
export class BandcampProvider extends BaseProvider {
  constructor() {
    super('bandcamp');
  }

  async initPlayer(options, instanceId) {
    const width = options.width || '100%';
    const height = options.height || (options.size === 'small' ? '42px' : '120px');

    const iframe = document.createElement('iframe');
    iframe.id = `sremote-bandcamp-${instanceId}`;
    iframe.allow = 'autoplay';
    iframe.style.border = '0';
    iframe.src = buildBandcampEmbedUrl(options);

    applyElementAttributes(iframe, width, height, instanceId);

    await waitForIframeLoad(iframe, options.timeout || 4000);

    return { player: { iframe }, element: iframe, iframe, destroy: () => {} };
  }

  createAdapter(playerInfo, context) {
    const iframe = context?.iframe || playerInfo?.iframe;

    return {
      load(options) {
        if (iframe) {
          iframe.src = buildBandcampEmbedUrl(options);
        }
      },
    };
  }
}

export const bandcampProvider = new BandcampProvider();

export const bandcamp = {
  create: options => bandcampProvider.create(options),
  mount: (container, options) => bandcampProvider.mount(container, options),
  provider: bandcampProvider,
};

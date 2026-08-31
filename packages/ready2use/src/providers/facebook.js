import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes } from '../core/dom-utils.js';
import { loadFacebookSdk } from '../utils/sdk-loader.js';

/**
 * Provider for Facebook Video Embed
 */
export class FacebookProvider extends BaseProvider {
  constructor() {
    super('facebook');
  }

  async loadSdk() {
    return loadFacebookSdk();
  }

  async initPlayer(options, instanceId) {
    const width = options.width || '500px';
    const height = options.height || 'auto';
    const videoUrl = options.videoUrl || options.url || 'https://www.facebook.com/facebook/videos/10153231379946729/';

    const container = document.createElement('div');
    container.id = `sremote-facebook-${instanceId}`;

    const fbVideo = document.createElement('div');
    fbVideo.className = 'fb-video';
    fbVideo.setAttribute('data-href', videoUrl);
    fbVideo.setAttribute('data-width', typeof width === 'number' ? `${width}` : width);
    fbVideo.setAttribute('data-show-text', options.showText ? 'true' : 'false');
    fbVideo.setAttribute('data-autoplay', options.autoplay ? 'true' : 'false');
    fbVideo.setAttribute('data-allowfullscreen', 'true');

    container.appendChild(fbVideo);
    applyElementAttributes(container, width, height, instanceId);

    if (options.useSdk !== false) {
      try {
        const FB = await this.loadSdk(options.appId);
        if (FB && typeof FB.XFBML?.parse === 'function') {
          FB.XFBML.parse(container);
        }
      } catch {}
    }

    return { player: { container, videoUrl }, element: container, destroy: () => {} };
  }

  createAdapter() {
    return {};
  }
}

export const facebookProvider = new FacebookProvider();
export const createFacebookPlayer = options => facebookProvider.create(options);
export const mountFacebookPlayer = (container, options) => facebookProvider.mount(container, options);

export const facebook = { create: createFacebookPlayer, mount: mountFacebookPlayer, provider: facebookProvider };

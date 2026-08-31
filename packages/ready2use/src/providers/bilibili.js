import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes } from '../core/dom-utils.js';

/**
 * Provider for Bilibili Embed Player
 * Bilibili uses native HTML5 inside iframe, so SRemote automatically discovers it.
 */
function buildBilibiliUrl(options = {}) {
  const params = new window.URLSearchParams();

  const bvid = options.bvid || (typeof options.videoId === 'string' && options.videoId.startsWith('BV') ? options.videoId : null);
  const aid =
    options.aid || options.avid || (typeof options.videoId === 'number' || (typeof options.videoId === 'string' && !options.videoId.startsWith('BV')) ? options.videoId : null);

  if (bvid) {
    params.set('bvid', bvid);
  } else if (aid) {
    const cleanAid = String(aid).replace(/^av/i, '');
    params.set('aid', cleanAid);
  } else if (options.id) {
    const idStr = String(options.id);
    if (idStr.startsWith('BV')) {
      params.set('bvid', idStr);
    } else {
      params.set('aid', idStr.replace(/^av/i, ''));
    }
  } else {
    params.set('bvid', 'BV1xx411c7mD');
  }

  if (options.cid) params.set('cid', options.cid);
  if (options.page) params.set('page', options.page);
  if (options.t || options.startTime) params.set('t', options.t || options.startTime);

  const autoPlay = options.autoplay ?? true;
  params.set('autoplay', autoPlay ? '1' : '0');

  if (options.danmaku !== undefined) {
    params.set('danmaku', options.danmaku ? '1' : '0');
  }
  if (options.highQuality !== undefined || options.high_quality !== undefined) {
    params.set('high_quality', (options.highQuality ?? options.high_quality) ? '1' : '0');
  }

  return `https://player.bilibili.com/player.html?${params.toString()}`;
}

export class BilibiliProvider extends BaseProvider {
  constructor() {
    super('bilibili');
  }

  async initPlayer(options, instanceId) {
    const width = options.width || '100%';
    const height = options.height || '100%';

    const iframe = document.createElement('iframe');
    iframe.id = `sremote-bilibili-${instanceId}`;
    iframe.allow = 'autoplay; encrypted-media; fullscreen';
    iframe.allowFullscreen = true;
    iframe.style.border = 'none';
    iframe.src = buildBilibiliUrl(options);

    applyElementAttributes(iframe, width, height, instanceId);

    return { player: { iframe, options }, element: iframe, iframe, destroy: () => {} };
  }

  createAdapter(playerInfo, context) {
    const iframe = context?.iframe || playerInfo?.iframe;

    return {
      load(source, page = 1) {
        if (iframe) {
          if (typeof source === 'object' && source !== null) {
            iframe.src = buildBilibiliUrl({ ...source, autoplay: true });
          } else {
            const srcStr = String(source);
            if (srcStr.startsWith('BV')) {
              iframe.src = buildBilibiliUrl({ bvid: srcStr, page, autoplay: true });
            } else {
              iframe.src = buildBilibiliUrl({ aid: srcStr, page, autoplay: true });
            }
          }
        }
      },
    };
  }
}

export const bilibiliProvider = new BilibiliProvider();
export const createBilibiliPlayer = options => bilibiliProvider.create(options);
export const mountBilibiliPlayer = (container, options) => bilibiliProvider.mount(container, options);

export const bilibili = { create: createBilibiliPlayer, mount: mountBilibiliPlayer, provider: bilibiliProvider };

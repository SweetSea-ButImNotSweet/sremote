import { BaseProvider } from '../core/base-provider.js';
import { applyElementAttributes, waitForIframeLoad } from '../core/dom-utils.js';

/**
 * Provider for Bilibili Embed Player
 * Bilibili uses native HTML5 inside iframe, so SRemote automatically discovers it.
 */
function buildBilibiliUrl(options = {}) {
  const params = new window.URLSearchParams();
  const opts = typeof options === 'string' ? { videoId: options } : options || {};

  // Extract raw ID candidate
  let rawId = opts.bvid || opts.aid || opts.avid || opts.videoId || opts.id;
  if (rawId && typeof rawId === 'object') {
    rawId = rawId.bvid || rawId.aid || rawId.avid || rawId.videoId || rawId.id || null;
  }

  const rawUrl = opts.url || opts.videoUrl || (typeof rawId === 'string' && rawId.includes('bilibili.com') ? rawId : null);

  let bvid = null;
  let aid = null;

  if (rawUrl) {
    const bvMatch = String(rawUrl).match(/BV[a-zA-Z0-9]+/i);
    const avMatch = String(rawUrl).match(/av(\d+)/i);
    if (bvMatch) {
      bvid = bvMatch[0];
    } else if (avMatch) {
      aid = avMatch[1];
    }
  }

  if (!bvid && !aid && rawId) {
    const idStr = String(rawId).trim();
    if (idStr !== '[object Object]') {
      if (/^BV/i.test(idStr)) {
        bvid = idStr;
      } else {
        aid = idStr.replace(/^av/i, '');
      }
    }
  }

  if (bvid) {
    params.set('bvid', bvid);
  } else if (aid) {
    params.set('aid', String(aid).replace(/^av/i, ''));
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

    await waitForIframeLoad(iframe, options.timeout || 4000);

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
            iframe.src = buildBilibiliUrl({ videoId: String(source), page, autoplay: true });
          }
        }
      },
    };
  }
}

export const bilibiliProvider = new BilibiliProvider();

export const bilibili = {
  create: options => bilibiliProvider.create(options),
  mount: (container, options) => bilibiliProvider.mount(container, options),
  provider: bilibiliProvider,
};

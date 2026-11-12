/**
 * URL Pattern Resolver for SRemote Ready2Use
 * Automatically detects platform and extracts identifiers and playback options.
 */

function parseTimeParam(val) {
  if (!val) return undefined;
  if (/^\d+$/.test(val)) return Number.parseInt(val, 10);
  const m = String(val).match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  if (m) {
    const h = Number.parseInt(m[1] || '0', 10);
    const min = Number.parseInt(m[2] || '0', 10);
    const s = Number.parseInt(m[3] || '0', 10);
    return h * 3600 + min * 60 + s;
  }
  return undefined;
}

/**
 * Platform matchers table.
 * Each entry specifies a matcher regex and an options parser function.
 */
export const URL_RESOLVER_RULES = [
  // 1. YouTube
  {
    provider: 'youtube',
    regex: /(?:youtube\.com\/(?:watch\?|embed\/|shorts\/|v\/)|youtu\.be\/)/i,
    parse: (url, u) => {
      let videoId = null;
      let startTime;
      if (url.includes('youtu.be/')) {
        const parts = u.pathname.split('/').filter(Boolean);
        videoId = parts[0] || null;
      } else if (u.searchParams.has('v')) {
        videoId = u.searchParams.get('v');
      } else {
        const m = u.pathname.match(/\/(?:embed|shorts|v)\/([a-zA-Z0-9_-]+)/);
        if (m) videoId = m[1];
      }
      const t = u.searchParams.get('t') || u.searchParams.get('start');
      if (t) startTime = parseTimeParam(t);
      const list = u.searchParams.get('list') || undefined;
      return { videoId, startTime, playerVars: { ...(startTime ? { start: startTime } : {}), ...(list ? { list } : {}) } };
    },
  },

  // 2. Bilibili
  {
    provider: 'bilibili',
    regex: /(?:bilibili\.com\/(?:video\/|bangumi\/play\/)|b23\.tv\/)/i,
    parse: (url, u) => {
      let bvid = null;
      let aid = null;
      const bvMatch = url.match(/BV[a-zA-Z0-9]+/i);
      const avMatch = url.match(/av(\d+)/i);
      if (bvMatch) bvid = bvMatch[0];
      else if (avMatch) aid = avMatch[1];
      const p = u.searchParams.get('p');
      const t = u.searchParams.get('t') || u.searchParams.get('start');
      return { bvid, aid, url, page: p ? Number(p) : undefined, startTime: t ? parseTimeParam(t) : undefined };
    },
  },

  // 3. NicoNico
  {
    provider: 'niconico',
    regex: /(?:nicovideo\.jp\/watch\/|nico\.ms\/)/i,
    parse: (url, u) => {
      let watchId = null;
      const m = url.match(/(?:watch\/|nico\.ms\/)([a-z0-9]+)/i);
      if (m) watchId = m[1];
      const from = u.searchParams.get('from');
      return { watchId, videoId: watchId, url, startTime: from ? parseTimeParam(from) : undefined };
    },
  },

  // 4. SoundCloud
  { provider: 'soundcloud', regex: /soundcloud\.com\//i, parse: url => ({ trackUrl: url, url }) },

  // 5. Spotify
  {
    provider: 'spotify',
    regex: /(?:open\.spotify\.com\/(?:track|album|playlist|show|episode)\/|spotify:)/i,
    parse: (url, u) => {
      let uri = null;
      if (url.startsWith('spotify:')) {
        uri = url;
      } else {
        const m = u.pathname.match(/\/(track|album|playlist|show|episode)\/([a-zA-Z0-9]+)/);
        if (m) uri = `spotify:${m[1]}:${m[2]}`;
      }
      return { uri, url };
    },
  },

  // 6. Vimeo
  {
    provider: 'vimeo',
    regex: /vimeo\.com\/(?:video\/)?(\d+)/i,
    parse: (url, u) => {
      const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
      const videoId = m ? m[1] : null;
      const t = u.searchParams.get('t');
      return { videoId, id: videoId, startTime: t ? parseTimeParam(t) : undefined };
    },
  },

  // 7. Dailymotion
  {
    provider: 'dailymotion',
    regex: /(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/)/i,
    parse: (url, u) => {
      let videoId = null;
      const m = url.match(/(?:video\/|embed\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/);
      if (m) videoId = m[1];
      const start = u.searchParams.get('start');
      return { videoId, id: videoId, startTime: start ? parseTimeParam(start) : undefined };
    },
  },

  // 8. Twitch
  {
    provider: 'twitch',
    regex: /twitch\.tv\//i,
    parse: (url, u) => {
      let channel = null;
      let video = null;
      const vidMatch = u.pathname.match(/\/videos\/(\d+)/);
      if (vidMatch) {
        video = vidMatch[1];
      } else {
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length > 0 && !['directory', 'p', 'downloads'].includes(parts[0])) {
          channel = parts[0];
        }
      }
      return { channel, video, url };
    },
  },

  // 9. Mixcloud
  { provider: 'mixcloud', regex: /mixcloud\.com\//i, parse: url => ({ feedUrl: url, url }) },

  // 10. TikTok
  {
    provider: 'tiktok',
    regex: /(?:tiktok\.com\/@[\w.-]+\/video\/(\d+)|vm\.tiktok\.com\/)/i,
    parse: url => {
      const m = url.match(/video\/(\d+)/);
      const videoId = m ? m[1] : null;
      return { videoId, url };
    },
  },

  // 11. Facebook
  { provider: 'facebook', regex: /(?:facebook\.com\/(?:.*\/videos\/|watch\/\?v=)|fb\.watch\/)/i, parse: url => ({ url, href: url }) },

  // 12. Twitter / X
  {
    provider: 'twitter',
    regex: /(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status\/(\d+)/i,
    parse: url => {
      const m = url.match(/status\/(\d+)/);
      return { tweetId: m ? m[1] : null, id: m ? m[1] : null, url };
    },
  },

  // 13. Kick
  {
    provider: 'kick',
    regex: /kick\.com\//i,
    parse: (url, u) => {
      const parts = u.pathname.split('/').filter(Boolean);
      const channel = parts[0] || null;
      return { channel, url };
    },
  },

  // 14. Streamable
  {
    provider: 'streamable',
    regex: /streamable\.com\/([a-zA-Z0-9]+)/i,
    parse: url => {
      const m = url.match(/streamable\.com\/([a-zA-Z0-9]+)/i);
      return { videoId: m ? m[1] : null, url };
    },
  },

  // 15. Rumble
  { provider: 'rumble', regex: /rumble\.com\//i, parse: url => ({ url }) },

  // 16. Odysee
  { provider: 'odysee', regex: /odysee\.com\//i, parse: url => ({ url }) },

  // 17. Bandcamp
  { provider: 'bandcamp', regex: /bandcamp\.com\//i, parse: url => ({ url }) },

  // 18. Instagram
  {
    provider: 'instagram',
    regex: /instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i,
    parse: (url, u) => {
      const m = u.pathname.match(/\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/);
      return { id: m ? m[1] : null, url };
    },
  },

  // 19. Threads
  {
    provider: 'threads',
    regex: /threads\.net\/@[\w.-]+\/post\/([a-zA-Z0-9_-]+)/i,
    parse: (url, u) => {
      const m = u.pathname.match(/\/post\/([a-zA-Z0-9_-]+)/);
      return { id: m ? m[1] : null, url };
    },
  },

  // 20. Apple Music
  { provider: 'applemusic', regex: /music\.apple\.com\//i, parse: url => ({ url }) },

  // 21. PeerTube
  {
    provider: 'peertube',
    regex: /\/(?:w|videos\/watch)\/([a-zA-Z0-9-]+)/i,
    parse: url => {
      const m = url.match(/\/(?:w|videos\/watch)\/([a-zA-Z0-9-]+)/);
      return { videoId: m ? m[1] : null, url };
    },
  },
];

/**
 * Resolves a given media URL into matching provider and extracted options.
 * @param {string} url - Target URL to resolve
 * @param {Object} [extraOptions={}] - Supplementary options to merge
 * @returns {{ providerName: string, options: Record<string, any> } | null}
 */
export function resolveProviderFromUrl(url, extraOptions = {}) {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  let parsedUrl = null;
  try {
    parsedUrl = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed);
  } catch {
    // If not a full URL, try parsing as https
    try {
      parsedUrl = new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }

  for (const rule of URL_RESOLVER_RULES) {
    if (rule.regex.test(trimmed)) {
      const extracted = rule.parse(trimmed, parsedUrl);
      return { providerName: rule.provider, options: { ...extracted, ...extraOptions } };
    }
  }

  return null;
}

/**
 * Checks whether a given media URL is supported by Ready2Use.
 * @param {string} url
 * @returns {boolean}
 */
export function isSupportedMediaUrl(url) {
  return Boolean(resolveProviderFromUrl(url));
}

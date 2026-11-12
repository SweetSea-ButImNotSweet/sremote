import { resolveProviderFromUrl, isSupportedMediaUrl } from './core/url-resolver.js';
import { getProvider, registerProvider, hasProvider, listProviders } from './core/provider-registry.js';
import { BaseProvider } from './core/base-provider.js';
import { youtube } from './providers/youtube.js';
import { vimeo } from './providers/vimeo.js';
import { soundcloud } from './providers/soundcloud.js';
import { dailymotion } from './providers/dailymotion.js';
import { twitch } from './providers/twitch.js';
import { mixcloud } from './providers/mixcloud.js';
import { spotify } from './providers/spotify.js';
import { tiktok } from './providers/tiktok.js';
import { niconico } from './providers/niconico.js';
import { bilibili } from './providers/bilibili.js';
import { facebook } from './providers/facebook.js';
import { twitter } from './providers/twitter.js';
import { peertube } from './providers/peertube.js';
import { rumble } from './providers/rumble.js';
import { kick } from './providers/kick.js';
import { streamable } from './providers/streamable.js';
import { odysee } from './providers/odysee.js';
import { bandcamp } from './providers/bandcamp.js';
import { instagram } from './providers/instagram.js';
import { threads } from './providers/threads.js';
import { applemusic } from './providers/applemusic.js';
import { applemusickit } from './providers/musickit.js';
import { createRemoteProxy } from './core/remote-proxy.js';

export { BaseProvider };
export { youtube };
export { vimeo };
export { soundcloud };
export { dailymotion };
export { twitch };
export { mixcloud };
export { spotify };
export { tiktok };
export { niconico };
export { bilibili };
export { facebook };
export { twitter };
export { peertube };
export { rumble };
export { kick };
export { streamable };
export { odysee };
export { bandcamp };
export { instagram };
export { threads };
export { applemusic };
export { applemusickit };
export { createRemoteProxy };
export { resolveProviderFromUrl, isSupportedMediaUrl };
export { getProvider, registerProvider, hasProvider, listProviders };

/**
 * Universal media creator: resolves URL to provider, instantiates player without mounting.
 * @param {string|Object} urlOrOptions
 * @param {Object} [options={}]
 * @returns {Promise<import('./index.d.ts').ProviderCreateResult>}
 */
export async function create(urlOrOptions, options = {}) {
  let targetProviderName = null;
  let targetOptions = {};

  if (typeof urlOrOptions === 'string') {
    const resolved = resolveProviderFromUrl(urlOrOptions, options);
    if (!resolved) {
      throw new Error(`[SRemote:Ready2Use] Could not resolve provider from URL: '${urlOrOptions}'`);
    }
    targetProviderName = resolved.providerName;
    targetOptions = resolved.options;
  } else if (urlOrOptions && typeof urlOrOptions === 'object') {
    if (urlOrOptions.url) {
      const resolved = resolveProviderFromUrl(urlOrOptions.url, urlOrOptions);
      if (resolved) {
        targetProviderName = resolved.providerName;
        targetOptions = resolved.options;
      }
    }
    if (!targetProviderName) {
      targetProviderName = urlOrOptions.provider || urlOrOptions.name;
      targetOptions = { ...urlOrOptions, ...options };
    }
  }

  const provider = getProvider(targetProviderName);
  if (!provider) {
    throw new Error(`[SRemote:Ready2Use] Provider '${targetProviderName}' is not registered`);
  }

  return provider.create(targetOptions);
}

/**
 * Universal media mounter: resolves URL to provider and mounts player into target container.
 * @param {string|HTMLElement} container
 * @param {string|Object} urlOrOptions
 * @param {Object} [options={}]
 * @returns {Promise<import('./index.d.ts').ProviderMountResult>}
 */
export async function mount(container, urlOrOptions, options = {}) {
  let targetProviderName = null;
  let targetOptions = {};

  if (typeof urlOrOptions === 'string') {
    const resolved = resolveProviderFromUrl(urlOrOptions, options);
    if (!resolved) {
      throw new Error(`[SRemote:Ready2Use] Could not resolve provider from URL: '${urlOrOptions}'`);
    }
    targetProviderName = resolved.providerName;
    targetOptions = resolved.options;
  } else if (urlOrOptions && typeof urlOrOptions === 'object') {
    if (urlOrOptions.url) {
      const resolved = resolveProviderFromUrl(urlOrOptions.url, urlOrOptions);
      if (resolved) {
        targetProviderName = resolved.providerName;
        targetOptions = resolved.options;
      }
    }
    if (!targetProviderName) {
      targetProviderName = urlOrOptions.provider || urlOrOptions.name;
      targetOptions = { ...urlOrOptions, ...options };
    }
  }

  const provider = getProvider(targetProviderName);
  if (!provider) {
    throw new Error(`[SRemote:Ready2Use] Provider '${targetProviderName}' is not registered`);
  }

  return provider.mount(container, targetOptions);
}

const ready2use = {
  create,
  mount,
  resolveProviderFromUrl,
  isSupportedMediaUrl,
  getProvider,
  registerProvider,
  hasProvider,
  listProviders,
  BaseProvider,
  youtube,
  vimeo,
  soundcloud,
  dailymotion,
  twitch,
  mixcloud,
  spotify,
  tiktok,
  niconico,
  bilibili,
  facebook,
  twitter,
  peertube,
  rumble,
  kick,
  streamable,
  odysee,
  bandcamp,
  instagram,
  threads,
  applemusic,
  applemusickit,
};

export default ready2use;

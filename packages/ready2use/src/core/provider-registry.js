/**
 * Central Provider Registry for SRemote Ready2Use
 * Provides synchronous, bundler-safe resolution of all supported media providers,
 * while allowing runtime registration of custom providers.
 */

import { appleMusicProvider } from '../providers/applemusic.js';
import { bandcampProvider } from '../providers/bandcamp.js';
import { bilibiliProvider } from '../providers/bilibili.js';
import { dailymotionProvider } from '../providers/dailymotion.js';
import { facebookProvider } from '../providers/facebook.js';
import { instagramProvider } from '../providers/instagram.js';
import { kickProvider } from '../providers/kick.js';
import { mixcloudProvider } from '../providers/mixcloud.js';
import { appleMusicKitProvider } from '../providers/musickit.js';
import { niconicoProvider } from '../providers/niconico.js';
import { odyseeProvider } from '../providers/odysee.js';
import { peerTubeProvider } from '../providers/peertube.js';
import { rumbleProvider } from '../providers/rumble.js';
import { soundcloudProvider } from '../providers/soundcloud.js';
import { spotifyProvider } from '../providers/spotify.js';
import { streamableProvider } from '../providers/streamable.js';
import { threadsProvider } from '../providers/threads.js';
import { tiktokProvider } from '../providers/tiktok.js';
import { twitchProvider } from '../providers/twitch.js';
import { twitterProvider } from '../providers/twitter.js';
import { vimeoProvider } from '../providers/vimeo.js';
import { youtubeProvider } from '../providers/youtube.js';

const registry = new Map([
  ['youtube', youtubeProvider],
  ['bilibili', bilibiliProvider],
  ['niconico', niconicoProvider],
  ['soundcloud', soundcloudProvider],
  ['spotify', spotifyProvider],
  ['vimeo', vimeoProvider],
  ['dailymotion', dailymotionProvider],
  ['twitch', twitchProvider],
  ['mixcloud', mixcloudProvider],
  ['tiktok', tiktokProvider],
  ['facebook', facebookProvider],
  ['twitter', twitterProvider],
  ['peertube', peerTubeProvider],
  ['rumble', rumbleProvider],
  ['kick', kickProvider],
  ['streamable', streamableProvider],
  ['odysee', odyseeProvider],
  ['bandcamp', bandcampProvider],
  ['instagram', instagramProvider],
  ['threads', threadsProvider],
  ['applemusic', appleMusicProvider],
  ['musickit', appleMusicKitProvider],
  ['applemusickit', appleMusicKitProvider],
]);

/**
 * Retrieves a provider instance by platform name.
 * @param {string} name - Platform name (e.g. 'youtube', 'soundcloud')
 * @returns {import('./base-provider.js').BaseProvider | null}
 */
export function getProvider(name) {
  if (!name || typeof name !== 'string') return null;
  return registry.get(name.toLowerCase().trim()) || null;
}

/**
 * Checks if a provider is registered for the platform name.
 * @param {string} name
 * @returns {boolean}
 */
export function hasProvider(name) {
  if (!name || typeof name !== 'string') return false;
  return registry.has(name.toLowerCase().trim());
}

/**
 * Registers a new provider or overrides an existing provider.
 * @param {string} name - Platform name
 * @param {import('./base-provider.js').BaseProvider} provider - Provider instance
 */
export function registerProvider(name, provider) {
  if (!name || typeof name !== 'string') {
    throw new Error('[SRemote:Ready2Use] Provider name must be a non-empty string');
  }
  if (!provider || typeof provider !== 'object') {
    throw new Error('[SRemote:Ready2Use] Provider must be an object implementing BaseProvider');
  }
  registry.set(name.toLowerCase().trim(), provider);
}

/**
 * Returns a list of all registered provider platform names.
 * @returns {string[]}
 */
export function listProviders() {
  return Array.from(registry.keys());
}

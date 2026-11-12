import { resolveProviderFromUrl, isSupportedMediaUrl } from '../src/core/url-resolver.js';
import { getProvider, hasProvider, listProviders, registerProvider } from '../src/core/provider-registry.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  } else {
    passed++;
  }
}

console.log('=== [Ready2Use] URL Resolver & Provider Registry Unit Test ===\n');

// 1. YouTube URL Matching
console.log('1. Testing YouTube URL patterns:');
const yt1 = resolveProviderFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
assert(yt1?.providerName === 'youtube', 'Standard YouTube watch URL resolved');
assert(yt1?.options.videoId === 'dQw4w9WgXcQ', 'YouTube videoId extracted correctly');

const yt2 = resolveProviderFromUrl('https://youtu.be/dQw4w9WgXcQ?t=42s');
assert(yt2?.providerName === 'youtube', 'Shortened youtu.be URL resolved');
assert(yt2?.options.videoId === 'dQw4w9WgXcQ', 'youtu.be videoId extracted');
assert(yt2?.options.startTime === 42, 't=42s timestamp parsed to 42 seconds');

const yt3 = resolveProviderFromUrl('https://www.youtube.com/shorts/abcdef12345');
assert(yt3?.providerName === 'youtube', 'YouTube Shorts URL resolved');
assert(yt3?.options.videoId === 'abcdef12345', 'YouTube Shorts videoId extracted');

const yt4 = resolveProviderFromUrl('https://www.youtube.com/embed/dQw4w9WgXcQ?start=15&list=PLtest');
assert(yt4?.providerName === 'youtube', 'YouTube embed URL resolved');
assert(yt4?.options.videoId === 'dQw4w9WgXcQ', 'Embed videoId extracted');
assert(yt4?.options.startTime === 15, 'start=15 parsed');
assert(yt4?.options.playerVars?.list === 'PLtest', 'playlist list passed in playerVars');

// 2. Bilibili URL Matching
console.log('\n2. Testing Bilibili URL patterns:');
const bili1 = resolveProviderFromUrl('https://www.bilibili.com/video/BV1xx411c7mD?p=2&t=15');
assert(bili1?.providerName === 'bilibili', 'Bilibili BV URL resolved');
assert(bili1?.options.bvid === 'BV1xx411c7mD', 'Bilibili bvid extracted');
assert(bili1?.options.page === 2, 'Bilibili page parameter extracted');
assert(bili1?.options.startTime === 15, 'Bilibili startTime extracted');

const bili2 = resolveProviderFromUrl('https://www.bilibili.com/video/av170001');
assert(bili2?.providerName === 'bilibili', 'Bilibili AV URL resolved');
assert(bili2?.options.aid === '170001', 'Bilibili aid extracted');

const bili3 = resolveProviderFromUrl('https://b23.tv/BV1xx411c7mD');
assert(bili3?.providerName === 'bilibili', 'b23.tv shortlink resolved');
assert(bili3?.options.bvid === 'BV1xx411c7mD', 'b23.tv bvid extracted');

// 3. NicoNico URL Matching
console.log('\n3. Testing NicoNico URL patterns:');
const nico1 = resolveProviderFromUrl('https://www.nicovideo.jp/watch/sm46693656');
assert(nico1?.providerName === 'niconico', 'NicoNico sm URL resolved');
assert(nico1?.options.watchId === 'sm46693656', 'NicoNico sm watchId extracted');

const nico2 = resolveProviderFromUrl('https://www.nicovideo.jp/watch/so12345678?from=90');
assert(nico2?.providerName === 'niconico', 'NicoNico so URL resolved');
assert(nico2?.options.watchId === 'so12345678', 'NicoNico so watchId extracted');
assert(nico2?.options.startTime === 90, 'NicoNico startTime from=90 parsed');

const nico3 = resolveProviderFromUrl('https://nico.ms/sm9');
assert(nico3?.providerName === 'niconico', 'nico.ms shortlink resolved');
assert(nico3?.options.watchId === 'sm9', 'nico.ms watchId extracted');

// 4. SoundCloud URL Matching
console.log('\n4. Testing SoundCloud URL patterns:');
const sc1 = resolveProviderFromUrl('https://soundcloud.com/user-123456/awesome-track');
assert(sc1?.providerName === 'soundcloud', 'SoundCloud URL resolved');
assert(sc1?.options.trackUrl.includes('awesome-track'), 'SoundCloud trackUrl preserved');

// 5. Spotify URL Matching
console.log('\n5. Testing Spotify URL patterns:');
const sp1 = resolveProviderFromUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');
assert(sp1?.providerName === 'spotify', 'Spotify track URL resolved');
assert(sp1?.options.uri === 'spotify:track:4cOdK2wGLETKBW3PvgPWqT', 'Spotify URI synthesized');

const sp2 = resolveProviderFromUrl('spotify:album:1DFixLWuPkv3KT3TnV35m3');
assert(sp2?.providerName === 'spotify', 'Spotify native URI resolved');
assert(sp2?.options.uri === 'spotify:album:1DFixLWuPkv3KT3TnV35m3', 'Spotify native URI preserved');

// 6. Vimeo, Twitch, Dailymotion, Mixcloud
console.log('\n6. Testing Vimeo, Twitch, Dailymotion, Mixcloud:');
const vim = resolveProviderFromUrl('https://vimeo.com/76979871?t=1m30s');
assert(vim?.providerName === 'vimeo', 'Vimeo URL resolved');
assert(vim?.options.videoId === '76979871', 'Vimeo videoId extracted');
assert(vim?.options.startTime === 90, 'Vimeo timestamp 1m30s parsed to 90s');

const tw1 = resolveProviderFromUrl('https://www.twitch.tv/ninja');
assert(tw1?.providerName === 'twitch', 'Twitch channel URL resolved');
assert(tw1?.options.channel === 'ninja', 'Twitch channel extracted');

const tw2 = resolveProviderFromUrl('https://www.twitch.tv/videos/123456789');
assert(tw2?.providerName === 'twitch', 'Twitch video URL resolved');
assert(tw2?.options.video === '123456789', 'Twitch video extracted');

const dm = resolveProviderFromUrl('https://www.dailymotion.com/video/x8abcdef');
assert(dm?.providerName === 'dailymotion', 'Dailymotion URL resolved');
assert(dm?.options.videoId === 'x8abcdef', 'Dailymotion videoId extracted');

const mc = resolveProviderFromUrl('https://www.mixcloud.com/spartacus/party-mix/');
assert(mc?.providerName === 'mixcloud', 'Mixcloud URL resolved');
assert(mc?.options.feedUrl.includes('party-mix'), 'Mixcloud feedUrl preserved');

// 7. Extra Platforms (Kick, Streamable, Apple Music, Bandcamp)
console.log('\n7. Testing Kick, Streamable, Apple Music, Bandcamp:');
const kick = resolveProviderFromUrl('https://kick.com/xqc');
assert(kick?.providerName === 'kick', 'Kick channel resolved');
assert(kick?.options.channel === 'xqc', 'Kick channel extracted');

const streamable = resolveProviderFromUrl('https://streamable.com/moo7b');
assert(streamable?.providerName === 'streamable', 'Streamable URL resolved');
assert(streamable?.options.videoId === 'moo7b', 'Streamable videoId extracted');

const apple = resolveProviderFromUrl('https://music.apple.com/us/album/song-name/12345');
assert(apple?.providerName === 'applemusic', 'Apple Music URL resolved');

const bandcamp = resolveProviderFromUrl('https://artist.bandcamp.com/album/album-name');
assert(bandcamp?.providerName === 'bandcamp', 'Bandcamp URL resolved');

// 8. General Helpers & Unsupported URLs
console.log('\n8. Testing Helpers & Invalid URLs:');
assert(isSupportedMediaUrl('https://www.youtube.com/watch?v=123') === true, 'isSupportedMediaUrl true for YouTube');
assert(isSupportedMediaUrl('https://unsupported-site.com/foo') === false, 'isSupportedMediaUrl false for unsupported URL');
assert(resolveProviderFromUrl('https://unsupported-site.com/foo') === null, 'Unsupported URL returns null');
assert(resolveProviderFromUrl(null) === null, 'Null URL returns null');
assert(resolveProviderFromUrl('') === null, 'Empty string returns null');

// 9. Provider Registry
console.log('\n9. Testing Provider Registry:');
const providersList = listProviders();
assert(providersList.length >= 22, `All 22+ providers registered in registry (count: ${providersList.length})`);
assert(hasProvider('youtube') === true, 'Registry has youtube');
assert(hasProvider('niconico') === true, 'Registry has niconico');
assert(hasProvider('bilibili') === true, 'Registry has bilibili');
assert(getProvider('youtube')?.name === 'youtube', 'getProvider(youtube) returns YouTubeProvider');

// Test custom provider registration
registerProvider('mock-platform', { name: 'mock-platform', create() {}, mount() {} });
assert(hasProvider('mock-platform') === true, 'Custom provider registered successfully');
assert(getProvider('mock-platform')?.name === 'mock-platform', 'Custom provider retrieved');

console.log('\n=== Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}

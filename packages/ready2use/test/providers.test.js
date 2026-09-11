import * as ready2use from '../src/index.js';
import { BaseProvider } from '../src/core/base-provider.js';
import { toggle, seek, seekTo, Volume } from '../src/core/polyfill.js';
import { createRemoteProxy } from '../src/core/remote-proxy.js';

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

console.log('=== [Ready2Use] Sanity & Providers Audit Test ===\n');

// 1. Audit Polyfills & Helpers
console.log('1. Checking Polyfills & Enhancers:');

// Toggle test
const mockToggle = {
  _paused: true,
  play() {
    this._paused = false;
  },
  pause() {
    this._paused = true;
  },
  paused() {
    return this._paused;
  },
};
toggle(mockToggle);
assert(typeof mockToggle.toggle === 'function', 'toggle() function polyfilled');
mockToggle.toggle();
assert(mockToggle._paused === false, 'toggle() plays when paused');
mockToggle.toggle();
assert(mockToggle._paused === true, 'toggle() pauses when playing');

// HTML5 Seek / setCurrentTime test
let seekTarget = 0;
const mockSeek = {
  _currentTime: 10,
  getCurrentTime() {
    return this._currentTime;
  },
  setCurrentTime(sec) {
    seekTarget = sec;
    this._currentTime = sec;
  },
};
seek(mockSeek);
seekTo(mockSeek);
assert(typeof mockSeek.seek === 'function', 'seek() (relative) was polyfilled');
await mockSeek.seek(15);
assert(seekTarget === 25, 'seek(+15) relative seek from 10 correctly moved to 25');
mockSeek.seekTo(50);
assert(seekTarget === 50, 'seekTo(50) absolute seek correctly moved to 50');

// Volume class test
const vol = new Volume(0.8);
let curVol = 0.8;
let curMuted = false;
const mockVolAdapter = vol.apply({
  setVolume(v) {
    curVol = v;
  },
  getVolume() {
    return curVol;
  },
  setMuted(m) {
    curMuted = m;
  },
  getMuted() {
    return curMuted;
  },
});
await mockVolAdapter.setMuted(true);
assert(curMuted === true, 'Volume adapter muted');
assert(vol.previousVolume === 0.8, 'Volume remembered previous volume');
await mockVolAdapter.setVolume(0.5);
assert(curVol === 0.5 && curMuted === false, 'Setting volume auto-unmutes');

console.log(`  ✓ Polyfills verified (${passed} assertions)\n`);

// 2. Audit Remote Proxy
console.log('2. Checking Remote Proxy:');
let played = false;
const testAdapter = {
  play() {
    played = true;
  },
  pause() {},
  capabilities: { play: true, pause: true },
};
const remote = createRemoteProxy(testAdapter, null, 'audit-id');
assert(remote.instanceId === 'audit-id', 'Remote instanceId matches');
assert(remote.capabilities.play === true, 'Remote capabilities proxy matches');
await remote.play();
assert(played === true, 'remote.play() forwarded to adapter.play()');

console.log(`  ✓ Remote Proxy verified\n`);

// 3. Audit all 22 providers
console.log('3. Auditing All Platform Providers:');

const providerKeys = [
  'youtube',
  'vimeo',
  'soundcloud',
  'dailymotion',
  'twitch',
  'mixcloud',
  'spotify',
  'tiktok',
  'niconico',
  'bilibili',
  'facebook',
  'twitter',
  'peertube',
  'rumble',
  'kick',
  'streamable',
  'odysee',
  'bandcamp',
  'instagram',
  'threads',
  'applemusic',
  'applemusickit',
];

for (const key of providerKeys) {
  const item = ready2use[key];
  if (!item) {
    assert(false, `Provider '${key}' is missing from index exports!`);
    continue;
  }

  // Check helper object surface: { create, mount, provider }
  assert(typeof item.create === 'function', `[${key}] has create() function`);
  assert(typeof item.mount === 'function', `[${key}] has mount() function`);
  assert(Boolean(item.provider), `[${key}] has underlying provider instance`);

  const p = item.provider;
  if (p) {
    // Check inheritance from BaseProvider
    assert(p instanceof BaseProvider, `[${key}] provider inherits from BaseProvider`);
    assert(typeof p.name === 'string' && p.name.length > 0, `[${key}] provider has a valid name ('${p?.name}')`);
    assert(typeof p.loadSdk === 'function', `[${key}] provider has loadSdk() method`);
    assert(typeof p.initPlayer === 'function', `[${key}] provider implements initPlayer()`);
    assert(typeof p.createAdapter === 'function', `[${key}] provider implements createAdapter()`);
    assert(typeof p.getCapabilities === 'function', `[${key}] provider has getCapabilities()`);

    // Verify default capabilities do not throw
    try {
      const caps = p.getCapabilities();
      assert(typeof caps === 'object' && caps !== null, `[${key}] getCapabilities() returns an object`);
    } catch (err) {
      assert(false, `[${key}] getCapabilities() threw an error: ${err.message}`);
    }
  }
}

console.log(`\n=== Summary ===`);
console.log(`Total checks passed: ${passed}`);
if (failed > 0) {
  console.error(`Total checks failed: ${failed}`);
  process.exit(1);
} else {
  console.log(`All ${providerKeys.length} providers and core utilities passed audit successfully! 🎉`);
}

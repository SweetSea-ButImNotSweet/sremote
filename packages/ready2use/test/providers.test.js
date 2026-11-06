import * as ready2use from '../src/index.js';
import { BaseProvider } from '../src/core/base-provider.js';
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

// 1. Audit Remote Proxy
console.log('1. Checking Remote Proxy:');
let played = false;
let paused = false;
let currentVolume = 1;
let currentOffset = 0;
const testAdapter = {
  play() {
    played = true;
  },
  pause() {
    paused = true;
  },
  setVolume(v) {
    currentVolume = v;
  },
  getVolume() {
    return currentVolume;
  },
  seek(offset) {
    currentOffset += offset;
  },
  getCurrentTime() {
    return currentOffset;
  },
  capabilities: { play: true, pause: true, volume: true, seek: true },
};
const remote = createRemoteProxy(testAdapter, null, 'audit-id');
assert(remote.instanceId === 'audit-id', 'Remote instanceId matches');
assert(remote.capabilities.play === true, 'Remote capabilities proxy matches');

// Test Fluent Chaining & Thenable contract
await remote.play().seek(15).volume(0.6).pause();
assert(played === true, 'Fluent chained play() executed');
assert(currentOffset === 15, 'Fluent chained seek(15) executed');
assert(currentVolume === 0.6, 'Fluent chained volume(0.6) executed');
assert(paused === true, 'Fluent chained pause() executed');

// Test Clean Fluent Chaining with .tap() and synchronous .state
let tappedState = null;
await remote
  .seek(5)
  .volume(0.9)
  .tap(s => {
    tappedState = s;
  });

assert(currentOffset === 20, 'Fluent chained seek(5) updated offset');
assert(currentVolume === 0.9, 'Fluent chained volume(0.9) updated volume');
assert(tappedState !== null, 'Fluent chained .tap(cb) received state snapshot');
assert(remote.state.paused === true, 'Synchronous remote.state.paused accessible');

// Test .catch() Error Boundary Recovery
let recoveredPlay = false;
const failingAdapter = {
  seek() {
    throw new Error('Seek failure');
  },
  play() {
    recoveredPlay = true;
  },
  capabilities: { play: true, seek: true },
};
const errorRemote = createRemoteProxy(failingAdapter, null, 'err-id');
await errorRemote.seek(10).catch().play();
assert(recoveredPlay === true, '.catch() swallowed error and recovered pipeline to play()');

// Test .lenient() Mode
let lenientVolumeExecuted = false;
const lenientAdapter = {
  seek() {
    throw new Error('Hardware seek unsupported');
  },
  setVolume() {
    lenientVolumeExecuted = true;
  },
  capabilities: { volume: true, seek: true },
};
const lenientRemote = createRemoteProxy(lenientAdapter, null, 'lenient-id');
await lenientRemote.lenient().seek(10).volume(0.5);
assert(lenientVolumeExecuted === true, '.lenient() skipped failing seek and executed volume(0.5)');

// Test client delegation if client.select is provided
let clientSelectedTarget = null;
let clientActionCalled = false;
const mockClient = {
  select(target) {
    clientSelectedTarget = target;
    return {
      play() {
        clientActionCalled = true;
        return this;
      },
      then(cb) {
        return Promise.resolve(cb ? cb() : undefined);
      },
    };
  },
};
const delegatedRemote = createRemoteProxy(testAdapter, mockClient, 'delegated-id');
await delegatedRemote.play();
assert(clientSelectedTarget === 'delegated-id', 'Delegated client.select(instanceId) called');
assert(clientActionCalled === true, 'Delegated fluent action executed');

console.log(`  ✓ Remote Proxy & Fluent Chaining verified\n`);

// 2. Audit all 22 providers
console.log('2. Auditing All Platform Providers:');

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

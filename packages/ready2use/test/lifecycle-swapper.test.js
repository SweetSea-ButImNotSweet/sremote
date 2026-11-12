import * as ready2use from '../src/index.js';
import { BaseProvider } from '../src/core/base-provider.js';

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

console.log('=== [Ready2Use] Lifecycle Events & In-Place Swapper Unit Test ===\n');

// 1. Mock SRemote Client to capture lifecycle events
const capturedEvents = [];
const mockSRemoteClient = {
  adapters: {
    registered: new Map(),
    register(ad, id) {
      this.registered.set(id, ad);
    },
    unregister(id) {
      this.registered.delete(id);
    },
  },
  emit(event, payload) {
    capturedEvents.push({ event, payload });
  },
};

// 2. Mock Providers for testing lifecycle and swapping
class MockTrackProvider extends BaseProvider {
  constructor(name = 'mock-audio') {
    super(name);
    this.loadedSources = [];
    this.destroyed = false;
  }

  async initPlayer(options, instanceId) {
    const attrs = new Map();
    const el = {
      tagName: 'DIV',
      id: `mock-${instanceId}`,
      setAttribute(k, v) {
        attrs.set(k, v);
      },
      getAttribute(k) {
        return attrs.get(k);
      },
      style: { width: '100%', height: '100%' },
      removeAttribute() {},
    };
    return {
      player: { options },
      element: el,
      destroy: () => {
        this.destroyed = true;
      },
    };
  }

  createAdapter(_playerInfo, _context) {
    return {
      name: this.name,
      load: source => {
        this.loadedSources.push(source);
      },
      play() {},
      pause() {},
      seekTo(t) {
        this.seekedTo = t;
      },
    };
  }
}

class MockVideoProvider extends BaseProvider {
  constructor(name = 'mock-video') {
    super(name);
    this.destroyed = false;
  }

  async initPlayer(options, instanceId) {
    const attrs = new Map();
    const el = {
      tagName: 'IFRAME',
      id: `mock-video-${instanceId}`,
      setAttribute(k, v) {
        attrs.set(k, v);
      },
      getAttribute(k) {
        return attrs.get(k);
      },
      style: { width: '100%', height: '100%' },
      removeAttribute() {},
    };
    return {
      player: { options },
      element: el,
      destroy: () => {
        this.destroyed = true;
      },
    };
  }

  createAdapter() {
    return { name: this.name, play() {}, pause() {} };
  }
}

class MockErrorProvider extends BaseProvider {
  constructor() {
    super('mock-error');
  }

  async initPlayer() {
    throw new Error('Simulated initialization failure');
  }

  createAdapter() {
    return {};
  }
}

// Register mock providers in registry
const audioProv = new MockTrackProvider('mock-audio');
const videoProv = new MockVideoProvider('mock-video');
const errProv = new MockErrorProvider();

ready2use.registerProvider('mock-audio', audioProv);
ready2use.registerProvider('mock-video', videoProv);
ready2use.registerProvider('mock-error', errProv);

// Mock Container
const mockContainer = {
  nodeType: 1,
  children: [],
  appendChild(child) {
    this.children.push(child);
  },
  innerHTML: '',
};

async function runTests() {
  console.log('1. Testing Lifecycle Events on Successful Mount:');
  capturedEvents.length = 0;

  const result1 = await audioProv.mount(mockContainer, { sremote: mockSRemoteClient, instanceId: 'test_inst_1', videoId: 'song_abc' });

  assert(result1.instanceId === 'test_inst_1', 'Mount returned correct instanceId');
  assert(typeof result1.swap === 'function', 'Mount result exposes swap() function');
  assert(typeof result1.remote?.swap === 'function', 'Remote controller exposes swap() function');

  const loadingEvt = capturedEvents.find(e => e.event === 'provider:loading');
  const readyEvt = capturedEvents.find(e => e.event === 'provider:ready');

  assert(Boolean(loadingEvt), 'provider:loading event was emitted');
  assert(loadingEvt?.payload?.provider === 'mock-audio', 'provider:loading has correct provider name');
  assert(Boolean(readyEvt), 'provider:ready event was emitted');
  assert(readyEvt?.payload?.instanceId === 'test_inst_1', 'provider:ready has matching instanceId');

  console.log('\n2. Testing Lifecycle Events on Failure:');
  capturedEvents.length = 0;
  let didCatch = false;
  try {
    await errProv.mount(mockContainer, { sremote: mockSRemoteClient, instanceId: 'err_inst' });
  } catch {
    didCatch = true;
  }
  assert(didCatch === true, 'Failed initialization throws error');
  const errorEvt = capturedEvents.find(e => e.event === 'provider:error');
  assert(Boolean(errorEvt), 'provider:error event was emitted on failure');
  assert(errorEvt?.payload?.error?.message === 'Simulated initialization failure', 'provider:error carries diagnostic error message');

  console.log('\n3. Testing In-Place Media Swap (Same Platform Native Load):');
  capturedEvents.length = 0;

  await result1.swap({ provider: 'mock-audio', videoId: 'song_xyz', startTime: 15 });

  assert(audioProv.loadedSources.includes('song_xyz'), 'Native load() was called with new videoId');
  assert(audioProv.destroyed === false, 'Existing player was NOT destroyed on in-place swap');

  const swappedEvt = capturedEvents.find(e => e.event === 'provider:swapped');
  assert(Boolean(swappedEvt), 'provider:swapped event was emitted');
  assert(swappedEvt?.payload?.inPlace === true, 'inPlace flag is true for same platform');

  console.log('\n4. Testing Hot DOM Swap (Cross-Platform):');
  capturedEvents.length = 0;

  const result2 = await result1.swap({ provider: 'mock-video', videoId: 'clip_789' });

  assert(audioProv.destroyed === true, 'Old provider player was destroyed on cross-platform swap');
  assert(result2.instanceId === 'test_inst_1', 'Parent instanceId was preserved on cross-platform swap');
  assert(result2.adapter.name === 'mock-video', 'New adapter is active');

  const crossSwapEvt = capturedEvents.find(e => e.event === 'provider:swapped');
  assert(Boolean(crossSwapEvt), 'provider:swapped event fired on cross swap');
  assert(crossSwapEvt?.payload?.inPlace === false, 'inPlace flag is false for cross-platform swap');
  assert(crossSwapEvt?.payload?.provider === 'mock-video', 'swapped payload reports new provider name');

  console.log('\n5. Testing Top-Level ready2use.create() and ready2use.mount():');
  const autoCreated = await ready2use.create({ provider: 'mock-audio', videoId: 'track_123' });
  assert(Boolean(autoCreated.element), 'ready2use.create({ provider }) created player element without container');
  assert(autoCreated.element.getAttribute('data-sremote-provider') === 'mock-audio', 'Target provider is mock-audio');

  const autoMounted = await ready2use.mount(mockContainer, { provider: 'mock-video', videoId: 'video_456' });
  assert(Boolean(autoMounted.element), 'ready2use.mount() mounted player into container');
  assert(autoMounted.element.getAttribute('data-sremote-provider') === 'mock-video', 'Mounted provider is mock-video');

  console.log('\n=== Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

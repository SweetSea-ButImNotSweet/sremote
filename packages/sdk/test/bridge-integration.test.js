import { SRemoteClient } from '../dist/index.mjs';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  } else {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('=== [SRemote SDK & Host Bridge Integration Test Suite] ===\n');

  // Setup DOM mock in Node environment
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
  }
  globalThis.window.addEventListener = globalThis.window.addEventListener || (() => {});
  globalThis.window.removeEventListener = globalThis.window.removeEventListener || (() => {});
  globalThis.window.dispatchEvent = globalThis.window.dispatchEvent || (() => true);
  if (typeof globalThis.document === 'undefined') {
    const mockElements = new Map();
    globalThis.document = {
      querySelector(sel) {
        return mockElements.get(sel) || null;
      },
      querySelectorAll() {
        return [];
      },
      documentElement: {},
      hidden: false,
    };
    globalThis._mockElements = mockElements;
  }

  // ----------------------------------------------------
  // TEST 1: Auto-Hello on Ready (Resolving On-Demand Handshake)
  // ----------------------------------------------------
  console.log('Test 1: Auto-Hello Triggered on ready()');
  let helloCalled = false;
  let helloOptions = null;

  const mockBridge = {
    [Symbol.for('__sremote_native__')]: true,
    hello(opts) {
      helloCalled = true;
      helloOptions = opts;
      return true;
    },
    list() {
      return ['inst_1'];
    },
    status() {
      return { paused: false, currentTime: 10 };
    },
    capabilities() {
      return { canPlay: true, canPause: true };
    },
    play(id) {
      if (id === 'not_found') {
        return Promise.resolve({ success: false, error: 'INSTANCE_NOT_FOUND', message: 'Instance not found' });
      }
      return Promise.resolve({ success: true, instanceId: id, action: 'play' });
    },
    pause(id) {
      return Promise.resolve({ success: true, instanceId: id, action: 'pause' });
    },
    on(_event, _handler) {
      return () => {};
    },
    off() {},
  };

  globalThis[Symbol.for('__sremote_native_driver__')] = mockBridge;

  const client = new SRemoteClient({ debug: false });
  await client.ready();

  assert(helloCalled === true, 'sremote.ready() automatically calls hello() on host bridge');
  assert(helloOptions?.trackParent === true, 'hello() called with trackParent: true');

  // ----------------------------------------------------
  // TEST 2: Fluent Chaining Fail-Fast & Lenient Mode
  // ----------------------------------------------------
  console.log('\nTest 2: Fluent Chaining Fail-Fast vs Lenient');

  let errorThrown = false;
  try {
    // Calling instance with 'not_found' should fail-fast by default
    await client.instance('not_found').play();
  } catch (err) {
    console.log('Caught error:', err);
    errorThrown = true;
    assert(err.code === 'INSTANCE_NOT_FOUND', `Strict chain caught expected error code: ${err.code}`);
  }
  assert(errorThrown === true, 'Strict mode throws Error on response.success === false');

  // Lenient mode should swallow the error without throwing
  let lenientSuccess = false;
  try {
    await client.instance('not_found').lenient().play();
    lenientSuccess = true;
  } catch {
    lenientSuccess = false;
  }
  assert(lenientSuccess === true, 'Lenient mode recovers gracefully when command fails');

  // ----------------------------------------------------
  // TEST 3: Selector & Polymorphic ID Routing
  // ----------------------------------------------------
  console.log('\nTest 3: Selector & Element Polymorphism');

  const mockIframe = {
    nodeType: 1,
    id: 'my-video-frame',
    getAttribute(attr) {
      if (attr === 'data-sremote-id') return 'custom-assigned-id';
      return null;
    },
  };
  globalThis._mockElements.set('#my-video-frame', mockIframe);

  const instanceFromSelector = client.instance('#my-video-frame');
  const resolvedTarget = instanceFromSelector.resolveTarget();
  assert(resolvedTarget === 'custom-assigned-id', `Selector resolved element custom ID: ${resolvedTarget}`);

  const directElementInstance = client.instance(mockIframe);
  const resolvedDirect = directElementInstance.resolveTarget();
  assert(resolvedDirect === 'custom-assigned-id', `Direct HTMLIFrameElement resolved target: ${resolvedDirect}`);

  // ----------------------------------------------------
  // TEST 4: Session Lock & Passkey Contract
  // ----------------------------------------------------
  console.log('\nTest 4: Session Lock Passkey Propagation');
  let lockPasskeyReceived = null;
  mockBridge.lock = key => {
    lockPasskeyReceived = key;
    return true;
  };

  client.lock('secret_key_123');
  assert(lockPasskeyReceived === 'secret_key_123', `lock() forwarded passkey correctly: ${lockPasskeyReceived}`);

  // ----------------------------------------------------
  // TEST 5: Auto-Queue Command Execution Prior to Ready
  // ----------------------------------------------------
  console.log('\nTest 5: Auto-Queue Command Buffer Execution');
  const delayedClient = new SRemoteClient({ debug: false, timeout: 3000 });
  // Call command before ready
  const queuedPlayPromise = delayedClient.play();
  assert(delayedClient._commandQueue.length === 1, 'Command successfully enqueued in Auto-Queue buffer');

  // Trigger ready, which should flush command buffer
  await delayedClient.ready();
  const queuedResult = await queuedPlayPromise;
  assert(queuedResult?.action === 'play', 'Queued command executed seamlessly upon connection readiness');

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n=== Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

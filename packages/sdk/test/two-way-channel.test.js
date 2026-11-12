import { runInActionScope, getActiveActionScope, isProgrammatic, actions } from '@sremote/shared';

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
  console.log('=== [SRemote Two-Way Channel & Programmatic Causality Test Suite] ===\n');

  // ----------------------------------------------------
  // TEST 1: Purge Verification of Legacy Tracker
  // ----------------------------------------------------
  console.log('Test 1: Verification that ActionTransactionTracker & getTracker are purged');
  const shared = await import('@sremote/shared');
  assert(typeof shared.getTracker === 'undefined', 'shared.getTracker is completely removed');
  assert(typeof shared.createTracker === 'undefined', 'shared.createTracker is completely removed');
  assert(typeof shared.pipeline === 'undefined', 'shared.pipeline namespace is removed');
  assert(typeof shared.ActionTransactionTracker === 'undefined', 'shared.ActionTransactionTracker class is removed');

  // ----------------------------------------------------
  // TEST 2: Scoped Action Execution (Explicit Programmatic Scope)
  // ----------------------------------------------------
  console.log('\nTest 2: Scoped Action Execution with cmdId');
  assert(getActiveActionScope() === null, 'Active scope is initially null');

  let scopeInsideSync = null;
  let isProgInsideSync = false;
  runInActionScope('volume', 0.8, { cmdId: 'cmd_vol_123', instanceId: 'inst_1' }, () => {
    scopeInsideSync = getActiveActionScope();
    isProgInsideSync = isProgrammatic({ eventName: 'volumechange', instanceId: 'inst_1' });
  });

  assert(scopeInsideSync !== null, 'Scope was active inside runInActionScope');
  assert(scopeInsideSync.cmdId === 'cmd_vol_123', 'Scope captured correct cmdId: cmd_vol_123');
  assert(scopeInsideSync.action === 'volume', 'Scope captured correct action: volume');
  assert(isProgInsideSync === true, 'isProgrammatic returned true inside active scope');

  // Allow microtask to clean up
  await new Promise(r => setTimeout(r, 10));
  assert(getActiveActionScope() === null, 'Active scope is cleanly reset to null after microtask');

  // ----------------------------------------------------
  // TEST 3: External Event (User / SponsorBlock Interaction)
  // ----------------------------------------------------
  console.log('\nTest 3: External / Native interaction is detected as isProgrammatic = false');
  const externalProg = isProgrammatic({ eventName: 'seeked', instanceId: 'inst_1' });
  assert(externalProg === false, 'External seeked event is accurately classified as isProgrammatic: false');

  const externalPlay = isProgrammatic({ eventName: 'play', instanceId: 'inst_1' });
  assert(externalPlay === false, 'External play event is accurately classified as isProgrammatic: false');

  // ----------------------------------------------------
  // TEST 4: Action Engine with Scoped Causality Tagging
  // ----------------------------------------------------
  console.log('\nTest 4: Action Engine dispatches with explicit cmdId and causality');
  let emittedEvents = [];
  const mockAdapter = {
    isAdapter: true,
    volume: 1.0,
    setVolume(val) {
      this.volume = val;
      const scope = getActiveActionScope();
      emittedEvents.push({ event: 'volumechange', value: val, isProgrammatic: isProgrammatic({ eventName: 'volumechange', instanceId: 'ad_1' }), causedBy: scope?.cmdId || null });
      return true;
    },
    getState() {
      return { volume: this.volume };
    },
  };

  await actions.execute(mockAdapter, 'volume', 0.5, { cmdId: 'rpc_req_555', instanceId: 'ad_1' });

  assert(emittedEvents.length === 1, 'Adapter event was emitted');
  assert(emittedEvents[0].isProgrammatic === true, 'Adapter event marked isProgrammatic: true');
  assert(emittedEvents[0].causedBy === 'rpc_req_555', 'Adapter event has causedBy: rpc_req_555');

  // ----------------------------------------------------
  // TEST 5: Out of Scope Execution (External Adapter Emit)
  // ----------------------------------------------------
  console.log('\nTest 5: Out of Scope Execution (External Adapter Emit)');
  mockAdapter.setVolume(0.2); // called directly outside SDK actions.execute
  assert(emittedEvents.length === 2, 'Second event recorded');
  assert(emittedEvents[1].isProgrammatic === false, 'Direct external call has isProgrammatic: false');
  assert(emittedEvents[1].causedBy === null, 'Direct external call has causedBy: null');

  console.log('\n=== Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});

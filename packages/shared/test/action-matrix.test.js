import { actions, hasActionSupport, wrapAdapter, evaluateCapabilities } from '../src/index.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  } else {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  }
}

async function runTestSuite() {
  console.log('=== [Action Fallback Matrix & Intervention Control Test Suite] ===\n');

  // ----------------------------------------------------
  // TEST 1: Raw Mode (strict: true) - Zero Polyfill & Unsupported Feedback
  // ----------------------------------------------------
  console.log('Test 1: Adapter with mode="raw" disables synthetic polyfills');
  let rawPlayCalled = false;
  let rawPauseCalled = false;

  const rawAdapter = wrapAdapter({
    mode: 'raw',
    play() {
      rawPlayCalled = true;
    },
    pause() {
      rawPauseCalled = true;
    },
    paused: true,
  });

  // Direct play/pause works
  const playRes = await actions.execute(rawAdapter, 'play');
  assert(playRes === true && rawPlayCalled, 'Direct play() executed successfully in raw mode');

  // Synthetic toggle must be rejected (false)
  const toggleRes = await actions.execute(rawAdapter, 'toggle');
  assert(toggleRes === false, 'Synthetic toggle() returns false when mode="raw"');

  // Synthetic stop must be rejected (false)
  const stopRes = await actions.execute(rawAdapter, 'stop');
  assert(stopRes === false, 'Synthetic stop() returns false when mode="raw"');

  // hasActionSupport reports false for unhandled actions in raw mode
  assert(hasActionSupport(rawAdapter, 'play') === true, 'hasActionSupport reports play=true');
  assert(hasActionSupport(rawAdapter, 'stop') === false, 'hasActionSupport reports stop=false in raw mode');
  assert(hasActionSupport(rawAdapter, 'toggle') === false, 'hasActionSupport reports toggle=false in raw mode');

  // evaluateCapabilities must report false for toggle and stop
  const rawCaps = evaluateCapabilities(rawAdapter);
  assert(rawCaps.play === true, 'rawCaps.play is true');
  assert(rawCaps.toggle === false, 'rawCaps.toggle is false in raw mode');
  assert(rawCaps.stop === false, 'rawCaps.stop is false in raw mode');

  // ----------------------------------------------------
  // TEST 2: Managed Mode (Default) - Automatic Polyfills
  // ----------------------------------------------------
  console.log('\nTest 2: Adapter with default mode="managed" executes polyfills');
  let managedPlayCalled = false;
  let managedPauseCalled = false;
  let managedPausedState = true;

  const managedAdapter = wrapAdapter({
    play() {
      managedPlayCalled = true;
      managedPausedState = false;
    },
    pause() {
      managedPauseCalled = true;
      managedPausedState = true;
    },
    paused() {
      return managedPausedState;
    },
  });

  // Polyfilled toggle plays when paused
  const managedToggleRes1 = await actions.execute(managedAdapter, 'toggle');
  assert(managedToggleRes1 === true && managedPlayCalled, 'Polyfilled toggle() plays when paused');

  // Polyfilled toggle pauses when playing
  const managedToggleRes2 = await actions.execute(managedAdapter, 'toggle');
  assert(managedToggleRes2 === true && managedPauseCalled, 'Polyfilled toggle() pauses when playing');

  // Polyfilled stop pauses
  managedPauseCalled = false;
  const managedStopRes = await actions.execute(managedAdapter, 'stop');
  assert(managedStopRes === true && managedPauseCalled, 'Polyfilled stop() pauses the player');

  // evaluateCapabilities reports true for toggle and stop in managed mode
  const managedCaps = evaluateCapabilities(managedAdapter);
  assert(managedCaps.toggle === true, 'managedCaps.toggle is true via polyfill');
  assert(managedCaps.stop === true, 'managedCaps.stop is true via polyfill');

  // ----------------------------------------------------
  // TEST 3: Granular Interventions (polyfill=true, autoEmit=false)
  // ----------------------------------------------------
  console.log('\nTest 3: Granular interventions (polyfill=true, autoEmit=false)');
  let emittedEvents = [];
  const noEmitAdapter = wrapAdapter({
    interventions: { polyfill: true, autoEmit: false },
    play() {},
    pause() {},
    emit(ev) {
      emittedEvents.push(ev);
    },
  });

  await actions.execute(noEmitAdapter, 'play');
  assert(emittedEvents.length === 0, 'No event was auto-emitted when autoEmit=false');

  // Contrast with default adapter having autoEmit=true
  let autoEmittedEvents = [];
  const autoEmitAdapter = wrapAdapter({
    play() {},
    emit(ev) {
      autoEmittedEvents.push(ev);
    },
  });
  await actions.execute(autoEmitAdapter, 'play');
  assert(autoEmittedEvents.includes('play'), 'Event "play" was auto-emitted when autoEmit=true');

  // ----------------------------------------------------
  // TEST 4: Attached DOM Fallback isolation
  // ----------------------------------------------------
  console.log('\nTest 4: Attached DOM Fallback isolation');
  const mockMedia = { tagName: 'VIDEO', loop: false, paused: true };

  const domFallbackAllowed = wrapAdapter({ interventions: { domFallback: true }, mediaElement: mockMedia, play() {} });

  const repeatRes = await actions.execute(domFallbackAllowed, 'repeat', true);
  assert(repeatRes === true && mockMedia.loop === true, 'DOM fallback executes repeat on attached mediaElement');

  mockMedia.loop = false;
  const domFallbackBlocked = wrapAdapter({ interventions: { domFallback: false }, mediaElement: mockMedia, play() {} });

  const repeatBlockedRes = await actions.execute(domFallbackBlocked, 'repeat', true);
  assert(repeatBlockedRes === false && mockMedia.loop === false, 'DOM fallback blocked when interventions.domFallback=false');

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log(`\n====================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test Suite encountered an unexpected error:', err);
  process.exit(1);
});

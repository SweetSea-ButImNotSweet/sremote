# 04. Testing & Debugging

This guide explains how to inspect connected player states, query metadata, and utilize the built-in diagnostic tools.

---

## 1. Inspecting Connected Instances & Status

SRemote provides synchronous and asynchronous state inspection methods:

```javascript
// List all active instance IDs
const instances = window.sremote.list();
console.log('Connected player instances:', instances); // e.g. ['sv_youtube_1', 'sv_bilibili_2']

// Query current playback state
const state = window.sremote.status();
console.log('Current state:', {
  paused: state.paused,
  currentTime: state.currentTime,
  duration: state.duration,
  volume: state.volume,
  muted: state.muted,
  playbackRate: state.playbackRate
});
```

---

## 2. Subscribing to Playback Events

Monitor the full lifecycle events in the console:

```javascript
// Playback events
window.sremote.on('play', () => console.log('▶ Playback started'));
window.sremote.on('pause', () => console.log('⏸ Playback paused'));
window.sremote.on('ended', () => console.log('🎉 Track/Video finished'));

// Volume change event
window.sremote.on('volumechange', (data) => {
  console.log('🔊 Volume:', data.state.volume, 'Muted:', data.state.muted);
});
```

---

## 3. Built-in Diagnostic Suite (`sremote.debug`)

SRemote comes with an integrated self-test suite accessible directly from DevTools:

```javascript
// Run all automated tests
window.sremote.debug.runAllTests().then(results => {
  console.table(results);
});

// Dump current internal registry state
console.log(window.sremote.debug.dumpState());
```

> [!TIP]
> Complete API details for the diagnostic suite can be found in the **[debug API Reference](/api/debug.md)**.

---

## ⏭️ Next Step
Proceed to **[05. UX Best Practices & End-User Guidance](./05-ux-best-practices.md)**.

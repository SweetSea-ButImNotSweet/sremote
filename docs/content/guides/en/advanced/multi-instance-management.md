# Multi-Instance Management & Exclusive Playback

In complex web applications (such as multi-screen e-learning platforms, media aggregator dashboards, or e-commerce feeds with product videos), multiple media players frequently coexist on a single page.

The **`sremote.instances`** namespace provides comprehensive tools to inspect, address, and synchronize playback across all active players.

---

## 1. Retrieve Active Connected Instances

To inspect which players are currently registered and online:

```javascript
import { sremote } from '@sremote/sdk';

// Returns an array of all connected instance IDs
const activeInstances = sremote.instances.list();
console.log('Connected players:', activeInstances);
// Output: ['sv_youtube_1', 'sv_vimeo_2', 'slot_course_intro']
```

---

## 2. Exclusive Playback Mode (`setExclusive`)

A critical UX requirement in multi-player applications is: **When the user clicks Play on Video A, any other active videos (B, C) should automatically pause** to prevent acoustic collision.

SRemote handles this automatically with a single line of code:

```javascript
// Enable automated exclusive playback:
sremote.instances.setExclusive('auto');
```

- **`'auto'`**: Whenever any instance starts playing, SRemote automatically dispatches `pause()` commands to every other active instance on the page.
- **`'none'`**: Allows simultaneous playback across multiple players (default behavior).

---

## 3. Semantic Identifiers with `instances.assign()`

By default, players receive generated instance IDs (e.g. `sv_youtube_1a2b3c`). For cleaner application architecture and tests, assign permanent semantic identifiers directly to DOM selectors:

```javascript
// Map DOM selectors to clean, descriptive instance aliases:
sremote.instances.assign('#video-header', 'hero-player');
sremote.instances.assign('#sidebar-podcast', 'podcast-player');

// Now you can target instances deterministically:
await sremote.play('hero-player');
await sremote.volume(0.5, 'podcast-player');
```

---

## 4. Inspecting Individual Instance State

You can inspect the latest state snapshot of any specific instance:

```javascript
const state = sremote.instances.get('hero-player')?.state;

if (state) {
  console.log('Player state snapshot:', {
    paused: state.paused,
    currentTime: state.currentTime,
    duration: state.duration,
    volume: state.volume
  });
}
```

---

## ⏭️ Next Steps
- Learn how to diagnose connection issues in [Troubleshooting & Debugging Guide](./troubleshooting-and-debugging.md).
- See the full [Compatibility Matrix](./compatibility-matrix.md) across all 22 supported services.

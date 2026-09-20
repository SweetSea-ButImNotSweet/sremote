# Use-case 3: Same-Origin Direct Media Control (No Iframe)

Beyond breaking cross-origin iframe boundaries, **SRemote SDK** also serves as a robust orchestration library for native HTML5 `<video>` and `<audio>` elements hosted directly on your primary domain (**Same-Origin / Local Media**).

In this scenario, SRemote runs in **`'dom-direct'`** mode — completely standalone and **without requiring end users to install any Userscript**.

---

## 1. Why Use SRemote for In-House Media?

If your webpage already has a `<video src="...">` tag, why use SRemote instead of calling `videoElement.play()` directly?

1. **Synchronous & Safe Promise Handling**: Automatically guards against unhandled Promise rejections triggered by browser Autoplay policies.
2. **Multi-Instance Orchestration**: Coordinates multiple media players effortlessly. For example, playing Video A can automatically pause Video B via built-in exclusive playback mode (`setExclusive('auto')`).
3. **Unified Application Logic**: Whether your app mixes self-hosted video (MP4/HLS) with YouTube embeds, your UI components only need to invoke a single `sremote.play()` call.

---

## 2. Straightforward Setup

Simply install `@sremote/sdk`:

```bash
npm install @sremote/sdk
```

### HTML:
```html
<video id="hero-video" src="/videos/intro.mp4" controls width="640"></video>
```

### JavaScript:
```javascript
import { createSRemoteClient } from '@sremote/sdk';

// Initialize SRemote client
const sremote = createSRemoteClient({
  fallbackToDom: true // Automatically fallback to direct DOM media if no userscript is found
});

await sremote.ready();
console.log('Operating mode:', sremote.mode); // Prints: 'dom-direct'

// Control the native video element directly:
await sremote.play();
await sremote.seek(15);      // Seek forward 15s
await sremote.volume(0.8);   // Set volume to 80%

// Listen to playback events:
sremote.on('timeupdate', ({ state }) => {
  console.log(`Local video progress: ${state.currentTime}s / ${state.duration}s`);
});
```

---

## 3. Managing Multiple Media Elements with `instances.assign()`

If your page contains multiple media streams (e.g., a primary course lecture video alongside an auxiliary sign-language or webcam video):

```html
<video id="lecture-video" src="/lecture.mp4"></video>
<video id="pip-video" src="/companion.mp4"></video>
```

Assign memorable aliases to each media element for targeted control:

```javascript
import { sremote } from '@sremote/sdk';

// Assign selectors to clean instance identifiers
sremote.instances.assign('#lecture-video', 'lecture');
sremote.instances.assign('#pip-video', 'companion');

// Target exact videos deterministically via assigned ID or selector (SRemote 4.0):
await sremote('lecture').play();
await sremote('companion').pause();

// Or target directly by CSS selector:
await sremote('#lecture-video').play();

// Or enable exclusive playback mode (auto-pauses others when one starts playing):
sremote.instances.setExclusive('auto');
```

---

## ⏭️ Next Steps
- Need to embed and automate complex cross-origin iframes without official SDKs? Explore [Use-case 4: Cross-Origin Iframe Automation via Userscript](./04-cross-origin-userscript.md).

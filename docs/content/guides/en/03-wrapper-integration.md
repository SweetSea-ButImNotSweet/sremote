# 03. SRemote Wrapper Integration

This guide walks you through including the `SRemote Wrapper` library in your project and controlling embedded media players.

---

## 1. Fastest Approach: `@sremote/ready2use` (Recommended)

If you want to quickly embed and control popular third-party media players (YouTube, Vimeo, Spotify, SoundCloud, Twitch, TikTok...) **without manually embedding third-party SDKs or writing custom Adapters**:

```bash
# npm
npm install @sremote/ready2use @sremote/wrapper

# pnpm
pnpm add @sremote/ready2use @sremote/wrapper
```

Call `mount()` to automatically create the iframe, load the required SDK, and bind SRemote in a single line of code:

```javascript
import { youtube, vimeo, spotify } from '@sremote/ready2use';

// Mount and control YouTube
const { remote } = await youtube.mount('#player-container', {
  videoId: 'dQw4w9WgXcQ'
});

// Control via SRemote
await remote.play();
await remote.seek(30);
await remote.volume(0.8);
await remote.load('M7lc1UVf-VE'); // Switch video
```

👉 See the complete list of providers and custom provider guidelines in the **[SRemote Ready2use API Documentation](../../api/en/ready2use.md)**.

---

## 2. Including SRemote Wrapper Standalone (For Custom Iframes)

If you already have existing `<iframe>` elements in your markup or are using custom media players, include `@sremote/wrapper` directly:

### Method A: NPM Package (Recommended for React, Vue, Vite, Next.js...)
```bash
npm install @sremote/wrapper
```

Initialize the client:
```javascript
import { createSRemote } from '@sremote/wrapper';

const remote = createSRemote();
await remote.ready();
```

### Method B: `<script>` Tag (Static HTML)
Add the wrapper bundle to the top of `<head>`:

```html
<script src="dist/sremote.wrapper.min.js"></script>
```

> [!TIP]
> **Script Loading Order (Best Practice):**  
> Always import and initialize `@sremote/wrapper` **as early as possible in `<head>`**, before untrusted third-party ad scripts, analytics, or iframes mount.  
> If the userscript is absent, `@sremote/wrapper` automatically guards `window.sremote` with a safe, non-writable Proxy, preventing third-party scripts from tampering with or hijacking the global object.

---

## 3. Handshake Lifecycle & Basic Control

The standard integration pattern consists of: **Register Events** → **Send `hello()` Handshake**.

```javascript
// 1. Listen for connection success
window.sremote.on('accept', (data) => {
  console.log('✅ Connected to media:', data.instanceId);
  console.log('Media type:', data.mediaType); // 'video' | 'audio' | 'mediasession' | 'adapter'
});

// 2. Listen to real-time playback progression
window.sremote.on('timeupdate', (data) => {
  const { currentTime, duration } = data.state;
  console.log(`⏱️ Progress: ${Math.round(currentTime)}s / ${Math.round(duration)}s`);
});

// 3. Initiate discovery once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.sremote.hello();
});
```

---

## 4. Essential Playback Commands

Once connected, control methods are immediately accessible:

```javascript
// Play / Pause / Toggle
window.sremote.play();
window.sremote.pause();
window.sremote.toggle();

// Seek relative or jump to absolute seconds
window.sremote.seek(10);     // Forward 10s
window.sremote.seek(-10);    // Rewind 10s
window.sremote.seekTo(120);  // Jump to 2:00 (120s)

// Volume & Mute
window.sremote.volume(0.7);  // 70% volume
window.sremote.mute();       // Toggle mute

// Load new media source (Designed for custom adapters like YouTube loadVideoById)
window.sremote.load('M7lc1UVf-VE');
```

---

## 5. Custom Adapters: `adapters.set` vs `BaseProvider`?

- **Use `sremote.adapters.set()` / `sremote.adapters.register()`**: When you already have the iframe on your site and simply need an adapter object to map `play()`, `pause()`, and `seekTo()`.
- **Subclass `BaseProvider`**: When creating a reusable, standalone provider module that handles SDK loading and offers both `.mount()` and `.create()` interfaces.

👉 For implementation details, see **[SRemote Ready2use API Guide](../../api/en/ready2use.md)**.

---

## 6. Framework & Platform Recipes

For complete copy-paste templates with React, Vue, or official SDK Adapters (YouTube, Spotify, SoundCloud):

👉 Visit the **[Integration Recipes](../../recipes.html)** page!

---

## ⏭️ Next Step
Proceed to **[04. Testing & Debugging](./04-testing-debugging.md)**.


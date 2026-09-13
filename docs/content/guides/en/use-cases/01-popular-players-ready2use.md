# Use-case 1: Embed & Control 22 Platforms with Ready2Use

This is the **fastest, most common, and highly recommended** integration path for modern web applications.

When combining `@sremote/sdk` with `@sremote/ready2use`, you do not need to manually include vendor SDKs, configure `<iframe>` boilerplate, and **end users are not required to install any Userscript**.

---

## 1. Installation

```bash
npm install @sremote/sdk @sremote/ready2use
```

---

## 2. Two Initialization Methods: `.mount()` vs `.create()`

All 22 platform modules exported by `@sremote/ready2use` provide two flexible initialization methods:

### A. Method `.mount(container, options)` (Recommended)
Automatically creates the DOM element or iframe, mounts it into the specified `container`, and **automatically binds the adapter to `sremote`**:

```javascript
import { sremote } from '@sremote/sdk';
import { youtube } from '@sremote/ready2use';

await youtube.mount('#my-player-container', {
  videoId: 'dQw4w9WgXcQ',
  width: '100%',
  height: 400
});

// Control cleanly and synchronously via sremote:
await sremote.play();
await sremote.pause();
await sremote.seek(15);
```

### B. Method `.create(options)` (Ideal for React / Vue)
Generates the DOM object and adapter, but **does not append it to the DOM**. Suitable when you prefer managing the iframe lifecycle manually within UI component lifecycles:

```javascript
import { sremote } from '@sremote/sdk';
import { vimeo } from '@sremote/ready2use';

const vm = await vimeo.create({
  videoId: '76979871',
  width: '100%',
  height: 400
});

// Manually mount iframe into your component's container:
document.getElementById('wrapper-box').appendChild(vm.iframe);

// Control via sremote as usual:
await sremote.play();
```

---

## 3. Two Control Paradigms: Centralized (`sremote`) vs Scoped (`remote`)

SRemote supports two architectural models depending on how your project is structured:

### Model 1: Centralized Control via `sremote` (Recommended for Site-wide / Dashboards)
When your application features a global media control bar (Floating Player Controls, Bottom Player Bar) or manages multiple instances:

```javascript
import { sremote } from '@sremote/sdk';
import { youtube } from '@sremote/ready2use';

const yt = await youtube.mount('#player', { videoId: 'dQw4w9WgXcQ' });

// Controls the currently active player:
await sremote.play();
await sremote.seekTo(45);
await sremote.volume(0.8);
await sremote.toggle();

// Or target a specific player by instanceId:
await sremote.play(yt.instanceId);

// Listen to global media events:
sremote.on('timeupdate', ({ instanceId, state }) => {
  console.log(`[${instanceId}] Position: ${state.currentTime}s / ${state.duration}s`);
});
```

### Model 2: Scoped Control via `remote` (Ideal for Isolated Components)
When creating standalone, reusable UI widgets (such as a video card component inside a feed), you can interact directly with the scoped `remote` controller without relying on the global client:

```javascript
const { remote, destroy } = await youtube.mount('#player', { videoId: 'dQw4w9WgXcQ' });

// Isolated controls within component scope:
await remote.play();
await remote.pause();
await remote.seekTo(30);
await remote.toggle();

// Teardown when component unmounts:
// destroy();
```

---

## 4. Supported Platforms (22 Services)

| Platform | Import | Adapter Support | Integration Mechanism |
| :--- | :--- | :---: | :--- |
| **YouTube** | `import { youtube } from '@sremote/ready2use'` | ✅ Full | YouTube IFrame Player API (`YT.Player`) |
| **Vimeo** | `import { vimeo } from '@sremote/ready2use'` | ✅ Full | Vimeo Player SDK (`@vimeo/player`) |
| **SoundCloud** | `import { soundcloud } from '@sremote/ready2use'` | ✅ Full | SoundCloud Widget API (`SC.Widget`) |
| **Dailymotion** | `import { dailymotion } from '@sremote/ready2use'` | ✅ Full | Dailymotion Player SDK |
| **Twitch** | `import { twitch } from '@sremote/ready2use'` | ✅ Full | Twitch Interactive Player SDK |
| **Mixcloud** | `import { mixcloud } from '@sremote/ready2use'` | ✅ Full | Mixcloud Widget API |
| **Spotify** | `import { spotify } from '@sremote/ready2use'` | ✅ Full | Spotify IFrame API (`EmbedController`) |
| **Apple MusicKit** | `import { applemusickit } from '@sremote/ready2use'` | ✅ Full | Apple MusicKit JS v3 SDK |
| **PeerTube** | `import { peertube } from '@sremote/ready2use'` | ✅ Full | PeerTube Embed API |
| **TikTok** | `import { tiktok } from '@sremote/ready2use'` | ✅ Full | TikTok Official Embed Player (v1) postMessage |
| **NicoNico** | `import { niconico } from '@sremote/ready2use'` | ✅ Full | NicoNico Player PostMessage Protocol |
| **Facebook** | `import { facebook } from '@sremote/ready2use'` | ✅ Full | Facebook Video Player SDK |
| **Apple Music (Embed)** | `import { applemusic } from '@sremote/ready2use'` | ⚠️ Fallback | Web Embed Player |
| **Rumble** | `import { rumble } from '@sremote/ready2use'` | ⚠️ Fallback | Rumble Embed Player |
| **Kick** | `import { kick } from '@sremote/ready2use'` | ⚠️ Fallback | Kick Interactive Player |
| **Streamable** | `import { streamable } from '@sremote/ready2use'` | ⚠️ Fallback | Streamable Embed |
| **Odysee / LBRY** | `import { odysee } from '@sremote/ready2use'` | ⚠️ Fallback | Odysee Embed |
| **Bandcamp** | `import { bandcamp } from '@sremote/ready2use'` | ⚠️ Fallback | Audio player widget |
| **Twitter / X** | `import { twitter } from '@sremote/ready2use'` | ❌ View-only (`null`) | Twitter Embed Widget |
| **Instagram** | `import { instagram } from '@sremote/ready2use'` | ❌ View-only (`null`) | Instagram Embed Frame |
| **Threads** | `import { threads } from '@sremote/ready2use'` | ❌ View-only (`null`) | Threads Reel Frame |
| **Bilibili** | `import { bilibili } from '@sremote/ready2use'` | ❌ View-only (`null`) | Bilibili Player Embed Frame |

> [!IMPORTANT]
> **View-only Widgets Notice:**  
> Platforms `twitter`, `threads`, `bilibili`, and `instagram` provide embed widgets strictly for display and do not expose programmatic two-way playback control APIs. Their `adapter` property intentionally returns `null` so SRemote avoids binding empty mock adapters.

---

## ⏭️ Next Steps
- Need to integrate an in-house video player or an unlisted service? See [Use-case 2: Custom Player Adapters](./02-custom-player-adapter.md).

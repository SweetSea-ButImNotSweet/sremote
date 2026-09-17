[ English ] | [ Tiếng Việt ](README/vi.md)

# SRemote

> **Universal Cross-Origin Embedded Media Remote Control Framework & SDK**

[![License: LGPL v3](https://img.shields.io/badge/License-LGPL_v3-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@sremote/wrapper.svg)](https://www.npmjs.com/package/@sremote/wrapper)

**SRemote** provides a unified control interface for embedded web media (HTML5 video/audio, YouTube, Spotify, Vimeo, SoundCloud, Bilibili, and 20+ other platforms). It solves cross-domain limitations (Same-Origin Policy) through an optional companion userscript bridge and provides rich client-side SDKs for web developers.

---

## 💡 Why SRemote? (Situations & Comparison)

### 1. Incompatible SDKs vs Unified API
Managing multiple players usually requires loading heavy proprietary SDKs and juggling conflicting method names.

<table width="100%">
<tr>
<th width="50%">❌ Without SRemote</th>
<th width="50%">✅ With SRemote</th>
</tr>
<tr>
<td width="50%" valign="top">

```javascript
// Juggling 4 different SDKs & APIs
if (type === 'youtube') {
  ytPlayer.pauseVideo();
  ytPlayer.seekTo(
    ytPlayer.getCurrentTime() + 10
  );
} else if (type === 'vimeo') {
  await vimeoPlayer.pause();
  const t = await vimeoPlayer.getCurrentTime();
  await vimeoPlayer.setCurrentTime(t + 10);
} else if (type === 'spotify') {
  spotifyEmbed.togglePlay();
} else if (type === 'html5') {
  videoElement.pause();
  videoElement.currentTime += 10;
}
```

</td>
<td width="50%" valign="top">

```javascript
import { createSRemote } from '@sremote/wrapper';

const remote = createSRemote();
await remote.ready();

// Unified API for ALL players:
await remote.pause();
await remote.seek(10);
```

</td>
</tr>
</table>

### 2. The Cross-Origin (Same-Origin Policy) Dead End
Embedding platforms without official JS APIs (Bilibili, Kick, Bandcamp) makes the iframe a completely unreadable "black box".

<table width="100%">
<tr>
<th width="50%">❌ Without SRemote</th>
<th width="50%">✅ With SRemote</th>
</tr>
<tr>
<td width="50%" valign="top">

```javascript
// Accessing cross-origin iframe:
const iframe = document.querySelector('iframe');
iframe.contentWindow.document... 
// 💥 DOMException: Blocked a frame
// with origin "..." from accessing
// a cross-origin frame.
// Cannot detect 'ended' or trigger seek!
```

</td>
<td width="50%" valign="top">

```javascript
// Companion Userscript bridges iframe:
remote.on('timeupdate', ({ state }) => {
  if (state.currentTime >= state.duration) {
    playNextTrack();
  }
});

// Control third-party iframes seamlessly:
await remote.seek(15);
```

</td>
</tr>
</table>

### 3. State Synchronization (Watch Party / Global Media Bar)
Co-watching rooms and dashboard widgets require standardized playback events across heterogeneous sources.

<table width="100%">
<tr>
<th width="50%">❌ Without SRemote</th>
<th width="50%">✅ With SRemote</th>
</tr>
<tr>
<td width="50%" valign="top">

```javascript
// Normalizing events manually:
ytPlayer.addEventListener('onStateChange', (e) => {
  if (e.data === 1) {
    socket.emit('play', ytPlayer.getCurrentTime());
  }
});
vimeoPlayer.on('play', (d) => {
  socket.emit('play', d.seconds);
});
spotify.addListener('playback_update', ...);
```

</td>
<td width="50%" valign="top">

```javascript
// Unified schema across all providers:
remote.on('play', ({ state, instanceId }) => {
  socket.emit('sync_play', {
    currentTime: state.currentTime,
    instanceId
  });
});
```

</td>
</tr>
</table>

---

## 📦 Packages in this Monorepo

| Package | Purpose | Documentation |
| :--- | :--- | :--- |
| **`@sremote/wrapper`** | Client-side SDK to auto-discover, connect, control players, and show install prompts | [Wrapper README](packages/wrapper/README.md) |
| **`@sremote/ready2use`** | Pre-configured player presets & official SDK adapters (YouTube, Spotify, Apple Music, etc.) | [Ready2Use README](packages/ready2use/README.md) |
| **`@sremote/userscript`** | The companion Userscript bridging cross-origin iframes without native APIs | [Userscript Guide](packages/userscript/README.md) |

---

## 🚀 Quick Start

### 1. Using `@sremote/wrapper` (Universal Client SDK)

```bash
npm install @sremote/wrapper
```

```javascript
import { createSRemote } from '@sremote/wrapper';

const remote = createSRemote();
await remote.ready();

// Prompt user if userscript is required for cross-domain iframes
if (!remote.isUserscriptAvailable()) {
  remote.showInstallModal();
}

// Control playback across same-origin and bridged cross-origin players
await remote.play();
await remote.seek(10);
await remote.volume(0.8);
```

### 2. Using `@sremote/ready2use` (Pre-configured Player Presets)

```bash
npm install @sremote/ready2use @sremote/wrapper
```

```javascript
import { youtube, spotify } from '@sremote/ready2use';

// Mount YouTube player and auto-bind to SRemote
const yt = await youtube.mount('#player-container', {
  videoId: 'dQw4w9WgXcQ'
});

await yt.remote.play();
await yt.remote.seek(15);
```

### 3. Direct HTML / Global Script (`window.sremote`)

```html
<script src="https://cdn.jsdelivr.net/npm/@sremote/wrapper/dist/index.global.js"></script>
<script>
  window.sremote.hello();
  window.sremote.on('accept', (data) => console.log('Connected:', data.instanceId));
  window.sremote.play();
</script>
```

---

## 🎯 Supported Providers & Compatibility

| Platform / Service | Support Mechanism | Integration Notes |
| :--- | :---: | :--- |
| **Pure HTML5 (Plyr, VideoJS, etc.)** | ✅ Native | Direct DOM/event control, no adapter needed |
| **Bilibili / Rumble / Kick / Bandcamp** | ✅ Userscript Discovery | Auto-discovered via the companion userscript |
| **YouTube** | ⚡ Adapter / Ready2Use | Via IFrame Player API |
| **Spotify** | ⚡ Adapter / Ready2Use | Via Spotify IFrame API |
| **Apple Music (MusicKit)** | ⚡ Adapter / Ready2Use | Via MusicKit JS |
| **SoundCloud** | ⚡ Adapter / Ready2Use | Via SoundCloud Widget API |
| **Vimeo / Dailymotion / Twitch / Mixcloud** | ⚡ Adapter / Ready2Use | Via Official Player SDKs |
| **NicoNico Douga** | ⚡ PostMessage Mode | Connected via 2-way postMessage protocol |

---

## 👤 End-User / Userscript Installation

If a website redirected you here to install the SRemote Userscript:
- 👉 Read the [Userscript Guide](packages/userscript/README.md) to understand why the hosting site needs this bridge.
- Direct script URL: [`dist/sremote.user.js`](https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.user.js)

---

## 📖 Documentation & Links

- 📘 **Technical Documentation:** [SRemote Documentation](docs/index.html)
- 🍳 **Cookbook / Embed Recipes:** [Recipes](docs/recipes.html)
- 🎮 **Developer Test Harness:** [Live Demo](demo/index.html)

---

## 🛠️ Monorepo Development & Build

```bash
# Install dependencies
npm install

# Start development server with live reload
npm run dev

# Build all packages (Userscript, Wrapper, Ready2Use)
npm run build

# Format codebase
npm run format
```

---

## 📄 License

This project is licensed under the **GNU Lesser General Public License v3.0 (LGPL-3.0)** - see the [LICENSE](LICENSE) file for details.

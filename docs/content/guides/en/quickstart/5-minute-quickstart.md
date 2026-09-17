# 5-Minute Quickstart with SRemote

Welcome to **SRemote**! This guide will get you embedding and controlling third-party media players (video/audio) on your webpage in under 5 minutes.

---

## 1. Install Required Packages

SRemote provides two complementary packages designed for modern frontend stacks:
- **`@sremote/sdk`**: Universal Client SDK to control media, manage events, and handle cross-frame communication.
- **`@sremote/ready2use`**: Ready-made presets for 22 platforms (YouTube, Vimeo, Spotify, SoundCloud, Twitch, TikTok, etc.).

Install using your preferred package manager:

```bash
# npm
npm install @sremote/sdk @sremote/ready2use

# pnpm
pnpm add @sremote/sdk @sremote/ready2use

# yarn
yarn add @sremote/sdk @sremote/ready2use
```

---

## 2. Embed and Control Your First Player

Let's embed a YouTube video into your page and control it via `sremote`:

### HTML:
Create a container for the player in your HTML:
```html
<div id="player-box" style="width: 100%; max-width: 720px; aspect-ratio: 16/9;"></div>

<div style="margin-top: 12px; display: flex; gap: 8px;">
  <button id="btn-play">▶ Play</button>
  <button id="btn-pause">⏸ Pause</button>
  <button id="btn-seek">⏩ +10s</button>
  <button id="btn-mute">🔇 Mute</button>
</div>
```

### JavaScript / TypeScript:
```javascript
import { sremote } from '@sremote/sdk';
import { youtube } from '@sremote/ready2use';

// 1. Mount YouTube Player directly into the container
await youtube.mount('#player-box', {
  videoId: 'dQw4w9WgXcQ',
  width: '100%',
  height: '100%'
});

// 2. Control cleanly and naturally via sremote:
document.getElementById('btn-play').onclick = () => sremote.play();
document.getElementById('btn-pause').onclick = () => sremote.pause();
document.getElementById('btn-seek').onclick = () => sremote.seek(10);
document.getElementById('btn-mute').onclick = () => sremote.mute();

// 3. Listen to unified media events
sremote.on('timeupdate', ({ instanceId, state }) => {
  console.log(`[${instanceId}] Current Time:`, state.currentTime);
});

sremote.on('statechange', ({ state }) => {
  console.log('Playback state changed:', state.paused ? 'Paused' : 'Playing');
});
```

---

## 3. How It Works

1. **`youtube.mount()`**: Automatically injects the necessary player SDK or iframe, initializes the player instance, and registers an adapter with `sremote`.
2. **`sremote.*`**: Acts as a centralized controller. Commands such as `play()`, `pause()`, and `seek()` are automatically dispatched to the active media instance without needing to manage platform-specific API differences manually.
3. **No Userscript Required for Presets**: Platforms with official embed APIs (like YouTube, Vimeo, Spotify, SoundCloud) work out-of-the-box in normal browsers.

---

## 4. Next Steps

- 💡 Read [Architecture Overview](../concepts/architecture-overview.md) to understand the Dual-Engine design.
- 🛠️ Explore [Use-case 1: 22 Platforms with Ready2Use](../use-cases/01-popular-players-ready2use.md).
- 🔌 Need an in-house or custom player? Check [Use-case 2: Custom Player Adapters](../use-cases/02-custom-player-adapter.md).
- 📊 See the full [Compatibility Matrix](../advanced/compatibility-matrix.md) across all 22 supported services.

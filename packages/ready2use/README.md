# @sremote/ready2use

Pre-configured player presets, third-party embed integrations, and standardized player adapters for [SRemote](https://github.com/SweetSea-ButImNotSweet/sremote).

It automatically loads third-party SDKs, injects and sizes DOM/iframe elements, bridges third-party player APIs into **standard HTML5 Media Element compliant adapters**, and provides a unified standalone **`remote` controller**.

---

## 📦 Installation

```bash
# npm
npm install @sremote/ready2use @sremote/wrapper

# pnpm
pnpm add @sremote/ready2use @sremote/wrapper
```

---

## 🎯 Supported Providers (22 Platforms)

All exported providers expose `.mount(container, options)` and `.create(options)`.

| Provider | Export | SRemote Adapter | Mechanism & Integration |
| :--- | :--- | :---: | :--- |
| **YouTube** | `youtube` | ✅ Full | YouTube IFrame Player API (`YT.Player`) |
| **Vimeo** | `vimeo` | ✅ Full | Vimeo Player SDK (`@vimeo/player`) |
| **SoundCloud** | `soundcloud` | ✅ Full | SoundCloud Widget API (`SC.Widget`) |
| **Dailymotion** | `dailymotion` | ✅ Full | Dailymotion Player SDK |
| **Twitch** | `twitch` | ✅ Full | Twitch Interactive Player SDK |
| **Mixcloud** | `mixcloud` | ✅ Full | Mixcloud Widget API |
| **Spotify** | `spotify` | ✅ Full | Spotify IFrame API (`EmbedController`) |
| **Apple MusicKit** | `applemusickit` | ✅ Full | Apple MusicKit JS v3 SDK |
| **PeerTube** | `peertube` | ✅ Full | PeerTube Embed API |
| **TikTok** | `tiktok` | ✅ Full | TikTok Official Embed Player (v1) via 2-way postMessage |
| **NicoNico** | `niconico` | ✅ Full | NicoNico Player PostMessage Protocol |
| **Facebook** | `facebook` | ✅ Full | Facebook Embedded Video SDK |
| **Apple Music (Embed)** | `applemusic` | ⚠️ Fallback | Apple Music Web Player Embed |
| **Rumble** | `rumble` | ⚠️ Fallback | Rumble Embed Player |
| **Kick** | `kick` | ⚠️ Fallback | Kick Interactive Player Embed |
| **Streamable** | `streamable` | ⚠️ Fallback | Streamable Embed Player |
| **Odysee / LBRY** | `odysee` | ⚠️ Fallback | Odysee Embed Player |
| **Bandcamp** | `bandcamp` | ⚠️ Fallback | Bandcamp Embed Widget |
| **Twitter / X** | `twitter` | ❌ None (`null`) | Twitter Embed Widget (view-only social embed) |
| **Instagram** | `instagram` | ❌ None (`null`) | Instagram Embed Frame (view-only social embed) |
| **Threads** | `threads` | ❌ None (`null`) | Threads Post/Reel Frame (view-only social embed) |
| **Bilibili** | `bilibili` | ❌ None (`null`) | Bilibili Player Embed (view-only iframe embed) |

> [!NOTE]
> Social embed widgets (`twitter`, `threads`, `bilibili`, `instagram`) do not provide interactive programmatic playback APIs. Their `createAdapter()` intentionally returns `null` so SRemote will not register invalid dummy adapters.

---

## 🚀 Usage

Both `mount()` and `create()` return a unified object:
```typescript
interface ProviderResult {
  element: HTMLElement;         // Generated root DOM element
  iframe?: HTMLIFrameElement;   // Iframe element (if provider uses iframe)
  remote: RemoteController;     // Direct standalone Promise-based player controller
  adapter: SRemoteCustomAdapter | null; // HTML5 Media Element compliant adapter
  player: any;                  // Native SDK instance (e.g. YT.Player, Vimeo.Player)
  instanceId: string;           // Unique instance identifier
  capabilities: SRemoteCapabilities; // Supported feature matrix
  destroy: () => void;          // Cleanup and teardown function
}
```

---

### 1. Mount & Direct Control via `remote`

```javascript
import { youtube } from '@sremote/ready2use';

// Mount YouTube Player into '#player-box'
const yt = await youtube.mount('#player-box', {
  videoId: 'dQw4w9WgXcQ',
  playerVars: { autoplay: 0, controls: 1 }
});

// Control immediately with the standalone remote controller:
await yt.remote.play();
await yt.remote.seekTo(45); // Seek to 45s
await yt.remote.seek(10);   // Relative seek: jump forward 10s
await yt.remote.setVolume(0.8);
await yt.remote.toggle();   // Toggle play / pause

console.log('Current time:', yt.remote.getCurrentTime());
console.log('Duration:', yt.remote.getDuration());

// Teardown when unmounting
// yt.destroy();
```

---

### 2. Integration with SRemote Wrapper

By default, `.mount()` and `.create()` automatically register the adapter into the active `sremote` instance (if available):

```javascript
import { vimeo } from '@sremote/ready2use';
import { sremote } from '@sremote/wrapper';

const { instanceId } = await vimeo.mount('#vimeo-box', {
  videoId: '76979871'
});

// Control via SRemote client
await sremote.play(instanceId);
await sremote.seek(30, instanceId);

sremote.on('timeupdate', ({ state, instanceId: id }) => {
  if (id === instanceId) {
    console.log(`Playback: ${state.currentTime}s / ${state.duration}s`);
  }
});
```

---

### 3. Framework Usage (React / Vue / Svelte)

Use `.create()` to prepare DOM elements and adapters without immediate attachment:

```javascript
import { soundcloud } from '@sremote/ready2use';

const { iframe, remote, destroy } = await soundcloud.create({
  trackUrl: 'https://api.soundcloud.com/tracks/293',
  color: '#ff5500'
});

// Mount DOM manually in component lifecycle:
document.getElementById('my-container').appendChild(iframe);

// Control via remote controller:
await remote.play();
```

---

## 🛠️ HTML5 Media Element Adapter Specification

Adapters created in `@sremote/ready2use` follow the `HTML5MediaElement` specification:

- **Playback**: `play()`, `pause()`, `toggle()`
- **Seeking & Position**:
  - `getCurrentTime()`: Returns current position in seconds.
  - `setCurrentTime(seconds)`: Core HTML5 seek method (absolute position).
  - `seekTo(seconds)`: Standard alias to `setCurrentTime(seconds)`.
  - `seek(deltaSeconds)`: Relative seek offset (`currentTime + delta`).
- **Volume**: `getVolume()`, `setVolume(0..1)`, `getMuted()`, `setMuted(boolean)`, `toggleMuted()`
- **State**: `getState()`, `getDuration()`, `isPaused()`
- **Events**: Emitted via `adapter.emit(eventName, payload)` (`play`, `pause`, `timeupdate`, `ended`, `seeking`, `seeked`, `volumechange`).

---

## 🧰 Polyfill Helpers & Utilities

`@sremote/ready2use` exports core helpers for provider authors:

```javascript
import { Polyfills, BaseProvider } from '@sremote/ready2use';

const { setCurrentTime, seekTo, seek, toggle, Volume } = Polyfills;
```

- **`setCurrentTime(adapter, nativeSeekFn)`**: Normalizes core seek behavior.
- **`seekTo(adapter)`**: Configures `seekTo` alias to `setCurrentTime`.
- **`seek(adapter)`**: Configures relative seeking based on `getCurrentTime()`.
- **`toggle(adapter)`**: Configures play/pause toggling based on `isPaused()`.
- **`Volume` class**: Manages volume levels `[0..1]`, caching, mute/unmute states, and sync callbacks to native SDKs.

---

## 🏗️ Implementing a Custom Provider with `BaseProvider`

```javascript
import { BaseProvider, Polyfills } from '@sremote/ready2use';

export class CustomPlayerProvider extends BaseProvider {
  constructor() {
    super('custom-player');
  }

  async loadSdk() {
    if (window.CustomSDK) return window.CustomSDK;
    // Load script tag if needed...
    return window.CustomSDK;
  }

  async initPlayer(options, instanceId) {
    const SDK = await this.loadSdk();
    const iframe = document.createElement('iframe');
    iframe.src = `https://example.com/embed/${options.id}`;

    const player = new SDK.Player(iframe);

    return {
      player,
      element: iframe,
      iframe,
      destroy: () => player.destroy?.()
    };
  }

  createAdapter(player, context) {
    const volumeManager = new Polyfills.Volume({
      onVolumeChange: (vol) => player.setVolume(vol * 100),
      onMuteChange: (muted) => player.setMuted(muted)
    });

    const adapter = {
      play: () => player.play(),
      pause: () => player.pause(),
      getCurrentTime: () => player.getTime() || 0,
      getDuration: () => player.getDuration() || 0,
      isPaused: () => player.paused(),
      getVolume: () => volumeManager.getVolume(),
      setVolume: (vol) => volumeManager.setVolume(vol),
      getMuted: () => volumeManager.getMuted(),
      setMuted: (m) => volumeManager.setMuted(m),
      load: (src) => player.load(src),
      getState: () => ({
        paused: player.paused(),
        currentTime: player.getTime() || 0,
        duration: player.getDuration() || 0
      })
    };

    // Attach HTML5 polyfill helpers
    Polyfills.setCurrentTime(adapter, (sec) => player.seek(sec));
    Polyfills.seekTo(adapter);
    Polyfills.seek(adapter);
    Polyfills.toggle(adapter);

    return adapter;
  }
}
```

---

## 📄 License

LGPL-3.0
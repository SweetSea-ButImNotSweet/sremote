# SRemote Ready2use API (`@sremote/ready2use`)

The `@sremote/ready2use` package provides **out-of-the-box player presets**, third-party embed integrations, and standardized player adapters for popular media platforms.

`@sremote/ready2use` automates all manual integration steps:
1. Loading third-party SDK scripts (YouTube IFrame API, Vimeo Player SDK, Spotify IFrame SDK, Apple MusicKit...).
2. Injecting and configuring properly formatted `<iframe>` elements or DOM containers.
3. Providing pre-built **HTML5 Media Element compliant adapters**.
4. Returning a unified standalone **`remote` (Remote Controller)** for immediate direct programmatic control.
5. Automatically binding the adapter to the active SRemote client in a single command.

---

## 1. Installation

```bash
# npm
npm install @sremote/ready2use

# pnpm
pnpm add @sremote/ready2use
```

---

## 2. Supported Out-of-the-Box Providers (22 Platforms)

All exported providers support both `.mount(container, options)` and `.create(options)`:

| Provider | Import | SRemote Adapter | Platform & Mechanism |
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
| **TikTok** | `import { tiktok } from '@sremote/ready2use'` | ✅ Full | TikTok Official Embed Player (v1) via 2-way postMessage |
| **NicoNico** | `import { niconico } from '@sremote/ready2use'` | ✅ Full | NicoNico Player PostMessage Protocol |
| **Facebook** | `import { facebook } from '@sremote/ready2use'` | ✅ Full | Facebook Video Player Embed SDK |
| **Apple Music (Embed)** | `import { applemusic } from '@sremote/ready2use'` | ⚠️ Fallback | Apple Music Web Player Embed |
| **Rumble** | `import { rumble } from '@sremote/ready2use'` | ⚠️ Fallback | Rumble Embed Player |
| **Kick** | `import { kick } from '@sremote/ready2use'` | ⚠️ Fallback | Kick Interactive Player Embed |
| **Streamable** | `import { streamable } from '@sremote/ready2use'` | ⚠️ Fallback | Streamable Embed Player |
| **Odysee / LBRY** | `import { odysee } from '@sremote/ready2use'` | ⚠️ Fallback | Odysee Embed Player |
| **Bandcamp** | `import { bandcamp } from '@sremote/ready2use'` | ⚠️ Fallback | Bandcamp Embed Widget |
| **Twitter / X** | `import { twitter } from '@sremote/ready2use'` | ❌ None (`null`) | Twitter Embed Widget (view-only social embed) |
| **Instagram** | `import { instagram } from '@sremote/ready2use'` | ❌ None (`null`) | Instagram Embed Frame (view-only social embed) |
| **Threads** | `import { threads } from '@sremote/ready2use'` | ❌ None (`null`) | Threads Post/Reel Frame (view-only social embed) |
| **Bilibili** | `import { bilibili } from '@sremote/ready2use'` | ❌ None (`null`) | Bilibili Player Embed (view-only iframe embed) |

> [!NOTE]
> Social embed widgets (`twitter`, `threads`, `bilibili`, `instagram`) are purely intended for visual rendering without an interactive two-way programmatic playback API. Their `createAdapter()` intentionally returns `null` so that SRemote will not register invalid empty adapters.

---

## 3. Basic Usage Patterns

### A. `mount(container, options)` Method (Recommended)
Generates the iframe/element, appends it into a target DOM container, returns a direct `remote` controller, and automatically registers the adapter into SRemote.

```javascript
import { youtube, vimeo } from '@sremote/ready2use';
import { sremote } from '@sremote/sdk';

// Mount YouTube Player directly into element #player-box
const yt = await youtube.mount('#player-box', {
  videoId: 'dQw4w9WgXcQ',
  playerVars: {
    autoplay: 0,
    controls: 1
  }
});

// 1. Approach 1: Direct control via standalone `remote` controller:
await yt.remote.play();
await yt.remote.seekTo(30);   // Absolute seek to 30s
await yt.remote.seek(10);     // Relative seek forward 10s
await yt.remote.setVolume(0.8);
await yt.remote.toggle();     // Toggle play / pause

// 2. Approach 2: Control via SRemote wrapper instance (Fluent selector):
await sremote(yt.instanceId).play();
await sremote(yt.instanceId).seek(45);
// Or chaining: await sremote(yt.instanceId).play().seek(45);

// Listen to real-time playback events (timeupdate, play, pause, ended...):
sremote.on('timeupdate', (data) => {
  if (data.instanceId === yt.instanceId) {
    console.log(`⏱️ Time: ${Math.round(data.state.currentTime)}s / ${Math.round(data.state.duration)}s`);
  }
});

sremote.on('ended', (data) => {
  if (data.instanceId === yt.instanceId) {
    console.log('🎉 Video finished playing!');
  }
});

// Cleanup player when component unmounts:
// yt.destroy();
```

### B. `create(options)` Method (React / Vue / Svelte)
Generates the DOM element, adapter, and controller **without** attaching it to the DOM immediately. Ideal for UI framework component lifecycles.

```javascript
import { soundcloud } from '@sremote/ready2use';

const { iframe, remote, instanceId, destroy } = await soundcloud.create({
  trackUrl: 'https://api.soundcloud.com/tracks/293',
  color: '#ff5500'
});

// 1. Manually insert the iframe into your component/DOM:
document.getElementById('my-music-wrapper').appendChild(iframe);

// 2. Control directly via remote:
await remote.play();
```

---

## 4. Returned Result Structure (`ProviderMountResult` / `ProviderCreateResult`)

Both `provider.mount()` and `provider.create()` return a Promise resolving to a unified context object:

```typescript
interface ProviderMountResult {
  element: HTMLElement;         // Generated DOM element (wrapper div or iframe)
  iframe?: HTMLIFrameElement;   // The iframe element (if provider generates an iframe)
  remote: RemoteController;     // Direct standalone Promise-based player controller
  adapter: SRemoteCustomAdapter | null; // SRemote Custom Adapter compliant with HTML5 Media Element
  player: any;                  // Native Player instance from third-party SDK (YT.Player, Vimeo.Player...)
  instanceId: string;           // Unique instance identifier
  capabilities: SRemoteCapabilities; // Feature support matrix
  destroy: () => void;          // Cleanup function to teardown player and remove DOM nodes
}
```

---

## 5. Standalone Fluent Remote Controller (`remote` / `FluentRemoteProxy`)

The `remote` object returned by `mount()` and `create()` supports SRemote's Clean Fluent API chaining, enabling seamless asynchronous invocation without passing an `instanceId`:

| Method / Property | Signature | Description |
| :--- | :--- | :--- |
| `play()` | `remote.play()` | Starts media playback. |
| `pause()` | `remote.pause()` | Pauses media playback. |
| `toggle()` | `remote.toggle()` | Toggles between play and pause. |
| `stop()` | `remote.stop()` | Stops playback and resets currentTime to 0. |
| `seek()` | `remote.seek(seconds)` | Relative seek forward (+) or backward (-). |
| `seekTo()` | `remote.seekTo(seconds)` | Direct seek to absolute timestamp (seconds). |
| `volume()` | `remote.volume(val)` | Sets volume level (`0.0` to `1.0`). |
| `mute()` | `remote.mute(muted?)` | Sets or toggles mute state. |
| `speed()` | `remote.speed(rate)` | Changes playback speed. |
| `swap()` | `remote.swap(urlOrOptions)` | Swaps media source/URL in-place while preserving instance ID and listeners. |
| `tap()` | `remote.tap(state => ...)` | Inspects state snapshot midway through a fluent chain. |
| `state` | `remote.state` | Synchronous getter for instant playback state snapshot. |
| `next()` | `remote.next()` | Advances to next track/video in playlist. |
| `previous()` | `remote.previous()` | Returns to previous track/video in playlist. |
| `load()` | `remote.load(source)` | Loads a new track, video ID, or source. |

---

## 6. HTML5 Media Element Adapter Specification

All adapters built in `@sremote/ready2use` adhere to the `HTML5MediaElement` standard:

- **Playback**: `play()`, `pause()`, `toggle()`, `stop()`
- **Position & Seeking**:
  - `getCurrentTime()`: Retrieves current playback position (seconds).
  - `setCurrentTime(seconds)`: Core HTML5 method to set absolute playback position.
  - `seekTo(seconds)`: Standard alias pointing to `setCurrentTime(seconds)`.
  - `seek(deltaSeconds)`: Relative seeking offset (`currentTime + delta`).
- **Volume**: `getVolume()`, `setVolume(0..1)`, `getMuted()`, `setMuted(boolean)`, `toggleMuted()`
- **State**: `getState()`, `getDuration()`, `isPaused()`
- **Events**: Emitted via `adapter.emit(eventName, payload)` (`play`, `pause`, `timeupdate`, `ended`, `seeking`, `seeked`, `volumechange`).

---

## 7. Smart URL Creator & Provider Registry (v4.1+)

`@sremote/ready2use` features intelligent URL resolution that automatically resolves and mounts the right provider without manual instantiation:

### A. Universal URL Resolution with `ready2use.create` & `ready2use.mount`
```javascript
import * as ready2use from '@sremote/ready2use';

// Mount directly from any supported URL across 22 platforms:
const player = await ready2use.mount('#player-box', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
await player.remote.play().seek(15).volume(0.9);

// Seamlessly swap to another media source:
await player.remote.swap('https://soundcloud.com/artist/track-name');
```

### B. Provider Registry & Introspection
- `ready2use.getProvider(name)`: Retrieves a provider instance by name (`'youtube'`, `'spotify'`).
- `ready2use.registerProvider(name, provider)`: Registers a custom provider into the central registry.
- `ready2use.listProviders()`: Lists all registered provider names.
- `ready2use.resolveProviderFromUrl(url)`: Analyzes a URL and returns matched provider metadata.

---

## 8. Creating a Custom Provider with `BaseProvider`

```javascript
import { BaseProvider } from '@sremote/ready2use';

export class MyCustomVideoProvider extends BaseProvider {
  constructor() {
    super('my-custom-video'); // Identifier prefix
  }

  // 1. (Optional) Load third-party SDK
  async loadSdk() {
    if (window.MySDK) return window.MySDK;
    // Load script tag if needed...
    return window.MySDK;
  }

  // 2. Initialize native player
  async initPlayer(options, instanceId) {
    const SDK = await this.loadSdk();

    const iframe = document.createElement('iframe');
    iframe.src = `https://example.com/embed/${options.videoId}`;
    iframe.style.width = options.width || '100%';
    iframe.style.height = options.height || '400px';

    const player = new SDK.Player(iframe);

    return {
      player,
      element: iframe,
      iframe,
      destroy: () => player.destroy?.()
    };
  }

  // 3. Map to HTML5 Media Element compliant SRemote Adapter
  createAdapter(player, context) {
    let currentVolume = 1;
    let isMuted = false;

    const adapter = {
      play: () => player.play(),
      pause: () => player.pause(),
      getCurrentTime: () => player.currentTime || 0,
      setCurrentTime: (sec) => player.seek(sec),
      seekTo: (sec) => player.seek(sec),
      seek: (delta) => player.seek((player.currentTime || 0) + delta),
      getDuration: () => player.duration || 0,
      isPaused: () => player.isPaused(),
      getVolume: () => currentVolume,
      setVolume: (vol) => {
        currentVolume = vol;
        player.setVolume(vol * 100);
      },
      getMuted: () => isMuted,
      setMuted: (muted) => {
        isMuted = muted;
        player.setMuted(muted);
      },
      toggle: () => (player.isPaused() ? player.play() : player.pause()),
      load: (source) => player.load(source),
      getState: () => ({
        paused: player.isPaused(),
        currentTime: player.currentTime || 0,
        duration: player.duration || 0,
        volume: currentVolume,
        muted: isMuted
      })
    };

    // Listen to native player events and emit SRemote signals
    if (player && typeof player.on === 'function') {
      player.on('play', () => adapter.emit?.('play', { state: adapter.getState() }));
      player.on('pause', () => adapter.emit?.('pause', { state: adapter.getState() }));
      player.on('timeupdate', () => adapter.emit?.('timeupdate', { state: adapter.getState() }));
      player.on('ended', () => adapter.emit?.('ended', { state: { ...adapter.getState(), paused: true, ended: true } }));
    }

    return adapter;
  }
}

// Instantiate and export utility helpers
export const myCustomProvider = new MyCustomVideoProvider();
export const myCustomVideo = {
  create: (opts) => myCustomProvider.create(opts),
  mount: (container, opts) => myCustomProvider.mount(container, opts),
  provider: myCustomProvider
};
```

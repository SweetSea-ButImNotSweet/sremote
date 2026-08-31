# SRemote Ready2use API (`@sremote/ready2use`)

The `@sremote/ready2use` package provides **out-of-the-box player presets** for popular third-party media platforms.

It automates all manual integration steps:
1. Loading third-party SDK scripts (YouTube IFrame API, Vimeo Player SDK, Spotify IFrame SDK...).
2. Injecting and configuring properly formatted `<iframe>` elements or DOM containers.
3. Providing pre-built **Custom Adapters** fully compliant with SRemote.
4. Automatically binding the adapter to the SRemote client in a single command.

---

## 1. Installation

```bash
# npm
npm install @sremote/ready2use @sremote/wrapper

# pnpm
pnpm add @sremote/ready2use @sremote/wrapper
```

---

## 2. Supported Out-of-the-Box Providers

All exported providers support both `.mount()` and `.create()` methods:

| Provider | Import | Platform & Mechanism |
| :--- | :--- | :--- |
| **YouTube** | `import { youtube } from '@sremote/ready2use'` | YouTube IFrame Player API (`YT.Player`) |
| **Vimeo** | `import { vimeo } from '@sremote/ready2use'` | Vimeo Player SDK (`@vimeo/player`) |
| **SoundCloud** | `import { soundcloud } from '@sremote/ready2use'` | SoundCloud Widget API (`SC.Widget`) |
| **Dailymotion** | `import { dailymotion } from '@sremote/ready2use'` | Dailymotion Player SDK |
| **Twitch** | `import { twitch } from '@sremote/ready2use'` | Twitch Interactive Player SDK |
| **Mixcloud** | `import { mixcloud } from '@sremote/ready2use'` | Mixcloud Widget API |
| **Spotify** | `import { spotify } from '@sremote/ready2use'` | Spotify IFrame API (`EmbedController`) |
| **TikTok** | `import { tiktok } from '@sremote/ready2use'` | TikTok Official Embed Player (v1) via 2-way postMessage |
| **NicoNico** | `import { niconico } from '@sremote/ready2use'` | NicoNico Player PostMessage Protocol |
| **Bilibili** | `import { bilibili } from '@sremote/ready2use'` | Bilibili Player Embed + SRemote Auto-Discovery |
| **Facebook** | `import { facebook } from '@sremote/ready2use'` | Facebook Video Player Embed |

---

## 3. Basic Usage Patterns

### A. `mount(container, options)` Method (Recommended)
Generates the iframe/element, appends it into a target DOM container, and automatically registers the adapter into SRemote.

```javascript
import { youtube, vimeo, spotify } from '@sremote/ready2use';
import { sremote } from '@sremote/wrapper';

// Mount YouTube Player directly into element #player-box
const { element, iframe, adapter, instanceId, capabilities, destroy } = await youtube.mount('#player-box', {
  videoId: 'dQw4w9WgXcQ',
  playerVars: {
    autoplay: 0,
    controls: 1
  }
});

// Immediate control via SRemote client:
await sremote.play(instanceId);
await sremote.seek(30, instanceId);
await sremote.volume(0.8, instanceId);

// Switch video source:
await sremote.load('M7lc1UVf-VE', instanceId);

// Cleanup player on unmount:
// destroy();
```

### B. `create(options)` Method (React / Vue / Svelte)
Generates the DOM element and SRemote adapter **without** attaching it to the DOM immediately. Ideal for UI framework component lifecycles.

```javascript
import { soundcloud } from '@sremote/ready2use';
import { sremote } from '@sremote/wrapper';

const { iframe, adapter, instanceId, destroy } = await soundcloud.create({
  trackUrl: 'https://api.soundcloud.com/tracks/293',
  color: '#ff5500'
});

// 1. Manually insert the iframe into your component/DOM:
document.getElementById('my-music-wrapper').appendChild(iframe);

// 2. Register adapter into SRemote (if not using mount):
sremote.adapters.register(adapter, instanceId);

// 3. Control via SRemote:
sremote.play(instanceId);
```

---

## 4. Returned Result Signature (`ProviderMountResult` / `ProviderCreateResult`)

Both `provider.mount()` and `provider.create()` return a Promise resolving to a comprehensive context object:

```typescript
interface ProviderMountResult {
  element: HTMLElement;       // Created DOM Element (iframe or container)
  iframe?: HTMLIFrameElement; // Iframe element if applicable
  adapter: SRemoteCustomAdapter; // SRemote Custom Adapter object
  player: any;                // Underlying native SDK instance (YT.Player, Vimeo.Player...)
  instanceId: string;         // Unique instance ID
  capabilities: SRemoteCapabilities; // Detected feature matrix
  destroy: () => void;        // Cleanup and memory release handler
}
```

---

## 5. Building Custom Providers with `BaseProvider`

If you want to package a reusable provider for a custom or proprietary video player:

> [!TIP]
> **Choosing between `BaseProvider` and `sremote.adapters.set`:**
> - Use **`sremote.adapters.set()`** (or `createUniversalAdapter`): If you already have the `<iframe>` in your HTML and just need to write a simple JS object to map commands. This is the fastest approach for 90% of custom needs.
> - Extend **`BaseProvider`**: When you want to create a reusable provider package that automatically injects third-party SDKs, generates the iframe DOM elements, and provides both `create()` and `mount()`. capabilities.

### Custom Provider Implementation Template:

```javascript
import { BaseProvider } from '@sremote/ready2use';

export class MyCustomVideoProvider extends BaseProvider {
  constructor() {
    super('my-custom-video'); // Unique provider prefix
  }

  // 1. (Optional) Load third-party SDK script
  async loadSdk() {
    if (window.MySDK) return window.MySDK;
    // Load script dynamically if needed
    return window.MySDK;
  }

  // 2. Initialize native player & DOM elements
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

  // 3. Map into SRemote Custom Adapter
  createAdapter(player, context) {
    return {
      play: () => player.play(),
      pause: () => player.pause(),
      seekTo: (sec) => player.seek(sec),
      getCurrentTime: () => player.currentTime || 0,
      getDuration: () => player.duration || 0,
      paused: () => player.isPaused(),
      setVolume: (vol) => player.setVolume(vol),
      setMuted: (muted) => player.setMuted(muted),
      load: (source) => player.load(source)
    };
  }
}

// Export singleton instance and convenience helpers
export const myCustomProvider = new MyCustomVideoProvider();
export const myCustomVideo = {
  create: (opts) => myCustomProvider.create(opts),
  mount: (container, opts) => myCustomProvider.mount(container, opts),
  provider: myCustomProvider
};
```

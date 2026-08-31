# @sremote/ready2use

Pre-configured player providers and adapter helpers for [SRemote](https://github.com/SweetSea-ButImNotSweet/sremote).

Automatically initializes third-party SDKs, mounts iframes/elements, and binds custom adapters directly into SRemote out-of-the-box.

---

## 🎯 Supported Providers

| Provider | Method / Mechanism | Exported Helper |
| :--- | :--- | :--- |
| **YouTube** | YouTube IFrame Player API | `youtube` |
| **Vimeo** | Vimeo Player SDK | `vimeo` |
| **SoundCloud** | SoundCloud Widget API | `soundcloud` |
| **Dailymotion** | Dailymotion Player SDK | `dailymotion` |
| **Twitch** | Twitch Interactive Player SDK | `twitch` |
| **Mixcloud** | Mixcloud Widget API | `mixcloud` |
| **Spotify** | Spotify IFrame API (EmbedController) | `spotify` |
| **TikTok** | TikTok Official Embed Player (v1) | `tiktok` |
| **NicoNico** | NicoNico PostMessage Protocol | `niconico` |
| **Bilibili** | Bilibili Player Embed + SRemote Discovery | `bilibili` |
| **Facebook** | Facebook Video Player Embed | `facebook` |


---

## 📦 Installation

```bash
# npm
npm install @sremote/ready2use @sremote/wrapper

# pnpm
pnpm add @sremote/ready2use @sremote/wrapper
```

---

## 🚀 Usage & Use Cases

All providers follow the unified `mount()` and `create()` contract:
`{ remote, iframe, element, adapter, player, instanceId, destroy }`

---

### Use Case 1: All-in-One Mount & Control via SRemote

Creates the player, appends it into a container element, and automatically registers its adapter to SRemote.

```javascript
import { youtube, vimeo, soundcloud } from '@sremote/ready2use';

// YouTube
const yt = await youtube.mount('#youtube-container', {
  videoId: 'dQw4w9WgXcQ'
});
await yt.remote.play();

// Vimeo
const vm = await vimeo.mount('#vimeo-container', {
  videoId: '76979871'
});
await vm.remote.seek(30);

// SoundCloud
const sc = await soundcloud.mount('#sc-container', {
  trackUrl: 'https://api.soundcloud.com/tracks/293'
});
await sc.remote.setVolume(0.5);
```

---

### Use Case 2: Custom DOM Placement & Manual SRemote Binding (React / Vue)

Generates the iframe/element and SRemote adapter without attaching it to the DOM immediately. Useful for UI frameworks (React, Vue, Svelte) or custom layouts.

```javascript
import { dailymotion } from '@sremote/ready2use';
import { createSRemote } from '@sremote/wrapper';

const myRemote = createSRemote();

const { iframe, adapter, instanceId, destroy } = await dailymotion.create({
  video: 'x7tgad0',
  width: 640,
  height: 360
});

// 1. Attach iframe manually into your DOM / component
document.getElementById('my-custom-wrapper').appendChild(iframe);

// 2. Register adapter into your custom SRemote instance
myRemote.adapters.register(adapter, instanceId);

// 3. Control via SRemote
await myRemote.play(instanceId);
```

---

### Use Case 3: Standalone Adapter (Without SRemote)

You can use the standardized adapter directly without initializing or relying on SRemote.

```javascript
import { twitch } from '@sremote/ready2use';

const { iframe, adapter } = await twitch.create({
  channel: 'the8bitdrummer'
});

document.body.appendChild(iframe);

// Control directly via the standard adapter interface
adapter.play();
adapter.seekTo(30);
```

---

### Use Case 4: Native Player SDK Access

When you need provider-specific features not covered by the unified interface, access the underlying native SDK instance directly (`YT.Player`, `Vimeo.Player`, `SC.Widget`, etc.):

```javascript
import { spotify } from '@sremote/ready2use';

const { player } = await spotify.mount('#player-container', {
  uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT'
});

// Access native Spotify EmbedController methods
player.addListener('playback_update', e => {
  console.log('Current position:', e.data.position);
});
```

---

### Custom Providers via `BaseProvider`

You can implement new providers by subclassing `BaseProvider`:

```javascript
import { BaseProvider } from '@sremote/ready2use';

export class CustomProvider extends BaseProvider {
  constructor() {
    super('custom-player');
  }

  async loadSdk() {
    // Optional: Load third-party script
  }

  async initPlayer(options, instanceId) {
    // Initialize native player & return elements
    return {
      player: nativePlayerInstance,
      element: iframeOrDomElement,
      destroy: () => nativePlayerInstance.destroy()
    };
  }

  createAdapter(player, context) {
    // Return SRemote adapter mapping
    return {
      play: () => player.play(),
      pause: () => player.pause(),
      load: (source) => player.load(source)
    };
  }
}
```

---

## 📄 License

LGPL-3.0
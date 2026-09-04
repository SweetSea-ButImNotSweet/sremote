# @sremote/ready2use

Pre-configured player providers and adapter helpers for [SRemote](https://github.com/SweetSea-ButImNotSweet/sremote).

Initializes third-party player SDKs, mounts iframe/DOM elements, and provides standardized player adapters. Can be used with SRemote or standalone directly in application code.

---

## Supported Providers

| Provider | SRemote Adapter | Exported Name |
| :--- | :---: | :--- |
| **YouTube** | Yes | `youtube` |
| **Vimeo** | Yes | `vimeo` |
| **SoundCloud** | Yes | `soundcloud` |
| **Dailymotion** | Yes | `dailymotion` |
| **Twitch** | Yes | `twitch` |
| **Mixcloud** | Yes | `mixcloud` |
| **Spotify** | Yes | `spotify` |
| **Apple MusicKit** | Yes | `applemusickit` |
| **TikTok** | Yes | `tiktok` |
| **NicoNico** | Yes | `niconico` |
| **Facebook (Video, Reels, Watch)** | Yes | `facebook` |
| **PeerTube** | Yes | `peertube` |
| **Twitter / X** | Yes *(View-only)* | `twitter` |
| **Instagram (Post, Reel)** | No *(View-only)* | `instagram` |
| **Threads** | No *(View-only)* | `threads` |
| **Apple Music (Embed)** | No *(View-only)* | `applemusic` |
| **Bilibili** | No *(HTML5 Discovery)* | `bilibili` |
| **Rumble** | No *(HTML5 Discovery)* | `rumble` |
| **Kick** | No *(HTML5 Discovery)* | `kick` |
| **Streamable** | No *(HTML5 Discovery)* | `streamable` |
| **Odysee / LBRY** | No *(HTML5 Discovery)* | `odysee` |
| **Bandcamp** | No *(HTML5 Discovery)* | `bandcamp` |


---

## 📦 Installation

```bash
# npm
npm install @sremote/ready2use @sremote/wrapper

# pnpm
pnpm add @sremote/ready2use @sremote/wrapper
```

---

## 🚀 Usage

All providers return:
`{ remote, iframe, element, adapter, player, instanceId, destroy }`

---

### 1. Mount and Auto-bind to SRemote

Mounts player into a container element and registers its adapter to SRemote.

```javascript
import { youtube, vimeo, soundcloud } from '@sremote/ready2use';

// Mounts iframe and auto-registers adapter with SRemote
const yt = await youtube.mount('#youtube-container', {
  videoId: 'dQw4w9WgXcQ'
});
await yt.remote.play();
```

---

### 2. Create Elements Without Mounting (React / Vue)

```javascript
import { dailymotion } from '@sremote/ready2use';
import { createSRemote } from '@sremote/wrapper';

const myRemote = createSRemote();
const { iframe, adapter, instanceId } = await dailymotion.create({
  video: 'x7tgad0',
  width: 640,
  height: 360
});

// Append to custom container and register adapter
document.getElementById('my-wrapper').appendChild(iframe);
myRemote.adapters.register(adapter, instanceId);
await myRemote.play(instanceId);
```

---

### 3. Standalone Adapter Usage

```javascript
import { twitch } from '@sremote/ready2use';

const { iframe, adapter } = await twitch.create({
  channel: 'the8bitdrummer'
});
document.body.appendChild(iframe);

adapter.play();
adapter.seekTo(30);
```

---

### 4. Direct Native SDK Access

```javascript
import { spotify } from '@sremote/ready2use';

const { player } = await spotify.mount('#player-container', {
  uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT'
});

// Direct access to native SDK instance
player.addListener('playback_update', e => {
  console.log('Position:', e.data.position);
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
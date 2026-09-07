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

`provider.create()` creates the player instance, iframe/element, and SRemote adapter. By default, it automatically registers the adapter with SRemote:

```javascript
import { dailymotion } from '@sremote/ready2use';
import { createSRemote } from '@sremote/wrapper';

const myRemote = createSRemote();
const { iframe, adapter, instanceId } = await dailymotion.create({
  video: 'x7tgad0',
  width: 640,
  height: 360,
  // register: true (default: automatically registers to active SRemote)
});

// Append to custom container in your React/Vue component
document.getElementById('my-wrapper').appendChild(iframe);
await myRemote.play(instanceId);
```

> **Automatic Event Deduplication & Ownership Claiming**:
> Elements created via `.create()` and `.mount()` are automatically tagged with `data-sremote-claimed="true"` and `data-sremote-ignore-events="true"`. Both the Userscript top-media tracker and Wrapper DOM driver respect these tags, completely preventing duplicate event emission between the DOM and Adapter layers.

---

### 3. Supported Events Matrix

All major providers emit standardized events via `adapter.emit(eventName, payload)`:

| Provider | Standard Events Supported | Notes |
| :--- | :--- | :--- |
| **YouTube** | `play`, `pause`, `ended`, `timeupdate`, `seeking`, `seeked`, `ratechange`, `buffering`, `volumechange` | IFrame API + Native Scrubbing detection |
| **Vimeo** | `play`, `pause`, `ended`, `timeupdate`, `seeking`, `seeked`, `ratechange`, `buffering`, `buffered`, `volumechange` | Official Player SDK events |
| **SoundCloud** | `play`, `pause`, `ended`, `timeupdate`, `seeking`, `seeked`, `volumechange` | SoundCloud Widget Events |
| **Spotify** | `play`, `pause`, `timeupdate`, `seeking`, `seeked` | Spotify EmbedController |
| **Dailymotion** | `play`, `pause`, `ended`, `timeupdate`, `seeking`, `seeked`, `buffering`, `volumechange` | Dailymotion Player Events |
| **Twitch** | `play`, `pause`, `ended`, `seeking`, `seeked`, `volumechange` | Twitch Interactive SDK |
| **Apple MusicKit** | `play`, `pause`, `timeupdate`, `seeking`, `seeked`, `volumechange` | Official MusicKit JS v3 |
| **PeerTube** | `play`, `pause`, `ended`, `timeupdate`, `seeking`, `seeked`, `ratechange`, `volumechange` | PeerTube Embed API |
| **Facebook** | `play`, `pause`, `ended`, `timeupdate`, `seeking`, `seeked`, `buffering`, `buffered`, `volumechange` | Facebook Video SDK |

---

### 4. Standalone Adapter Usage

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
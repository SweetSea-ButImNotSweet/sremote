# Use-case 2: Custom Player Adapters

When you use an in-house company video player, an open-source web player (such as Video.js, Plyr, JWPlayer), or a third-party service not bundled in `@sremote/ready2use`, you can create a **Custom Adapter** to seamlessly integrate into the SRemote ecosystem.

---

## 1. Two Architectural Approaches: `sremote.adapters.register` vs `BaseProvider`

Depending on project scope, SRemote provides two straightforward options:

| Criteria | Using `sremote.adapters.register()` | Extending `BaseProvider` |
| :--- | :--- | :--- |
| **When to use?** | You already have an existing iframe or player element on your page and need a quick mapping object. | You want to package a reusable module that manages SDK injection, offering both `.mount()` and `.create()`. |
| **Complexity** | Very low (plain JavaScript object). | Moderate (requires a subclass). |
| **Packages Needed** | Only `@sremote/sdk`. | Requires `@sremote/ready2use`. |

---

## 2. Approach 1: Quick Adapter via `sremote.adapters.register()`

Suppose you have an existing custom player instance with bespoke method names:

```javascript
import { sremote } from '@sremote/sdk';

// Assume myPlayer is your custom player instance:
const myPlayer = new CustomPlayerSDK('#my-video');

// Create an adapter conforming to the HTML5 Media Element standard:
const myAdapter = {
  play: () => myPlayer.start(),
  pause: () => myPlayer.stop(),
  getCurrentTime: () => myPlayer.getPositionSeconds(),
  getDuration: () => myPlayer.getTotalDuration(),
  setCurrentTime: (sec) => myPlayer.jumpTo(sec),
  seekTo: (sec) => myPlayer.jumpTo(sec),
  seek: (delta) => myPlayer.jumpTo(myPlayer.getPositionSeconds() + delta),
  toggle: () => (myPlayer.isPlaying() ? myPlayer.stop() : myPlayer.start()),
  getState: () => ({
    paused: !myPlayer.isPlaying(),
    currentTime: myPlayer.getPositionSeconds(),
    duration: myPlayer.getTotalDuration()
  })
};

// Register adapter into SRemote with a custom instance identifier:
sremote.adapters.register(myAdapter, 'my-custom-player');

// Control seamlessly across SRemote:
await sremote.play('my-custom-player');
await sremote.seek(15, 'my-custom-player');
```

---

## 3. Approach 2: Subclassing `BaseProvider` & Leveraging `Polyfills` (Recommended)

`@sremote/ready2use` exports the **`Polyfills`** utility to relieve you from manually implementing relative seeking math, state toggling, or volume tracking.

### The `Polyfills` Toolkit includes:
- **`Polyfills.setCurrentTime(adapter, nativeSeekFn)`**: Binds absolute seeking.
- **`Polyfills.seekTo(adapter)`**: Automatically creates the `seekTo` alias referencing `setCurrentTime`.
- **`Polyfills.seek(adapter)`**: Computes relative seeking based on `getCurrentTime()`.
- **`Polyfills.toggle(adapter)`**: Inverts play/pause state based on `isPaused()`.
- **`Polyfills.Volume` Class**: Manages `[0..1]` normalized levels, caching pre-mute volume and restoring it upon unmuting.

### Complete Custom Provider Implementation:

```javascript
import { BaseProvider, Polyfills } from '@sremote/ready2use';

export class MyCustomPlayerProvider extends BaseProvider {
  constructor() {
    super('custom-player'); // Identifier prefix
  }

  // 1. (Optional) Dynamically load the SDK script tag if needed
  async loadSdk() {
    if (window.MySDK) return window.MySDK;
    // Inject vendor script if necessary...
    return window.MySDK;
  }

  // 2. Initialize DOM element and Native Player instance
  async initPlayer(options, instanceId) {
    const SDK = await this.loadSdk();

    const iframe = document.createElement('iframe');
    iframe.src = `https://my-service.com/embed/${options.videoId}`;
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

  // 3. Construct the HTML5-compliant Adapter
  createAdapter(player, context) {
    // Instantiate normalized volume manager
    const volume = new Polyfills.Volume({
      onVolumeChange: (vol) => player.setSoundLevel(vol * 100),
      onMuteChange: (muted) => player.setSilent(muted)
    });

    const adapter = {
      play: () => player.play(),
      pause: () => player.pause(),
      getCurrentTime: () => player.currentTime || 0,
      getDuration: () => player.duration || 0,
      isPaused: () => player.isPaused(),
      getVolume: () => volume.getVolume(),
      setVolume: (v) => volume.setVolume(v),
      getMuted: () => volume.getMuted(),
      setMuted: (m) => volume.setMuted(m),
      load: (src) => player.changeSource(src),
      getState: () => ({
        paused: player.isPaused(),
        currentTime: player.currentTime || 0,
        duration: player.duration || 0
      })
    };

    // Apply standard HTML5 polyfills with one-liners:
    Polyfills.setCurrentTime(adapter, (sec) => player.seek(sec));
    Polyfills.seekTo(adapter);
    Polyfills.seek(adapter);
    Polyfills.toggle(adapter);

    // Relay native events back to SRemote:
    player.on?.('timeupdate', () => {
      adapter.emit?.('timeupdate', { state: adapter.getState() });
    });

    return adapter;
  }
}

// Export singleton instance:
export const myCustomProvider = new MyCustomPlayerProvider();
```

Usage:
```javascript
const myVideo = await myCustomProvider.mount('#container', { videoId: '12345' });
await myVideo.remote.play();
await myVideo.remote.seek(10);
```

---

## ⏭️ Next Steps
- Managing native HTML5 video/audio elements on your own domain without iframes? See [Use-case 3: Same-Origin Direct Media Control](./03-same-origin-direct-media.md).

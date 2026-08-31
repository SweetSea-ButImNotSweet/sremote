# @sremote/wrapper

[![npm version](https://img.shields.io/npm/v/@sremote/wrapper.svg)](https://www.npmjs.com/package/@sremote/wrapper)
[![license](https://img.shields.io/npm/l/@sremote/wrapper.svg)](https://github.com/SweetSea-ButImNotSweet/sremote)

> A client-side wrapper library designed to interact with [SRemote](https://sweetsea-butimnotsweet.github.io/sremote).
>
> However, it can also be used as a standalone abstraction layer if you just want a unified interface to control different embedded media players (HTML5, YouTube, SoundCloud, Vimeo, etc.) in one consistent place.

---

> [!NOTE]
> - **Standalone Mode:** Controls same-origin media elements directly via DOM/Custom Adapters.
> - **With SRemote Userscript:** Automatically bridges cross-origin iframes (YouTube, Bilibili, SoundCloud, etc.) bypassing browser Same-Origin Policy (SOP).
>
> 💡 **Best Practice / Script Order:** Always import and initialize `@sremote/wrapper` (or place its script tag) as early as possible in your HTML `<head>` or bundle entry — before untrusted third-party scripts, ads, or iframes mount. If the Userscript is not present, `@sremote/wrapper` immediately locks down and guards `window.sremote` with a safe non-writable Proxy, preventing third-party scripts from tampering with or hijacking the global object.
>
> 👉 **Userscript:** [SRemote Repository](https://github.com/SweetSea-ButImNotSweet/sremote)

---

## 📖 Documentation & Links

- 📘 **Technical Documentation:** [API Guide](https://github.com/SweetSea-ButImNotSweet/sremote/blob/main/README.md)
- 🍳 **Cookbook / Embed Recipes:** [Recipes](https://sweetsea-butimnotsweet.github.io/sremote/docs/recipes.html)
- 🎮 **Developer Test Harness:** [Live Demo](https://sweetsea-butimnotsweet.github.io/sremote/demo/index.html)

---

## 📦 Installation

```bash
# npm
npm install @sremote/wrapper

# yarn
yarn add @sremote/wrapper

# pnpm
pnpm add @sremote/wrapper
```

---

## 🚀 Quick Start

### 1. Basic Usage

```javascript
import { createSRemote } from '@sremote/wrapper';

// Initialize the client
const remote = createSRemote({
  timeout: 2000,        // Handshake wait time (ms)
  fallbackToDom: true   // Fallback to local DOM inspection if same-origin
});

// Wait for SRemote detection
await remote.ready();

// Case A: Userscript is available (Controls cross-domain third-party iframes automatically)
if (remote.isUserscriptAvailable()) {
  await remote.play();
  await remote.seek(10); // +10s
  await remote.volume(0.8);
} else {
  // Case B: Standalone mode (Without userscript)
  // You can register custom adapters for official SDKs (YouTube, SoundCloud, Spotify, etc.)
  remote.adapters.set({
    play() { myPlayer.playVideo(); },
    pause() { myPlayer.pauseVideo(); },
    seekTo(sec) { myPlayer.seekTo(sec); }
  }, 'my_slot');

  // Control through the unified interface
  await remote.play('my_slot');
}
```

### 2. Multi-Iframe Slots

When managing multiple iframes on the same page, target specific instances by passing the slot/instance ID:

```html
<iframe src="https://player.bilibili.com/..." name="sremote_id=slot_1" data-sremote-id="slot_1"></iframe>
<iframe src="https://www.youtube.com/..." name="sremote_id=slot_2" data-sremote-id="slot_2"></iframe>
```

```javascript
// Pre-assign iframe element if needed
remote.assignId('#my-iframe', 'slot_1');

// Control specific slot
await remote.play('slot_1');
await remote.pause('slot_2');
```

### 3. Listening to Playback Events

```javascript
// Listen to events from any instance
remote.on('*', (payload) => {
  console.log('Event:', payload.event, 'from instance:', payload.instanceId);
});

// Specific event listener
remote.on('timeupdate', (data) => {
  console.log(`Playback time: ${data.state.currentTime} / ${data.state.duration}`);
});
```

---

### 4. Userscript Installation Guide Modal

If your application requires the userscript for cross-domain control, you can display a built-in guide modal with one line of code:

```javascript
import { createSRemote, showInstallModal } from '@sremote/wrapper';

const remote = createSRemote();
await remote.ready();

// Check if userscript is missing and show install prompt
if (!remote.isUserscriptAvailable()) {
  remote.showInstallModal({
    userscriptUrl: 'https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.user.js',
    onClose: ({ success }) => console.log('Modal closed, activated:', success),
    onSuccess: () => console.log('Userscript detected!')
  });
}
```

---

## 🛠️ API Reference

### `createSRemote(options?)`
Creates a new `SRemoteClient` instance.

#### Options:
- `timeout` (`number`, default `2000`): Maximum milliseconds to wait for userscript detection.
- `fallbackToDom` (`boolean`, default `true`): Whether to fall back to direct DOM query for same-origin media elements.
- `passkey` (`string | null`, default `null`): Authentication passkey if domain access is locked.

### Methods:
- `remote.ready(): Promise<this>`: Resolves when SRemote handshake is ready.
- `remote.isUserscriptAvailable(): boolean`: Returns `true` if SRemote Userscript is active in the current page.
- `remote.showInstallModal(options?): { host, close }`: Displays the userscript installation guide modal.
- `remote.promptUserscript(options?): { host, close }`: Alias for `showInstallModal()`.
- `remote.play(instanceId?): Promise<any>`
- `remote.pause(instanceId?): Promise<any>`
- `remote.toggle(instanceId?): Promise<any>`
- `remote.stop(instanceId?): Promise<any>`
- `remote.seek(offsetSeconds, instanceId?): Promise<any>`
- `remote.seekTo(targetSeconds, instanceId?): Promise<any>`
- `remote.volume(valueBetween0And1, instanceId?): Promise<any>`
- `remote.mute(isMuted?, instanceId?): Promise<any>`
- `remote.playbackRate(speed, instanceId?): Promise<any>`
- `remote.pip(enable?, instanceId?): Promise<any>`
- `remote.adapters.set(adapterConfig, instanceId?): string`
- `remote.getCustomAdapter(instanceId?): object | null`
- `remote.removeAdapter(instanceId?): boolean`
- `remote.on(event, handler): () => void`
- `remote.off(event, handler): void`
- `remote.list(): any[]`
- `remote.status(instanceId?): any`

### Standalone Functions:
- `showInstallModal(options?): { host, close }`
- `promptUserscript(options?): { host, close }`

---

## 📄 License

LGPL-3.0 © [SweetSea-ButImNotSweet](https://github.com/SweetSea-ButImNotSweet)
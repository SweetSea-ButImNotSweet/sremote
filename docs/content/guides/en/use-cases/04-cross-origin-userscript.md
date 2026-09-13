# Use-case 4: Cross-Origin Iframe Automation via Userscript

This is the flagship capability of SRemote: **Empowering the parent page to control any embedded media player inside an `<iframe>` across different domains (Cross-Origin)**, even when the platform offers no external API.

---

## 1. How the Userscript Engine Works

When a user has a userscript manager (Tampermonkey, Violentmonkey, etc.) with **`sremote.user.js`** installed:

1. **Agent Injection into Iframes**: The userscript executes inside the embedded `<iframe>` context, automatically detecting `<video>` / `<audio>` elements or the frame's MediaSession handlers.
2. **Secure Communication Channel**: A private two-way channel (`MessageChannel`) is established between the parent page and the iframe upon completing the `sremote.hello()` handshake.
3. **Command Execution & State Synchronization**: Commands like `play()`, `pause()`, `seek()`, and `volume()` sent from the parent page are forwarded via isolated `MessagePort`s and executed directly on the target media element in milliseconds.

---

### Real-world Case Study: "A Lifesaver for SDK-less Platforms like Bilibili"

Many major video sharing platforms (such as Bilibili, Rumble, Kick...) offer iframe embed codes, but **they provide no JavaScript Player SDK** allowing external sites to trigger Play or Pause.

Without the Userscript:
- The iframe remains a complete "black box". External programmatic control is impossible due to CORS.

With the SRemote Userscript:
- The script runs quietly inside the Bilibili iframe context.
- It finds the internal `<video class="bpx-player-video-wrap">` DOM node.
- It opens a dedicated `MessagePort` back to your parent webpage.
- Calling `sremote.play()` from your parent page immediately plays the Bilibili video!

---

## 2. Step 1: Configure the `<iframe>` Attributes Properly

To prevent the browser from blocking audio playback or script execution, your `<iframe>` tag **must include proper permissions** via the `allow` attribute:

```html
<iframe
  id="cross-origin-frame"
  src="https://example-video-service.com/embed/12345"
  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
  allowfullscreen
  style="width: 100%; height: 450px; border: none; border-radius: 8px;">
</iframe>
```

> [!CAUTION]
> **If you use the `sandbox` attribute:**  
> You must include at least: `sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"`. Omitting `allow-scripts` or `allow-same-origin` completely prevents userscripts and player engines from initializing.

---

## 3. Step 2: Handshake & Listen for Connections in JavaScript

In your frontend application, use `@sremote/sdk`:

```javascript
import { sremote } from '@sremote/sdk';

// 1. Listen for successful connections with embedded iframes
sremote.on('accept', (data) => {
  console.log('✅ Successfully connected with instance:', data.instanceId);
  console.log('Detected media type:', data.mediaType); // 'video' | 'audio' | 'mediasession'
});

// 2. Listen to real-time playback updates
sremote.on('timeupdate', ({ instanceId, state }) => {
  console.log(`[${instanceId}] Current position: ${state.currentTime}s / ${state.duration}s`);
});

// 3. Dispatch handshake signal once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  sremote.hello();
});
```

---

## 4. Step 3: Friendly Fallback UX when Userscript is Missing

If a user visits your website without having the userscript installed, SRemote SDK detects this and marks cross-origin iframes as `'unsupported'`.

You can display a polite, fully-styled installation modal with a single function call:

```javascript
import { sremote, showInstallModal } from '@sremote/sdk';

await sremote.ready();

if (sremote.mode === 'unsupported') {
  // Present a 1-click guide modal helping the user install the companion script
  showInstallModal({
    lang: 'en', // 'en' or 'vi'
    onDismiss: () => console.log('User dismissed the modal')
  });
}
```

The built-in modal provides step-by-step instructions for installing Tampermonkey and loading the Userscript, saving you from designing custom UI from scratch.

---

## ⏭️ Next Steps
- Learn how to control multiple iframes in [Multi-Instance Management](../advanced/multi-instance-management.md).
- Having connectivity issues? Check [Troubleshooting & Debugging](../advanced/troubleshooting-and-debugging.md).

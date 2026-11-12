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

// 3. Initialize connection: ready() automatically dispatches handshake hello in the background
await sremote.ready();

// 4. Control the cross-origin iframe directly using Fluent API (SRemote 4.0):
await sremote('#cross-origin-frame').play().seek(15).volume(0.8);
```

---

## 4. Step 3: Friendly Fallback UX when Userscript is Missing

For cross-origin iframes without embedded SDKs, a companion userscript bridge is required. If a visitor accesses your page without the script installed, verify its availability and display a built-in guide modal:

```javascript
import { sremote } from '@sremote/sdk';

await sremote.ready();

// Check if the companion userscript bridge is active:
if (!sremote.isUserscriptAvailable()) {
  sremote.showInstallModal({
    onSuccess: () => {
      console.log('🎉 Userscript detected and activated successfully!');
    },
    onClose: ({ success }) => {
      console.log('Modal closed. Activated status:', success);
    }
  });
}
```

> [!NOTE]
> **Why use `!sremote.isUserscriptAvailable()` instead of `mode === 'unsupported'`?**  
> SRemote enables `fallbackToDom: true` by default. When no userscript is present, it automatically enters `mode = 'dom-direct'` to manage local same-origin media. Calling `sremote.isUserscriptAvailable()` directly inspects the bridge status and is the most reliable check.

Built-in modal advantages:
- **Automatic Browser Detection**: Highlights the appropriate Tampermonkey extension link for the user's active browser (Chrome, Edge, Firefox, Safari...).
- **Shadow DOM Isolation**: Renders inside an isolated Shadow DOM container with zero CSS bleeding or style conflicts with your page.
- **Auto-Detection (`autoDetect`)**: Automatically senses when the user installs and enables the script, transitioning to success state without requiring a manual page refresh.

---

## ⏭️ Next Steps
- Learn how to control multiple iframes in [Multi-Instance Management](../advanced/multi-instance-management.md).
- Having connectivity issues? Check [Troubleshooting & Debugging](../advanced/troubleshooting-and-debugging.md).

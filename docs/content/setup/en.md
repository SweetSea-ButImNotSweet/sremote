# Developer Guide: Iframe Setup & SRemote Integration

This guide provides technical specifications for setting up `<iframe>` elements properly and integrating `SRemote` into your web applications (Vanilla JS, React, Vue, Next.js, etc.).

---

## 1. Technical Iframe Setup & Permissions

When embedding media from third-party services (YouTube, Spotify, SoundCloud, Dailymotion, custom web players, etc.), browser security restrictions will block crucial media features unless you declare appropriate permissions using the `allow` attribute.

### 📌 Recommended `<iframe>` Snippet:
```html
<iframe
  id="media-frame"
  src="https://target-service.com/embed/..."
  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
  allowfullscreen
  loading="lazy"
  style="width: 100%; height: 450px; border: none;">
</iframe>
```

### 🔍 Crucial Permissions Explained:
- **`autoplay`** *(Required)*: Grants playback permissions so media inside the iframe can start or stream audio/video.
- **`encrypted-media`** *(Required for DRM/Spotify/Netflix/Widevine)*: Allows the iframe to initialize digital rights management decryption pipelines.
- **`picture-in-picture`**: Enables floating Picture-in-Picture window mode via `sremote.pip()`.
- **`fullscreen` / `allowfullscreen`**: Allows fullscreen video expansion.

> [!WARNING]
> If `autoplay` or `encrypted-media` is missing, the browser will block media audio/video pipelines, causing calls to `sremote.play()` to fail or stall.

---

## 2. Handshake Lifecycle & Architecture

SRemote establishes a secure, direct two-way channel between the parent website and the child iframe using **Handshake ID & MessageChannel (MessagePort)**.

```
Top Window (Your Application)                 Iframe (Embedded Player)
          │                                              │
          │─── sremote.hello() (postMessage) ───────────>│
          │                                              │ 
          │<─── accept (Dedicated MessagePort created) ─│ (With MediaMetadata)
          │                                              │
     [READY TO CONTROL]                            [LISTENING]
          │─── sremote.play() / pause() / seek() ───────>│
          │<─── timeupdate / ended / volumechange ───────│
```

---

## 3. Basic Integration (Vanilla JS)

### Step 1: Subscribe to Connection & Playback Events
Subscribe to `'accept'` before or right when initiating the handshake. SRemote features **Sticky Replay**, so even if you register listeners after the iframe has already connected, your callback will receive the connection payload immediately:

```javascript
// Listen for successful connection
window.sremote.on('accept', (data) => {
  console.log('✅ Connected to media instance:', data.instanceId);
  console.log('Media type:', data.mediaType); // 'video' | 'audio' | 'mediasession' | 'adapter'
});

// Track playback progress
window.sremote.on('timeupdate', (data) => {
  console.log('Progress:', data.state.currentTime, '/', data.state.duration);
});

// Listen for playback completion
window.sremote.on('ended', () => {
  console.log('🎉 Playback finished');
});
```

### Step 2: Initiate Handshake Discovery (`sremote.hello`)
Call `sremote.hello()` once your document is ready:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Broadcast handshake to all iframes in the page
  window.sremote.hello();
});
```

If you have multiple iframes and want to target a specific one:
```javascript
const myFrame = document.getElementById('media-frame');
window.sremote.hello({
  target: myFrame.contentWindow
});
```

---

## 4. Anti-FOUC Dynamic CSS Injection

If you need to hide native controls, banners, watermarks, or unwanted UI elements inside the iframe, pass `css` directly into `hello()`:

```javascript
window.sremote.hello({
  css: `
    /* Hide native controls to use your own customized web UI */
    .native-controls, .watermark-logo, .ad-banner {
      display: none !important;
    }
  `
});
```

> [!TIP]
> CSS passed via `hello({ css: '...' })` is injected directly into `document.documentElement` at `document-start` before the DOM is rendered, completely eliminating Flash of Unstyled Content (FOUC).

---

## 5. Practical Real-World Patterns

### A. Handling `MISSING_MEDIA_SOURCE` & Autoplay Policies
Some embedded players create empty `<video>` elements and only populate `src` after a user clicks their native play button.
- When calling `sremote.play()`, if the media element has `readyState = 0` without a source, SRemote returns `{ error: 'MISSING_MEDIA_SOURCE' }`.
- **Solution:** Design an initial "Start Player" user gesture on your parent page or prompt the user to click the iframe once to unlock the browser's autoplay policy.

### B. Single Page App Integration (React / Vue)
In SPA frameworks, components with iframes are mounted and unmounted dynamically:

```jsx
import React, { useEffect, useRef } from 'react';

export function CustomMediaPlayer({ src }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    // 1. Subscribe to events
    const unsubAccept = window.sremote.on('accept', (data) => {
      console.log('Player ready:', data.instanceId);
    });

    const unsubTime = window.sremote.on('timeupdate', (data) => {
      // Update playback timeline state in your React UI
    });

    // 2. Initiate handshake once iframe is rendered
    if (iframeRef.current) {
      window.sremote.hello({
        target: iframeRef.current.contentWindow
      });
    }

    // 3. Unsubscribe on unmount
    return () => {
      unsubAccept();
      unsubTime();
    };
  }, [src]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      style={{ width: '100%', height: '400px', border: 0 }}
    />
  );
}
```

### C. Multi-Iframe Orchestration (`multiMode` & `setExclusive`)
If your page embeds multiple media players simultaneously (e.g. course platforms, playlist dashboards):

```javascript
// Automatically pause other players when any player starts playing
window.sremote.setExclusive('auto');

// Or target a specific instance by instanceId
window.sremote.play('sv_youtube_1');
window.sremote.pause('sv_spotify_2');

// Play or pause all connected instances simultaneously
window.sremote.play('all');
window.sremote.pause('all');
```

---

## 6. Custom Adapter Registration (`useAdapter`)

If an embedded service uses its own JavaScript SDK (such as YouTube Iframe API `YT.Player` or SoundCloud Widget SDK), wrap it with a Custom Adapter to unify it under SRemote's control API:

```javascript
const adapterId = window.sremote.useAdapter({
  play() { ytPlayer.playVideo(); },
  pause() { ytPlayer.pauseVideo(); },
  toggle() { ytPlayer.getPlayerState() === 1 ? ytPlayer.pauseVideo() : ytPlayer.playVideo(); },
  seekTo(seconds) { ytPlayer.seekTo(seconds, true); },
  setVolume(vol) { ytPlayer.setVolume(vol * 100); },
  getCurrentTime() { return ytPlayer.getCurrentTime(); },
  getDuration() { return ytPlayer.getDuration(); },
  paused() { return ytPlayer.getPlayerState() !== 1; }
}, 'my_youtube_player');

// Now you can control it seamlessly via SRemote:
window.sremote.play(adapterId);
```

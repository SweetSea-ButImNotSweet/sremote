# 01. Iframe Setup Guide

This guide provides best practices for securely embedding third-party media players (video/audio) in an `<iframe>` while ensuring full compatibility with SRemote.

---

## 1. Recommended `<iframe>` Structure

When embedding video/audio from third-party platforms (YouTube, Spotify, SoundCloud, Bilibili, Dailymotion, custom players), browsers enforce strict security policies that limit playback unless permissions are explicitly granted via the `allow` attribute.

```html
<iframe
  id="media-frame"
  src="https://target-service.com/embed/..."
  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
  allowfullscreen
  loading="lazy"
  style="width: 100%; height: 450px; border: none; border-radius: 8px;">
</iframe>
```

---

## 2. Key Permissions in `allow`

| Permission | Required? | Purpose & Impact |
| :--- | :---: | :--- |
| **`autoplay`** | ⭐ **Required** | Grants permission for embedded audio/video to play programmatically from the parent page. |
| **`encrypted-media`** | ⭐ **Required for DRM** | Required for DRM-protected streams (Spotify, Netflix, Widevine, Apple FairPlay...). |
| **`picture-in-picture`** | Recommended | Enables floating PiP window mode via `sremote.pip()`. |
| **`fullscreen` / `allowfullscreen`**| Recommended | Allows the player to enter fullscreen mode. |
| **`clipboard-write`** | Optional | Permits the player to copy share links or timestamps to the clipboard. |

> [!WARNING]
> Without `autoplay` or `encrypted-media`, web browsers will automatically block audio playback, causing `sremote.play()` to fail silently or pause immediately.

---

## 3. Responsive Layouts & Aspect Ratios

To maintain a fluid 16:9 aspect ratio across all screen sizes:

### Modern CSS `aspect-ratio` (Recommended):
```css
.video-container {
  width: 100%;
  max-width: 800px;
  aspect-ratio: 16 / 9;
}

.video-container iframe {
  width: 100%;
  height: 100%;
  border: none;
}
```

---

## 4. Crucial Notes on `sandbox`

If you use the `sandbox` attribute for heightened security, you **must** include these essential flags so SRemote and the player script can communicate:

```html
<iframe
  src="https://..."
  sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
  allow="autoplay; encrypted-media">
</iframe>
```

> [!CAUTION]
> - An empty `sandbox=""` or missing `allow-scripts` will completely disable all JavaScript inside the iframe.
> - Omitting `allow-same-origin` isolates the iframe origin, breaking `MessageChannel` port transfers and local storage.

---

## ⏭️ Next Step
Proceed to **[02. Checking Service Compatibility](./02-compatibility-check.md)** to verify whether your target service supports native media hooks.

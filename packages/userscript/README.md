[ English ] | [ Tiếng Việt ](README/vi.md)

# SRemote Userscript
*(or Sea's Remote - Userscript Bridge)*

A userscript created to solve a frustrating modern web problem: a webpage embeds a media player from a third-party service, but that service does not provide a remote controller.

---

## 📌 Who is this userscript for?

### 1. If you are an end-user redirected here by a website:
Did a website ask you to install this userscript to watch video or listen to audio? Here is why:

> **The TV Remote Analogy:** Imagine visiting a friend's house to watch a movie, but your friend keeps the remote control hidden. You can't pause to grab a snack, adjust the volume, or fast-forward without asking them every single time.
>
> On the modern web, the exact same thing happens:
> 1. **No External API:** Many third-party media platforms (like Bilibili, Kick, or Rumble) let websites embed their video players, but provide zero JavaScript APIs to control playback from the outside.
> 2. **Same-Origin Policy (SOP):** Web browsers strictly prevent a parent webpage from interacting with content inside a cross-domain `<iframe>`.

**SRemote Userscript** acts as that missing remote control. Once installed, it bridges the cross-origin gap safely, allowing the hosting website to pause, seek, and control playback seamlessly.

### 2. If you are a developer:
SRemote is a technical bridge designed to pair with `@sremote/sdk`. It automatically inspects cross-origin child media frames and establishes an authenticated, low-latency `MessageChannel` bridge to the parent page.

---

## 🚀 How to Install
1. Install a userscript manager extension in your browser ([Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) recommended).
2. Install the userscript via one of the links below:
   - **Direct Install:** [sremote.user.js](https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.user.js)
   - **Minified Build:** [sremote.min.user.js](https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.min.user.js)
3. Visit or refresh the website embedding the media. When prompted by the SRemote permission dialog, click **Allow** (optionally tick "Remember for this site").

---

## 🛠️ How it works under the hood
When active, the userscript operates securely in the background:
1. It automatically inspects child media frames (`<video>`, `<audio>`, and custom player DOM nodes).
2. It establishes an authenticated, bidirectional `MessageChannel` / `postMessage` bridge between the parent page and the iframe.
3. The parent page can dispatch standard media commands (`play`, `pause`, `seek`, `volume`, `speed`) with zero frame-dropping DOM scanning.

---

## Development & Build

```bash
# In the repository root
npm install

# Build the userscript
npm run build:userscript

# Development mode
npm run dev
```

---

## License

This userscript is licensed under the **GNU Lesser General Public License v3.0 (LGPL-3.0)**.

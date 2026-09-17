[ English ] | [ Tiếng Việt ](README/vi.md)

# SRemote Userscript
*(or Sea's Remote - Userscript Bridge)*

A userscript created to solve a frustrating modern web problem: a webpage embeds a media player from a third-party service, but that service does not provide a remote controller.

---

## If you randomly stumbled across this project and want to install it...
Hold on before hitting that install button, no matter how cool this project might sound! At its core, SRemote is a **developer SDK / technical bridge**. Unless you are a developer looking to control iframes, or a website specifically redirected you here to watch movies or listen to music... installing it will just take up space in Tampermonkey without doing any standalone magic. Don't rush to install it!

## If you were casually surfing the internet and got redirected here...
Did a webpage ask you to come here and install this userscript? Before you write a passionate complaint message to their developers, let me explain why **they were completely powerless and had no other choice**, and a quick secret: I was once in the exact same position as those developers.

Picture this: You visit a friend's house to watch a movie together. But your friend refuses to give you the remote controller; whenever you want to change something, you have to ask them. You want to fast-forward, adjust the volume, or pick a different video? Nope, they won't give you the remote, and they play whatever they want. Frustrating, right?

The exact same thing happens on the web, though the underlying technology is slightly different:

- **In short:** The website you are browsing doesn't have a remote to control the video it embedded from another platform.
- **In detail:** There are two main technical hurdles:
  1. **No External API:** The third-party platform does not provide an API for the hosting website (an API is essentially a unified communication channel between two services). In plain terms, the other platform chooses to ignore messages from the hosting page.
  2. **Same-Origin Policy (SOP):** Web browsers strictly prevent one webpage from touching or modifying content inside an iframe if they are hosted on different domains.

Because of these limitations, **SRemote** was created with a single mission: to provide a universal remote controller for websites to control embedded media from third-party services that still don't offer a remote in 2026.

---

## How do I install this userscript?
1. Install a userscript manager extension in your browser (we recommend [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)).
2. Add and enable the script `dist/sremote.user.js` in your userscript manager:
   - **Direct Install:** [sremote.user.js](https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.user.js)
   - **Minified Install:** [sremote.min.user.js](https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.min.user.js)
3. When you visit or reload a page with embedded media, if a permission prompt appears, click **Allow** (you can also check "Remember for this site").

---

## How it works under the hood
When installed, the userscript runs in the background of web pages and iframes:
1. It securely inspects child media frames (`<video>`, `<audio>`, and custom player instances).
2. It establishes an authenticated, bidirectional `MessageChannel` / `postMessage` bridge between the top-level parent page and the embedded iframe.
3. The parent page can then send standard playback actions (`play`, `pause`, `seek`, `volume`, `rate`) without violating Same-Origin restrictions.

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

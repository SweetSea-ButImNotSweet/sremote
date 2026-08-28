[ English ] | [ Tiếng Việt ](README/vi.md)

# SRemote
*(or Sea's Remote)*

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
2. Add and enable the script `dist/sremote.user.js` in your userscript manager.
3. When you visit or reload a page with embedded media, if a permission prompt appears, click **Allow** (you can also check "Remember for this site").

---

## How do I integrate SRemote into my own website?
1. Embed the `iframe` containing the audio/video you want to play. Make sure to enable required permissions via the `allow` attribute (especially important for YouTube, Spotify, and DRM-protected streams):
   ```html
   <iframe
     src="https://..."
     allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
     allowfullscreen>
   </iframe>
   ```
2. Call `sremote.hello()` from your parent page (top-level window) to initiate discovery and establish a secure MessagePort connection to the media in the iframe:
   ```javascript
   // Initiate handshake to all iframes or pass a specific target window
   window.sremote.hello();
   ```
3. Listen for connection and playback events from `sremote`:
   ```javascript
   window.sremote.on('accept', (data) => {
     console.log('Successfully connected to media instance:', data.instanceId);
   });

   window.sremote.on('timeupdate', (data) => {
     console.log('Current playback time:', data.state.currentTime);
   });
   ```
4. Control playback directly via the global `window.sremote` object (e.g., `sremote.play()`, `sremote.pause()`, `sremote.seek(10)`, `sremote.volume(0.8)`).

---

## Documentation & API Reference
- Technical guides and complete API index: [SRemote Documentation](docs/index.html)
- Embed templates and adapter code examples: [Cookbook](docs/recipes.html)
- Interactive demo: [Live Demo](demo/index.html)

---

## Known Limitations
1. **Prefer Official APIs:** If an iframe provider already offers an official embedded API, prioritize using it. SRemote provides `sremote.useAdapter()` if you want a single unified control interface across multiple providers.
2. **Initial User Interaction (Autoplay):** Some services require at least one user gesture on the Play button before audio/video can stream, due to browser autoplay policies or internal state watchers.
3. **Not a Magic Wand:** SRemote cannot control players that do not use standard HTML5 `<video>` / `<audio>` elements or do not register actions with the `MediaSession` API.
4. **No DRM/Embed Bypass:** SRemote is purely a playback remote controller; it does not bypass geographic restrictions, domain embed blocks, or DRM protections enforced by services.

---

## Bug Reports
When submitting an issue, please include:
1. A clear description of the problem and steps to reproduce.
2. The service name, URL, or test link where the issue occurred.
3. A minimal reproduction demo if possible.

---

## Development & Build

```bash
# Install dependencies
npm install

# Start development server with live reload
npm run dev

# Build production userscript (dist/sremote.user.js)
npm run build

# Run linter
npx eslint .
```

---

## License

This project is licensed under the **GNU Lesser General Public License v3.0 (LGPL-3.0)** - see the [LICENSE](LICENSE) file for details.

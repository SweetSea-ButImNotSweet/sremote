# `sremote.debug` & `sremote_debug` API

Diagnostics, media scanning, direct manipulation, and testing (Mocking/Diagnostics) suite designed specifically for developers.

> [!NOTE]
> The Debug API suite is only available when the `ENABLE_DEBUG_API = true` flag is enabled in the userscript. When this flag is disabled (`false`), the debug endpoints will be completely `undefined` to ensure absolute security and safety in production releases.

---

## 👑 1. Parent Page (`window.sremote.debug`)
High-level operations called from the top-level parent window. Commands invoked via `.debug` **automatically bypass Passkey & Permission** checks for effortless testing.

| Method | Parameters | Description |
| :--- | :--- | :--- |
| `scan()` | None | Scans all iframes in the page and logs a `console.table` with iframe list, sources, connection states, and playback states. |
| `inspect(instanceId?)` | `instanceId?: string` | Finds and invokes DevTools `inspect(element)` to jump directly to the target `<video>` / `<iframe>` in the Elements tab. |
| `getMediaElement(instanceId?)` | `instanceId?: string` | Returns the `HTMLMediaElement` (if Same-Origin) or the `HTMLIFrameElement` in the parent DOM. |
| `getState(instanceId?)` | `instanceId?: string` | Retrieves complete technical state of the iframe: DOM Media Elements, MediaSession metadata & action handlers. |
| `dump(instanceId?)` | `instanceId?: string` | Prints a comprehensive diagnostic table directly to the parent DevTools console. |
| `play(instanceId?)` | `instanceId?: string` | Forces immediate media playback. |
| `pause(instanceId?)` | `instanceId?: string` | Forces media to pause. |
| `toggle(instanceId?)` | `instanceId?: string` | Toggles play/pause state. |
| `seek(offset, instanceId?)` | `offset: number, instanceId?: string` | Relative seek (adds/subtracts seconds). |
| `seekTo(time, instanceId?)` | `time: number, instanceId?: string` | Direct seek to target time (in seconds). |
| `setVolume(vol, instanceId?)` | `vol: number (0 -> 1 or 0 -> 100), instanceId?: string` | Adjusts volume level. |
| `setMute(muted?, instanceId?)` | `muted?: boolean, instanceId?: string` | Toggles or sets mute state. |
| `setRate(rate, instanceId?)` | `rate: number (0.25 -> 4.0), instanceId?: string` | Adjusts playback speed. |
| `toggleLoop(instanceId?)` | `instanceId?: string` | Toggles loop mode for video/audio. |
| `setSource(source, instanceId?)` | `source: string \| Blob \| File, instanceId?: string` | Overrides media source with a new URL or Blob. |
| `injectTestTone(freq?, dur?, instanceId?)` | `freq = 440, dur = 3, instanceId?: string` | Generates a Sine wave PCM WAV file (Beep tone at `freq` Hz) and injects it directly into the player. |
| `injectSilentTrack(dur?, instanceId?)` | `dur = 5, instanceId?: string` | Injects a silent PCM WAV file (tests timeline/clock tracking). |
| `injectWhiteNoise(dur?, instanceId?)` | `dur = 3, instanceId?: string` | Injects a White Noise WAV file to test audio output. |
| `injectSampleVideo(instanceId?)` | `instanceId?: string` | Injects Mozilla's sample MP4 video (`flower.mp4`). |
| `simulateStall(instanceId?)` | `instanceId?: string` | Simulates `waiting` and `stalled` events to test UI buffering state. |
| `restoreOriginal(instanceId?)` | `instanceId?: string` | Restores original media source prior to debug injection. |

---

## 🛠️ 2. Inside Child Iframe (`window.sremote_debug`)
Available when opening DevTools and switching the Console execution context directly to the child iframe.

| Property / Method | Description |
| :--- | :--- |
| `sremote_debug.activeMedia` | Directly returns the `HTMLMediaElement` currently managed by SRemote. |
| `sremote_debug.inspect()` | Calls `inspect(activeMedia)` to jump immediately to the active `<video>`/`<audio>` in DevTools Elements tab. |
| `sremote_debug.getAllMedia()` | Returns an array of all `<video>` and `<audio>` elements in the DOM and tracking pool. |
| `sremote_debug.getState()` | Retrieves the video state object (`getVideoState()`). |
| `sremote_debug.getMediaSession()` | Inspects metadata and registered action handlers on `navigator.mediaSession`. |
| `sremote_debug.dump(index = 0)` | Prints a detailed technical specification table of the media element at `index` to the Console. |
| `sremote_debug.setSource(url, index = 0)` | Changes the media source to the specified URL. |
| `sremote_debug.setBlob(blobOrFile, index = 0)` | Sets the media source using a `Blob` or `File` object. |
| `sremote_debug.playTone(freq = 440, duration = 3, index = 0)` | Generates and plays a Sine Beep tone immediately. |
| `sremote_debug.playSilent(duration = 5, index = 0)` | Plays a silent audio track. |
| `sremote_debug.playNoise(duration = 3, index = 0)` | Plays a White Noise audio track. |
| `sremote_debug.restoreOriginal(index = 0)` | Restores the original media source. |
| `sremote_debug.setCSS(css)` | Injects or updates dynamic CSS directly from within the iframe. |
| `sremote_debug.getCSS()` | Retrieves the current dynamic CSS of the iframe. |
| `sremote_debug.removeCSS()` | Removes the dynamic CSS from the iframe. |

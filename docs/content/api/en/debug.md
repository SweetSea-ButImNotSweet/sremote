# `sremote.debug` API

Diagnostics, media scanning, and testing suite designed specifically for developers.

> [!NOTE]
> The Debug API suite is only available when the `ENABLE_DEBUG_API = true` flag is enabled in the userscript. When this flag is disabled (`false`), the debug endpoints will be completely `undefined` to ensure absolute security and safety in production releases.
> Userscript no longer attaches standalone `sremote_debug` in iframes or hijacks `window.sremote`. All debug operations are unified under `sremote.debug` provided by the SDK.

---

## 👑 Debug Operations (`window.sremote.debug`)
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
| `setSource(source, instanceId?)` | `source: string \| Blob \| File, instanceId?: string` | Overrides media source with a new URL or Blob. |
| `logLevel(level?)` | `level?: number` | Inspects or adjusts runtime debug log level. |


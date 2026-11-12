# `sremote.debug` API

Diagnostics, media scanning, and inspection suite designed specifically for developers.

> [!NOTE]
> The Debug API suite is active when the `ENABLE_DEBUG_API = true` flag is enabled in the Userscript (default in development environments). When disabled (`false`), advanced bridge debug endpoints safely return `null` or empty arrays to ensure security in production.
> All debug operations are centralized under the `sremote.debug` namespace provided by the SDK Client.

---

## 👑 Technical Diagnostics (`sremote.debug`)
High-level inspection operations called from the top-level window. Commands invoked via `.debug` **automatically bypass Passkey & Permission** checks for effortless local testing.

| Method | Parameters | Description |
| :--- | :--- | :--- |
| `scan()` | None | Scans all iframes on the page, returning iframe list, sources, connection states, and playback states. |
| `inspect(instanceId?)` | `instanceId?: string` | Finds and invokes DevTools `inspect(element)` to jump directly to the target `<video>` / `<iframe>` in the Elements tab. |
| `getMediaElement(instanceId?)` | `instanceId?: string` | Returns the `HTMLMediaElement` (if Same-Origin) or the `HTMLIFrameElement` in the parent DOM. |
| `getState(instanceId?)` | `instanceId?: string` | Retrieves complete technical state of the iframe: DOM Media Elements, MediaSession metadata & action handlers. |
| `capabilities(instanceId?)` | `instanceId?: string` | Checks the feature capability matrix of the target instance. |
| `dump(instanceId?)` | `instanceId?: string` | Prints a comprehensive diagnostic table directly to the parent DevTools console. |
| `setSource(source, instanceId?)` | `source: string \| Blob \| File, instanceId?: string` | Overrides media source with a new URL or Blob. |
| `logLevel(level?)` | `level?: number` | Inspects or adjusts runtime debug log level (`0: NONE`, `1: ERROR`, `2: WARN`, `3: INFO`, `4: DEBUG`). |

## Example Usage
```javascript
// 1. Scan all active players on the page:
const iframes = sremote.debug.scan();
console.table(iframes);

// 2. Dump complete diagnostic snapshot to console:
sremote.debug.dump();

// 3. Set log level to DEBUG:
sremote.debug.logLevel(4);
```

# sremote.play
Sends a play command to the media inside the iframe or to a custom adapter.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Identifier of the media instance to play. If omitted, applies to the most recently active instance (or all instances if passed `'all'`). |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Notes
- In multi-media mode (`multiMode`), if multiple media instances are active and no `instanceId` is specified, the command will issue a `whereIsInstanceID` warning.
- You can pass `instanceId = 'all'` to start playback across all connected media instances simultaneously.
- **Handling `MISSING_MEDIA_SOURCE`**: If an iframe creates an empty `<video>` or `<audio>` tag with `readyState = 0` without setting its `src` or `MediaSource` (commonly seen when platforms wait for a direct user interaction on their own Play button first), calling `play()` will log a warning and return `{ error: 'MISSING_MEDIA_SOURCE' }` to signal that no playable media source is loaded yet.

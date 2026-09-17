# sremote.subtitle

Sets the active subtitle/closed-caption track, or disables subtitles on the target media player.

## Signature
`sremote.subtitle(track, targetOrId?, key?)`

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `track` | `string \| null` | **Required** | The subtitle track ID or language code (e.g. `'en'`, `'vi'`), or `null` / `'off'` to disable subtitles. |
| `targetOrId` | `string \| HTMLElement` | `null` | Identifier of the media instance or target element. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns a Promise resolving to a command result object indicating success or failure.

## Related Methods
- [`sremote.getSubtitles`](./getSubtitles.md): Retrieves available subtitle tracks.

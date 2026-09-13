# sremote.quality

Sets the video resolution quality level on the target player or iframe.

## Signature
`sremote.quality(level, targetOrId?, key?)`

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `level` | `string \| number` | **Required** | The desired resolution quality level (e.g. `'1080p'`, `'720p'`, `'480p'`, `'auto'`, or numerical height `1080`). |
| `targetOrId` | `string \| HTMLElement` | `null` | Identifier of the media instance or target element to apply quality to. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns a Promise resolving to a command result object indicating success or failure.

## Related Methods
- [`sremote.getQualities`](./getQualities.md): Retrieves the list of supported quality resolutions.

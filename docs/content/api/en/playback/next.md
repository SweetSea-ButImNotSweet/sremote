# sremote.next

Skips to the next track or video in the playlist / queue.

## Signature
`sremote.next(targetOrId?, key?)`

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `targetOrId` | `string \| HTMLElement` | `null` | Identifier of the media instance or target element. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns a Promise resolving to a command result object indicating success or failure.

## Related Methods
- [`sremote.previous`](./previous.md): Jumps to the previous track.

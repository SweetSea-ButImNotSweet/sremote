# sremote.previous

Returns to the previous track or video in the playlist / queue.

## Signature
`sremote.previous(targetOrId?, key?)`

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `targetOrId` | `string \| HTMLElement` | `null` | Identifier of the media instance or target element. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns a Promise resolving to a command result object indicating success or failure.

## Related Methods
- [`sremote.next`](./next.md): Advances to the next track.

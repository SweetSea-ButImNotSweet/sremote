# sremote.pause
Sends a pause command to the media inside the iframe or to a custom adapter.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Identifier of the media instance to pause. If omitted, applies to the most recently active instance. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Notes
- Similar to `play`, when `multiMode` is enabled and 2 or more media instances are active, you must specify a target `instanceId` or pass `'all'`.

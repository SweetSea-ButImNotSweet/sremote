# sremote.seek
Performs a relative seek (forward or backward by seconds) relative to current media playback time.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `offset` | `number` | **Required** | Number of seconds to seek (positive value to seek forward, negative value to seek backward). |
| `instanceId` | `string` | `null` | Identifier of the media instance to seek. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Notes
- The resulting playback position is automatically clamped so that it cannot drop below 0.

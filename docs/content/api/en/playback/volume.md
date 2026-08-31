# sremote.volume
Adjusts the volume level of the media.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `vol` | `number` | **Required** | Target volume level. Accepts a range from `0.0` to `1.0` or `1` to `100`. |
| `instanceId` | `string` | `null` | Identifier of the media instance to adjust volume for. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Notes
- If passed a value between `1` and `100`, the script automatically divides by `100` to normalize it to the standard `0.0` - `1.0` range.

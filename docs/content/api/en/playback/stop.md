# sremote.stop
Stops media playback completely and resets playback time to 0 seconds.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Identifier of the media instance to stop. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Notes
- This command pauses the media and resets `currentTime = 0`.

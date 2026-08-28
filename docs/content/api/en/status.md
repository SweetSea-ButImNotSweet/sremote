# sremote.status
Retrieves a snapshot of the current state of a media instance or custom adapter.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Identifier of the media instance to query. If omitted, queries the most recently active instance. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns a state `Object` containing:
- `paused` (`boolean`): Whether playback is paused.
- `ended` (`boolean`): Whether the media has finished playing.
- `currentTime` (`number`): Current playback time in seconds.
- `duration` (`number \| null`): Total duration in seconds.
- `buffered` (`number`): Buffered range end in seconds.
- `volume` (`number`): Volume level (`0.0` - `1.0`).
- `muted` (`boolean`): Whether audio is muted.
- `playbackRate` (`number`): Current playback speed.
- `readyState` (`number`): Media readiness state code.
- `src` (`string`): Media source URL.
- `fullscreen` (`boolean`): Fullscreen status.
- `pictureInPicture` (`boolean`): Picture-in-Picture active status.

Returns `null` if the instance is not found or permission is denied.

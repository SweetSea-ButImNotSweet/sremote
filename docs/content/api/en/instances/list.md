# sremote.instances.list
Retrieves a list of all active iframe media instances and registered custom adapters.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns an array `Array<Object>` of instances, where each object contains:
- `instanceId` (`string`): Unique identifier.
- `location` (`string`): URL of the frame containing the media.
- `origin` (`string`): Origin of the frame.
- `note` (`string`): Descriptive tag label (if assigned via `sremote.note`).
- `mediaType` (`'video' | 'audio' | 'mediasession' | 'adapter'`): Classification of the media source.
- `state` (`Object`): Detailed playback state of the media.

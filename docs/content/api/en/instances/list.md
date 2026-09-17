# sremote.instances.list

Retrieves a list of all active iframe media instances and registered custom adapters.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns an array `Array<SRemoteInstanceInfo>` of instances, where each item contains:
- `instanceId` (`string`): Unique identifier of the instance.
- `location` (`string`): URL of the frame containing the media.
- `origin` (`string`): Origin of the frame.
- `note` (`string`): Descriptive tag label (if assigned via `sremote.instances.note`).
- `mediaType` (`'video' | 'audio' | 'mediasession' | 'adapter'`): Classification of the media source.
- `capabilities` (`SRemoteCapabilities | null`): Feature matrix supported by this instance.
- `state` (`SRemoteMediaState | null`): Detailed playback state snapshot.
- `status` (`'ready' | 'connecting' | 'disconnected'`): Connection lifecycle status.

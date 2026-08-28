# sremote.seekTo
Directly seeks to a specific playback timestamp (in seconds).

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `time` | `number` | **Required** | Target playback timestamp in seconds. |
| `instanceId` | `string` | `null` | Identifier of the media instance to seek. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

# sremote.instances.setExclusive
Sets up Exclusive playback mode to ensure only one media instance is allowed to play at any given time.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `mode` | `string \| 'auto' \| null` | **Required** | - `'auto'`: Automatically pauses all other media instances whenever any media starts playing.<br>- `instanceId`: Designates only this specific instance to play, pausing all other instances.<br>- `null`: Disables exclusive playback mode. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

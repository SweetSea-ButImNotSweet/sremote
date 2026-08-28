# sremote.pip
Enables, disables, or toggles Picture-in-Picture (PiP) mode for the video.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enable` | `boolean \| string` | `undefined` | `true` to enter PiP, `false` to exit PiP. If omitted or passed as an `instanceId` string, toggles the current PiP state. |
| `instanceId` | `string` | `null` | Identifier of the video instance to control. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

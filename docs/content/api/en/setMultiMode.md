# sremote.setMultiMode
Configures multi-media instance control mode.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `mode` | `boolean \| null` | **Required** | `true`: Forces multi mode on.<br>`false`: Forces single mode.<br>`null`: Auto-detects based on the number of currently running iframes/instances. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

# sremote.mute
Mutes, unmutes, or toggles the mute state of the target media.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `muted` | `boolean` | `undefined` | Target mute state (`true`: mute, `false`: unmute). If omitted or `undefined`, toggles the current mute state. |
| `instanceId` | `string` | `null` | Identifier of the target media instance. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

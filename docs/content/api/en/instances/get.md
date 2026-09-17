# sremote.instances.get

Retrieves the current media state snapshot of an instance by its instance ID.

## Signature
`sremote.instances.get(instanceId?, key?)`

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Unique identifier of the target media instance. If omitted, queries the active instance. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns an `SRemoteMediaState` object containing properties such as `paused`, `currentTime`, `duration`, `volume`, `muted`, `src`, etc., or `null` if not found.

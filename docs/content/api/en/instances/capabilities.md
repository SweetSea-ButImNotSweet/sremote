# sremote.instances.capabilities

Retrieves the feature capability matrix of an instance by its instance ID.

## Signature
`sremote.instances.capabilities(instanceId?, key?)`
*(Alias: `sremote.instances.getCapabilities(instanceId?, key?)`)*

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Identifier of the media instance. If omitted, queries the active instance. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns an `SRemoteCapabilities` object representing supported playback actions (e.g. `play`, `pause`, `seek`, `volume`, `quality`, etc.), or `null` if not found.

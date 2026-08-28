# sremote.getCustomAdapter
Retrieves a previously registered Custom Adapter object.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Identifier of the adapter to retrieve. If omitted and only 1 adapter exists, returns that adapter. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns the corresponding `adapter` object or `null` if not found.

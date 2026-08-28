# sremote.removeAdapter
Removes a previously registered Custom Adapter on the parent page.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Identifier of the adapter to remove (if omitted or only 1 adapter exists, removes the current adapter). |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
- `boolean`: Returns `true` if removal succeeded, `false` otherwise.

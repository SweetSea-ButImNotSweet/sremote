# sremote.css.remove
Removes all dynamic CSS rules applied to the target iframe.

## Syntax
```javascript
sremote.css.remove(instanceId?, key?);
```

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Target iframe instance identifier (if omitted, applies to the most recently active iframe). |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns a `Promise<{ success: boolean }>` confirming that the dynamic CSS style tag was removed.

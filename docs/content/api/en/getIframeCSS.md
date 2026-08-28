# sremote.getIframeCSS
Retrieves the dynamic CSS string currently applied to the target iframe.

## Syntax
```javascript
sremote.getIframeCSS(instanceId?, key?);
```

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Target iframe instance identifier (if omitted, queries the most recently active iframe). |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns a `Promise<{ success: boolean, css: string }>` containing the current dynamic CSS string.

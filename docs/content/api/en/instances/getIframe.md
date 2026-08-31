# sremote.instances.getIframe
Retrieves the `HTMLIFrameElement` DOM node corresponding to a specific `instanceId`.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | **Required** | Identifier of the media instance. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
- `HTMLIFrameElement | null`: Returns the matching iframe DOM node if found, or `null` if not found or unauthorized.

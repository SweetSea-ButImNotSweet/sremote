# sremote.rpc.postMessage
Sends a message to the target iframe window context (via direct `iframe.contentWindow.postMessage` or bridged via MessagePort).

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `message` | `any` | **Required** | Data payload to send to the iframe. |
| `targetOrigin` | `string` | `'*'` | Allowed target origin. |
| `instanceId` | `string` | `null` | Target iframe instance identifier (if omitted, targets the latest active instance). |
| `from` | `string` | `'parent'` | Sending context origin (`'parent'` posts directly into iframe window, or `'iframe'` emits from inside iframe context). |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
- `boolean`: `true` if sent successfully, `false` otherwise.

# sremote.rpc.call
Invokes a custom asynchronous RPC method (returns a Promise) on the target iframe.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `action` | `string` | **Required** | Action/RPC method name to execute (e.g. `'setIframeCSS'`, `'getIframeCSS'`, `'removeIframeCSS'`, ...). |
| `params` | `any` | `undefined` | Payload data to send with the RPC request. |
| `instanceId` | `string` | `null` | Identifier of the target media instance (if omitted, targets the latest active instance). |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
- `Promise<{ success: boolean, data?: any, error?: string, message?: string, instanceId?: string }>`:
  - On success: `{ success: true, data: res, ... }`
  - On failure: `{ success: false, error: 'AUTH_FAILED' | 'INSTANCE_NOT_FOUND' | 'TIMEOUT' | 'PORT_ERROR' | 'ACTION_NOT_FOUND' | 'EXECUTION_ERROR', message: string, ... }` (Promise always resolves this object to prevent uncaught rejections).

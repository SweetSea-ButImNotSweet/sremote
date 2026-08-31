# sremote.rpc.onMessage
Listens for arbitrary messages sent from the iframe up to the parent page via the private MessagePort bridge.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `handler` | `Function` | **Required** | Callback receiving payload data when a message arrives from the iframe. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
- `Function`: Unsubscribe function to remove the message listener when no longer needed.

## Callback Payload
The callback receives an object containing:
- `instanceId` (`string`): ID of the sending iframe instance.
- `data` (`any`): Message payload content.
- `origin` (`string`): Origin of the iframe page.
- `location` (`string`): Full URL of the iframe page.

## Example
```javascript
const unbind = sremote.rpc.onMessage(payload => {
  console.log(`Received message from instance ${payload.instanceId}:`, payload.data);
});

// To stop listening:
// unbind();
```

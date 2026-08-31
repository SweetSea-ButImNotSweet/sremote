# sremote.on
Subscribes to events emitted from iframe media instances or custom adapters.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `event` | `string` | **Required** | The name of the event to listen for (e.g. `'play'`, `'pause'`, `'timeupdate'`, `'ended'`, `'accept'`, `'disconnect'`, or `'*'` to capture all events). Case-insensitive. |
| `handler` | `Function` | **Required** | The event listener callback function `(payload) => void`. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns an unsubscribe function `() => void` that removes this specific listener when called.

## Notes
- Supports **Sticky Replay**: If you subscribe to `'accept'` or `'*'` after an iframe has already successfully connected, the callback will be invoked immediately with the cached connection payload.

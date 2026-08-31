# sremote.off
Unsubscribes a previously registered event listener callback.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `event` | `string` | **Required** | The event name to remove the listener from. |
| `handler` | `Function` | **Required** | Reference to the exact callback function passed into `sremote.on`. |

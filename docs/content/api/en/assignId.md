# sremote.assignId
Pre-assigns a custom `instanceId` to a target `<iframe>` element before or during the handshake process.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `iframeOrSelector` | `HTMLIFrameElement` \| `string` | **Required** | The iframe DOM element or CSS selector targeting the iframe (e.g. `'#player-frame'`). |
| `customId` | `string` | **Required** | The custom identifier string to assign. |

## Return Value
- `boolean`: Returns `true` if assignment succeeded, `false` otherwise (e.g. element not found or invalid ID).

## Example
```javascript
// Pre-assign custom ID 'main-player' to an iframe before handshake
sremote.assignId('#my-iframe', 'main-player');

// Then handshake and control directly with this ID
sremote.hello();
sremote.play('main-player');
```

# sremote.speed / sremote.rate

Sets the playback rate (speed) of the media inside the target iframe or adapter.

## Signatures
- `sremote.speed(rate, targetOrId?, key?)`
- `sremote.rate(rate, targetOrId?, key?)` *(Alias)*
- `sremote.playbackRate(rate, targetOrId?, key?)` *(Alias)*

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `rate` | `number` | **Required** | The desired playback speed (e.g. `0.5`, `1.0`, `1.25`, `1.5`, `2.0`). |
| `targetOrId` | `string \| HTMLElement` | `null` | Identifier of the media instance or target element to apply speed to. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns a Promise resolving to a command result object indicating success or failure.

## Example
```javascript
// Set speed to 1.5x on current active player
await sremote.speed(1.5);

// Set speed on a specific instance
await sremote.speed(2.0, 'iframe-youtube');
```

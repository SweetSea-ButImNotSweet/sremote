# sremote.repeat

Sets the playlist repeat mode on supported media providers.

## Signature
`sremote.repeat(mode?, targetOrId?, key?)`

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `mode` | `'off' \| 'all' \| 'one' \| boolean` | `'all'` | Repeat mode: `'off'` (disable repeat), `'all'` (repeat entire playlist), `'one'` (repeat current track), or boolean (`true` for all, `false` for off). |
| `targetOrId` | `string \| HTMLElement` | `null` | Identifier of the media instance or target element. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns a Promise resolving to a command result object indicating success or failure.

## Example
```javascript
// Repeat single track
await sremote.repeat('one');

// Turn off repeat
await sremote.repeat('off');
```

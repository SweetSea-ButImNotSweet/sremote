# sremote.shuffle

Enables, disables, or toggles playlist shuffle playback on supported players (Spotify, SoundCloud, etc.).

## Signature
`sremote.shuffle(enable?, targetOrId?, key?)`

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enable` | `boolean` | `undefined` | `true` to turn on shuffle, `false` to turn off. If omitted, toggles the current shuffle state. |
| `targetOrId` | `string \| HTMLElement` | `null` | Identifier of the media instance or target element. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns a Promise resolving to a command result object indicating success or failure.

## Example
```javascript
// Toggle shuffle
await sremote.shuffle();

// Explicitly enable shuffle
await sremote.shuffle(true, 'spotify-instance');
```

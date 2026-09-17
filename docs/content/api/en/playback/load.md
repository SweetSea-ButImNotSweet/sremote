# sremote.load

Loads a new media source into the target player or iframe. Depending on the provider, this can be a video/audio URL, video ID, or configuration object.

## Signature
`sremote.load(source, targetOrId?, key?)`

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `source` | `string \| Object` | **Required** | The media identifier, URL, or provider-specific source descriptor. |
| `targetOrId` | `string \| HTMLElement` | `null` | Identifier of the media instance or target element to load the source into. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns a Promise resolving to a command result object indicating success or failure.

## Example
```javascript
// Load a new video into active player
await sremote.load('https://example.com/stream.mp4');

// Load a specific video on YouTube adapter
await sremote.load('dQw4w9WgXcQ', 'youtube-player');
```

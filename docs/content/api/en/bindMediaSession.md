# sremote.bindMediaSession
Enables automatic binding of metadata and `navigator.mediaSession` action handlers for the media inside the iframe.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Identifier of the media instance to bind. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Notes
- When invoked, the script in the iframe automatically parses the page title (`og:title`, `title`), artist/channel name, and poster/artwork images from meta tags to create a `MediaMetadata` object and registers basic action handlers (`play`, `pause`, `stop`, `seekto`, etc.).

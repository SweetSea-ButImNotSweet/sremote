# sremote.getQualities

Retrieves the list of available quality levels / resolutions supported by the target media or adapter.

## Signature
`sremote.getQualities(targetOrId?, key?)`

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `targetOrId` | `string \| HTMLElement` | `null` | Identifier of the media instance or target element to query. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns an array of string identifiers (or a Promise resolving to `string[]`), e.g. `['1080p', '720p', '480p', '360p', 'auto']`.

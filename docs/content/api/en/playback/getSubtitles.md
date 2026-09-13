# sremote.getSubtitles

Retrieves the list of available subtitle / caption tracks for the current media.

## Signature
`sremote.getSubtitles(targetOrId?, key?)`

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `targetOrId` | `string \| HTMLElement` | `null` | Identifier of the media instance or target element to query. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns an array (or a Promise resolving to an array) of subtitle descriptor objects:
```typescript
Array<{
  id: string;
  label?: string;
  lang?: string;
  src?: string;
}>
```

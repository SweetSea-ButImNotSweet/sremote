# sremote.capabilities

Retrieves the feature capability matrix supported by the target media element or custom adapter.

## Signature
`sremote.capabilities(targetOrId?, key?)`

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `targetOrId` | `string \| HTMLElement` | `null` | Identifier of the media instance or target element to query. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns an `SRemoteCapabilities` object (or `null` if instance not found):
```typescript
interface SRemoteCapabilities {
  play: boolean;
  pause: boolean;
  toggle: boolean;
  stop: boolean;
  seek: boolean;
  volume: boolean;
  muted: boolean;
  speed: boolean;
  playbackRate?: boolean;
  pip: boolean;
  quality: boolean;
  subtitles: boolean;
  shuffle: boolean;
  repeat: boolean;
  next: boolean;
  previous: boolean;
  load: boolean;
  hasAdapter?: boolean;
  hasNative?: boolean;
  hasMediaSession?: boolean;
}
```

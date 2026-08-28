# sremote.useAdapter
Registers a user-defined Custom Adapter for non-standard media sources (such as YouTube Iframe API, Video.js, external playback SDKs, etc.) to unify them under SRemote's standardized control interface.

## Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `adapter` | `Object` | **Required** | The adapter implementation object providing playback methods (`play()`, `pause()`, `toggle()`, `seekTo(time)`, `setVolume(vol)`, `setMuted(muted)`, `getCurrentTime()`, `getDuration()`, `paused()`, etc.). |
| `instanceId` | `string` | `null` | Custom identifier desired for the adapter. If omitted, an ID in the form of `adapter_...` will be auto-generated. |
| `key` | `string` | `null` | Passkey authentication if domain lock is enabled. |

## Return Value
Returns the registered adapter's `instanceId` (`string`).

## Notes
- Upon registration, SRemote automatically injects an `adapter.emit(eventName, payload)` method into your adapter object so you can forward playback events (`play`, `pause`, `timeupdate`, etc.) directly to `sremote.on()` subscribers.

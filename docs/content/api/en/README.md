# SRemote API Reference

All methods are exposed via the global `window.sremote` object.

## 1. API Functions Table

| Category | API Functions |
| :--- | :--- |
| **Connection & Initialization** | `hello(options?, target?)`<br>`assignId(iframeOrSelector, customId)` |
| **Frame Communication & RPC** | `postWindowMessage(message, targetOrigin?, instanceId?, from?, key?)`<br>`onWindowMessage(handler, key?)`<br>`call(action, params?, instanceId?, key?)` |
| **Iframe CSS** | `setIframeCSS(css, instanceId?, key?)`<br>`getIframeCSS(instanceId?, key?)`<br>`removeIframeCSS(instanceId?, key?)` |
| **Playback Control** | `play(instanceId?, key?)`<br>`pause(instanceId?, key?)`<br>`toggle(instanceId?, key?)`<br>`stop(instanceId?, key?)`<br>`playbackRate(rate, instanceId?, key?)` |
| **Seeking & Timeline** | `seek(offset, instanceId?, key?)`<br>`seekTo(time, instanceId?, key?)` |
| **Volume & Audio** | `volume(vol, instanceId?, key?)`<br>`mute(muted?, instanceId?, key?)` |
| **Display & DOM** | `pip(enable?, instanceId?, key?)`<br>`getIframe(instanceId, key?)` |
| **Status & Management** | `status(instanceId?, key?)`<br>`list(key?)`<br>`query(key?)`<br>`note(notesDict, key?)` |
| **Events** | `on(event, handler, key?)`<br>`off(event, handler)` |
| **Custom Adapter** | `useAdapter(adapter, instanceId?, key?)`<br>`getCustomAdapter(instanceId?, key?)`<br>`removeAdapter(instanceId?, key?)` |
| **MediaSession & Metadata** | `bindMediaSession(instanceId?, key?)`<br>`bindMetadata(meta, instanceId?, key?)` |
| **Playback Mode** | `setMultiMode(mode, key?)`<br>`isMultiMode(key?)`<br>`setExclusive(mode, key?)` |
| **Security & Protection** | `lock()` |
| **Diagnostics & Test Suite (Debug)** | `debug.scan()`<br>`debug.getState(instanceId?)`<br>`debug.dump(instanceId?)`<br>`debug.setSource(source, instanceId?)`<br>`debug.injectTestTone(freq?, dur?, instanceId?)`<br>`debug.injectSilentTrack(dur?, instanceId?)`<br>`debug.injectWhiteNoise(dur?, instanceId?)`<br>`debug.injectSampleVideo(instanceId?)`<br>`debug.simulateStall(instanceId?)`<br>`debug.restoreOriginal(instanceId?)` |
| **Error Handling & Codes** | [View Error Codes & Troubleshooting Guide](../../guides/en/errors.md) |

## 2. Events Table

These events are dispatched from the iframe/adapter and can be subscribed to via `sremote.on(event, handler)` (or using `'*'` to listen to all events):

| Event Category | Event Name | Description |
| :--- | :--- | :--- |
| **Lifecycle & Connection** | `accept` | Handshake succeeded; ready to receive media control commands. |
| | `disconnect` | Iframe closed, navigated away, or connection lost. |
| | `mediadisconnected` | The media element inside the iframe was removed from the DOM or destroyed. |
| **Media Playback State** | `play` | Media playback requested. |
| | `pause` | Media transitioned to the paused state. |
| | `playing` | Media is actively playing after buffering/loading enough data. |
| | `almostend` | Emitted when audio/video is near the end (~0.8s remaining). Typically used for iframes that self-destruct their player when hitting ended. |
| | `ended` | Media has played through to the end. |
| | `timeupdate` | Current playback time updated continuously during playback. |
| | `durationchange` | Total duration of the media was determined or updated. |
| | `volumechange` | Volume level or mute state was changed. |
| | `ratechange` | Playback speed (`playbackRate`) changed. |
| | `seeking` | Seeking operation started. |
| | `seeked` | Seeking operation completed to the new position. |
| **Loading & Buffering** | `loadstart` | Browser started loading media data. |
| | `loadedmetadata` | Media metadata (dimensions, duration, format) loaded. |
| | `loadeddata` | First frame of the media loaded. |
| | `canplay` | Media can start playing (though buffering may still cause pauses). |
| | `canplaythrough` | Estimated that media can play through to the end without buffering pauses. |
| | `progress` | Browser is downloading additional media buffer chunks. |
| | `waiting` | Playback paused waiting for more buffer data. |
| | `stalled` | Data fetching from server is stalled or unexpectedly stopped. |
| | `suspend` | Data fetching intentionally suspended (e.g. buffer is full). |
| | `emptied` | Media source cleared or reset. |
| | `abort` | Media loading aborted before completion. |
| | `error` | An error occurred while loading or decoding media. |
| | `encrypted` | Media is DRM encrypted and initializing decryption keys. |
| **Picture-in-Picture** | `enterpictureinpicture` | Video entered Picture-in-Picture mode. |
| | `exitpictureinpicture` | Video exited Picture-in-Picture mode. |
| **Multi-Media & Warnings** | `singleMediaDetected` | Detected exactly 1 active media instance. |
| | `multipleMediaDetected` | Detected 2 or more active media instances concurrently in the page. |
| | `whereIsInstanceID` | Warning emitted when multiple media instances are active but command was called without a target `instanceId`. |

# SRemote API Reference

All methods are available on the global `window.sremote` object (or the client instance created from `@sremote/wrapper`).

---

## 0. Extended Preset Package: SRemote Ready2use (`@sremote/ready2use`)

👉 **See Full API Documentation:** **[SRemote Ready2use API Guide](./ready2use.md)**

Out-of-the-box player presets for YouTube, Vimeo, Spotify, SoundCloud, Twitch, Dailymotion, TikTok, Mixcloud, NicoNico, Bilibili, Facebook.

```javascript
import { youtube } from '@sremote/ready2use';

const { remote } = await youtube.mount('#player-container', { videoId: 'dQw4w9WgXcQ' });
await remote.play();
```

---

## 1. API Methods by Domain


### 📡 A. Lifecycle, Events & Security
Initiate handshake connection, manage event listeners, sync metadata, and enforce domain lock:

| API Method | Signature | Description |
| :--- | :--- | :--- |
| **Broadcast Hello** | `hello(options?, target?)` | Broadcasts handshake discovery to child frames |
| **Listen to Events** | `on(event, handler, key?)` | Subscribes to events from frames/adapters (supports `'*'`) |
| **Unsubscribe** | `off(event, handler)` | Removes an event listener |
| **Session Lock** | `lock(passkey?)` | Locks SRemote execution on the current page |
| **MediaSession** | `bindMediaSession(instanceId?, key?)` | Syncs iframe with browser MediaSession API |
| **Metadata** | `bindMetadata(meta, instanceId?, key?)` | Sets track title, artist, album, and artwork |

---

### 🎮 B. Quick Playback Controls (Root)
Target the active instance or a specifically designated `instanceId`:

| API Method | Signature | Description |
| :--- | :--- | :--- |
| **Play** | `play(instanceId?, key?)` | Requests media playback |
| **Pause** | `pause(instanceId?, key?)` | Pauses media playback |
| **Toggle Play/Pause** | `toggle(instanceId?, key?)` | Toggles between play and pause |
| **Stop** | `stop(instanceId?, key?)` | Pauses playback and resets currentTime to 0 |
| **Relative Seek** | `seek(offset, instanceId?, key?)` | Seeks forward (+) or backward (-) by seconds |
| **Absolute Seek** | `seekTo(time, instanceId?, key?)` | Jumps to a specific timestamp in seconds |
| **Volume** | `volume(vol, instanceId?, key?)` | Sets volume level from `0.0` to `1.0` |
| **Mute / Unmute** | `mute(muted?, instanceId?, key?)` | Sets or toggles muted state |
| **Playback Rate** | `rate(speed, instanceId?, key?)`<br>`playbackRate(speed, instanceId?, key?)` | Changes playback speed (0.25 - 4.0) |
| **Load New Source** | `load(source, instanceId?, key?)` | Loads a new media source (Video ID, URL string, or config object) |
| **Quality / Resolution** | `quality(level, instanceId?, key?)`<br>`getQualities(instanceId?, key?)` | Sets or retrieves available video resolution qualities (`'1080p'`, `'720p'`, `'auto'`) |
| **Subtitle / Captions** | `subtitle(track, instanceId?, key?)`<br>`getSubtitles(instanceId?, key?)` | Sets or disables subtitle (`'vi'`, `'en'`, `null`) or retrieves available subtitle tracks |
| **Shuffle** | `shuffle(enable?, instanceId?, key?)` | Sets or toggles playlist shuffle state |
| **Repeat** | `repeat(mode?, instanceId?, key?)` | Sets playlist repeat mode (`'off'`, `'all'`, `'one'`) |
| **Next Track** | `next(instanceId?, key?)` | Advances to the next track/video in playlist |
| **Previous Track** | `previous(instanceId?, key?)` | Returns to the previous track/video in playlist |
| **Picture-in-Picture** | `pip(enable?, instanceId?, key?)` | Requests or toggles Picture-in-Picture mode |
| **Media Status** | `status(instanceId?, key?)` | Retrieves the current state snapshot of a media instance |
| **Capabilities** | `capabilities(instanceId?, key?)` | Retrieves the supported capabilities map of a player or adapter |

---

### 🗂️ C. Instance Management (`sremote.instances`)

| API Method | Signature | Description |
| :--- | :--- | :--- |
| **Pre-assign ID** | `instances.assign(iframeOrSelector, customId)` | Assigns instance ID to an iframe before handshake |
| **Get Iframe Node** | `instances.getIframe(instanceId, key?)` | Retrieves the `HTMLIFrameElement` in the parent DOM |
| **Get State Info** | `instances.get(instanceId, key?)` | Returns full instance media status details |
| **Get Capabilities**| `instances.capabilities(instanceId?, key?)` | Retrieves supported feature matrix of an instance/adapter |
| **List Instances** | `instances.list(key?)` | Enumerates all connected media instances & adapters |
| **Multi-Media Mode** | `instances.setMultiMode(mode, key?)` | Forces Multi-mode (`true`), Single-mode (`false`), or Auto (`null`) |
| **Is Multi-Media** | `instances.isMultiMode(key?)` | Returns whether multiple active instances are detected |
| **Exclusive Mode** | `instances.setExclusive(mode, key?)` | Sets playback exclusivity (`'auto'`, `instanceId`, or `null`) |
| **Active GM Query** | `instances.query(key?)` | Proactively discovers background frames via GM storage |
| **Annotate Instance**| `instances.note(dict, key?)` | Assigns semantic labels/notes to instances |

---

### 🔌 D. Custom Adapter Subsystem (`sremote.adapters`)

| API Method | Signature | Description |
| :--- | :--- | :--- |
| **Create Universal Adapter** | `createUniversalAdapter(options)` | Creates a standardized adapter to wrap any in-page custom player |
| **Register Adapter** | `adapters.register(adapter, instanceId?, key?)` | Registers a custom adapter for proprietary embeds |
| **Unregister Adapter**| `adapters.unregister(instanceId?, key?)` | Removes a registered custom adapter |
| **Get Adapter** | `adapters.get(instanceId?, key?)` | Retrieves an active custom adapter instance |

---

### ⚡ E. RPC & Cross-Frame Messaging (`sremote.rpc`)

| API Method | Signature | Description |
| :--- | :--- | :--- |
| **Invoke RPC** | `rpc.call(action, params?, instanceId?, key?)` | Invokes a custom RPC action inside an iframe |
| **Post Window Message** | `rpc.postMessage(message, targetOrigin?, instanceId?, from?, key?)` | Bridges postMessage directly into an iframe's window context |
| **Listen to Frame Msg** | `rpc.onMessage(handler, key?)` | Listens to arbitrary messages sent from child iframes |

---

### 🎨 F. Dynamic Iframe CSS (`sremote.css`)

| API Method | Signature | Description |
| :--- | :--- | :--- |
| **Apply CSS** | `css.set(cssText, instanceId?, key?)` | Injects dynamic CSS rules into an iframe |
| **Get Current CSS** | `css.get(instanceId?, key?)` | Retrieves applied custom CSS |
| **Remove CSS** | `css.remove(instanceId?, key?)` | Clears custom injected CSS |

---

### 🛠️ G. Diagnostics Test Suite (`sremote.debug`)

| API Method | Signature | Description |
| :--- | :--- | :--- |
| **Scan Frames** | `debug.scan()` | Scans all iframes on parent page and logs a summary table |
| **Get State** | `debug.getState(instanceId?)` | Inspects frame state, elements, and MediaSession metadata |
| **Console Dump** | `debug.dump(instanceId?)` | Outputs formatted property tables to browser console |
| **Set Test Source** | `debug.setSource(url, instanceId?)` | Replaces active media source with custom URL or Blob |
| **Sine Tone Generator** | `debug.injectTestTone(freq?, dur?, instanceId?)` | Injects synthetic sine wave audio (default 440Hz) |
| **Silent Track** | `debug.injectSilentTrack(dur?, instanceId?)` | Injects silent audio for autoplay permission testing |
| **White Noise** | `debug.injectWhiteNoise(dur?, instanceId?)` | Injects synthesized white noise audio |
| **Simulate Stall** | `debug.simulateStall(instanceId?)` | Triggers artificial `waiting` and `stalled` events |
| **Restore Source** | `debug.restoreOriginal(instanceId?)` | Restores original media URL before debug testing |

---

## 2. Event Reference

Events emitted from child frames/adapters can be intercepted using `sremote.on(event, handler)`:

| Category | Event Name | Description |
| :--- | :--- | :--- |
| **Lifecycle & Connection** | `accept` | Handshake completed successfully and ready for commands. |
| | `disconnect` | Iframe navigated away, closed, or disconnected. |
| | `mediadisconnected` | Media element detached from iframe DOM. |
| **Frame Bridge** | `iframe:message` / `message` | Arbitrary window message forwarded from iframe. |
| **Playback State** | `play` | Media play requested. |
| | `pause` | Media transitioned to paused state. |
| | `playing` | Media actually playing after buffering/starting. |
| | `almostend` | Near media completion (~0.8s remaining). |
| | `ended` | Media finished playing to the end. |
| | `timeupdate` | Progress update during playback. |
| | `durationchange` | Total media duration updated. |
| | `volumechange` | Volume level or muted state modified. |
| | `ratechange` | Playback speed rate altered. |
| | `seeking` | Seeking operation initiated. |
| | `seeked` | Seeking operation completed. |
| **Buffering & Loading** | `loadstart` | Browser starts loading media data. |
| | `loadedmetadata` | Dimensions, duration, and track metadata ready. |
| | `loadeddata` | First media frame rendered. |
| | `canplay` | Media can begin playback. |
| | `canplaythrough` | Sufficient buffer to play without interruption. |
| | `progress` | Ongoing buffer download progress. |
| | `waiting` | Playback stalled waiting for more buffer data. |
| | `stalled` | Network data fetch stalled. |
| | `suspend` | Buffer download intentionally paused. |
| | `emptied` | Media element source reset. |
| | `abort` | Media loading aborted. |
| | `error` | Media decoding or network error encountered. |
| | `encrypted` | Encrypted media stream (DRM) handshake. |
| **Picture-in-Picture** | `enterpictureinpicture` | Media entered PiP mode. |
| | `exitpictureinpicture` | Media exited PiP mode. |
| **Multi-Media & Warning** | `singleMediaDetected` | Exactly 1 media instance detected. |
| | `multipleMediaDetected` | Multiple media instances detected concurrently. |
| | `whereIsInstanceID` | Command sent without target instanceId when multiple medias exist. |

# sremote.adapters.register

Registers a Custom Adapter for proprietary embedded players or custom media engines (YouTube Iframe API, SoundCloud Widget, Spotify Embed, Vimeo SDK, Twitch Player, TikTok Embed, HTML5 Audio/Video, etc.).

---

## Syntax

```javascript
// New namespaced syntax:
sremote.adapters.register(adapter, instanceId?, key?);

// Equivalent aliases:
sremote.adapters.use(adapter, instanceId?, key?);
sremote.adapters.register(adapter, instanceId?, key?);
```

---

## Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `adapter` | `object` | **Required** | Object implementing control methods: `play()`, `pause()`, `toggle()`, `seek(offset)`, `seekTo(sec)`, `volume(vol)`, `mute(bool)`, `getCurrentTime()`, `getDuration()`, `paused()`. |
| `instanceId` | `string` | Auto-generated | Target instance identifier for the adapter (e.g. `'youtube_player'`). |
| `key` | `string` | `null` | Authentication passkey if the domain is locked. |

---

## Synchronizing Events Back to SRemote (`adapter.emit`)

When an adapter is registered, SRemote automatically injects `adapter.emit(eventName, payload)` so third-party player events (`play`, `pause`, `timeupdate`, `ended`) can be broadcast seamlessly.

```javascript
const adapter = {
  play() { player.playVideo(); },
  pause() { player.pauseVideo(); },
  getCurrentTime() { return player.getCurrentTime(); },
  getDuration() { return player.getDuration(); },
  paused() { return player.getPlayerState() !== 1; }
};

sremote.adapters.register(adapter, 'youtube_player');

// Sync playback updates from 3rd-party player into SRemote:
player.on('timeupdate', () => {
  adapter.emit('timeupdate', {
    state: {
      paused: adapter.paused(),
      currentTime: adapter.getCurrentTime(),
      duration: adapter.getDuration()
    }
  });
});
```

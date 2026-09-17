# sremote.adapters.create / createUniversalAdapter

Factory helper to build a standardized `SRemoteCustomAdapter` object wrapping any arbitrary in-page custom media player or third-party web player instance.

## Signatures
- `sremote.adapters.create(options?: UniversalAdapterOptions): SRemoteCustomAdapter`
- `createUniversalAdapter(options?: UniversalAdapterOptions): SRemoteCustomAdapter` *(Direct standalone import from `@sremote/sdk`)*

## Options
The `options` object allows configuring callbacks and capabilities:
- `name?: string`: Descriptive adapter name (default: `'universal-adapter'`).
- `mediaElement?: HTMLMediaElement`: Optional existing media element to bind natively.
- `capabilities?: SRemoteCapabilities`: Feature capability overrides.
- `play?: () => void | Promise<void>`: Callback when play action is invoked.
- `pause?: () => void | Promise<void>`: Callback when pause action is invoked.
- `toggle?: () => void | Promise<void>`: Callback when toggle action is invoked.
- `stop?: () => void | Promise<void>`: Callback when stop action is invoked.
- `seek?: (offset: number) => void | Promise<void>`: Callback when relative seek is invoked.
- `seekTo?: (time: number) => void | Promise<void>`: Callback when absolute seek is invoked.
- `getCurrentTime?: () => number | Promise<number>`: Getter for current playback position in seconds.
- `getDuration?: () => number | Promise<number>`: Getter for total duration in seconds.
- `getVolume?: () => number | Promise<number>`: Getter for volume level (`0.0` - `1.0`).
- `setVolume?: (vol: number) => void | Promise<void>`: Setter for volume level.
- `getMuted?: () => boolean | Promise<boolean>`: Getter for muted status.
- `setMuted?: (muted: boolean) => void | Promise<void>`: Setter for muted status.
- `getPlaybackRate?: () => number | Promise<number>`: Getter for speed rate.
- `setPlaybackRate?: (rate: number) => void | Promise<void>`: Setter for speed rate.
- `setQuality?: (quality: string | number) => void | Promise<void>`: Callback to change quality.
- `getQualities?: () => string[] | Promise<string[]>`: Getter for available quality levels.
- `setSubtitle?: (sub: string | null) => void | Promise<void>`: Callback to change subtitle track.
- `getSubtitles?: () => any[] | Promise<any[]>`: Getter for available subtitle tracks.
- `setShuffle?: (shuffle: boolean) => void | Promise<void>`: Callback for shuffle playback.
- `setRepeat?: (mode: 'off' | 'all' | 'one' | boolean) => void | Promise<void>`: Callback for repeat mode.
- `next?: () => void | Promise<void>`: Callback to advance to next item.
- `previous?: () => void | Promise<void>`: Callback to go to previous item.
- `load?: (source: any) => void | Promise<void>`: Callback to load a new source.

## Example
```javascript
// Method 1: Using sremote.adapters.create
const myAdapter = sremote.adapters.create({
  name: 'CustomPlayer',
  play: () => player.playVideo(),
  pause: () => player.pauseVideo(),
  getCurrentTime: () => player.getCurrentTime(),
  getDuration: () => player.getDuration(),
});

// Register into SRemote
sremote.adapters.register(myAdapter, 'my-player-1');
```

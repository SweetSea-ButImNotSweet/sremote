# Compatibility Matrix

This document provides a comprehensive breakdown of supported playback commands and real-time event reporting across all 22 major media platforms when integrated with SRemote.

---

## 1. Notation Legend

- ✅ : **Fully Supported**: Smooth, reliable, and production-tested.
- ⚠️ : **Conditional Support**: Dependent on platform specifics (see Notes column).
- ❌ : **Unsupported**: The platform does not expose the corresponding feature or API.

---

## 2. 22-Platform Overview Matrix

| Platform | Control Channel | `play` / `pause` / `toggle` | `seek` / `seekTo` | `volume` / `mute` | Real-time Events (`timeupdate`) | Technical Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **YouTube** | Adapter (`YT.Player`) | ✅ | ✅ | ✅ | ✅ | Supports high-precision scrubbing |
| **Vimeo** | Adapter (`@vimeo/player`) | ✅ | ✅ | ✅ | ✅ | Supports both `buffer` and `ratechange` |
| **SoundCloud** | Adapter (`SC.Widget`) | ✅ | ✅ | ✅ | ✅ | Specialized for audio streams |
| **Dailymotion** | Adapter (Player SDK) | ✅ | ✅ | ✅ | ✅ | Emits native buffering events |
| **Twitch** | Adapter (Interactive SDK) | ✅ | ⚠️ *(Live)* | ✅ | ⚠️ *(Live)* | Live streams only support Pause/Play/Volume |
| **Mixcloud** | Adapter (Widget API) | ✅ | ✅ | ✅ | ✅ | Supports podcast timelines |
| **Spotify** | Adapter (`EmbedController`) | ✅ | ✅ | ❌ *(SDK limit)* | ✅ | Spotify IFrame forbids volume mutation via code |
| **Apple MusicKit** | Adapter (MusicKit JS v3) | ✅ | ✅ | ✅ | ✅ | Requires Apple Developer Token |
| **PeerTube** | Adapter (Embed API) | ✅ | ✅ | ✅ | ✅ | Decentralized video streaming |
| **TikTok** | Adapter (Embed v1) | ✅ | ⚠️ | ✅ | ⚠️ | Two-way postMessage protocol |
| **NicoNico** | Adapter (PostMessage) | ✅ | ✅ | ✅ | ✅ | Japanese postMessage messaging schema |
| **Facebook** | Adapter (Video SDK) | ✅ | ✅ | ✅ | ✅ | Supports both Facebook Reels & Watch |
| **Apple Music (Web)**| Fallback HTML5 / Embed | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Basic web embed player |
| **Rumble** | Fallback HTML5 Discovery | ✅ | ✅ | ✅ | ✅ | Controlled via Userscript |
| **Kick** | Fallback HTML5 Discovery | ✅ | ⚠️ *(Live)* | ✅ | ⚠️ *(Live)* | Livestream platform |
| **Streamable** | Fallback HTML5 Discovery | ✅ | ✅ | ✅ | ✅ | Native `<video>` detection |
| **Odysee / LBRY** | Fallback HTML5 Discovery | ✅ | ✅ | ✅ | ✅ | Web3 video streaming |
| **Bandcamp** | Fallback HTML5 Discovery | ✅ | ✅ | ✅ | ✅ | Audio player widget |
| **Twitter / X** | View-only | ❌ | ❌ | ❌ | ❌ | Returns `adapter: null`, display-only |
| **Instagram** | View-only | ❌ | ❌ | ❌ | ❌ | Returns `adapter: null`, display-only |
| **Threads** | View-only | ❌ | ❌ | ❌ | ❌ | Returns `adapter: null`, display-only |
| **Bilibili** | View-only | ❌ | ❌ | ❌ | ❌ | Returns `adapter: null`, display-only |

---

## 3. TABLE 1: Command Execution Matrix

> **Legend:**
> - ✅ : Fully supported and stable.
> - ⚠️ : Supported with limitations *(see Technical Notes column)*.
> - ❌ : Not supported.
> - ➖ : Not supported but irrelevant / not needed.

<div class="matrix-table-wrapper">
<table class="matrix-table">
  <thead>
    <tr>
      <th class="left">Platform / Service</th>
      <th class="left">Control Channel</th>
      <th><code>play</code><br/><code>pause</code><br/><code>toggle</code></th>
      <th><code>seek</code><br/><code>seekTo</code></th>
      <th><code>volume</code><br/><code>mute</code></th>
      <th><code>playbackRate</code></th>
      <th><code>pip</code></th>
      <th><code>stop</code></th>
      <th class="left">Technical Notes</th>
    </tr>
  </thead>
  <tbody>
    <!-- Vanilla HTML5 Media -->
    <tr class="platform-start">
      <td rowspan="2" class="platform-title">Vanilla HTML5 Media<br><small style="font-weight: normal; opacity: 0.7;">(VideoJS, Plyr, native)</small></td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Direct access to native <code>HTMLMediaElement</code></td>
    </tr>
    <tr class="platform-end">
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Browser MediaSession API lacks Volume / Rate / PiP handlers</td>
    </tr>
    <!-- Bilibili Embed -->
    <tr class="platform-start">
      <td rowspan="2" class="platform-title">Bilibili Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Identifies <code>&lt;video&gt;</code> element in bpx-player</td>
    </tr>
    <tr class="platform-end">
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Compatible with standard browser media keys</td>
    </tr>
    <!-- YouTube Embed -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">YouTube Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Directly hooks <code>video.html5-main-video</code></td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Controls play, pause, seek, stop</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="ok"></td>
      <td>Wrapped via <code>YT.Player</code> (PiP subject to iframe flags)</td>
    </tr>
    <!-- TikTok Embed -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">TikTok Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td>Controllable but UI overlay desynchronization may occur</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Receives browser MediaSession action commands</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Controlled via TikTok Embed Player API v1 (postMessage protocol)</td>
    </tr>
    <!-- Spotify Web Player -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">Spotify Web Player</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="no"></td>
      <td>No raw HTML5 DOM access (DRM EME / encrypted blob stream)</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Seeking depends on Spotify playback buffer state</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Via Spotify Web Playback SDK / Iframe API (Rate not supported)</td>
    </tr>
    <!-- SoundCloud Widget -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">SoundCloud Widget</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Hooks embedded <code>&lt;audio&gt;</code> element inside widget</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Responds smoothly to next/prev/play/pause actions</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Wrapped via SoundCloud Widget API (<code>SC.Widget</code>)</td>
    </tr>
    <!-- Dailymotion Player -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">Dailymotion Player</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Identifies standard video elements in player container</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Fully registers MediaSession actions (play, pause, seek, stop)</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="ok"></td>
      <td>Wrapped via Dailymotion Player SDK</td>
    </tr>
    <!-- Facebook Video Player -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">Facebook Video</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td>Video element enclosed in FB sandboxed shadow root</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Standard MediaSession action handler dispatch</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Direct integration via Facebook JS SDK (<code>xfbml.ready</code>)</td>
    </tr>
    <!-- NicoNico Player -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">NicoNico Player</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Auto-detects video element in NicoNico embed</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Standard OS media key dispatching</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message (postMessage)</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Official NicoNico embed postMessage protocol (<code>playerMetadataChange</code>)</td>
    </tr>
    <!-- PeerTube Embed -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">PeerTube Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>100% compatible with native PeerTube instance video tag</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Standard MediaSession synchronization</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Two-way control bridge via <code>@peertube/embed-api</code></td>
    </tr>
    <!-- Twitter / X Tweet Embed -->
    <tr class="platform-start">
      <td rowspan="2" class="platform-title">Twitter / X</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Auto-detects embedded tweet video in rendered DOM</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Mounted programmatically via Twitter Widgets JS SDK (<code>createTweet</code>)</td>
    </tr>
    <!-- HTML5 Discovery Platforms (Rumble, Kick, Streamable, Odysee) -->
    <tr class="platform-start platform-end">
      <td class="platform-title">Rumble / Kick / Streamable / Odysee</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Automatic HTML5 video discovery via SRemote Userscript (Zero-config)</td>
    </tr>
    <!-- Bandcamp Widget -->
    <tr class="platform-start platform-end">
      <td class="platform-title">Bandcamp Widget</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Auto-detects embedded widget <code>&lt;audio&gt;</code> element</td>
    </tr>
  </tbody>
</table>
</div>

---

## 4. TABLE 2: Playback Events Matrix

<div class="matrix-table-wrapper">
<table class="matrix-table">
  <thead>
    <tr>
      <th class="left">Platform / Service</th>
      <th class="left">Control Channel</th>
      <th><code>'play'</code><br/><code>'pause'</code></th>
      <th><code>'playing'</code><br/><code>'waiting'</code></th>
      <th><code>'seeking'</code><br/><code>'seeked'</code></th>
      <th><code>'ended'</code></th>
      <th><code>'volumechange'</code></th>
      <th><code>'ratechange'</code></th>
      <th class="left">Response Characteristics</th>
    </tr>
  </thead>
  <tbody>
    <!-- Vanilla HTML5 Media -->
    <tr class="platform-start">
      <td rowspan="2" class="platform-title">Vanilla HTML5 Media</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Direct DOM event listening (Real-time)</td>
    </tr>
    <tr class="platform-end">
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>MediaSession only emits on user action handlers</td>
    </tr>
    <!-- Bilibili Embed -->
    <tr class="platform-start">
      <td rowspan="2" class="platform-title">Bilibili Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Full event stream from Bilibili HTML5 player</td>
    </tr>
    <tr class="platform-end">
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Ended event might be delayed due to recommendations</td>
    </tr>
    <!-- YouTube Embed -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">YouTube Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Directly hooked to YouTube internal video element</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Emits play/pause based on OS media state</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Mapped to YouTube <code>onStateChange</code> events</td>
    </tr>
    <!-- TikTok Embed -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">TikTok Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Direct video DOM event listener</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Syncs playing state via MediaSession</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td>Hooks <code>onStateChange</code> from TikTok Player v1</td>
    </tr>
    <!-- Spotify Web Player -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">Spotify Web Player</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>No raw HTML5 DOM access</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Track metadata updates via MediaSession</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td>Listens to <code>playback_update</code> via Spotify Embed SDK</td>
    </tr>
    <!-- SoundCloud Widget -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">SoundCloud Widget</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Native DOM <code>&lt;audio&gt;</code> events triggered immediately</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Syncs playing state on mobile notification center</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="na"></td>
      <td>Hooks <code>SC.Widget.Events.PLAY</code>, <code>FINISH</code>, <code>PLAY_PROGRESS</code></td>
    </tr>
    <!-- Dailymotion Player -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">Dailymotion Player</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Receives standard media element events</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Fully registers and emits events via MediaSession</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Wrapped via Dailymotion Player SDK</td>
    </tr>
    <!-- Facebook Video Player -->
    <tr class="platform-start">
      <td rowspan="2" class="platform-title">Facebook Video</td>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Playback state sync via MediaSession</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td>Hooks <code>startedPlaying</code>, <code>paused</code>, <code>finishedPlaying</code> from FB SDK</td>
    </tr>
    <!-- NicoNico Player -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">NicoNico Player</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Direct video DOM event listener</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Syncs playing state via MediaSession</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message (postMessage)</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Listens to <code>loadComplete</code>, <code>playerMetadataChange</code>, <code>statusChange</code></td>
    </tr>
    <!-- PeerTube Embed -->
    <tr class="platform-start">
      <td rowspan="2" class="platform-title">PeerTube Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Direct listener on native HTML5 DOM events</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Two-way synchronization via <code>@peertube/embed-api</code> events</td>
    </tr>
    <!-- HTML5 Discovery Platforms (Rumble, Kick, Streamable, Odysee) -->
    <tr class="platform-start platform-end">
      <td class="platform-title">Rumble / Kick / Streamable / Odysee</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Real-time DOM event listening via Userscript discovery</td>
    </tr>
    <!-- Bandcamp Widget -->
    <tr class="platform-start platform-end">
      <td class="platform-title">Bandcamp Widget</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="na"></td>
      <td>Captures <code>play</code>, <code>pause</code>, <code>timeupdate</code> from widget audio element</td>
    </tr>
  </tbody>
</table>
</div>

---

---

## ⏭️ Next Steps
- Return to [5-Minute Quickstart](../quickstart/5-minute-quickstart.md).
- Read [Architecture Overview](../concepts/architecture-overview.md).

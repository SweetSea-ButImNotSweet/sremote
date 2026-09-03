# 02. Checking Service Compatibility

Before writing integration code for SRemote on your website, you should determine which control channels your target service player supports, which commands are executable, and which playback events can be received by the parent window.

---

## 1. The Recommended Fast Path: Using `@sremote/ready2use`

If you are developing a modern application, the quickest approach is using the **`@sremote/ready2use`** package. When initializing via `create()` or `mount()`, you can directly check whether the target platform provides an adapter or relies on automatic HTML5 discovery:

```javascript
import { youtube, rumble } from '@sremote/ready2use';

// 1. Platforms with dedicated Adapters (YouTube, Spotify, SoundCloud, Vimeo, FB SDK...)
const yt = await youtube.create({ videoId: 'dQw4w9WgXcQ' });
console.log(yt.adapter); // Object with methods { play, pause, seek... } -> Has dedicated Adapter!

// 2. Platforms relying on automated HTML5 Discovery (Rumble, Kick, Streamable, Odysee, Bandcamp, Bilibili...)
const rb = await rumble.create({ video: 'v397yeg' });
console.log(rb.adapter); // null or empty -> Auto-discovered via Userscript!
```

> [!TIP]
> **Quick Summary:**
> - **If `adapter` exists (non-null / has methods)**: You can control the player directly via the Adapter interface or through SRemote client even without Userscript (via underlying official SDKs).
> - **If `adapter` is `null` or empty**: The platform is handled via **HTML5 Discovery**. You will need the **SRemote Userscript** installed to hook and intercept the embedded `<video>` / `<audio>` element inside the cross-origin iframe.

---

## 2. Fast Verification via Live Demo

The visual way to verify compatibility for any embed link:
1. Open the SRemote **[Live Demo](../demo/index.html)**.
2. Paste your target embed URL into the Iframe URL field.
3. Click **Load Iframe** and check:
   - If the status bar shows `Connected (instanceId: ...)` → **Fully Compatible**.
   - Test ▶ Play, ⏸ Pause, 🔇 Mute, ⏩ +10s to see if the player responds.

> [!NOTE]
> The Live Demo contains **no hardcoded logic for any specific platform**. It relies entirely on generic HTML5 media scanning and MediaSession interception. If it works on the Demo, it will work on your site!

---

## 3. Inspecting Unknown Services via DevTools

For private players or unlisted services:
1. Open DevTools (F12) → **Elements** tab.
2. Switch context to the target iframe.
3. Run in Console:
   ```javascript
   document.querySelector('video, audio')
   ```
4. If a `<video>` or `<audio>` node is returned, SRemote will be able to control it!

---

## 4. TABLE 1: Command Execution Matrix

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

## 5. TABLE 2: Playback Events Matrix

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

## ⏭️ Next Step
Proceed to **[03. SRemote Wrapper Integration](./03-wrapper-integration.md)**.

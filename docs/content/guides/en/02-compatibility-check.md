# 02. Checking Service Compatibility

Before writing integration code for SRemote on your website, you should determine which control channels your target service player supports, which commands are executable, and which playback events can be received by the parent window.

---

## 1. Fast Verification via Live Demo

The fastest way to verify compatibility:
1. Open the SRemote **[Live Demo](../demo/index.html)**.
2. Paste your target embed URL into the Iframe URL field.
3. Click **Load Iframe** and check:
   - If the status bar shows `Connected (instanceId: ...)` → **Fully Compatible**.
   - Test ▶ Play, ⏸ Pause, 🔇 Mute, ⏩ +10s to see if the player responds.

> [!NOTE]
> The Live Demo contains **no hardcoded logic for any specific platform**. It relies entirely on generic HTML5 media scanning and MediaSession interception. If it works on the Demo, it will work on your site!

---

## 2. Inspecting Unknown Services via DevTools

For private players or unlisted services:
1. Open DevTools (F12) → **Elements** tab.
2. Switch context to the target iframe.
3. Run in Console:
   ```javascript
   document.querySelector('video, audio')
   ```
4. If a `<video>` or `<audio>` node is returned, SRemote will be able to control it!

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
      <td rowspan="3" class="platform-title">Vanilla HTML5 Media<br><small style="font-weight: normal; opacity: 0.7;">(VideoJS, Plyr, native)</small></td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Direct access to native <code>HTMLMediaElement</code></td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Browser MediaSession API lacks Volume / Rate / PiP handlers</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Direct command dispatching via <code>postMessage</code></td>
    </tr>
    <!-- Bilibili Embed -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">Bilibili Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Identifies <code>&lt;video&gt;</code> element in bpx-player</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Compatible with system OS media controls</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Cross-origin command handling via SRemote client</td>
    </tr>
    <!-- YouTube Embed -->
    <tr class="platform-start">
      <td rowspan="4" class="platform-title">YouTube Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Hooks <code>video.html5-main-video</code> element directly</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Limited to play, pause, seek, stop commands</td>
    </tr>
    <tr>
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="ok"></td>
      <td>Wrapped via <code>YT.Player</code> (PiP subject to iframe permissions)</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Emits compliant JSON protocol messages</td>
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
      <td>Controllable, but UI overlay has visual desync / bugs</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Responds to system media controls</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Receives commands via SRemote client messaging</td>
    </tr>
    <!-- Spotify Web Player -->
    <tr class="platform-start">
      <td rowspan="4" class="platform-title">Spotify Web Player</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="no"></td>
      <td>Unsupported via vanilla HTML5 (DRM EME protected & blob streaming)</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Seeking subject to Spotify buffer state</td>
    </tr>
    <tr>
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Via Spotify Web Playback SDK / Iframe API</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Playback speed adjustment is unsupported by Spotify</td>
    </tr>
    <!-- SoundCloud Widget -->
    <tr class="platform-start">
      <td rowspan="4" class="platform-title">SoundCloud Widget</td>
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
      <td>Responds well to next/prev/play/pause system triggers</td>
    </tr>
    <tr>
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Wrapped via SoundCloud Widget API (<code>SC.Widget</code>)</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Pure audio; Picture-in-Picture is not applicable</td>
    </tr>
    <!-- Dailymotion Player -->
    <tr class="platform-start">
      <td rowspan="4" class="platform-title">Dailymotion Player</td>
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
    <tr>
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="ok"></td>
      <td>Wrapped via Dailymotion Player SDK</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Full command stream forwarded via SRemote client</td>
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
      <td rowspan="3" class="platform-title">Vanilla HTML5 Media</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Real-time native DOM event listeners</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>MediaSession only responds to user action triggers</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Instant event forwarding via <code>postMessage</code></td>
    </tr>
    <!-- Bilibili Embed -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">Bilibili Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Full event callbacks from Bilibili web player</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Ended event might be delayed due to recommendations</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Continuous event stream to SRemote client</td>
    </tr>
    <!-- YouTube Embed -->
    <tr class="platform-start">
      <td rowspan="4" class="platform-title">YouTube Embed</td>
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
    <tr>
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Mapped to YouTube <code>onStateChange</code> events</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Relays all events to parent window through wrapper</td>
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
      <td>Direct video element DOM event listeners fire cleanly</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Syncs playback state via MediaSession</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Standard event stream forwarded to parent</td>
    </tr>
    <!-- Spotify Web Player -->
    <tr class="platform-start">
      <td rowspan="4" class="platform-title">Spotify Web Player</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Direct HTML5 DOM events are unsupported</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Updates track title & artist metadata cleanly</td>
    </tr>
    <tr>
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td>Listens to <code>player_state_changed</code> in Spotify SDK</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td>Synchronizes playback progress, duration and metadata</td>
    </tr>
    <!-- SoundCloud Widget -->
    <tr class="platform-start">
      <td rowspan="4" class="platform-title">SoundCloud Widget</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Underlying <code>&lt;audio&gt;</code> DOM events fire instantly</td>
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
    <tr>
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="na"></td>
      <td>Hooks <code>SC.Widget.Events.PLAY</code>, <code>FINISH</code>, <code>PLAY_PROGRESS</code></td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Transmits real-time progress events to parent window</td>
    </tr>
    <!-- Dailymotion Player -->
    <tr class="platform-start">
      <td rowspan="4" class="platform-title">Dailymotion Player</td>
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
    <tr>
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="ok"></td>
      <td>Wrapped via Dailymotion Player SDK</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Full command stream forwarded via SRemote client</td>
    </tr>
  </tbody>
</table>
</div>

---

## ⏭️ Next Step
Proceed to **[03. SRemote Wrapper Integration](./03-wrapper-integration.md)**.

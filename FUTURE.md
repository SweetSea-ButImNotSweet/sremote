# 🔮 Future of SRemote

This document outlines the evolutionary ideas, architectural vision, and roadmap milestones for the SRemote monorepo ecosystem (`@sremote/sdk`, `@sremote/ready2use`, `@sremote/userscript`, and future packages).

> 💡 **Core Philosophy**: Prioritize developer ergonomics (DX), bulletproof cross-origin security & UX clarity, rigorous end-to-end testing, and progressive desktop webview unification before stepping into competitive enterprise showcases.

---

## 🏗️ Version 4.0 — Unified Fluent Architecture, Smart Ready2Use & Permission Prompt Revamp

Version 4.0 is a milestone architectural overhaul that synchronizes developer ergonomics across the entire SDK, modernizes driver execution, and cleans up user permission UX.

### 1. Fluent Multi-Instance & Polymorphic Selector
- [ ] **Polymorphic Scoped Selector Syntax**:
  - Allow `sremote(...)` to seamlessly accept any target: a CSS selector string (`'#my-iframe'`), a direct DOM element reference (`HTMLIFrameElement` / `HTMLMediaElement`), or an existing `instanceId` string:
    ```javascript
    sremote(document.querySelector('iframe')).play();
    sremote('#my-iframe').seek(10);
    sremote('instance_slot_1').volume(0.8);
    ```
  - Automatically infer or assign a tracking `instanceId` under the hood if an HTML element without an ID is passed.
  - Calling without a selector (`sremote().play()`) targets the active/default player or broadcasts across registered instances.
- [ ] **Promise-like Pipeline Queue (Fluent Chaining)**:
  - Asynchronous chaining without cluttering code with multiple `await` statements:
    ```javascript
    await sremote('#hero-video').play().seek(10).volume(0.8);
    ```
  - Internal command queue with automatic microtask dispatch and flush.
- [ ] **Deprecate Legacy Trailing Arguments**:
  - Drop trailing `instanceId` arguments (`remote.play('id')` ➔ `remote('id').play()`) to eliminate API ambiguity.

### 2. Unified Driver Pipeline & Platform-Aware Caching
- [x] **Unified Driver Interface**:
  - Standardize all drivers to implement a single execution contract:
    ```javascript
    driver.execute(actionName, payload, context)
    ```
  - Eliminate brittle argument-sniffing heuristics (`args[0]` vs `args[1]`).
- [x] **Lazy Driver Resolution**:
  - Resolve the underlying driver (Adapter vs. Bridge vs. MediaSession vs. DOM) lazily on the first executed command rather than blocking synchronous initialization.
- [x] **Platform-Aware Driver Caching**:
  - Cache the resolved driver tagged with platform metadata (e.g., `platform: 'youtube'`) for instant 0ms subsequent dispatch.
  - Automatic cache invalidation when target elements detach, remount, or navigate to another media source.
- [ ] **Micro-Kernel Protocol Envelope & Pure Transport Layer**:
  - Completely decouple physical communication (`MessagePort` delivery) from business logic (Permissions, Media RPC, Command Queue).
  - Standardize all cross-origin packets into an immutable envelope contract: `{ id, type: 'RPC'|'EVENT'|'HANDSHAKE', action, payload, meta }`.
  - Eliminate recursive DOM scanning (`root.querySelectorAll('iframe')`) by indexing source ports directly.
- [x] **Zero-Dependency Hierarchical FSM Engine (`@sremote/shared`)**:
  - Build an ultra-lightweight (~50 LoC) State Machine engine with deterministic transitions and transition listeners.
  - Implement a **Hierarchical State Tree**:
    - Root Transport State: `DISCONNECTED` ➔ `CONNECTING` ➔ `CONNECTED` ➔ `TERMINATED`.
    - Nested Media State (Active only when `CONNECTED`): `NO_MEDIA` (idle / detached) ⇄ `HAS_MEDIA` (`READY` / `PLAYING` / `PAUSED` / `ENDED`).
  - Eliminate race conditions, ghost states, and disconnected listener leaks permanently during rapid in-place video swaps.
- [ ] **MutationObserver & rVFC Media Liveness (Zero Timer Polling)**:
  - Eliminate all battery-draining `setInterval` polling loops (`huntTimer`, `checkActiveMediaLiveness`, fake `timeupdateTimer`).
  - Use scoped `MutationObserver` for instant, event-driven video element discovery and replacement.
  - Leverage `HTMLVideoElement.requestVideoFrameCallback()` (rVFC) for rock-solid, 60fps frame-accurate progress tracking without CPU-wasting timers.

### 3. SRemote SDK & Ready2Use Bridge Binding
- [ ] **Direct Fluent Instance Binding**:
  - Both `.mount(target, opts)` and `.create(opts)` from `@sremote/ready2use` immediately return a chainable, active Fluent instance managed by the SDK.
- [x] **Standardize Bridge Driver & Registration Interface**:
  - Standardized the bridge adapter registration interface so any custom adapter or ready2use provider plugs directly into the Driver Pipeline without `window.sremote` polling.
  - Eliminated `window.sremote` hijacking by userscript; unified discovery via `Symbol.for('__sremote_native_driver__')` and reactive event `sremote:driver:ready`.

### 4. Userscript Permission Dialog Overhaul
- [ ] **Fix "Always Allow" Logic Bug**:
  - Clarify and cleanly isolate permission scopes: current session vs. domain-level permanent allowance. Fix the bug where "Always Allow" gets confused across distinct frames/origins.
- [ ] **Modernized, Clean Modal UI**:
  - Redesign the consent prompt modal to reduce clutter, improve visual hierarchy, and make permissions transparent and easy to understand for end-users.

---

## 🎨 Version 4.1 — Tri-Dialect Event System & Next-Gen Ready2Use Overhaul

Version 4.1 focuses on expressive developer experience, stylized playback events, and a complete architectural revamp of `@sremote/ready2use`.

### 1. Next-Gen Ready2Use (Dynamic Factory, Lifecycle & Media Swapping)
- [ ] **Smart URL Creator with Lazy Dynamic Imports (`ready2use.create(url)`)**:
  - Universal media factory resolving URLs via pattern matching and dynamically loading only the matching provider (`() => import('./providers/youtube.js')`), preventing bundle bloat:
    ```javascript
    const player = await ready2use.create('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '#box');
    await player.play().seek(15).volume(0.9);
    ```
- [ ] **Comprehensive Provider Lifecycle Events**:
  - Emit explicit lifecycle transitions: `provider:loading` ➔ `provider:ready` (or `provider:error` with detailed CDN/timeout diagnostics) allowing host apps to display custom loading skeletons or retry UI.
- [ ] **Smart In-Place Media Swapping**:
  - When playing a playlist in the same slot:
    - If the platform remains the same and supports native track switching, invoke the provider's in-place load API (e.g. `loadVideoById`).
    - If cross-platform or missing in-place APIs, automatically tear down the underlying player and remount the new platform DOM node while **preserving the parent `instanceId` and Fluent handle intact**.
- [ ] **Zero-Opinion Bare DOM Styling**:
  - Ready2Use embeds pure, unopinionated iframes without forced CSS containers or hardcoded aspect-ratio wrappers, granting developers 100% styling autonomy.
- [ ] **Subpath Exports & Granular Tree-Shaking**:
  - Support granular imports for single-provider consumption:
    ```javascript
    import { youtube } from '@sremote/ready2use/youtube';
    ```

### 2. Tri-Dialect Event System (HTML5, SRemote & Vivid BAD SQUAD Presets)

- [ ] **Zero-Config Multi-Alias Dispatch**:
  - Support seamless event naming across classic HTML5, clear modern Semantic labels, and a stylized street-music **Vivid BAD SQUAD** dialect:

| State / Meaning | 1. Classic HTML5 | 2. SRemote Semantic | 3. Vivid BAD SQUAD Dialect 🎤🔥 |
| :--- | :--- | :--- | :--- |
| **Bắt đầu phát** | `play` / `playing` | `play` | `drop` |
| **Tạm dừng** | `pause` | `pause` | `break` |
| **Bắt đầu tua** | `seeking` | `seek:start` | `scratch` |
| **Tua hoàn tất** | `seeked` | `seek:end` | `land` |
| **Sẵn sàng phát** | `canplay` / `canplaythrough` | `ready` | `standby` |
| **Đang đệm / Lag** | `waiting` / `stalled` | `buffering` | `catch-breath` |
| **Tiến trình thời gian** | `timeupdate` | `progress` | `beat` |
| **Kết thúc bài** | `ended` | `finish` | `complete` |
| **Gặp lỗi** | `error` | `error` | `crash` |
| **Chỉnh âm lượng** | `volumechange` | `volume` | `gain` |
| **Tốc độ phát** | `ratechange` | `speed` | `tempo` |
| **Bắt đầu nạp bài** | `loadstart` | `load` | `cue` |
| **Đọc xong metadata** | `loadedmetadata` | `metadata` | `track-info` |
| **Tải gói đệm mạng** | `progress` | `buffer:update` | `preload` |
| **Reset bộ đệm** | `emptied` | `reset` | `clear` |

- [ ] **Configurable Event Dialect**:
  - Configurable via `createSRemote({ eventDialect: 'html5' | 'sremote' | 'vivid' })`, defaulting to `'html5'` for standard HTML5 media compatibility.

---

## 🎛️ Version 4.2 — Deep Media Inspection & Advanced Playback Capabilities

Elevate SRemote's API coverage to 100% parity with HTML5 MediaElement specifications and professional web players:

- [ ] **Multi-Segment Buffered & Seekable TimeRanges**:
  - `bufferedRanges()`: Parse native `TimeRanges` into serializable segments `[{ start, end }]` allowing developers to render segmented buffer bars accurately on custom UI.
  - `seekableRanges()`: Expose sliding seekable windows critical for Live Stream time-shifting (HLS / DASH).
- [ ] **Cross-Origin Fullscreen Orchestration**:
  - `requestFullscreen(target)` / `exitFullscreen()` / `isFullscreen()` bypassing iframe sandbox restrictions (`allow="fullscreen"`).
- [ ] **Live Stream Detection & Live-Edge Catchup**:
  - `isLive()` / `seekToLive()`: Automatically detect continuous streams (duration = `Infinity` or live stream signatures) and provide a one-click method to jump straight to the live edge.
- [ ] **Deep Playback Diagnostics & Stall Sensing**:
  - Expose `isBuffering`, `isStalled`, `readyState`, and `networkState` across all drivers.
  - Detect browser Autoplay Policy rejection, enabling host applications to prompt users with a clean *"Click to unmute / play"* fallback banner.
- [ ] **Video Frame Metrics & Dimension Sensing**:
  - Dynamically read `videoWidth`, `videoHeight`, and computed `aspectRatio` directly from active video frames to allow responsive layout auto-fitting on the host page.

---

## 🧪 Version 5.x – 6.x — Real-World E2E Test Suite & Comprehensive Documentation Audit

Ensure rock-solid stability and top-tier developer documentation before venturing onto desktop platforms.

- [ ] **Playwright Cross-Origin E2E Test Suite**:
  - Real browser automation running distinct origins (e.g. `http://localhost:3000` parenting `http://127.0.0.1:8080`).
  - Automated testing for `postMessage` handshakes, `MessagePort` lifecycle, disconnect recovery, and event emission without brittle mocks.
- [ ] **Provider Regression Suite**:
  - Continuous smoke testing against third-party player embeds to catch DOM/API changes from platforms early.
- [ ] **Full Documentation Audit & Polish**:
  - Systematically review, update, and align all multilingual guides, API references, recipes, and live demo sandboxes.

---

## 🖥️ Version 6.0 — Dedicated Desktop Environment (`@sremote/desktop`)

Expand SRemote beyond browser tabs into hybrid desktop applications.

- [ ] **`@sremote/desktop` Package**:
  - Dedicated helpers and adapters for desktop webview containers:
    - **Electron**: Interceptors and preload scripts leveraging `webContents.executeJavaScript` / `session.webRequest` to bypass CORS and iframe barriers natively.
    - **Tauri**: IPC bridge leveraging custom Webview windows and native event emitters.
- [ ] **Starter Templates & Recipes**:
  - Ready-to-use desktop dashboard examples managing multi-stream media playback.

---

## 🌐 Version 7.0 — B2B Expansion & Full Social Media Sweep

Complete broad-spectrum platform coverage and prepare for enterprise integrations.

- [ ] **Remaining Social & Media Platforms**:
  - Sweep and integrate remaining media platforms and specialized video players (e.g. niche streaming services, podcast networks, enterprise video hosts).
- [ ] **B2B & White-label Integration Tooling**:
  - Enhanced compliance, enterprise custom branding hooks for permission prompts, and headless configurations for business embeds.

---

## 🏆 Post-7.0 (v7.1+) — Innovation Contests, Commercial Outreach & Monetization

Once the platform is battle-tested, fully documented, and proven across web & desktop:

- [ ] **Science & Tech Innovation Competitions (Cuộc thi Sáng tạo KHCN)**:
  - Prepare technical solution dossier & presentation highlighting SRemote's cross-origin media coordination architecture (SOP handling, FSM MessagePort transport, Selective Event Fallback, accessibility & educational impact).
  - Submit SRemote to regional and national Science & Technology Innovation competitions.
- [ ] **Outreach & Client Acquisition**:
  - Actively pitch and onboard prospective enterprise clients, e-learning platforms, and accessibility software creators.
- [ ] **Open Source Sponsorship & Donation Channels**:
  - **Individual Backers**: GitHub Sponsors, Buy Me a Coffee, Ko-fi, and local payment methods (Momo / VNPay).
  - **Corporate & Open Collective**: Open Collective and Polar.sh for organizational grants and sponsorships.

---

## 🚀 Version 8.0 — Official Web Extension Companion

Graduate from userscript-only bridging to an official, store-distributed browser extension.

- [ ] **Manifest V3 Extension Package (Chrome Web Store & Firefox Add-ons)**:
  - One-click install for mainstream users without requiring Tampermonkey or Violentmonkey.
  - Native communication bridge using `externally_connectable` / extension messaging for enhanced security and tighter browser integration.

---

## 🎮 Side Quest / Satellite Projects

Independent applications and demo vessels in the ecosystem that fuel SRemote's development and serve as real-world origin stories:

- [ ] **Flagship Showcase & Origin Backstory (PJSK Music Player)**:
  - **Algorithm & Asset Adapter Update**: Refresh indexing and parser algorithms to adapt to the new `sekai.best` filesystem structure.
  - **Copyright & Compliance Hardening**: Strip proprietary internal assets and hide sensitive audio extraction/playback features to ensure strict copyright compliance for public competitions and showcases.
  - **Live Proof of Concept**: Serve as the flagship demonstration app proving SRemote's real-world power to sync and control third-party media embeds seamlessly.

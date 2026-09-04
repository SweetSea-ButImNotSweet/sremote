# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-09-03

SRemote v2.1.0 is a major feature and stabilization update. This release massively expands platform compatibility in `@sremote/ready2use` by introducing 7 brand new providers, completely revamps the Facebook Video integration, optimizes core player lifecycle architecture, and patches several critical runtime and memory leak bugs.

### 🚀 Added

- **7 New Platform Providers (`@sremote/ready2use`)**:
  - **Twitter / X (`twitter`)**: Programmatically render and control embedded tweet videos using the official Twitter Widgets JS SDK (`platform.twitter.com/widgets.js`).
  - **PeerTube (`peertube`)**: Added native two-way remote control support for decentralized PeerTube instances via `@peertube/embed-api` (`play`, `pause`, `seek`, `volume`, `rate`, and state synchronization).
  - **Rumble (`rumble`)**: Zero-config auto-discovery and playback integration for embedded HTML5 videos (`rumble.com/embed/...`).
  - **Kick (`kick`)**: Native out-of-the-box live stream player support (`player.kick.com/...`).
  - **Streamable (`streamable`)**: Seamless HTML5 playback control for embedded video clips (`streamable.com/e/...`).
  - **Odysee / LBRY (`odysee`)**: Integrated playback control for decentralized video embeds (`odysee.com/$/embed/...`).
  - **Bandcamp (`bandcamp`)**: Support for Bandcamp embedded music player widgets with dynamic album and track loading capabilities.
- **Non-Mutating Adapter Pipeline (`@sremote/shared`)**:
  - Introduced `wrapCustomAdapter` in `@sremote/shared` to standardize custom adapter registration across Userscript, Wrapper (`DomDriver`), and Ready2use ecosystems.
  - Safely wraps user-provided adapter objects via `Object.create` without mutating original instances or overwriting native `emit` methods, while automatically injecting fallback `toggle()` implementations and evaluating capabilities.
- **Architectural Upgrades (`BaseProvider`)**:
  - **Unified Pipeline (`_instantiate`)**: Consolidated player creation and mounting logic to prevent DOM desynchronization.
  - **Automatic Capabilities & Fallbacks**: Adapters now automatically derive fallback `toggle()` methods (if `play` and `pause` exist) and auto-detect capability flags.
  - **Automatic Remote Teardown**: Teardown handlers (`destroy()`) now cleanly unregister the adapter from the active SRemote instance registry (`remote.adapters.unregister`).
  - **DOM Readiness Utility**: Added `waitForIframeLoad` helper with configurable timeout handling to ensure embedded frames are ready before handshake negotiation.
- **Documentation & Recipes**:
  - Interactive recipes showcase for all 7 new platforms (Vanilla JS and `@sremote/wrapper` SDK).
  - Bilingual localization (i18n) for recipe comments, tooltips, and platform descriptions.

### 🔄 Changed

- **Facebook Video Player Revamp**:
  - Replaced static iframe embedding with full **Facebook JavaScript SDK (`connect.facebook.net/en_US/sdk.js`)** integration.
  - Subscribes to `xfbml.ready` events to bind the underlying player controller to SRemote Adapter interfaces (`play`, `pause`, `seek`, `volume`, `mute`, and real-time playback state updates).
- **Dailymotion SDK URL Migration**: Updated Dailymotion embed recipes to load the new SDK CDN endpoint at `https://geo.dailymotion.com/libs/player.js`.
- **Tooling & Dependencies**:
  - Monorepo package versions synchronized to `v2.1.0`.
  - ESLint Flat Config updated to ignore `tarballs/**` and `**/dist/**`.
  - Knip configuration streamlined.
  - Bumped dependencies: RollDown (`1.2.7`), Knip (`6.34.0`), Zod (`4.5.4`).

### 🐛 Fixed

- **Early MutationObserver & Closed Shadow DOM Media Hunting**:
  - Initialized `MutationObserver` and constructor hooks (`attachShadow`, `new Audio()`, `Document.prototype.createElement`) immediately on early script execution (`document-start`) instead of deferring until `DOMContentLoaded` or handshake negotiation.
  - Hooked `Element.prototype.attachShadow` to capture both open and closed ShadowRoots, enabling recursive hunting of dynamically rendered and web-component-encapsulated media elements (e.g., Apple Music Player, Custom Web Players).
- **Mute State & Previous Volume Retention**:
  - Fixed an issue in `createUniversalAdapter`, `executeAdapterAction`, and `BaseMediaProvider` where muting failed to store the previous volume level, preventing audio from being properly restored upon un-muting.
  - Automatically discard mute state (`muted: false`) whenever a new non-zero volume is explicitly set across all adapter runners and HTML5 controller drivers.
- **Spotify Provider `ReferenceError`**: Fixed a critical bug in `playback_update` event listener where an undeclared `currentTime` variable was referenced directly, causing runtime crashes.
- **Dummy Instance Guard in `resolveSRemote`**: Fixed an issue where providers could bind to placeholder dummy objects by verifying `!window.sremote.isDummy`, checking `!globalThis.sremote.isDummy`, and prioritizing `Symbol.for('__sremote_client__')`.
- **Memory Leaks on Teardown**: Added dedicated `destroy()` hooks to **TikTok**, **NicoNico**, and **YouTube** adapters to properly detach `window` message listeners (`removeEventListener`) and clear active `timeupdate` intervals.
- **Bilibili Video ID Extraction**: Resolved regex edge-cases when passing nested option objects, raw `BV`/`av` strings, or full `bilibili.com` URLs to ensure proper parameter serialization.
- **Vimeo oEmbed Restrictions**: Replaced implicit SDK DOM wrapping with direct `<iframe>` element generation (`autoplay`, `muted`, `loop`, `api=1`) alongside timeout race conditions to prevent mounting hangs.
- **Defensive SoundCloud Teardown**: Added safety checks for `SC.Widget.Events` before unbinding widget listeners on `destroy()`, avoiding uncaught errors during early component unmounting.
- **Custom Container Mounting**: Fixed element detachment and duplication issues when providing custom `container` targets in **YouTube**, **Dailymotion**, and **Spotify** providers.

### ⚠️ Removed & Breaking API Cleanups

To streamline the API surface, eliminate redundant aliases, and improve TypeScript type safety, several legacy and duplicate APIs have been removed:

- **Redundant Aliases on `SRemoteClient` / `sremote`**:
  - `sremote.rate()` and `sremote.playbackRate()` (standardized to `sremote.speed()`).
  - `sremote.getCapabilities()` (standardized to `sremote.capabilities()` and `sremote.instances.capabilities()`).
  - `sremote.useAdapter()` / `sremote.removeAdapter()` / `sremote.getCustomAdapter()` (standardized under `sremote.adapters.*`: `register`, `unregister`, `get`).
  - `sremote.promptUserscript()` (standardized to `sremote.showInstallModal()`).
  - `sremote.adapters.set()` (standardized to `sremote.adapters.register()`).
- **Factory & Module Export Cleanups**:
  - Deprecated `createSRemoteClient` alias (standardized to `createSRemote`).
  - Removed re-export of `lockGlobalSRemoteIfAbsent` and `promptUserscript` from `@sremote/wrapper`.
- **Removed Experimental Features**:
  - `sremote.bindMediaSession`: The manual `bindMediaSession()` method has been removed because SRemote now **automatically binds and manages the native `navigator.mediaSession`** whenever supported. Developers only need to use `bindMetadata()` to feed custom track metadata.
  - Internal unused `getMediaPort` from iframe handshake agent.

---

## [2.0.0] - 2026-08-20

- Initial major release of SRemote monorepo architecture.
- Core userscript frame controller & `@sremote/wrapper` SDK.
- Ready2Use providers for YouTube, Spotify, Soundcloud, Vimeo, Bilibili, TikTok, Twitch, Dailymotion, Niconico.

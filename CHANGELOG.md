# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.0] - Unreleased

SRemote v3.0.0 is a major architecture overhaul, unification, and feature release. This release introduces a unified API schema and factory builder across the entire monorepo (`@sremote/shared`), massively expands platform compatibility in `@sremote/ready2use` up to **22 supported platforms**, transitions completely to modern Pure ESM, revamps the Facebook/Instagram/Threads/Apple Music pipelines, provides full seeking/seeked event coverage, replaces crude DOM ownership claiming with selective handled events fallback for 100% reliable event emission without duplicates, and delivers centralized parent adapter logging along with critical runtime fixes.

### 🚀 Added & Enhanced

- **Unified Adapter Event Logging to Parent / Top Window (`@sremote/shared`, `@sremote/userscript`)**:
  - **Parent Context Event Visibility**: Shifted adapter event debug logging from isolated iframe contexts directly to the `parent` (`top`) window. Developers can now view all incoming adapter events directly in the main browser console under `[SRemote:event]` (`Adapter emit [instanceId] (source) -> <event>`) when log level is set to `3` (`DEBUG`).
  - **Enhanced Message Relay**: Enriched handshake port relay (`packages/userscript/src/parent/handshake.js`) to attach `source` and `mediaType` metadata on all forwarded adapter events.

- **Selective Handled Events Fallback & Deduplication (`@sremote/ready2use`, `@sremote/shared`, `@sremote/wrapper`, `@sremote/userscript`)**:
  - **Replaced Hard Claiming**: Completely eliminated crude blocking attributes `data-sremote-claimed`, `data-sremote-ignore-events`, and internal symbols `__sremote_claimed__` & `__sremote_ignore_events__`.
  - **Selective Deduplication via `handledEvents`**: Player elements created by `@sremote/ready2use` or custom adapters no longer suppress all DOM events. Instead, SRemote intelligently checks `handledEvents` and dynamic adapter emissions (`adapter.emit`), allowing natural media events (such as `timeupdate`, `volumechange`, `seeking`) to fall through seamlessly without ever emitting duplicate events.
  - **Cleaned Up DOM Listeners**: Removed hard-block guards from `bindMediaEvents` (`@sremote/shared`), `DomDriver.trackMediaElement` (`@sremote/wrapper`), and `isElementClaimed` (`@sremote/userscript`).

- **Unified Hierarchical Logging System (`@sremote/shared`, `@sremote/wrapper`, `@sremote/userscript`)**:
  - **Logger Factory & Scoped Channels (`createLogger`)**: Standardized scoped loggers with colored namespace headers (`[SRemote:wrapper]`, `[SRemote:userscript]`, etc.) and zero runtime performance cost via short-circuited no-op functions when logging levels are not met.
  - **Hierarchical Log Level Resolution (`LOG_LEVELS`)**: Supports `-1` (Inherit), `0` (Silent), `1` (Error/Warn), `2` (Info), and `3` (Debug). Global overrides from developer console (`window.__sremote_log_level__`, `globalThis[Symbol.for('__sremote_log_level__')]`) or persistent storage (`sremote:log_level`) seamlessly take precedence over web application options if set to anything other than `-1`.
  - **Client Configuration Options**: Added `logLevel` (`number`) and `debug` (`boolean`) options to `createSRemote()` / `SRemoteClient` in `@sremote/wrapper`.
  - **Dynamic Level Checking**: Logger dynamically evaluates effective log levels at runtime so adjustments in browser DevTools or storage take effect immediately without requiring a page refresh.

- **Event Seeking & Seeked Ecosystem (`@sremote/ready2use`)**:
  - **YouTube Provider**: Added complete support for `seeking` and `seeked` events across both programmatic seek calls (`seek()`, `seekTo()`) and native player UI scrubbing (automatic scrubber jump detection `> 1.5s`).
  - Added missing lifecycle and state change events to YouTube provider: `buffering` (`onStateChange === 3`), `ratechange` (`onPlaybackRateChange`), and `volumechange` (`setVolume()`, `setMuted()`).
  - **Vimeo Provider**: Added `player.on('seeking')` event forwarding, `playbackratechange` (`ratechange`), and `bufferstart`/`bufferend` (`buffering`/`buffered`).
  - **SoundCloud Provider**: Added `seeking` event emission on `seek()`/`seekTo()` and `volumechange` on volume/mute adjustments.
  - **Dailymotion Provider**: Added `seeking` event emission, support for `events.PLAYER_SEEKING`, and `events.PLAYER_BUFFERING` (`buffering`).
  - **Spotify Provider**: Added seek tracking with `seeking` and `seeked` emission on playback position updates.
  - **Twitch Provider**: Added `seeking`, `seeked`, and `volumechange` event emissions.
  - **Apple MusicKit JS & PeerTube Providers**: Added `seeking`, `seeked`, `volumechange`, and `ratechange` event emissions.
- **Event Deduplication & DOM Ownership Claiming (`@sremote/ready2use`, `@sremote/userscript`, `@sremote/wrapper`)**:
  - **Ownership Claim on Creation (`BaseProvider`)**: `_instantiate()` and `applyElementAttributes()` now automatically mark player DOM elements (`targetElement`, `iframe`) with ownership attributes: `data-sremote-claimed="true"`, `data-sremote-ignore-events="true"`, `data-sremote-id`, and internal Symbols (`__sremote_claimed__`, `__sremote_ignore_events__`, `__sremote_adapter__`).
  - **Auto-Registration in `create()`**: `BaseProvider.create()` now automatically resolves and registers newly instantiated adapters with SRemote (`remote.adapters.register`) unless explicitly disabled via `opts.register = false` / `opts.autoRegister = false`.
  - **DOM Tracker Event Deduplication (`@sremote/userscript`)**: Updated `top-media.js` to skip tracking elements claimed by adapters (`isElementClaimed`). Added runtime suppression (`suppressMediaElement`) and auto-untracking when adapters are registered via `adapters.register()`.
  - **DOM Driver Event Deduplication (`@sremote/wrapper`)**: Updated `DomDriver.trackMediaElement` to ignore elements marked with `data-sremote-claimed` or `data-sremote-ignore-events`.
  - **Shared Event Binder Protection (`@sremote/shared`)**: `bindMediaEvents` automatically skips binding if elements specify `data-sremote-ignore-events="true"`.

- **Selective Event Fallback for Custom Adapters (`@sremote/shared`, `@sremote/wrapper`)**:
  - `wrapCustomAdapter` now automatically inspects if the adapter wraps a native `HTMLMediaElement` (`mediaElement` or `element`).
  - Automatically binds a non-intrusive fallback DOM listener (`allowFallback: true`) only for events that the adapter does not explicitly handle or emit (`handledEvents`).
  - Automatically detects when an adapter dynamically calls `adapter.emit()` and suppresses the corresponding fallback listener to guarantee 0% duplicate event emission.
  - Enhanced `bindMediaEvents` to accept `excludedEvents` and `allowFallback` options.
  - Attached `mediaElement` reference in `createUniversalAdapter` to natively benefit from selective fallback.

- **Unified API Architecture (`@sremote/shared`)**:
  - **`API_SPEC` (`packages/shared/src/api/schema.js`)**: Single source of truth for all root playback methods, argument schemas, action dispatch mappings, and sub-namespaces (`instances`, `adapters`, `rpc`, `css`).
  - **`buildSRemoteApi` (`packages/shared/src/api/builder.js`)**: Universal API factory generating standardized, immutable (`Object.freeze`) SRemote API objects with automated argument parsing, action forwarding, event manager hookup, and lifecycle binding.
- **Shared Instance Manager Architecture (`@sremote/shared`)**:
  - Extracted core instance management and lifecycle tracking into `@sremote/shared` via `createInstanceManager`.
  - Enables unified instance state tracking, adapter registration (`wrapCustomAdapter`), active instance detection, exclusivity management (`exclusiveMode: 'auto'`), and custom signal notifications across both `@sremote/userscript` and `@sremote/wrapper`.
  - Added lightweight top-level DOM media tracking in Userscript (`setupTopMediaTracker`), with zero native prototype overrides, controlled via `hello({ trackParent: true })` (defaults to `false`). Includes `timeupdate` throttling, microtask batching for `MutationObserver`, and non-blocking initial scans.
  - Added centralized media validation utilities in `@sremote/shared`: `isValidMediaElement` (filters detached DOM and tracking/beacon video elements `< 32x32`) and `hasMediaSource` (verifies media attachment), applied across both top-level parent tracker and iframe media hunter.
  - Refactored `@sremote/wrapper`'s `DomDriver` to directly leverage `createInstanceManager` from `@sremote/shared`, eliminating duplicate adapter state storage, event busses, and exclusivity logic.
  - Enhanced `createInstanceManager` with unified `on` / `off` event subscriptions, `getCustomAdapter` query helper, and automatic adapter-level pause coordination in `pauseOthersExcept` (including direct pause execution for top-level DOM media elements).
- **Public API Documentation & Types Auditor**:
  - Introduced `scripts/check-api-docs.js` (`npm run check:docs`) to automatically audit public API surface methods, namespaces, action constants, and configuration options against `.d.ts` type definitions and documentation files.
- **Unified Playback Speed Naming Cleanup**:
  - Standardized `SREMOTE_ACTIONS.SPEED = 'speed'` and cleaned up all internal legacy `rate` / `playbackRate` action switch branches in `controller.js` and `adapter-runner.js`.
- **New Platform Providers (`@sremote/ready2use`)**:
  - **Apple MusicKit JS (`applemusickit`)**: Full-featured player and SRemote adapter powered by Apple's official MusicKit JS v3 SDK (`play`, `pause`, `toggle`, `seek`, `seekTo`, `volume`, `mute`, `next`, `previous`, `setQueue`, and real-time event tracking).
  - **Apple Music Embed (`applemusic`)**: Zero-token Iframe widget embed (`embed.music.apple.com/...`) for quick preview playback of songs, albums, and playlists.
  - **Instagram (`instagram`)**: View-only embed provider for Instagram Posts and Reels via `instagram.com/embed.js`.
  - **Threads (`threads`)**: View-only embed provider for Threads posts and video embeds via `threads.net/embed.js`.
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
  - Interactive recipes showcase for all newly added platforms (Vanilla JS and `@sremote/wrapper` SDK).
  - Bilingual localization (i18n) for recipe comments, tooltips, and platform descriptions.
  - Reorganized documentation structure: separated end-user userscript guide into `packages/userscript/README.md` and streamlined root `README.md` for web developers.
  - Enhanced shared navigation `<sremote-header>` with quick access to userscript docs and NPM packages (`@sremote/wrapper`, `@sremote/ready2use`).

### 🔄 Changed

- **Userscript Parent API Refactoring (`@sremote/userscript`)**:
  - Refactored `createExportedApi` in `packages/userscript/src/parent/api.js` to build `window.sremote` directly via `buildSRemoteApi`, removing redundant manual method declarations.
  - Aligned API method aliases (`rate`, `playbackRate`, `speed`) across environments.
- **Pure ESM Transition (Dropped CommonJS / CJS)**:
  - Dropped legacy CommonJS build targets (`.cjs`) across `@sremote/wrapper` and `@sremote/ready2use` packages in favor of modern **Pure ESM (`.mjs`)** and standalone browser bundles (`.global.js`).
  - Streamlined `package.json` export maps (`"exports": { ".": { "import": "./dist/index.mjs" } }`), reducing published package footprints and preventing dual-package hazard.
- **Facebook Video, Reels & Watch Revamp**:
  - Replaced static iframe embedding with full **Facebook JavaScript SDK (`connect.facebook.net/en_US/sdk.js`)** integration.
  - Added URL normalization supporting standard videos, Facebook Watch (`/watch/?v=...`), Facebook Reels (`/reel/...`), and `fb.watch` shortlinks.
  - Subscribes to `xfbml.ready` events to bind the underlying player controller to SRemote Adapter interfaces (`play`, `pause`, `seek`, `volume`, `mute`, and real-time playback state updates).
- **Dailymotion SDK URL Migration**: Updated Dailymotion embed recipes to load the new SDK CDN endpoint at `https://geo.dailymotion.com/libs/player.js`.
- **Tooling, Types & Dependencies**:
  - **Module-First TypeScript Definitions**: Cleaned up all `.d.ts` files across published packages (`@sremote/wrapper`, `@sremote/ready2use`, `@sremote/shared`) to only export explicit ESM types without polluting the global `Window` interface.
  - Monorepo package versions synchronized to `v3.0.0`.
  - ESLint Flat Config updated to ignore `tarballs/**` and `**/dist/**`.
  - Cleaned up unused variables, parameters, and imports.
  - Bumped dependencies: RollDown (`1.2.7`), Knip (`6.34.0`), Zod (`4.5.4`).

### 🗑️ Removed

- **CommonJS Support (`index.cjs`)**: Completely dropped legacy CJS output bundles across all published NPM packages. All consumers must use ES Modules (`import`) or direct script inclusion.

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
- **Top DOM Media Tracking Performance & Race Condition Fixes**:
  - Throttled high-frequency `timeupdate` events (~250ms) in `setupTopMediaTracker` to prevent layout thrashing and event flood.
  - Batched `MutationObserver` callbacks into microtasks (`Promise.resolve`) and guarded subtree queries with `childElementCount > 0` to eliminate main-thread stutter on dynamic pages.
  - Resolved active instance shadowing race condition by properly calling `setCurrentActiveInstanceId()` rather than mutating the getter.
  - Fixed exclusive mode (`exclusiveMode: 'auto'`) to properly pause top-level media elements without ports via `mediaElement.pause()`.
  - Filtered detached and miniature tracking/beacon elements (`< 32x32`), and guarded against commands dispatched to elements without media sources attached.
- **Single Mode Active Instance Routing & Custom Adapter Dispatching**:
  - **Prioritized Parent Custom Adapters in Single Mode (`@sremote/shared`)**: Refactored `getLatestActiveInstanceId()` in `instance-manager.js` so that when Single Mode is active (`multiMode = false`), registered parent custom adapters (`parentAdaptersMap`) strictly take precedence over `currentActiveInstanceId`.
  - **Iframe Message Port Active Instance Hijacking Protection (`@sremote/userscript`)**: Prevented incoming iframe heartbeat and message-channel events (`ping`, `timeupdate`, etc.) in `handshake.js` from continuously overwriting `currentActiveInstanceId` when a parent custom adapter is registered.
  - **Top DOM Media Event Hijacking Protection (`@sremote/userscript`)**: Prevented `play` / `playing` events from top-level `<video>` / `<audio>` elements in `top-media.js` from stealing the active instance ID away from registered parent adapters in Single Mode.
  - **Command Dispatch & Action Fallback (`@sremote/userscript`)**: Hardened `dispatchCommand()` and `executeParentAdapterAction()` in `parent/index.js` to reliably route to the parent adapter when no explicit `instanceId` is supplied in Single Mode, preventing lost or misrouted playback commands.
  - **State & Capability Queries Resolution (`@sremote/userscript`)**: Updated `getStatus()`, `getCapabilities()`, and `getCustomAdapter()` in `parent/api.js` to immediately query and return state from registered custom adapters in Single Mode rather than querying empty or wrong iframe instances.
  - **DOM Driver Adapter Connectivity Detection (`@sremote/wrapper`)**: Enhanced `_findConnectedAdapter()` in `strategies/dom.js` to return the active custom adapter in Single Mode even if it does not wrap a native DOM element (e.g. YouTube IFrame API and SDK-driven players).
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

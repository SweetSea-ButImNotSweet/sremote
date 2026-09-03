import type { SRemoteCapabilities, SRemoteMediaState, SRemoteInstanceData, SRemoteEventPayload, SRemoteEventHandler, SRemoteActionName, SRemoteEventName } from '@sremote/shared';

export type { SRemoteCapabilities, SRemoteMediaState, SRemoteInstanceData, SRemoteEventPayload, SRemoteEventHandler, SRemoteActionName, SRemoteEventName };

export { SREMOTE_EVENTS, SREMOTE_ACTIONS, SREMOTE_STORAGE_KEYS, MEDIA_EVENTS } from '@sremote/shared';

/**
 * Configuration options for initializing the SRemote client SDK.
 */
export interface SRemoteClientOptions {
  /**
   * Whether to fallback to direct DOM query execution when the userscript is not available
   * (works only for same-origin iframes or media elements on the parent page).
   * @default true
   */
  fallbackToDom?: boolean;

  /**
   * Maximum wait time (in milliseconds) for detecting the SRemote userscript before resolving `.ready()`.
   * @default 2000
   */
  timeout?: number;

  /**
   * Domain passkey required if the parent website has enabled domain lock authorization.
   * @default null
   */
  passkey?: string | null;

  /**
   * Whether to treat the last ~0.8s before the end of media playback as the ended event.
   * @default false
   */
  treatAlmostEndAsEnd?: boolean;

  [key: string]: any;
}

/**
 * The current connection and control mode of the SRemote client.
 * - `'detecting'`: Probing whether the userscript or media elements exist.
 * - `'userscript'`: Connected to the full cross-domain SRemote userscript engine.
 * - `'dom-direct'`: Operating via direct DOM manipulation (same-origin fallback).
 * - `'unsupported'`: Userscript is missing and DOM fallback is unavailable.
 */
export type SRemoteClientMode = 'detecting' | 'userscript' | 'dom-direct' | 'unsupported';

/**
 * Connected media instance information item.
 */
export interface SRemoteInstanceInfo {
  instanceId: string;
  location: string;
  origin: string;
  note?: string;
  mediaType: string | null;
  state: SRemoteMediaState | null;
  capabilities?: SRemoteCapabilities | null;
  status: 'ready' | 'connecting' | 'disconnected' | string;
}

/**
 * Custom Adapter interface for wrapping proprietary or 3rd-party player SDKs
 * (e.g. YouTube Player API `YT.Player`, SoundCloud Widget SDK, Spotify Embed, Vimeo SDK, Video.js).
 */
export interface SRemoteCustomAdapter {
  name?: string;
  capabilities?: SRemoteCapabilities;
  play?: () => void | Promise<void>;
  pause?: () => void | Promise<void>;
  toggle?: () => void | Promise<void>;
  stop?: () => void | Promise<void>;
  seek?: (offset: number) => void | Promise<void>;
  seekTo?: (time: number) => void | Promise<void>;
  getCurrentTime?: () => number | Promise<number>;
  setCurrentTime?: (time: number) => void | Promise<void>;
  getDuration?: () => number | Promise<number>;
  getVolume?: () => number | Promise<number>;
  setVolume?: (vol: number) => void | Promise<void>;
  getMuted?: () => boolean | Promise<boolean>;
  setMuted?: (muted: boolean) => void | Promise<void>;
  getPlaybackRate?: () => number | Promise<number>;
  setPlaybackRate?: (rate: number) => void | Promise<void>;
  paused?: boolean | (() => boolean);
  pip?: (enable?: boolean) => void | Promise<void>;
  requestPip?: (enable?: boolean) => void | Promise<void>;
  setQuality?: (quality: string | number) => void | Promise<void>;
  getQualities?: () => string[] | Promise<string[]>;
  setSubtitle?: (sub: string | null) => void | Promise<void>;
  getSubtitles?: () => Array<{ id: string; label?: string; src?: string; lang?: string }> | Promise<any[]>;
  setShuffle?: (shuffle: boolean) => void | Promise<void>;
  setRepeat?: (mode: 'off' | 'all' | 'one' | boolean) => void | Promise<void>;
  next?: () => void | Promise<void>;
  previous?: () => void | Promise<void>;
  load?: (source: any) => void | Promise<void>;
  getState?: () => SRemoteMediaState | Promise<SRemoteMediaState>;
  emit?: (event: string, payload?: any) => void;
  [key: string]: any;
}

/**
 * Options for configuring a Universal Adapter instance.
 */
export interface UniversalAdapterOptions extends SRemoteCustomAdapter {}

/**
 * Factory to create an SRemote-compatible Universal Adapter.
 */
export declare function createUniversalAdapter(options?: UniversalAdapterOptions): SRemoteCustomAdapter;

/**
 * Options for `sremote.hello()` discovery broadcast.
 */
export interface SRemoteHelloOptions {
  multiMode?: boolean | null;
  treatAlmostEndAsEnd?: boolean;
  target?: Window;
  key?: string;
  css?: string;
  [key: string]: any;
}

/**
 * Options for configuring the Userscript Installation Guide Modal.
 */
export interface SRemoteInstallModalOptions {
  userscriptUrl?: string;
  title?: string;
  description?: string;
  autoDetect?: boolean;
  onClose?: (result?: { success: boolean }) => void;
  onSuccess?: () => void;
}

/**
 * Handle returned when presenting the installation modal.
 */
export interface SRemoteInstallModalHandle {
  host: HTMLElement | null;
  close: () => void;
}

/**
 * Instance Management Subsystem (`sremote.instances`).
 */
export interface SRemoteInstancesNamespace {
  /**
   * Pre-assign a custom instance ID to an `<iframe>` element before or during handshake.
   */
  assign(iframeOrSelector: string | HTMLIFrameElement, customId: string): boolean;

  /**
   * Get the DOM `<iframe>` element corresponding to an instance ID.
   */
  getIframe(instanceId?: string, key?: string): HTMLIFrameElement | null;

  /**
   * Get the current snapshot state of an instance.
   */
  get(instanceId?: string, key?: string): SRemoteMediaState | null;

  /**
   * Get the evaluated capabilities of an instance.
   */
  capabilities(instanceId?: string, key?: string): SRemoteCapabilities | null;

  /**
   * Get a list of all currently connected media instances and adapters.
   */
  list(key?: string): SRemoteInstanceInfo[];

  /**
   * Configure multi-media mode (`true` for forced multi, `false` for single, `null` for auto).
   */
  setMultiMode(mode: boolean | null, key?: string): void;

  /**
   * Check whether multi-media mode is currently active.
   */
  isMultiMode(key?: string): boolean;

  /**
   * Set exclusive playback mode (`'auto'` to pause others automatically, `instanceId`, or `null`).
   */
  setExclusive(mode: 'auto' | string | null, key?: string): void;

  /**
   * Actively poll GM Storage for hidden or background iframe media instances.
   */
  query(key?: string): any[];

  /**
   * Annotate instances with friendly descriptive labels.
   */
  note(dict: Record<string, string>, key?: string): void;
}

/**
 * Custom Adapters Subsystem (`sremote.adapters`).
 */
export interface SRemoteAdaptersNamespace {
  /**
   * Register a custom adapter object for third-party player SDKs.
   */
  register(adapter: SRemoteCustomAdapter, instanceId?: string, key?: string): string | null;

  /**
   * Unregister and remove a custom adapter.
   */
  unregister(instanceId: string, key?: string): boolean;

  /**
   * Retrieve an active custom adapter object.
   */
  get(instanceId?: string, key?: string): SRemoteCustomAdapter | null;
}

/**
 * RPC & Cross-Frame Messaging Subsystem (`sremote.rpc`).
 */
export interface SRemoteRpcNamespace {
  /**
   * Call a custom RPC action inside the target iframe.
   */
  call(action: string, params?: any, instanceId?: string, key?: string): Promise<any>;

  /**
   * Bridge arbitrary window `postMessage` directly into the iframe's window context.
   */
  postMessage(message: any, targetOrigin?: string, instanceId?: string, from?: string, key?: string): boolean;

  /**
   * Subscribe to messages bridged from child iframes.
   */
  onMessage(handler: (data: any) => void, key?: string): () => void;
}

/**
 * Dynamic Iframe CSS Subsystem (`sremote.css`).
 */
export interface SRemoteCssNamespace {
  /**
   * Inject dynamic CSS styles into the iframe document.
   */
  set(css: string, instanceId?: string, key?: string): Promise<any>;

  /**
   * Retrieve dynamic CSS styles currently active in the iframe.
   */
  get(instanceId?: string, key?: string): Promise<any>;

  /**
   * Remove custom dynamic CSS styles from the iframe.
   */
  remove(instanceId?: string, key?: string): Promise<any>;
}

/**
 * Base abstract strategy driver for SRemote client operations.
 */
export declare abstract class BaseDriver {
  options: Record<string, any>;
  constructor(options?: Record<string, any>);
  getPasskey(key?: string | null): string | null;

  play(target?: string | HTMLElement, key?: string): Promise<any>;
  pause(target?: string | HTMLElement, key?: string): Promise<any>;
  toggle(target?: string | HTMLElement, key?: string): Promise<any>;
  stop(target?: string | HTMLElement, key?: string): Promise<any>;
  seek(offset: number, target?: string | HTMLElement, key?: string): Promise<any>;
  seekTo(time: number, target?: string | HTMLElement, key?: string): Promise<any>;
  volume(vol: number, target?: string | HTMLElement, key?: string): Promise<any>;
  mute(muted?: boolean, target?: string | HTMLElement, key?: string): Promise<any>;
  speed(rate: number, target?: string | HTMLElement, key?: string): Promise<any>;
  pip(enable?: boolean, target?: string | HTMLElement, key?: string): Promise<any>;
  load(source: any, target?: string | HTMLElement, key?: string): Promise<any>;

  useAdapter(adapter: SRemoteCustomAdapter, instanceId?: string, key?: string): string | null;
  removeAdapter(instanceId: string, key?: string): boolean;
  getCustomAdapter(instanceId?: string, key?: string): SRemoteCustomAdapter | null;

  on(event: string, handler: (data: any) => void, key?: string): () => void;
  off(event: string, handler: (data: any) => void): void;
}

/**
 * Driver interfacing with the cross-domain userscript environment.
 */
export declare class UserscriptDriver extends BaseDriver {
  constructor(options?: SRemoteClientOptions);
  isAvailable(): boolean;
  getApi(required?: boolean): any;
  call(action: string, params?: any, instanceId?: string, key?: string): Promise<any>;
  postWindowMessage(message: any, targetOrigin?: string, instanceId?: string, from?: string, key?: string): boolean;
  status(instanceId?: string, key?: string): SRemoteMediaState | null;
  capabilities(instanceId?: string, key?: string): SRemoteCapabilities | null;
  assignId(iframeOrSelector: string | HTMLIFrameElement, customId: string): boolean;
  bindMetadata(meta: any, instanceId?: string, key?: string): void;
}

/**
 * Driver operating via direct DOM access and local media tracking (same-origin fallback).
 */
export declare class DomDriver extends BaseDriver {
  adaptersMap: Map<string, SRemoteCustomAdapter>;
  eventListeners: Map<string, Set<(data: any) => void>>;
  trackedMediaElements: WeakSet<Element>;
  multiMode: boolean;
  exclusiveMode: 'auto' | boolean | string;

  constructor(options?: SRemoteClientOptions);
  initDomAutoTracking(): void;
  trackMediaElement(mediaEl: HTMLMediaElement): void;
  startAdapterStatePolling(instanceId: string, adapter: SRemoteCustomAdapter): void;
  stopAdapterStatePolling(instanceId: string): void;
  list(): SRemoteInstanceInfo[];
  setMultiMode(mode: boolean | null): void;
  isMultiMode(): boolean;
  setExclusive(mode: 'auto' | boolean | string | null): void;
  getCapabilities(targetOrId?: string | HTMLElement): SRemoteCapabilities | null;
  emit(event: string, payload?: any): void;
}

/**
 * SRemote Client SDK - Unified cross-domain iframe media controller and abstraction layer.
 */
export class SRemoteClient {
  constructor(options?: SRemoteClientOptions);

  /**
   * Current operational mode.
   */
  mode: SRemoteClientMode;

  /**
   * Active driver instance (UserscriptDriver or DomDriver).
   */
  readonly activeDriver: BaseDriver | null;

  /**
   * Check if the cross-domain SRemote userscript is active and connected on the page.
   */
  isUserscriptAvailable(): boolean;

  /**
   * Asynchronously wait until SRemote completes initial handshake and detection.
   */
  ready(): Promise<this>;

  /**
   * Synchronize registered parent adapters into the userscript environment.
   */
  syncAdaptersToUserscript(): void;

  // --- Sub-Namespaces ---
  instances: SRemoteInstancesNamespace;
  adapters: SRemoteAdaptersNamespace;
  rpc: SRemoteRpcNamespace;
  css: SRemoteCssNamespace;

  // --- Quick Playback Controls ---
  play(targetOrId?: string | HTMLElement, key?: string): Promise<any>;
  pause(targetOrId?: string | HTMLElement, key?: string): Promise<any>;
  toggle(targetOrId?: string | HTMLElement, key?: string): Promise<any>;
  stop(targetOrId?: string | HTMLElement, key?: string): Promise<any>;
  seek(offset: number, targetOrId?: string | HTMLElement, key?: string): Promise<any>;
  seekTo(time: number, targetOrId?: string | HTMLElement, key?: string): Promise<any>;
  volume(vol: number, targetOrId?: string | HTMLElement, key?: string): Promise<any>;
  mute(muted?: boolean, targetOrId?: string | HTMLElement, key?: string): Promise<any>;
  speed(rate: number, targetOrId?: string | HTMLElement, key?: string): Promise<any>;
  pip(enable?: boolean, targetOrId?: string | HTMLElement, key?: string | null): Promise<any>;
  quality(level: string | number, targetOrId?: string | HTMLElement, key?: string | null): Promise<any>;
  getQualities(targetOrId?: string | HTMLElement, key?: string | null): Promise<string[]>;
  subtitle(track: string | null, targetOrId?: string | HTMLElement, key?: string | null): Promise<any>;
  getSubtitles(targetOrId?: string | HTMLElement, key?: string | null): Promise<any[]>;
  shuffle(enable?: boolean, targetOrId?: string | HTMLElement, key?: string | null): Promise<any>;
  repeat(mode?: 'off' | 'all' | 'one' | boolean, targetOrId?: string | HTMLElement, key?: string | null): Promise<any>;
  next(targetOrId?: string | HTMLElement, key?: string | null): Promise<any>;
  previous(targetOrId?: string | HTMLElement, key?: string | null): Promise<any>;
  load(source: any, targetOrId?: string | HTMLElement, key?: string | null): Promise<any>;
  status(instanceId?: string, key?: string | null): SRemoteMediaState | null;
  capabilities(targetOrId?: string | HTMLElement, key?: string | null): SRemoteCapabilities | null;

  // --- Global Lifecycle & Events ---
  hello(options?: SRemoteHelloOptions, key?: string): void;
  bindMetadata(meta: any, instanceId?: string, key?: string): void;
  emit(event: string, payload?: any): void;
  on(event: string, handler: (data: any) => void, key?: string): () => void;
  off(event: string, handler: (data: any) => void): void;

  showInstallModal(options?: SRemoteInstallModalOptions): SRemoteInstallModalHandle;
}

export declare function showInstallModal(options?: SRemoteInstallModalOptions): SRemoteInstallModalHandle;

export declare function createSRemote(options?: SRemoteClientOptions): SRemoteClient;

export declare const sremote: SRemoteClient;
export default sremote;

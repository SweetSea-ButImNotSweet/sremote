import type { SRemoteCapabilities, SRemoteMediaState, SRemoteEventPayload, SRemoteEventHandler, SRemoteActionName, SRemoteEventName } from '@sremote/shared';

export type { SRemoteCapabilities, SRemoteMediaState, SRemoteEventPayload, SRemoteEventHandler, SRemoteActionName, SRemoteEventName };

/**
 * Connected media instance information item in userscript parent runtime.
 */
export interface SRemoteInstanceInfo {
  instanceId: string;
  location: string;
  origin: string;
  note?: string;
  mediaType: string | null;
  capabilities: SRemoteCapabilities | null;
  state: SRemoteMediaState | null;
  status: 'ready' | 'connecting' | 'disconnected' | string;
}

/**
 * Custom Adapter interface for wrapping proprietary or 3rd-party player SDKs in parent context.
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
 * Result returned by dispatchCommand / RPC calls.
 */
export interface SRemoteCommandResult {
  success: boolean;
  action?: string;
  instanceId?: string | null;
  error?: string;
  message?: string;
  source?: string;
  [key: string]: any;
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
  getCapabilities(instanceId?: string, key?: string): SRemoteCapabilities | null;

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
   * Register a custom adapter object for third-party player SDKs in parent page.
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
  call(action: string, params?: any, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;

  /**
   * Bridge arbitrary window `postMessage` directly into the iframe's window context.
   */
  postMessage(message: any, targetOrigin?: string, instanceId?: string | null, from?: string, key?: string | null): boolean;

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
  set(css: string, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;

  /**
   * Retrieve dynamic CSS styles currently active in the iframe.
   */
  get(instanceId?: string, key?: string): Promise<SRemoteCommandResult>;

  /**
   * Remove custom dynamic CSS styles from the iframe.
   */
  remove(instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
}

/**
 * Parent Debug Namespace (`sremote.debug`).
 */
export interface SRemoteDebugNamespace {
  scan(): Promise<any[]>;
  getMediaElement(instanceId?: string | null): HTMLElement | null;
  inspect(instanceId?: string | null): HTMLElement | null;
  getState(instanceId?: string | null): Promise<any>;
  capabilities(instanceId?: string | null): SRemoteCapabilities | null;
  getCapabilities(instanceId?: string | null): SRemoteCapabilities | null;
  dump(instanceId?: string | null): Promise<any>;
  play(instanceId?: string | null): Promise<SRemoteCommandResult>;
  pause(instanceId?: string | null): Promise<SRemoteCommandResult>;
  toggle(instanceId?: string | null): Promise<SRemoteCommandResult>;
  seek(offset: number, instanceId?: string | null): Promise<SRemoteCommandResult>;
  seekTo(time: number, instanceId?: string | null): Promise<SRemoteCommandResult>;
  setVolume(vol: number, instanceId?: string | null): Promise<SRemoteCommandResult>;
  setMute(muted: boolean, instanceId?: string | null): Promise<SRemoteCommandResult>;
  setRate(rate: number, instanceId?: string | null): Promise<SRemoteCommandResult>;
  toggleLoop(instanceId?: string | null): Promise<any>;
  setSource(sourceUrlOrBlob: string | Blob | File, instanceId?: string | null): Promise<any>;
  injectTestTone(freq?: number, duration?: number, instanceId?: string | null): Promise<any>;
  injectSilentTrack(duration?: number, instanceId?: string | null): Promise<any>;
  injectWhiteNoise(duration?: number, instanceId?: string | null): Promise<any>;
  injectSampleVideo(instanceId?: string | null): Promise<any>;
  restoreOriginal(instanceId?: string | null): Promise<any>;
  simulateStall(instanceId?: string | null): Promise<any>;
}

/**
 * Native `window.sremote` API exposed by the userscript in the parent window.
 */
export interface SRemoteParentApi {
  // Quick Playback Controls
  play(instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  pause(instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  toggle(instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  stop(instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  seek(offset: number, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  seekTo(time: number, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  volume(vol: number, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  mute(muted: boolean, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  rate(rate: number, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  playbackRate(rate: number, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  quality(level: string | number, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  getQualities(instanceId?: string, key?: string): string[];
  subtitle(track: string | null, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  getSubtitles(instanceId?: string, key?: string): any[];
  shuffle(enable: boolean, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  repeat(mode: 'off' | 'all' | 'one' | boolean, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  next(instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  previous(instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  pip(enable?: boolean | string, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  load(source: any, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;
  status(instanceId?: string, key?: string): SRemoteMediaState | null;
  capabilities(instanceId?: string, key?: string): SRemoteCapabilities | null;

  // Subsystems
  instances: SRemoteInstancesNamespace;
  adapters: SRemoteAdaptersNamespace;
  rpc: SRemoteRpcNamespace;
  css: SRemoteCssNamespace;

  // Metadata
  bindMetadata(meta: any, instanceId?: string, key?: string): Promise<SRemoteCommandResult>;

  // Events & Lifecycle
  on(event: string, handler: SRemoteEventHandler, key?: string): () => void;
  off(event: string, handler: SRemoteEventHandler): void;
  lock(): boolean;
  hello(options?: SRemoteHelloOptions, target?: Window | null): void | boolean;

  // Identification flags
  isDummy: boolean;
  isSremoteNative: boolean;

  // Optional Debug namespace (if enabled)
  debug?: SRemoteDebugNamespace;
}

export declare function createExportedApi(context: {
  instanceManager: any;
  dispatchCommand: (action: string, value?: any, targetInstanceId?: string | null, key?: string | null) => Promise<SRemoteCommandResult>;
  validateDomainAccess: (providedKey?: string | null) => boolean;
  queryMediaInstancesViaGM: () => any[];
}): SRemoteParentApi;

declare global {
  interface Window {
    sremote?: SRemoteParentApi;
    SRemote?: SRemoteParentApi;
  }
}

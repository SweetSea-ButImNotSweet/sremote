export interface SRemoteCapabilities {
  play: boolean;
  pause: boolean;
  toggle: boolean;
  stop: boolean;
  seek: boolean;
  volume: boolean;
  muted: boolean;
  speed: boolean;
  playbackRate?: boolean;
  pip: boolean;
  quality: boolean;
  subtitles: boolean;
  shuffle: boolean;
  repeat: boolean;
  next: boolean;
  previous: boolean;
  load: boolean;
  hasAdapter?: boolean;
  hasNative?: boolean;
  hasMediaSession?: boolean;
}

export interface SRemoteInstanceData {
  instanceId: string;
  origin?: string;
  location?: string;
  note?: string;
  state?: 'playing' | 'paused' | 'stopped' | 'buffering' | 'idle' | string;
  mediaType?: 'video' | 'audio' | 'adapter' | 'mediasession' | string;
  currentTime?: number;
  duration?: number | null;
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  speed?: number;
  lastSeen?: number;
  assignedId?: string;
  capabilities?: SRemoteCapabilities;
}

export interface SRemoteMediaState {
  paused: boolean;
  ended?: boolean;
  currentTime: number;
  duration: number | null;
  buffered?: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  readyState?: number;
  src?: string;
  loop?: boolean;
  repeat?: 'off' | 'one' | 'all' | boolean;
  fullscreen?: boolean;
  pictureInPicture?: boolean;
  quality?: string | number;
  subtitle?: string | null;
  shuffle?: boolean;
  [key: string]: any;
}

export interface SRemoteEventPayload {
  source: string;
  instanceId: string;
  mediaType: string;
  action: string;
  isProgrammatic?: boolean;
  state?: SRemoteMediaState | null;
  [key: string]: any;
}

export type SRemoteEventHandler = (data: any) => void;

export declare const SREMOTE_EVENTS: {
  readonly READY: 'sremote:ready';
  readonly STATE_CHANGE: 'sremote:state-change';
  readonly DISCONNECT: 'sremote:disconnect';
  readonly PERMISSION_DECISION: 'sremote:permission_decision';
};

export type SRemoteEventName = (typeof SREMOTE_EVENTS)[keyof typeof SREMOTE_EVENTS];

export declare const SREMOTE_ACTIONS: {
  readonly PLAY: 'play';
  readonly PAUSE: 'pause';
  readonly TOGGLE: 'toggle';
  readonly STOP: 'stop';
  readonly SEEK: 'seek';
  readonly SEEK_TO: 'currentTime';
  readonly VOLUME: 'volume';
  readonly MUTE: 'muted';
  readonly SPEED: 'speed';
  readonly PIP: 'pip';
  readonly ENTER_PIP: 'enterpip';
  readonly EXIT_PIP: 'exitpip';
  readonly QUALITY: 'quality';
  readonly GET_QUALITIES: 'getQualities';
  readonly SUBTITLE: 'subtitle';
  readonly GET_SUBTITLES: 'getSubtitles';
  readonly SHUFFLE: 'shuffle';
  readonly REPEAT: 'repeat';
  readonly NEXT: 'nexttrack';
  readonly PREVIOUS: 'previoustrack';
};

export type SRemoteActionName = (typeof SREMOTE_ACTIONS)[keyof typeof SREMOTE_ACTIONS];

export declare const SREMOTE_STORAGE_KEYS: {
  readonly HELLO_SEQ: 'sremote:hello_seq';
  readonly PARENT_ORIGIN: 'sremote:parent_origin';
  readonly HANDSHAKE_SECRET: 'sremote:handshake_secret';
};

export declare const MEDIA_EVENTS: readonly string[];
export declare const SAFE_FALLBACK_EVENTS: readonly string[];

export declare function hasMediaSource(media: any): boolean;
export declare function isValidMediaElement(media: any, options?: { minSize?: number; requireConnected?: boolean }): boolean;
export declare function extractMediaState(media: any): SRemoteMediaState | null;
export declare function createEventPayload(event: string, options?: any): SRemoteEventPayload;
export declare function evaluateCapabilities(target: any): SRemoteCapabilities;
export declare function bindMediaEvents(
  media: any,
  onEvent: (event: string, payload: any) => void,
  options?: {
    instanceId?: string;
    source?: string;
    treatAlmostEndAsEnd?: boolean;
    events?: readonly string[] | string[];
    excludedEvents?: readonly string[] | string[] | Set<string> | null;
  },
): () => void;
export declare function wrapCustomAdapter(rawAdapter: any, options?: { instanceId?: string; onEmit?: (event: string, payload: any) => void; source?: string }): any;

export declare const API_SPEC: any;
export declare function buildSRemoteApi(context: {
  dispatchCommand?: (action: string, value?: any, targetInstanceId?: string | null, key?: string | null) => Promise<any>;
  handlers?: Record<string, any>;
  eventsManager?: { on?: any; off?: any; emit?: any };
  lifecycleHandlers?: { hello?: any; lock?: any; bindMetadata?: any };
  debugApi?: any;
  customExtensions?: Record<string, any>;
}): any;

export declare function generateInstanceId(prefix?: string): string;

export interface InstanceManagerOptions {
  ns?: string;
  logger?: { log?: (...args: any[]) => void; debug?: (...args: any[]) => void; warn?: (...args: any[]) => void; error?: (...args: any[]) => void };
  onSignal?: (payload: any) => void;
  getIframeCount?: () => number;
}

export interface InstanceManager {
  instances: Map<string, any>;
  parentAdaptersMap: Map<string, any>;
  assignedIframeIdMap: Map<string, any>;
  iframeToAssignedIdMap: WeakMap<any, string>;
  globalEventListeners: Map<string, Set<Function>>;
  exclusiveMode: string | null;
  setExclusiveMode: (mode: string | null) => void;
  multiModeConfig: boolean | null;
  setMultiModeConfig: (mode: boolean | null) => void;
  currentActiveInstanceId: string | null;
  setCurrentActiveInstanceId: (id: string | null) => void;
  isSessionLocked: boolean;
  setSessionLocked: (locked: boolean) => void;
  isSessionDenied: boolean;
  setSessionDenied: (denied: boolean) => void;
  readonly lastAcceptedData: any;
  isMultiModeActive: () => boolean;
  getLatestActiveInstanceId: () => string | null;
  broadcastToPorts: (payload: any, excludeInstanceId?: string | null) => void;
  notifyMediaCountChange: () => void;
  emitGlobalEvent: (event: string, payload?: any) => void;
  on: (event: string, handler: (payload: any) => void) => () => void;
  off: (event: string, handler?: (payload: any) => void) => void;
  pauseOthersExcept: (activeInstanceId: string) => void;
  removeInstance: (instanceId: string, reason?: string) => void;
  handleUseAdapter: (adapterVal: any, instanceId?: string | null) => string | null;
  handleRemoveAdapter: (instanceId?: string | null) => boolean;
  getCustomAdapter: (instanceId?: string | null) => any;
}

export declare function createInstanceManager(options?: InstanceManagerOptions): InstanceManager;

export declare const LOG_LEVELS: { readonly INHERIT: -1; readonly SILENT: 0; readonly ERROR: 1; readonly INFO: 2; readonly DEBUG: 3 };

export interface Logger {
  readonly level: number;
  setLevel: (level: number) => void;
  log: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  scope: (prefix: string) => { log: (...args: any[]) => void; debug: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void };
}

export declare function getGlobalLogLevelOverride(): number | null;
export declare function resolveLogLevel(localLevel?: number, defaultLevel?: number): number;
export declare function createLogger(options?: { prefix?: string; level?: number; getLevel?: () => number; defaultLevel?: number }): Logger;

export declare const defaultLogger: Logger;
export declare const console_log: (...args: any[]) => void;
export declare const console_debug: (...args: any[]) => void;
export declare const console_warn: (...args: any[]) => void;
export declare const console_error: (...args: any[]) => void;

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
  readonly SPEED: 'playbackRate';
  readonly PLAYBACK_RATE: 'playbackRate';
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

export declare function extractMediaState(media: any): SRemoteMediaState | null;
export declare function createEventPayload(event: string, options?: any): SRemoteEventPayload;
export declare function evaluateCapabilities(target: any): SRemoteCapabilities;
export declare function bindMediaEvents(
  media: any,
  onEvent: (event: string, payload: any) => void,
  options?: { instanceId?: string; source?: string; treatAlmostEndAsEnd?: boolean; events?: readonly string[] | string[] },
): () => void;
export declare function wrapCustomAdapter(rawAdapter: any, options?: { instanceId?: string; onEmit?: (event: string, payload: any) => void; source?: string }): any;

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
  state?: 'playing' | 'paused' | 'stopped' | 'buffering' | 'idle';
  mediaType?: 'video' | 'audio' | 'adapter' | 'mediasession' | string;
  currentTime?: number;
  duration?: number;
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
  repeat?: 'off' | 'one' | 'all';
  fullscreen?: boolean;
  pictureInPicture?: boolean;
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

export declare const MEDIA_EVENTS: readonly string[];

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
    events?: string[];
  }
): () => void;



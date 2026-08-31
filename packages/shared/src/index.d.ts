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

export type SRemoteEventHandler = (data: any) => void;


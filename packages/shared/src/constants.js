export const SREMOTE_EVENTS = {
  READY: 'sremote:ready',
  STATE_CHANGE: 'sremote:state-change',
  DISCONNECT: 'sremote:disconnect',
  PERMISSION_DECISION: 'sremote:permission_decision',
};

export const SREMOTE_ACTIONS = {
  PLAY: 'play',
  PAUSE: 'pause',
  TOGGLE: 'toggle',
  STOP: 'stop',
  SEEK: 'seek',
  SEEK_TO: 'seekTo',
  CURRENT_TIME: 'currentTime',
  VOLUME: 'volume',
  MUTE: 'muted',
  SPEED: 'speed',
  PIP: 'pip',
  ENTER_PIP: 'enterpip',
  EXIT_PIP: 'exitpip',
  QUALITY: 'quality',
  GET_QUALITIES: 'getQualities',
  SUBTITLE: 'subtitle',
  GET_SUBTITLES: 'getSubtitles',
  SHUFFLE: 'shuffle',
  REPEAT: 'repeat',
  NEXT: 'next',
  PREVIOUS: 'previous',
  NEXT_TRACK: 'nexttrack',
  PREVIOUS_TRACK: 'previoustrack',
};

/** @deprecated Legacy storage keys from v2/v3 (now obsolete with v4 in-memory handshake) */
export const SREMOTE_STORAGE_KEYS = Object.freeze({});

export const constants = { ACTIONS: SREMOTE_ACTIONS, EVENTS: SREMOTE_EVENTS, STORAGE_KEYS: SREMOTE_STORAGE_KEYS };

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
  SEEK_TO: 'currentTime',
  VOLUME: 'volume',
  MUTE: 'muted',
  SPEED: 'playbackRate',
  PLAYBACK_RATE: 'playbackRate',
  PIP: 'pip',
  ENTER_PIP: 'enterpip',
  EXIT_PIP: 'exitpip',
  QUALITY: 'quality',
  GET_QUALITIES: 'getQualities',
  SUBTITLE: 'subtitle',
  GET_SUBTITLES: 'getSubtitles',
  SHUFFLE: 'shuffle',
  REPEAT: 'repeat',
  NEXT: 'nexttrack',
  PREVIOUS: 'previoustrack',
};

export const SREMOTE_STORAGE_KEYS = { HELLO_SEQ: 'sremote:hello_seq', PARENT_ORIGIN: 'sremote:parent_origin', HANDSHAKE_SECRET: 'sremote:handshake_secret' };

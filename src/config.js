import { unsafeWindow } from '$';

export const VERSION = '1.0.0';
export const NS = 'sremote:';

export const LOG_LEVEL = 3; // 0: None, 1: Error/Warn, 2: Debug, 3: Full Log
export const ENABLE_DEBUG_API = true;

export const console_log = LOG_LEVEL >= 3 ? console.log.bind(console) : () => {};
export const console_debug = LOG_LEVEL >= 2 ? console.debug.bind(console) : () => {};
export const console_warn = LOG_LEVEL >= 1 ? console.warn.bind(console) : () => {};
export const console_error = LOG_LEVEL >= 1 ? console.error.bind(console) : () => {};

export const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

// HTML5 Standard Media Events
export const MEDIA_EVENTS = [
  'play',
  'pause',
  'playing',
  'ended',
  'timeupdate',
  'durationchange',
  'volumechange',
  'ratechange',
  'seeking',
  'seeked',
  'progress',
  'canplay',
  'canplaythrough',
  'waiting',
  'stalled',
  'emptied',
  'abort',
  'error',
  'loadeddata',
  'loadedmetadata',
  'loadstart',
  'suspend',
  'encrypted',
  'enterpictureinpicture',
  'exitpictureinpicture',
];

// Native HTMLMediaElement property descriptors
const mediaProto = HTMLMediaElement.prototype;
export const descriptors = {
  volume: Object.getOwnPropertyDescriptor(mediaProto, 'volume'),
  muted: Object.getOwnPropertyDescriptor(mediaProto, 'muted'),
  currentTime: Object.getOwnPropertyDescriptor(mediaProto, 'currentTime'),
  duration: Object.getOwnPropertyDescriptor(mediaProto, 'duration'),
  paused: Object.getOwnPropertyDescriptor(mediaProto, 'paused'),
  ended: Object.getOwnPropertyDescriptor(mediaProto, 'ended'),
  playbackRate: Object.getOwnPropertyDescriptor(mediaProto, 'playbackRate'),
  readyState: Object.getOwnPropertyDescriptor(mediaProto, 'readyState'),
  currentSrc: Object.getOwnPropertyDescriptor(mediaProto, 'currentSrc'),
  src: Object.getOwnPropertyDescriptor(mediaProto, 'src'),
  buffered: Object.getOwnPropertyDescriptor(mediaProto, 'buffered'),
  play: mediaProto.play,
  pause: mediaProto.pause,
};

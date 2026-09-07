import { unsafeWindow } from '$';

export const VERSION = '3.0.0';
export const NS = 'sremote:';

import { LOG_LEVELS, createLogger } from '@sremote/shared';

export const LOG_LEVEL = 3; // 0: None, 1: Error/Warn, 2: Debug, 3: Full Log
export const ENABLE_DEBUG_API = true;

// Create unified logger for userscript with dynamic level checking
export const logger = createLogger({ prefix: 'userscript', level: LOG_LEVEL, defaultLevel: LOG_LEVELS.INFO });

export const console_log = (...args) => logger.log(...args);
export const console_debug = (...args) => logger.debug(...args);
export const console_warn = (...args) => logger.warn(...args);
export const console_error = (...args) => logger.error(...args);

export const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

export { MEDIA_EVENTS } from '@sremote/shared';

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

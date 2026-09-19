export * from './const.js';
import { LOG_LEVEL } from './const.js';

import { unsafeWindow } from '$';
import { logger as sharedLogger, events } from '@sremote/shared';

// Create unified logger for userscript with dynamic level checking
export const logger = sharedLogger.create({ prefix: 'userscript', level: LOG_LEVEL, defaultLevel: sharedLogger.LEVELS.INFO });

export const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

export const MEDIA_EVENTS = events.MEDIA_EVENTS;

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

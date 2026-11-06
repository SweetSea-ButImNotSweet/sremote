// --- Constants & Thresholds ---
export const TIMEUPDATE_THROTTLE_MS = 250;
export const PROGRESS_THROTTLE_MS = 500;
export const TIMEUPDATE_LOG_THROTTLE_MS = 2000;
export const PROGRAMMATIC_WINDOW_MS = 500;
export const ALMOST_END_THRESHOLD_SEC = 0.8;
export const ALMOST_END_MIN_DURATION_SEC = 3;
export const ALMOST_END_RESET_THRESHOLD_SEC = 1.5;

/**
 * Standard list of HTML5 Media Events supported by SRemote
 */
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

/**
 * Standard list of Safe Passive Fallback Events for Custom Adapters.
 * Excludes active lifecycle events (play, pause, ended) to prevent state conflicts when adapters manage their own playback.
 */
export const SAFE_FALLBACK_EVENTS = [
  'timeupdate',
  'volumechange',
  'ratechange',
  'seeking',
  'seeked',
  'progress',
  'canplay',
  'canplaythrough',
  'waiting',
  'stalled',
  'loadedmetadata',
  'loadeddata',
];

/**
 * Events that automatically trigger a unified 'state' event update.
 */
export const STATE_CHANGING_EVENTS = new Set(['play', 'pause', 'playing', 'ended', 'seeked', 'ratechange', 'volumechange', 'loadedmetadata']);

/**
 * Standard action methods to intercept on adapters for programmatic tracking.
 */
export const ACTION_METHODS = ['play', 'pause', 'toggle', 'stop', 'seekTo', 'seek', 'volume', 'mute', 'speed', 'playbackRate', 'repeat'];

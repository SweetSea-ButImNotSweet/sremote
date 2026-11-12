// --- Canonical Concise Modern API ---
export * from './constants.js';
export { captureMediaSnapshot } from './snapshot.js';
export { buildEventPayload } from './payload.js';
export { isValidMedia, hasMediaSource, evaluateCapabilities } from './validator.js';
export { isProgrammatic, runInActionScope, getActiveActionScope } from './origin-detector.js';
export { bindDomMedia } from './dom-binder.js';
export { wrapAdapter } from './adapter-decorator.js';

import { evaluateCapabilities } from './validator.js';
import { bindDomMedia } from './dom-binder.js';
import { MEDIA_EVENTS, SAFE_FALLBACK_EVENTS } from './constants.js';

export const capabilities = { get: evaluateCapabilities };
export const events = { bind: bindDomMedia, attach: bindDomMedia, MEDIA_EVENTS, SAFE_FALLBACK_EVENTS };

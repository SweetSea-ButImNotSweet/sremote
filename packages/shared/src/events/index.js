// --- Canonical Concise Modern API ---
export * from './constants.js';
export { captureMediaSnapshot } from './snapshot.js';
export { buildEventPayload } from './payload.js';
export { isValidMedia, hasMediaSource, evaluateCapabilities } from './validator.js';
export { isProgrammatic } from './origin-detector.js';
export { bindDomMedia } from './dom-binder.js';
export { wrapAdapter } from './adapter-decorator.js';

// --- Backward-Compatibility Aliases ---
export { buildEventPayload as buildEventEnvelope, buildEventPayload as createEventPayload } from './payload.js';
export {
  isValidMedia as assertValidMediaElement,
  isValidMedia as isValidMediaElement,
  hasMediaSource as hasActiveMediaSource,
  evaluateCapabilities as getCapabilities,
} from './validator.js';
export { isProgrammatic as detectProgrammaticOrigin, isProgrammatic as resolveIsProgrammatic } from './origin-detector.js';
export { bindDomMedia as attachDomMediaListeners, bindDomMedia as bindMediaEvents } from './dom-binder.js';
export { wrapAdapter as decorateCustomAdapter, wrapAdapter as wrapCustomAdapter } from './adapter-decorator.js';
export { captureMediaSnapshot as extractMediaState } from './snapshot.js';

import { evaluateCapabilities } from './validator.js';
import { bindDomMedia } from './dom-binder.js';
import { MEDIA_EVENTS, SAFE_FALLBACK_EVENTS } from './constants.js';

export const capabilities = { get: evaluateCapabilities };
export const events = { bind: bindDomMedia, attach: bindDomMedia, MEDIA_EVENTS, SAFE_FALLBACK_EVENTS };

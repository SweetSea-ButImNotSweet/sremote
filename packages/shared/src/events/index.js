// --- Canonical Modern Public API ---
export * from './constants.js';
export { captureMediaSnapshot } from './snapshot.js';
export { buildEventEnvelope } from './envelope.js';
export { hasActiveMediaSource, assertValidMediaElement, evaluateCapabilities } from './validator.js';
export { detectProgrammaticOrigin } from './origin-detector.js';
export { attachDomMediaListeners } from './dom-binder.js';
export { decorateCustomAdapter } from './adapter-decorator.js';

// --- Backward-Compatibility Aliases ---
export { captureMediaSnapshot as extractMediaState } from './snapshot.js';
export { buildEventEnvelope as createEventPayload } from './envelope.js';
export { assertValidMediaElement as isValidMediaElement, hasActiveMediaSource as hasMediaSource } from './validator.js';
export { detectProgrammaticOrigin as resolveIsProgrammatic } from './origin-detector.js';
export { attachDomMediaListeners as bindMediaEvents } from './dom-binder.js';
export { decorateCustomAdapter as wrapCustomAdapter } from './adapter-decorator.js';

import { evaluateCapabilities } from './validator.js';
import { attachDomMediaListeners } from './dom-binder.js';
import { MEDIA_EVENTS, SAFE_FALLBACK_EVENTS } from './constants.js';

export const capabilities = { get: evaluateCapabilities };
export const events = { bind: attachDomMediaListeners, attach: attachDomMediaListeners, MEDIA_EVENTS, SAFE_FALLBACK_EVENTS };

import { extractMediaState, createEventPayload } from '../events.js';
export const state = { get: extractMediaState, createPayload: createEventPayload };

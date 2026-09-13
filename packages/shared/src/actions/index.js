import { executeMediaAction, safePlayMedia, safePauseMedia } from './action-engine.js';
import { wrapCustomAdapter } from '../events.js';

export const actions = { execute: executeMediaAction, safePlay: safePlayMedia, safePause: safePauseMedia, wrapAdapter: wrapCustomAdapter };

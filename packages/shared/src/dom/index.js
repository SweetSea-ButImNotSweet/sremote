import { resolveMediaElement } from '../actions/action-engine.js';
import { queryMediaDeep, findAllMedia, createMediaWatcher } from './dom-hunter.js';
import { isValidMediaElement, hasMediaSource } from '../events.js';

export const dom = {
  resolve: resolveMediaElement,
  query: queryMediaDeep,
  findAll: findAllMedia,
  watch: createMediaWatcher,
  isValid: isValidMediaElement,
  hasSource: hasMediaSource,
};

import { NS, logger } from '../config.js';
import { createInstanceManager as createSharedInstanceManager } from '@sremote/shared';

export function createInstanceManager(customOptions = {}) {
  return createSharedInstanceManager({
    ns: NS,
    logger,
    onSignal: payload => {
      window.postMessage(payload, '*');
    },
    getIframeCount: () => {
      try {
        return document.querySelectorAll('iframe').length;
      } catch {
        return 0;
      }
    },
    ...customOptions,
  });
}

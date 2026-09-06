import { NS, console_log, console_debug, console_warn } from '../config.js';
import { createInstanceManager as createSharedInstanceManager } from '@sremote/shared';

export function createInstanceManager(customOptions = {}) {
  return createSharedInstanceManager({
    ns: NS,
    logger: { log: console_log, debug: console_debug, warn: console_warn },
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

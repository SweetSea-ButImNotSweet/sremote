import { initParentController } from './parent/index.js';
import { initIframeAgent } from './iframe/index.js';

(function SRemoteMain() {
  'use strict';

  if (window.top === window.self) {
    // Check if web app already loaded @sremote/wrapper as single source of truth
    const existing = window.sremote || (typeof unsafeWindow !== 'undefined' ? unsafeWindow.sremote : null);
    if (existing && existing[Symbol.for('__sremote_source__')] === 'wrapper') {
      // In wrapper-first mode, wrapper is already managing window.sremote.
      // Userscript only acts as background privilege / menu helper
      return;
    }
    initParentController();
  } else {
    initIframeAgent();
  }
})();

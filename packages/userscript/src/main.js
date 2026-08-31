import { initParentController } from './parent/index.js';
import { initIframeAgent } from './iframe/index.js';

(function SRemoteMain() {
  'use strict';

  if (window.top === window.self) {
    initParentController();
  } else {
    initIframeAgent();
  }
})();

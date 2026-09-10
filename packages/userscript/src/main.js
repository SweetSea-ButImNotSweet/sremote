import { registerMenuCommands } from './parent/menu.js';
import { initParentController } from './parent/index.js';
import { initIframeAgent } from './iframe/index.js';

(function SRemoteMain() {
  'use strict';

  if (window.top === window.self) {
    // 1. Always register Tampermonkey menu commands on top window
    registerMenuCommands();

    // 2. Initialize parent controller (attaches exported API to unsafeWindow.sremote)
    initParentController();
  } else {
    initIframeAgent();
  }
})();


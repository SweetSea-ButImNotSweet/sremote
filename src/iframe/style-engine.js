import { console_warn } from '../config.js';

export const IframeStyleEngine = (function initIframeStyleEngine() {
  let dynamicCssText = '';
  let dynamicStyleEl = null;

  function applyDynamicCSS(css) {
    dynamicCssText = typeof css === 'string' ? css : '';
    if (!dynamicCssText.trim()) {
      if (dynamicStyleEl) {
        dynamicStyleEl.remove();
        dynamicStyleEl = null;
      }
      return;
    }

    try {
      if (!dynamicStyleEl || !dynamicStyleEl.isConnected) {
        dynamicStyleEl = document.createElement('style');
        dynamicStyleEl.id = 'sremote-dynamic-css';
        dynamicStyleEl.textContent = dynamicCssText;
        const target = document.head || document.documentElement;
        if (target) target.appendChild(dynamicStyleEl);
      } else {
        dynamicStyleEl.textContent = dynamicCssText;
      }
    } catch (e) {
      console_warn('[sremote:css] Error applying dynamic CSS:', e);
    }
  }

  function maintainStyles() {
    if (dynamicCssText && (!dynamicStyleEl || !dynamicStyleEl.isConnected)) {
      applyDynamicCSS(dynamicCssText);
    }
  }

  return {
    init(initialCss = '') {
      if (initialCss) {
        applyDynamicCSS(initialCss);
      }
    },
    setDynamicCSS(css) {
      applyDynamicCSS(css);
    },
    getDynamicCSS() {
      return dynamicCssText;
    },
    removeDynamicCSS() {
      applyDynamicCSS('');
    },
    maintainStyles,
  };
})();

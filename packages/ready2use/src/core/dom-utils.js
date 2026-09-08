/**
 * DOM utility functions for player mounting and containment
 */

/**
 * Resolves a container target to an HTMLElement
 * @param {string|HTMLElement} target
 * @returns {HTMLElement|null}
 */
export function resolveElement(target) {
  if (typeof document === 'undefined') return null;
  if (!target) return null;
  if (typeof target === 'string') {
    return document.querySelector(target);
  }
  if (target && target.nodeType === 1) {
    return target;
  }
  return null;
}

/**
 * Creates a hidden temporary container for player SDK initialization
 * @param {string} instanceId
 * @param {number|string} [width='100%']
 * @param {number|string} [height='100%']
 * @returns {{ hiddenWrapper: HTMLDivElement, tempNode: HTMLDivElement, cleanup: () => void }}
 */
export function createTempNode(instanceId, width = '100%', height = '100%') {
  const tempNode = document.createElement('div');
  tempNode.id = `sremote-temp-node-${instanceId}`;
  tempNode.style.width = typeof width === 'number' ? `${width}px` : width;
  tempNode.style.height = typeof height === 'number' ? `${height}px` : height;

  const hiddenWrapper = document.createElement('div');
  hiddenWrapper.style.display = 'none';
  hiddenWrapper.appendChild(tempNode);

  if (document.body) {
    document.body.appendChild(hiddenWrapper);
  }

  const cleanup = () => {
    try {
      if (hiddenWrapper.parentNode) {
        hiddenWrapper.parentNode.removeChild(hiddenWrapper);
      }
    } catch {}
  };

  return { hiddenWrapper, tempNode, cleanup };
}

/**
 * Applies dimensions and attributes to an element
 * @param {HTMLElement} el
 * @param {number|string} [width='100%']
 * @param {number|string} [height='100%']
 * @param {string} [instanceId]
 */
export function applyElementAttributes(el, width = '100%', height = '100%', instanceId = null) {
  if (!el) return;
  if (instanceId) {
    el.setAttribute('data-sremote-id', instanceId);
  }
  if (width !== undefined) {
    el.style.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height !== undefined) {
    el.style.height = typeof height === 'number' ? `${height}px` : height;
  }
}

/**
 * Waits for an iframe to trigger its load event or times out safely.
 * @param {HTMLIFrameElement} iframe
 * @param {number} [timeoutMs=5000]
 * @returns {Promise<void>}
 */
export function waitForIframeLoad(iframe, timeoutMs = 5000) {
  if (!iframe || typeof window === 'undefined') return Promise.resolve();

  return new Promise(resolve => {
    let done = false;
    let timer = null;

    const onFinish = () => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      iframe.removeEventListener('load', onFinish);
      iframe.removeEventListener('error', onFinish);
      resolve();
    };

    try {
      // If the iframe already has readyState complete in some browsers
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
        resolve();
        return;
      }
    } catch {}

    iframe.addEventListener('load', onFinish, { once: true });
    iframe.addEventListener('error', onFinish, { once: true });

    if (timeoutMs > 0) {
      timer = setTimeout(onFinish, timeoutMs);
    }
  });
}

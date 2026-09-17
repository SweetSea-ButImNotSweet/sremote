import { isValidMediaElement } from '../events.js';

/**
 * Recursively queries media elements across DOM tree, open Shadow DOM, and accessible iframes.
 *
 * @param {Node|Document|ShadowRoot} [root=document] - Starting root
 * @param {Set} [visitedRoots=new Set()] - Set of already visited roots to prevent loops
 * @param {Object} [options] - Validation options
 * @returns {HTMLMediaElement[]}
 */
export function queryMediaDeep(root = typeof document !== 'undefined' ? document : null, visitedRoots = new Set(), options = {}) {
  const list = [];
  try {
    if (!root || visitedRoots.has(root)) return list;
    visitedRoots.add(root);

    if (root.querySelectorAll) {
      const found = root.querySelectorAll('video, audio');
      for (let i = 0; i < found.length; i++) {
        const el = found[i];
        if (isValidMediaElement(el, options)) {
          list.push(el);
        }
      }
    }

    const allElements = root.querySelectorAll ? root.querySelectorAll('*') : [];
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i];
      if (el.shadowRoot) {
        list.push(...queryMediaDeep(el.shadowRoot, visitedRoots, options));
      }
      if (el.tagName === 'IFRAME' || el.tagName === 'FRAME') {
        try {
          const childDoc = el.contentDocument || el.contentWindow?.document;
          if (childDoc) {
            list.push(...queryMediaDeep(childDoc, visitedRoots, options));
          }
        } catch {}
      }
    }
  } catch {}
  return list;
}

/**
 * Finds all active and valid media elements in document, including known closed shadow roots.
 *
 * @param {Object} [options]
 * @param {() => Array<ShadowRoot|Node>} [options.getKnownShadowRoots] - Hook to get closed shadow roots
 * @param {Document} [options.doc] - Document root (defaults to document)
 * @returns {HTMLMediaElement[]}
 */
export function findAllMedia(options = {}) {
  if (typeof document === 'undefined') return [];
  const doc = options.doc || document;
  const visitedRoots = new Set();
  const mediaList = queryMediaDeep(doc, visitedRoots, options);

  // Scan through all captured shadow roots (including closed mode hooks if provided)
  if (typeof options.getKnownShadowRoots === 'function') {
    try {
      const shadowRoots = options.getKnownShadowRoots() || [];
      for (let i = 0; i < shadowRoots.length; i++) {
        const sr = shadowRoots[i];
        if (sr && !visitedRoots.has(sr)) {
          const subMedia = queryMediaDeep(sr, visitedRoots, options);
          for (let j = 0; j < subMedia.length; j++) {
            if (!mediaList.includes(subMedia[j])) {
              mediaList.push(subMedia[j]);
            }
          }
        }
      }
    } catch {}
  }

  return mediaList;
}

/**
 * Creates a DOM MutationObserver watcher that continuously discovers new media elements.
 *
 * @param {(mediaEl: HTMLMediaElement) => void} onMediaAdded - Callback when new media is detected
 * @param {Object} [options]
 * @param {() => Array<ShadowRoot|Node>} [options.getKnownShadowRoots] - Hook for closed shadow roots
 * @param {Document} [options.doc] - Document root
 * @returns {{ disconnect: () => void, scanNow: () => HTMLMediaElement[] }}
 */
export function createMediaWatcher(onMediaAdded, options = {}) {
  if (typeof document === 'undefined') {
    return { disconnect: () => {}, scanNow: () => [] };
  }

  const doc = options.doc || document;
  const seenMedia = new WeakSet();

  const handleMedia = el => {
    if (!el || seenMedia.has(el)) return;
    seenMedia.add(el);
    if (typeof onMediaAdded === 'function') {
      onMediaAdded(el);
    }
  };

  // Initial full scan
  const initialMedia = findAllMedia(options);
  for (const m of initialMedia) {
    handleMedia(m);
  }

  let observer = null;
  if (typeof MutationObserver !== 'undefined') {
    try {
      observer = new MutationObserver(mutations => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) {
              const tag = node.tagName?.toUpperCase?.();
              if (tag === 'VIDEO' || tag === 'AUDIO') {
                if (isValidMediaElement(node, options)) {
                  handleMedia(node);
                }
              }

              // Also scan nested elements (and shadowRoot if present)
              const nested = queryMediaDeep(node, new Set(), options);
              for (const n of nested) {
                handleMedia(n);
              }
            }
          }
        }
      });

      const rootEl = doc.documentElement || doc.body;
      if (rootEl) {
        observer.observe(rootEl, { childList: true, subtree: true });
      }
    } catch {}
  }

  return {
    disconnect: () => {
      if (observer) {
        try {
          observer.disconnect();
        } catch {}
        observer = null;
      }
    },
    scanNow: () => {
      const current = findAllMedia(options);
      for (const m of current) {
        handleMedia(m);
      }
      return current;
    },
  };
}

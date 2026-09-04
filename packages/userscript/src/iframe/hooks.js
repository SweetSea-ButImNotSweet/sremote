import { pageWindow, console_warn } from '../config.js';

// Global registry of all known ShadowRoots (both open and closed)
const knownShadowRoots = new Set();

export function getKnownShadowRoots() {
  return Array.from(knownShadowRoots);
}

export function setupMediaHooks({ trackMediaElement, onElementAdded }) {
  try {
    // Hook Element.prototype.attachShadow to capture all shadow roots (even mode: 'closed')
    const hookAttachShadowOn = targetProto => {
      if (!targetProto || targetProto.__sremote_attach_shadow_hooked__) return;
      try {
        const nativeAttachShadow = targetProto.attachShadow;
        if (typeof nativeAttachShadow === 'function') {
          targetProto.attachShadow = function (init) {
            const shadowRoot = nativeAttachShadow.call(this, init);
            if (shadowRoot) {
              knownShadowRoots.add(shadowRoot);

              // Observe mutations inside the newly created shadow root
              try {
                const shadowObserver = new MutationObserver(mutations => {
                  for (let i = 0; i < mutations.length; i++) {
                    const m = mutations[i];
                    if (m.addedNodes) {
                      for (let j = 0; j < m.addedNodes.length; j++) {
                        const node = m.addedNodes[j];
                        if (node.nodeType === 1) {
                          // ELEMENT_NODE
                          if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO' || node instanceof HTMLMediaElement) {
                            trackMediaElement(node);
                          }
                          if (typeof onElementAdded === 'function') {
                            onElementAdded(node);
                          }
                        }
                      }
                    }
                  }
                });
                shadowObserver.observe(shadowRoot, { childList: true, subtree: true });
              } catch {}
            }
            return shadowRoot;
          };
          targetProto.__sremote_attach_shadow_hooked__ = true;
        }
      } catch {}
    };

    const elemProto = window.Element?.prototype || (typeof globalThis !== 'undefined' && globalThis.Element?.prototype);
    if (elemProto) hookAttachShadowOn(elemProto);
    if (pageWindow?.Element?.prototype && pageWindow.Element.prototype !== elemProto) {
      hookAttachShadowOn(pageWindow.Element.prototype);
    }

    // Hook Audio constructor on both pageWindow and window
    const hookAudioConstructorOn = targetWin => {
      if (!targetWin) return;
      try {
        const NativeAudio = targetWin.Audio;
        if (typeof NativeAudio === 'function' && !NativeAudio.__sremote_hooked__) {
          const HookedAudio = function (...args) {
            const instance = new NativeAudio(...args);
            trackMediaElement(instance);
            return instance;
          };
          HookedAudio.prototype = NativeAudio.prototype;
          HookedAudio.__sremote_hooked__ = true;
          targetWin.Audio = HookedAudio;
        }
      } catch {}
    };

    hookAudioConstructorOn(window);
    if (pageWindow && pageWindow !== window) hookAudioConstructorOn(pageWindow);

    // Hook Document.prototype.createElement
    const hookCreateElementOn = targetDocProto => {
      if (!targetDocProto || targetDocProto.__sremote_hooked__) return;
      try {
        const nativeCreateElement = targetDocProto.createElement;
        if (typeof nativeCreateElement === 'function') {
          targetDocProto.createElement = function (tagName, options) {
            const el = nativeCreateElement.call(this, tagName, options);
            if (typeof tagName === 'string') {
              const lower = tagName.toLowerCase();
              if (lower === 'audio' || lower === 'video') {
                trackMediaElement(el);
              }
            }
            return el;
          };
          targetDocProto.__sremote_hooked__ = true;
        }
      } catch {}
    };

    hookCreateElementOn(Document.prototype);
    if (pageWindow?.Document?.prototype && pageWindow.Document.prototype !== Document.prototype) {
      hookCreateElementOn(pageWindow.Document.prototype);
    }

    // Hook HTMLMediaElement.prototype.play
    const hookMediaPlayOn = targetMediaProto => {
      if (!targetMediaProto || targetMediaProto.__sremote_play_hooked__) return;
      try {
        const nativePlay = targetMediaProto.play;
        if (typeof nativePlay === 'function') {
          targetMediaProto.play = function (...args) {
            trackMediaElement(this);
            return nativePlay.apply(this, args);
          };
          targetMediaProto.__sremote_play_hooked__ = true;
        }
      } catch {}
    };

    hookMediaPlayOn(HTMLMediaElement.prototype);
    if (pageWindow?.HTMLMediaElement?.prototype && pageWindow.HTMLMediaElement.prototype !== HTMLMediaElement.prototype) {
      hookMediaPlayOn(pageWindow.HTMLMediaElement.prototype);
    }

    // Global capture-phase event listener for media activity
    const onAnyMediaActivity = ev => {
      const el = ev.target;
      if (el && (el.tagName === 'AUDIO' || el.tagName === 'VIDEO' || el instanceof HTMLMediaElement)) {
        trackMediaElement(el);
      }
    };
    window.addEventListener('play', onAnyMediaActivity, true);
    window.addEventListener('loadeddata', onAnyMediaActivity, true);
    if (pageWindow && pageWindow !== window) {
      try {
        pageWindow.addEventListener('play', onAnyMediaActivity, true);
        pageWindow.addEventListener('loadeddata', onAnyMediaActivity, true);
      } catch {}
    }
  } catch (e) {
    console_warn('[sremote] Media constructors hook warning:', e);
  }
}

/**
 * Creates a defensive dummy Proxy that warns if SRemote userscript is missing.
 * Prevents malicious third-party or ad scripts from hijacking window.sremote.
 */
export function createDummyProxy() {
  const dummyTarget = { isDummy: true, isUserscriptAvailable: () => false };

  return new Proxy(dummyTarget, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'symbol' || prop === 'inspect' || prop === 'toJSON') return undefined;

      // Return a function for any method call that warns the developer
      return (..._args) => {
        console.warn(`[SRemote:Wrapper] SRemote userscript is not installed. '${String(prop)}()' cannot control cross-domain iframes.`);
        return undefined;
      };
    },
    set() {
      // Prevent modification
      return true;
    },
  });
}

let dummyProxyInstance = null;
let currentGlobalInstance = null;

export function isNativeSRemoteInstance(target) {
  if (!target || typeof target !== 'object') return false;
  if (target.isDummy) return false;
  try {
    if (target.isSremoteNative === true) return true;
    if (target[Symbol.for('__sremote_native__')] === true) return true;
  } catch {}
  // Also check signature shape if functions match expected userscript API
  return typeof target.play === 'function' && typeof target.useAdapter === 'function' && typeof target.assignId === 'function';
}

/**
 * Guard window.sremote if Userscript has not yet injected.
 * Uses configurable: true and writable: true (or getter/setter) so that
 * when the userscript loads (or injects later), it can seamlessly overwrite window.sremote.
 */
export function lockGlobalSRemoteIfAbsent() {
  if (typeof window === 'undefined') return;

  // If window.sremote is already defined by userscript, do not override it
  if (window.sremote && isNativeSRemoteInstance(window.sremote)) return;

  if (!dummyProxyInstance) {
    dummyProxyInstance = createDummyProxy();
  }
  if (!currentGlobalInstance) {
    currentGlobalInstance = dummyProxyInstance;
  }

  try {
    const existingDescriptor = Object.getOwnPropertyDescriptor(window, 'sremote');
    // If descriptor exists and is not configurable or already locked with native API, skip
    if (existingDescriptor && !existingDescriptor.configurable && !existingDescriptor.set) {
      return;
    }

    Object.defineProperty(window, 'sremote', {
      get() {
        return currentGlobalInstance;
      },
      set(newVal) {
        if (isNativeSRemoteInstance(newVal)) {
          currentGlobalInstance = newVal;
          // Lock down permanently once genuine userscript is injected
          try {
            Object.defineProperty(window, 'sremote', { value: newVal, writable: false, configurable: false, enumerable: true });
          } catch {}
        } else {
          console.warn('[SRemote:Wrapper] Blocked unauthorized attempt to overwrite window.sremote by external script.');
        }
      },
      configurable: true,
      enumerable: true,
    });
  } catch {
    try {
      if (!window.sremote || window.sremote.isDummy) {
        window.sremote = dummyProxyInstance;
      }
    } catch {}
  }
}

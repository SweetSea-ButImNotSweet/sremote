/**
 * Safe Native HTMLMediaElement Accessors & Invokers.
 *
 * Bypasses third-party prototype monkey-patching or overrides (e.g. Bilibili Dash/Nano,
 * customized video players) by caching and invoking original HTMLMediaElement descriptors.
 */

const mediaProto = typeof HTMLMediaElement !== 'undefined' ? HTMLMediaElement.prototype : null;

/**
 * Standard media element prototype property descriptors cache
 */
export const nativeMediaDescriptors = {
  play: typeof mediaProto?.play === 'function' ? mediaProto.play : null,
  pause: typeof mediaProto?.pause === 'function' ? mediaProto.pause : null,
  currentTime: mediaProto && typeof Object.getOwnPropertyDescriptor === 'function' ? Object.getOwnPropertyDescriptor(mediaProto, 'currentTime') : null,
  volume: mediaProto && typeof Object.getOwnPropertyDescriptor === 'function' ? Object.getOwnPropertyDescriptor(mediaProto, 'volume') : null,
  muted: mediaProto && typeof Object.getOwnPropertyDescriptor === 'function' ? Object.getOwnPropertyDescriptor(mediaProto, 'muted') : null,
  playbackRate: mediaProto && typeof Object.getOwnPropertyDescriptor === 'function' ? Object.getOwnPropertyDescriptor(mediaProto, 'playbackRate') : null,
  paused: mediaProto && typeof Object.getOwnPropertyDescriptor === 'function' ? Object.getOwnPropertyDescriptor(mediaProto, 'paused') : null,
  duration: mediaProto && typeof Object.getOwnPropertyDescriptor === 'function' ? Object.getOwnPropertyDescriptor(mediaProto, 'duration') : null,
};

/**
 * Gets a property value using native HTMLMediaElement descriptor getter when available,
 * falling back to direct element property access.
 *
 * @template T
 * @param {HTMLMediaElement|any} el
 * @param {keyof typeof nativeMediaDescriptors} prop
 * @param {T} [defaultValue]
 * @returns {any}
 */
export function getNativeMediaProp(el, prop, defaultValue) {
  if (!el) return defaultValue;
  try {
    const desc = nativeMediaDescriptors[prop];
    if (desc?.get) {
      const val = desc.get.call(el);
      return val !== undefined ? val : defaultValue;
    }
    const val = el[prop];
    return val !== undefined ? val : defaultValue;
  } catch {
    return el[prop] !== undefined ? el[prop] : defaultValue;
  }
}

/**
 * Sets a property value using native HTMLMediaElement descriptor setter when available,
 * falling back to direct assignment.
 *
 * @param {HTMLMediaElement|any} el
 * @param {keyof typeof nativeMediaDescriptors} prop
 * @param {any} val
 * @returns {boolean} Whether setting succeeded
 */
export function setNativeMediaProp(el, prop, val) {
  if (!el) return false;
  try {
    const desc = nativeMediaDescriptors[prop];
    if (desc?.set) {
      desc.set.call(el, val);
      return true;
    }
    el[prop] = val;
    return true;
  } catch {
    try {
      el[prop] = val;
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Invokes a native media method (e.g. 'play', 'pause') directly from prototype.
 *
 * @param {HTMLMediaElement|any} el
 * @param {'play'|'pause'} method
 * @param {...any} args
 * @returns {any}
 */
export function callNative(el, method, ...args) {
  if (!el) return undefined;
  const fn = nativeMediaDescriptors[method];
  if (typeof fn === 'function') {
    return fn.apply(el, args);
  }
  if (typeof el[method] === 'function') {
    return el[method](...args);
  }
  return undefined;
}

// Backward-compatibility alias
export const callNativeMediaMethod = callNative;

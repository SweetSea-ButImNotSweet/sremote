export function isNativeSRemoteInstance(target) {
  if (!target || typeof target !== 'object') return false;
  if (target.isDummy) return false;
  try {
    if (target.isSremoteNative === true) return true;
    if (target[Symbol.for('__sremote_native__')] === true) return true;
    if (target[Symbol.for('__sremote_driver__')] === true) return true;
  } catch {}
  // Also check signature shape if functions match expected driver/userscript API
  return typeof target.play === 'function' && (typeof target.assignId === 'function' || Boolean(target.instances?.assign) || Boolean(target.instances?.getIframe));
}

/**
 * Guard window.sremote if absent.
 * When SDK is present, it claims window.sremote cleanly.
 */
export function lockGlobalSRemoteIfAbsent() {
  // No-op: window.sremote is now strictly owned and managed by SRemoteClient singleton in SDK
}

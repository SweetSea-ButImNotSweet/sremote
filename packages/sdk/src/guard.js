export function isNativeSRemoteInstance(target) {
  if (!target || typeof target !== 'object') return false;
  try {
    if (target.isSremoteNative === true) return true;
    if (target[Symbol.for('__sremote_native_driver__')] || target[Symbol.for('__sremote_native__')] || target[Symbol.for('__sremote_driver__')]) return true;
  } catch {}
  // Also check signature shape if functions match expected driver/userscript API
  return typeof target.play === 'function' && (typeof target.assignId === 'function' || Boolean(target.instances?.assign) || Boolean(target.instances?.getIframe));
}

// GM API Bridge & Storage Helper
import { GM_getValue, GM_setValue, GM_deleteValue, GM_listValues, GM_registerMenuCommand } from '$';

export const GM = {
  get: GM_getValue,
  set: GM_setValue,
  remove: GM_deleteValue,
  list: GM_listValues,
  register: typeof GM_registerMenuCommand === 'function' ? GM_registerMenuCommand : null,
};

export const Storage = {
  get(key, defaultValue = null) {
    try {
      const val = GM.get(key, null);
      if (val !== undefined && val !== null) return val;
    } catch {}
    return defaultValue;
  },
  set(key, value) {
    try {
      GM.set(key, value);
    } catch {}
  },
  remove(key) {
    try {
      GM.remove(key);
    } catch {}
  },
  list() {
    try {
      return GM.list() || [];
    } catch {
      return [];
    }
  },
  clearAllsremoteData() {
    const allKeys = this.list();
    for (const k of allKeys) {
      if (typeof k === 'string' && (k.startsWith('sremote:') || k.startsWith('sremote_'))) {
        this.remove(k);
      }
    }
  },
};

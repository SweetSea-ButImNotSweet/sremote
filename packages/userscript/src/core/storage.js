// GM API Bridge & Storage Helper
import { GM_getValue, GM_setValue, GM_deleteValue, GM_listValues, GM_registerMenuCommand } from '$';

export const GM = {
  get: GM_getValue,
  set: GM_setValue,
  remove: GM_deleteValue,
  list: GM_listValues,
  register: typeof GM_registerMenuCommand === 'function' ? GM_registerMenuCommand : null,
};

const ROOT_STORE_KEY = 'sremote_store';

function getDefaultRootStore() {
  return { version: 1, permissions: {}, auth: {}, preferences: { logLevel: null, hiddenBadges: {} } };
}

const rawStorage = {
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
};

function getRawStore() {
  const raw = rawStorage.get(ROOT_STORE_KEY, null);
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return {
      version: raw.version || 1,
      permissions: raw.permissions && typeof raw.permissions === 'object' ? raw.permissions : {},
      auth: raw.auth && typeof raw.auth === 'object' ? raw.auth : {},
      preferences: {
        logLevel: raw.preferences?.logLevel || null,
        hiddenBadges: raw.preferences?.hiddenBadges && typeof raw.preferences.hiddenBadges === 'object' ? raw.preferences.hiddenBadges : {},
      },
    };
  }
  return getDefaultRootStore();
}

function saveRawStore(storeData) {
  rawStorage.set(ROOT_STORE_KEY, storeData);
}

function updateStore(mutator) {
  const current = getRawStore();
  mutator(current);
  saveRawStore(current);
  return current;
}

export const Storage = {
  // 1. Primitive / Raw storage operations (used for IPC or direct access)
  raw: rawStorage,

  // 2. Permissions Management: permissions[parentOrigin][iframeOrigin] = 1 (allow) | 0 (deny)
  permissions: {
    get(parentOrigin, iframeOrigin) {
      const store = getRawStore();
      const parentKey = parentOrigin || '*';
      if (iframeOrigin) {
        if (store.permissions[parentKey]?.[iframeOrigin] !== undefined) {
          return store.permissions[parentKey][iframeOrigin];
        }
        if (store.permissions['*']?.[iframeOrigin] !== undefined) {
          return store.permissions['*'][iframeOrigin];
        }
      }
      return null;
    },

    set(parentOrigin, iframeOrigin, decision) {
      const parentKey = parentOrigin || '*';
      if (!iframeOrigin) return;
      updateStore(store => {
        if (!store.permissions[parentKey]) {
          store.permissions[parentKey] = {};
        }
        store.permissions[parentKey][iframeOrigin] = Number(decision);
      });
    },

    remove(parentOrigin, iframeOrigin = null) {
      updateStore(store => {
        const parentKey = parentOrigin || '*';
        if (!iframeOrigin) {
          delete store.permissions[parentKey];
          for (const p of Object.keys(store.permissions)) {
            if (store.permissions[p]?.[parentOrigin] !== undefined) {
              delete store.permissions[p][parentOrigin];
            }
          }
        } else if (store.permissions[parentKey]) {
          delete store.permissions[parentKey][iframeOrigin];
          if (Object.keys(store.permissions[parentKey]).length === 0) {
            delete store.permissions[parentKey];
          }
        }
      });
    },
  },

  // 3. Auth & Domain Lock Management: auth[hostDomain] = { passkey: string|null, locked: boolean }
  auth: {
    get(hostDomain) {
      if (!hostDomain) return { passkey: null, locked: false };
      const store = getRawStore();
      const domainAuth = store.auth[hostDomain] || {};
      return { passkey: domainAuth.passkey || null, locked: Boolean(domainAuth.locked) };
    },

    setPasskey(hostDomain, passkey) {
      if (!hostDomain) return;
      updateStore(store => {
        if (!store.auth[hostDomain]) {
          store.auth[hostDomain] = { passkey: null, locked: false };
        }
        store.auth[hostDomain].passkey = passkey;
      });
    },

    removePasskey(hostDomain) {
      if (!hostDomain) return;
      updateStore(store => {
        if (store.auth[hostDomain]) {
          store.auth[hostDomain].passkey = null;
          if (!store.auth[hostDomain].locked) {
            delete store.auth[hostDomain];
          }
        }
      });
    },

    setLocked(hostDomain, locked) {
      if (!hostDomain) return;
      updateStore(store => {
        if (!store.auth[hostDomain]) {
          store.auth[hostDomain] = { passkey: null, locked: false };
        }
        store.auth[hostDomain].locked = Boolean(locked);
      });
    },

    isLocked(hostDomain) {
      return this.get(hostDomain).locked;
    },
  },

  // 4. Preferences Management (log level, hidden badges)
  preferences: {
    getLogLevel() {
      return getRawStore().preferences.logLevel;
    },

    setLogLevel(level) {
      updateStore(store => {
        store.preferences.logLevel = level;
      });
    },

    isBadgeHidden(origin) {
      if (!origin) return false;
      return Boolean(getRawStore().preferences.hiddenBadges[origin]);
    },

    setBadgeHidden(origin, hidden = true) {
      if (!origin) return;
      updateStore(store => {
        if (hidden) {
          store.preferences.hiddenBadges[origin] = true;
        } else {
          delete store.preferences.hiddenBadges[origin];
        }
      });
    },

    unhideAllBadges() {
      updateStore(store => {
        store.preferences.hiddenBadges = {};
      });
    },
  },

  // 5. Cleanup & Maintenance
  clearPersistentStore() {
    rawStorage.remove(ROOT_STORE_KEY);
  },

  clearIPCData() {
    const keys = rawStorage.list();
    for (const k of keys) {
      if (
        typeof k === 'string' &&
        (k.startsWith('sremote:ipc:') || k.startsWith('sremote:query_req') || k.startsWith('sremote:report:') || k.startsWith('sremote:latest_handshake:'))
      ) {
        rawStorage.remove(k);
      }
    }
  },

  clearAll() {
    const allKeys = rawStorage.list();
    for (const k of allKeys) {
      if (typeof k === 'string' && (k.startsWith('sremote:') || k.startsWith('sremote_'))) {
        rawStorage.remove(k);
      }
    }
  },
};

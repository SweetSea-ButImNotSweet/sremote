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

// In-Memory Handshake Secrets Store
const activeHandshakeSecrets = new Map();

export function setHandshakeSecret(handshakeId, token) {
  if (!handshakeId || !token) return;
  const record = { token, created: Date.now() };
  activeHandshakeSecrets.set(handshakeId, record);
  Storage.set(`sremote:hs_${handshakeId}`, record);
}

export function checkHandshakeSecret(handshakeId, token, maxAgeMs = 30000) {
  if (!handshakeId || !token) return false;
  const now = Date.now();

  // 1. Check in-memory secrets
  const mem = activeHandshakeSecrets.get(handshakeId);
  if (mem && mem.token === token && now - (mem.created || 0) <= maxAgeMs) {
    return true;
  }

  // 2. Check GM Storage fallback
  const raw = Storage.get(`sremote:hs_${handshakeId}`);
  if (raw) {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (data && data.token === token && now - (data.created || 0) <= maxAgeMs) {
        return true;
      }
    } catch {}
  }

  return false;
}

export function consumeHandshakeSecret(handshakeId) {
  if (!handshakeId) return;
  activeHandshakeSecrets.delete(handshakeId);
  Storage.remove(`sremote:hs_${handshakeId}`);
}

export function verifyHandshakeSecret(handshakeId, token, maxAgeMs = 30000) {
  const isValid = checkHandshakeSecret(handshakeId, token, maxAgeMs);
  if (isValid) {
    consumeHandshakeSecret(handshakeId);
  }
  return isValid;
}

// Auto-Purge expired handshake secrets from memory and GM Storage
export function purgeExpiredHandshakeSecrets(maxAgeMs = 60000) {
  const now = Date.now();
  for (const [id, item] of activeHandshakeSecrets.entries()) {
    if (now - (item.created || 0) > maxAgeMs) {
      activeHandshakeSecrets.delete(id);
    }
  }
  try {
    const keys = Storage.list();
    for (const k of keys) {
      if (typeof k === 'string' && k.startsWith('sremote:hs_')) {
        const raw = Storage.get(k);
        if (!raw) {
          Storage.remove(k);
          continue;
        }
        try {
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (!data || !data.created || now - data.created > maxAgeMs) {
            Storage.remove(k);
          }
        } catch {
          Storage.remove(k);
        }
      }
    }
  } catch {}
}

// Run initial purge at startup and schedule periodic sweeps
try {
  purgeExpiredHandshakeSecrets();
  setInterval(purgeExpiredHandshakeSecrets, 60000);
} catch {}

export function safeGetProp(el, descriptor, fallbackProp) {
  if (!el) return undefined;
  try {
    if (descriptor?.get) return descriptor.get.call(el);
  } catch {}
  return el[fallbackProp];
}

export function safeSetProp(el, descriptor, fallbackProp, val) {
  if (!el) return;
  try {
    if (descriptor?.set) {
      descriptor.set.call(el, val);
      return;
    }
  } catch {}
  try {
    el[fallbackProp] = val;
  } catch {}
}

export function isPersistableOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  const trimmed = origin.trim();
  if (!trimmed || trimmed === 'null' || trimmed === '*' || trimmed === 'unknown_parent') return false;
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return false;
  return true;
}

export function getOriginStorageKeys(origin) {
  if (!isPersistableOrigin(origin)) {
    return { allowKey: null, denyKey: null, hideBadgeKey: null };
  }
  return { allowKey: `sremote:allow:${origin}`, denyKey: `sremote:deny:${origin}`, hideBadgeKey: `sremote:hide_badge:${origin}` };
}

/**
 * Generates storage keys for a ParentOrigin -> IframeOrigin permission pair.
 * Prevents blocking child player instances globally when denied on a specific parent.
 */
export function getPermissionPairStorageKeys(parentOrigin, iframeOrigin) {
  const isParentPersistable = isPersistableOrigin(parentOrigin);
  const isIframePersistable = isPersistableOrigin(iframeOrigin);
  if (!isParentPersistable || !isIframePersistable) {
    return { pairAllowKey: null, pairDenyKey: null, isPersistable: false };
  }
  return { pairAllowKey: `sremote:allow:${parentOrigin}->${iframeOrigin}`, pairDenyKey: `sremote:deny:${parentOrigin}->${iframeOrigin}`, isPersistable: true };
}

/**
 * Checks if a ParentOrigin -> IframeOrigin pair is granted or denied.
 * Supports fallback to legacy single-origin keys for seamless backward compatibility.
 */
export function checkOriginPairPermission(parentOrigin, iframeOrigin, storage) {
  if (!storage || typeof storage.get !== 'function') {
    return { isAllowed: false, isDenied: false, isPersisted: false };
  }

  // 1. Check pair keys first (highest precedence)
  const { pairAllowKey, pairDenyKey, isPersistable } = getPermissionPairStorageKeys(parentOrigin, iframeOrigin);
  if (isPersistable) {
    if (pairDenyKey && storage.get(pairDenyKey) === '1') {
      return { isAllowed: false, isDenied: true, isPersisted: true, key: pairDenyKey };
    }
    if (pairAllowKey && storage.get(pairAllowKey) === '1') {
      return { isAllowed: true, isDenied: false, isPersisted: true, key: pairAllowKey };
    }
  }

  // 2. Legacy fallback: check parent allow or iframe allow key if previously persisted
  const { allowKey: parentAllowKey, denyKey: parentDenyKey } = getOriginStorageKeys(parentOrigin);
  const { allowKey: iframeAllowKey } = getOriginStorageKeys(iframeOrigin);

  if (parentDenyKey && storage.get(parentDenyKey) === '1') {
    return { isAllowed: false, isDenied: true, isPersisted: true, key: parentDenyKey };
  }
  if (parentAllowKey && storage.get(parentAllowKey) === '1') {
    return { isAllowed: true, isDenied: false, isPersisted: true, key: parentAllowKey };
  }
  if (iframeAllowKey && storage.get(iframeAllowKey) === '1') {
    return { isAllowed: true, isDenied: false, isPersisted: true, key: iframeAllowKey };
  }

  return { isAllowed: false, isDenied: false, isPersisted: false };
}

export function generateInstanceId(prefix = 'sv') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

export function createButton({ className, text, title, onClick }) {
  const btn = document.createElement('button');
  if (className) btn.className = className;
  if (text !== undefined && text !== null) btn.textContent = text;
  if (title) btn.title = title;
  if (typeof onClick === 'function') {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      onClick(e);
    });
  }
  return btn;
}

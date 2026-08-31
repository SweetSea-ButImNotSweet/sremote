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

export function generateInstanceId(prefix = 'sv') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

export function getMeta(selectors) {
  for (const s of selectors) {
    const el = document.querySelector(s);
    const val = el?.getAttribute('content') || el?.getAttribute('href');
    if (val) return val.trim();
  }
  return '';
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

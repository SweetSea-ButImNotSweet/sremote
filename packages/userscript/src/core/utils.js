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

export function normalizeOrigin(origin) {
  if (!origin || typeof origin !== 'string') return '';
  const trimmed = origin.trim();
  if (!trimmed || trimmed === 'null' || trimmed === '*' || trimmed === 'unknown_parent') return '';
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return '';
  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch {
    // If not a full URL with scheme, strip trailing slashes
    return trimmed.replace(/\/+$/, '').toLowerCase();
  }
}

import { Storage } from './storage.js';

/**
 * Checks if a ParentOrigin -> IframeOrigin pair is granted or denied in Storage.permissions.
 */
export function checkOriginPairPermission(parentOrigin, iframeOrigin) {
  const normParent = normalizeOrigin(parentOrigin);
  const normIframe = normalizeOrigin(iframeOrigin);

  const decision = Storage.permissions.get(normParent, normIframe);
  if (decision === 1) {
    return { isAllowed: true, isDenied: false, isPersisted: true };
  }
  if (decision === 0) {
    return { isAllowed: false, isDenied: true, isPersisted: true };
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

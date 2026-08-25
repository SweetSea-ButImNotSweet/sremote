// ==UserScript==
// @name         SRemote Frame Controller
// @namespace    sweetsea.sremote
// @version      2.0.0
// @description  Allow a parent page to control media inside an iframe with permission.
// @match        *://*/*
// @match        http://*/*
// @match        https://*/*
// @match        file:///*
// @include      *
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// ==/UserScript==

/* eslint-disable no-undef */
/* eslint-disable react/no-unnecessary-use-prefix*/
(function SRemoteMain() {
  'use strict';
  const SHOW_DEBUG_LOG = true;

  const console_log = SHOW_DEBUG_LOG ? console.log : () => {};
  const console_debug = SHOW_DEBUG_LOG ? console.debug : () => {};
  const console_warn = SHOW_DEBUG_LOG ? console.warn : () => {};
  const console_error = SHOW_DEBUG_LOG ? console.error : () => {};

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // ==========================================================================
  // Mock MediaMetadata (Polyfill / Fallback State Container)
  // ==========================================================================
  class MockMediaMetadata {
    constructor(init = {}) {
      this.title = init.title || '';
      this.artist = init.artist || '';
      this.album = init.album || '';
      this.artwork = Array.isArray(init.artwork) ? Object.freeze([...init.artwork]) : Object.freeze([]);
    }
  }

  if (typeof MediaMetadata === 'undefined') {
    try {
      window.MediaMetadata = MockMediaMetadata;
    } catch {}
  }

  // ==========================================================================
  // MODULE 0: sremote Core (Shared Utilities, Signals, Security & Descriptors)
  // ==========================================================================
  const SRemoteCore = (function initsremoteCore() {
    const VERSION = '2.0.0';
    const NS = 'sremote:';

    // GM API Bridge
    const GM = {
      get: typeof GM_getValue === 'function' ? GM_getValue : null,
      set: typeof GM_setValue === 'function' ? GM_setValue : null,
      remove: typeof GM_deleteValue === 'function' ? GM_deleteValue : null,
      list: typeof GM_listValues === 'function' ? GM_listValues : null,
      register: typeof GM_registerMenuCommand === 'function' ? GM_registerMenuCommand : null,
    };

    // In-memory runtime fallback storage (if GM APIs are absent, keeps session clean without localStorage)
    const memoryStore = new Map();

    // Universal Storage Helper (Pure GM Storage with in-memory fallback)
    const Storage = {
      get(key, defaultValue = null) {
        try {
          if (GM.get) {
            const val = GM.get(key, null);
            if (val !== undefined && val !== null) return val;
          }
        } catch {}
        return memoryStore.has(key) ? memoryStore.get(key) : defaultValue;
      },
      set(key, value) {
        try {
          if (GM.set) {
            GM.set(key, value);
            return;
          }
        } catch {}
        memoryStore.set(key, value);
      },
      remove(key) {
        try {
          if (GM.remove) GM.remove(key);
        } catch {}
        memoryStore.delete(key);
      },
      list() {
        const keySet = new Set();
        try {
          const gmKeys = GM.list?.() || [];
          for (let i = 0; i < gmKeys.length; i++) keySet.add(gmKeys[i]);
        } catch {}
        for (const k of memoryStore.keys()) keySet.add(k);
        return Array.from(keySet);
      },
      clearAllsremoteData() {
        const allKeys = this.list();
        for (const k of allKeys) {
          if (typeof k === 'string' && (k.startsWith('sremote:') || k.startsWith('sremote_'))) {
            this.remove(k);
          }
        }
        memoryStore.clear();
      },
    };

    // HTML5 Standard Media Events
    const MEDIA_EVENTS = [
      'play',
      'pause',
      'playing',
      'ended',
      'timeupdate',
      'durationchange',
      'volumechange',
      'ratechange',
      'seeking',
      'seeked',
      'progress',
      'canplay',
      'canplaythrough',
      'waiting',
      'stalled',
      'emptied',
      'abort',
      'error',
      'loadeddata',
      'loadedmetadata',
      'loadstart',
      'suspend',
      'encrypted',
      'enterpictureinpicture',
      'exitpictureinpicture',
    ];

    // Native HTMLMediaElement property descriptors
    const mediaProto = HTMLMediaElement.prototype;
    const descriptors = {
      volume: Object.getOwnPropertyDescriptor(mediaProto, 'volume'),
      muted: Object.getOwnPropertyDescriptor(mediaProto, 'muted'),
      currentTime: Object.getOwnPropertyDescriptor(mediaProto, 'currentTime'),
      duration: Object.getOwnPropertyDescriptor(mediaProto, 'duration'),
      paused: Object.getOwnPropertyDescriptor(mediaProto, 'paused'),
      ended: Object.getOwnPropertyDescriptor(mediaProto, 'ended'),
      playbackRate: Object.getOwnPropertyDescriptor(mediaProto, 'playbackRate'),
      readyState: Object.getOwnPropertyDescriptor(mediaProto, 'readyState'),
      currentSrc: Object.getOwnPropertyDescriptor(mediaProto, 'currentSrc'),
      src: Object.getOwnPropertyDescriptor(mediaProto, 'src'),
      buffered: Object.getOwnPropertyDescriptor(mediaProto, 'buffered'),
      play: mediaProto.play,
      pause: mediaProto.pause,
    };

    function safeGetProp(el, descriptor, fallbackProp) {
      if (!el) return undefined;
      try {
        if (descriptor?.get) return descriptor.get.call(el);
      } catch {}
      return el[fallbackProp];
    }

    function safeSetProp(el, descriptor, fallbackProp, val) {
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

    // Security & Origin Validators
    const DANGEROUS_KEYS = new Set([
      '__proto__',
      'prototype',
      'constructor',
      'toString',
      'valueOf',
      'eval',
      'Function',
      'Object',
      'Array',
      'window',
      'document',
      'location',
    ]);

    function isSafeIdentifier(key) {
      if (typeof key !== 'string') return false;
      const trimmed = key.trim();
      if (!trimmed || trimmed.length > 80) return false;
      if (DANGEROUS_KEYS.has(trimmed)) return false;
      return /^[a-z_$][\w$]*$/i.test(trimmed);
    }

    function isPersistableOrigin(origin) {
      if (!origin || typeof origin !== 'string') return false;
      const trimmed = origin.trim();
      if (!trimmed || trimmed === 'null' || trimmed === '*' || trimmed === 'unknown_parent') return false;
      if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return false;
      return true;
    }

    function getOriginStorageKeys(origin) {
      if (!isPersistableOrigin(origin)) {
        return { allowKey: null, denyKey: null, hideBadgeKey: null };
      }
      return {
        allowKey: `sremote:allow:${origin}`,
        denyKey: `sremote:deny:${origin}`,
        hideBadgeKey: `sremote:hide_badge:${origin}`,
      };
    }

    // Sliding Window Rate Limiter
    class RateLimiter {
      constructor(maxAllowed = 6, windowMs = 10000, blockDurationMs = 60000) {
        this.maxAllowed = maxAllowed;
        this.windowMs = windowMs;
        this.blockDurationMs = blockDurationMs;
        this.records = new Map();
      }

      isLimited(key = 'default') {
        const now = Date.now();
        let record = this.records.get(key);
        if (!record) {
          record = { count: 1, lastTime: now, blockedUntil: 0 };
          this.records.set(key, record);
          return false;
        }
        if (now < record.blockedUntil) return true;
        if (now - record.lastTime > this.windowMs) {
          record.count = 1;
          record.lastTime = now;
          return false;
        }
        record.count++;
        record.lastTime = now;
        if (record.count > this.maxAllowed) {
          record.blockedUntil = now + this.blockDurationMs;
          console_warn(`[sremote] Rate limit exceeded for '${key}'. Blocked for ${this.blockDurationMs / 1000}s.`);
          return true;
        }
        return false;
      }
    }

    // Generate random instance ID
    function generateInstanceId(prefix = 'sv') {
      return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
    }

    // In-Memory Handshake Secrets Store (Instant & Zero IO overhead)
    const activeHandshakeSecrets = new Map();

    function setHandshakeSecret(handshakeId, token) {
      if (!handshakeId || !token) return;
      const record = { token, created: Date.now() };
      activeHandshakeSecrets.set(handshakeId, record);
      Storage.set(`sremote:hs_${handshakeId}`, record);
    }

    function checkHandshakeSecret(handshakeId, token, maxAgeMs = 30000) {
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

    function consumeHandshakeSecret(handshakeId) {
      if (!handshakeId) return;
      activeHandshakeSecrets.delete(handshakeId);
      Storage.remove(`sremote:hs_${handshakeId}`);
    }

    function verifyHandshakeSecret(handshakeId, token, maxAgeMs = 30000) {
      const isValid = checkHandshakeSecret(handshakeId, token, maxAgeMs);
      if (isValid) {
        consumeHandshakeSecret(handshakeId);
      }
      return isValid;
    }

    // Auto-Purge expired handshake secrets from memory and GM Storage
    function purgeExpiredHandshakeSecrets(maxAgeMs = 60000) {
      const now = Date.now();
      // 1. Purge in-memory map
      for (const [id, item] of activeHandshakeSecrets.entries()) {
        if (now - (item.created || 0) > maxAgeMs) {
          activeHandshakeSecrets.delete(id);
        }
      }
      // 2. Purge GM Storage
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

    function getMeta(selectors) {
      for (const s of selectors) {
        const el = document.querySelector(s);
        const val = el?.getAttribute('content') || el?.getAttribute('href');
        if (val) return val.trim();
      }
      return '';
    }

    // UI Stylesheet
    const UI_CSS = `
      :host { all: initial; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .sv-btn, .sv-action-btn {
        font-family: inherit; cursor: pointer; line-height: 1.2;
        border: 1px solid #334155; background: #1e293b; color: #94a3b8;
        transition: all 0.15s ease;
      }
      .sv-action-btn { font-size: 10.5px; padding: 2px 6px; }
      .sv-action-btn:hover, .sv-btn-deny:hover { background: #334155; color: #ffffff; border-color: #475569; }
      .sv-btn { padding: 6px 14px; font-size: 13px; font-weight: 500; }
      .sv-btn-deny { color: #cbd5e1; }
      .sv-btn-allow { background: #0284c7; color: #ffffff; border-color: transparent; }
      .sv-btn-allow:hover { background: #0369a1; }
      .sv-badge-wrapper {
        position: fixed; left: 10px; bottom: 10px; z-index: 2147483646;
        display: inline-flex; align-items: center; gap: 6px;
        background: #0f172a; color: #f8fafc; font-size: 11px; font-weight: 500;
        padding: 4px 8px; border: 1px solid #334155; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        user-select: none; opacity: 0.85; transition: opacity 0.15s ease;
      }
      .sv-badge-wrapper:hover { opacity: 1; border-color: #475569; }
      .sv-dot-btn {
        width: 8px; height: 8px; background: #10b981; border-radius: 50%;
        display: inline-flex; align-items: center; justify-content: center;
        cursor: pointer; font-size: 9px; line-height: 1; font-weight: 700;
        color: transparent; border: none; padding: 0; transition: all 0.15s ease;
      }
      .sv-badge-wrapper:hover .sv-dot-btn { width: 14px; height: 14px; background: #7f1d1d; color: #fca5a5; }
      .sv-badge-wrapper:hover .sv-dot-btn:hover { background: #dc2626; color: #ffffff; }
      .sv-label { cursor: pointer; color: #f1f5f9; font-weight: 600; }
      .sv-actions { display: none; align-items: center; gap: 4px; margin-left: 2px; padding-left: 6px; border-left: 1px solid #334155; }
      .sv-badge-wrapper:hover .sv-actions { display: inline-flex; }
      .sv-tooltip {
        display: none; position: absolute; left: 0; bottom: 100%; padding-bottom: 4px;
        pointer-events: auto; min-width: 280px; max-width: min(450px, calc(100vw - 32px));
        box-sizing: border-box;
      }
      .sv-tooltip-inner {
        background: #0f172a; color: #cbd5e1; font-size: 11px; line-height: 1.5;
        padding: 10px 12px; border: 1px solid #334155; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
        white-space: pre-line; word-break: break-word;
      }
      .sv-badge-wrapper:hover .sv-tooltip, .sv-tooltip:hover { display: block; }
      .sv-link { color: #38bdf8; text-decoration: underline; word-break: break-all; }
      .sv-link:hover { color: #7dd3fc; }
      dialog {
        position: fixed; inset: 0; margin: auto; border: none; background: transparent;
        color: #f8fafc; font-size: 13.5px; box-sizing: border-box; z-index: 2147483647;
        display: flex; align-items: center; justify-content: center;
      }
      dialog:not([open]) { display: none; }
      dialog::backdrop { background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(2px); }
      .sv-box {
        width: min(380px, calc(100vw - 32px)); padding: 18px 20px; box-sizing: border-box;
        background: #0f172a; border: 1px solid #334155; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.85);
        border-radius: 8px; pointer-events: auto;
      }
      .sv-title { font-weight: 700; font-size: 15px; margin-bottom: 8px; color: #38bdf8; }
      .sv-text { margin-bottom: 14px; color: #94a3b8; font-size: 13px; line-height: 1.5; }
      .sv-remember {
        display: inline-flex; align-items: center; gap: 8px; margin-bottom: 18px;
        font-size: 12.5px; cursor: pointer; user-select: none; color: #94a3b8;
      }
      .sv-remember:hover { color: #f1f5f9; }
      .sv-remember input { cursor: pointer; margin: 0; accent-color: #38bdf8; }
      .sv-buttons { display: flex; gap: 8px; justify-content: flex-end; }
    `;

    const I18N = {
      vi: {
        dialogTitle: 'Cho phép điều khiển video?',
        dialogText: 'Trang này muốn điều khiển media trong iframe.',
        rememberChoice: 'Nhớ lựa chọn cho trang này',
        denyBtn: 'Từ chối',
        allowBtn: 'Đồng ý',
        badgeTooltipPrefix: 'Trang ',
        badgeTooltipSuffix: '\nđang điều khiển video này qua ',
        badgeDontShow: 'Đừng hiện lại',
        badgeDontShowTitle: 'Ẩn chỉ báo này cho trang hiện tại',
        badgeCloseTitle: 'Ẩn',
        menuReset: '🔄 Đặt lại quyền cho {domain}',
        menuUnhideBadge: '👁️ Hiện lại tất cả Badge đã ẩn',
        menuClearAll: '🧹 Xóa toàn bộ dữ liệu & quyền',
        menuGenerateKey: '🔑 Tạo & Copy Passkey ({domain})',
        menuDeleteKey: '🗑️ Xóa Passkey ({domain})',
        menuToggleLock: '🔒 Khóa SRemote chủ động ({domain})',
        targetTop: 'trang này (Top)',
        targetIframe: 'iframe này',
        alertResetDone: '[sremote] Đã reset quyền và chỉ báo cho: {origin}\n(Tải lại trang để áp dụng)',
        alertUnhideDone: '[sremote] Đã khôi phục hiển thị tất cả các badge sremote.',
        confirmClearAll: '[sremote] Bạn có chắc muốn xóa toàn bộ quyền và cài đặt của sremote?',
        alertClearDone: '[sremote] Đã dọn dẹp sạch toàn bộ dữ liệu của sremote.',
        alertKeyGenerated:
          '[sremote] Đã tạo & copy Passkey mới cho {domain} vào Clipboard:\n{key}\n\n(Dán key này vào App hoặc gọi sremote.hello({ key }) để xác thực)',
        alertKeyDeleted: '[sremote] Đã xóa Passkey của {domain}.\n(Tải lại trang để áp dụng)',
        alertLockEnabled: '[sremote] Đã kích hoạt Khóa SRemote cho {domain}.\nBất kỳ lệnh hello nào cũng bắt buộc phải có đúng Passkey!',
        alertLockDisabled: '[sremote] Đã mở khóa SRemote cho {domain}.',
      },
      en: {
        dialogTitle: 'Allow media control?',
        dialogText: 'This page wants to control media inside the frame.',
        rememberChoice: 'Remember for this site',
        denyBtn: 'Deny',
        allowBtn: 'Allow',
        badgeTooltipPrefix: 'Page ',
        badgeTooltipSuffix: '\nis controlling this video via ',
        badgeDontShow: "Don't show again",
        badgeDontShowTitle: 'Hide this indicator for the current site',
        badgeCloseTitle: 'Hide',
        menuReset: '🔄 Reset permissions for {target}',
        menuUnhideBadge: '👁️ Unhide all badges',
        menuClearAll: '🧹 Clear all data & permissions',
        menuGenerateKey: '🔑 Generate & Copy Passkey ({domain})',
        menuDeleteKey: '🗑️ Delete Passkey ({domain})',
        menuToggleLock: '🔒 Active Lock SRemote ({domain})',
        targetTop: 'this site (Top)',
        targetIframe: 'this iframe',
        alertResetDone: '[sremote] Reset permissions and badges for: {origin}\n(Reload page to apply)',
        alertUnhideDone: '[sremote] Restored display for all sremote badges.',
        confirmClearAll: '[sremote] Are you sure you want to clear all sremote permissions and settings?',
        alertClearDone: '[sremote] Cleaned up all sremote data.',
        alertKeyGenerated:
          '[sremote] Generated & copied new Passkey for {domain} to Clipboard:\n{key}\n\n(Paste this key in your App or pass to sremote.hello({ key }))',
        alertKeyDeleted: '[sremote] Deleted Passkey for {domain}.\n(Reload page to apply)',
        alertLockEnabled: '[sremote] Enabled SRemote Lock for {domain}.\nAny hello command now strictly requires valid Passkey!',
        alertLockDisabled: '[sremote] Disabled SRemote Lock for {domain}.',
      },
    };

    function t(key, params = {}) {
      const navLang = (navigator.language || navigator.userLanguage || 'vi').toLowerCase();
      const lang = navLang.startsWith('vi') ? 'vi' : 'en';
      let text = I18N[lang]?.[key] || I18N.en?.[key] || key;
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
      return text;
    }

    function createButton({ className, text, title, onClick }) {
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

    return {
      VERSION,
      NS,
      pageWindow,
      GM,
      Storage,
      MEDIA_EVENTS,
      descriptors,
      safeGetProp,
      safeSetProp,
      isSafeIdentifier,
      isPersistableOrigin,
      getOriginStorageKeys,
      RateLimiter,
      generateInstanceId,
      setHandshakeSecret,
      checkHandshakeSecret,
      consumeHandshakeSecret,
      verifyHandshakeSecret,
      getMeta,
      UI_CSS,
      t,
      createButton,
    };
  })();

  // ==========================================================================
  // MODULE 1: Parent Controller IIFE (Top Window Orchestrator)
  // ==========================================================================
  function initParentController() {
    const currentOrigin = location.origin;
    const { allowKey, denyKey, hideBadgeKey } = SRemoteCore.getOriginStorageKeys(currentOrigin);

    if (denyKey && SRemoteCore.Storage.get(denyKey) === '1') {
      console_log(
        `%c[SRemote] THIS PAGE IS BLOCKED PERMANENTLY!%c\nOrigin '${currentOrigin}' is in the permanent deny list. SRemote execution is aborted.\nUse the Tampermonkey menu to reset permissions if needed.`,
        'background: #ef4444; color: #ffffff; font-size: 24px; font-weight: 900; padding: 6px 12px; border-radius: 4px;',
        'color: #f87171; font-size: 13px; font-weight: bold;',
      );

      // Register emergency unlock/reset menu items so user is never permanently locked out
      try {
        if (SRemoteCore.GM.register) {
          SRemoteCore.GM.register(SRemoteCore.t('menuReset', { target: location.origin }), () => {
            [allowKey, denyKey, hideBadgeKey].forEach(k => k && SRemoteCore.Storage.remove(k));
            alert(SRemoteCore.t('alertResetDone', { origin: currentOrigin }));
          });
          SRemoteCore.GM.register(SRemoteCore.t('menuClearAll'), () => {
            if (!confirm(SRemoteCore.t('confirmClearAll'))) return;
            SRemoteCore.Storage.clearAllsremoteData();
            alert(SRemoteCore.t('alertClearDone'));
          });
        }
      } catch {}
      return;
    }

    console_log(
      `%c[sremote v${SRemoteCore.VERSION}] Parent Controller Initialized`,
      'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 2px 6px;',
    );

    // Reset GM hello sequence on top window boot
    SRemoteCore.Storage.set('sremote:hello_seq', 0);
    SRemoteCore.Storage.set('sremote:parent_origin', location.origin);

    const instances = new Map(); // instanceId -> { port, location, origin, note, state, mediaType, lastSeen }
    const parentAdaptersMap = new Map(); // adapterKey -> adapterObject
    let exclusiveMode = null; // null | 'auto' | instanceId
    let multiModeConfig = null; // null (auto-detect) | true (force multi) | false (force single)
    let currentActiveInstanceId = null; // Strictly tracks the latest authenticated active instance
    let isSessionLocked = false;

    function validateDomainAccess(providedKey = null) {
      const hostDomain = location.hostname || 'this_domain';
      const domainLockStorage = `sremote:locked:${hostDomain}`;
      const isDomainPersistentlyLocked = SRemoteCore.Storage.get(domainLockStorage) === '1';
      const isLocked = isSessionLocked || isDomainPersistentlyLocked;
      if (!isLocked) return true;

      const domainKeyStorage = `sremote:passkey:${hostDomain}`;
      const expectedKey = SRemoteCore.Storage.get(domainKeyStorage);
      const cleanKey = providedKey ? String(providedKey).trim() : null;

      return Boolean(expectedKey && cleanKey && cleanKey === expectedKey);
    }

    function isMultiModeActive() {
      if (typeof multiModeConfig === 'boolean') return multiModeConfig;
      // Auto-detect: Check alive instances and live iframes in DOM
      try {
        const liveIframes = document.querySelectorAll('iframe');
        if (liveIframes.length <= 1) return false;
      } catch {}
      return instances.size > 1;
    }

    function getLatestActiveInstanceId() {
      // 1. Direct active instance pointer
      if (currentActiveInstanceId && instances.has(currentActiveInstanceId)) {
        return currentActiveInstanceId;
      }

      // 2. Fallback: Scan latest seen instance
      let latestId = null;
      let latestTime = -1;
      for (const [id, item] of instances.entries()) {
        const seen = item.lastSeen || 0;
        if (seen > latestTime) {
          latestTime = seen;
          latestId = id;
        }
      }
      currentActiveInstanceId = latestId || Array.from(instances.keys())[instances.size - 1] || null;
      return currentActiveInstanceId;
    }

    let topPermissionHost = null;

    function showParentPermissionDialog(onDecision) {
      if (topPermissionHost) return;
      const origin = location.origin;
      const { allowKey, denyKey } = SRemoteCore.getOriginStorageKeys(origin);
      if (SRemoteCore.Storage.get(denyKey) === '1') {
        onDecision?.(false);
        return;
      }
      if (SRemoteCore.Storage.get(allowKey) === '1') {
        onDecision?.(true);
        return;
      }

      const host = document.createElement('div');
      host.id = 'sremote-top-permission-host';
      const shadow = host.attachShadow({ mode: 'closed' });

      const style = document.createElement('style');
      style.textContent = SRemoteCore.UI_CSS;

      const dialog = document.createElement('dialog');
      const box = document.createElement('div');
      box.className = 'sv-box';

      const title = document.createElement('div');
      title.className = 'sv-title';
      title.textContent = SRemoteCore.t('dialogTitle');

      const text = document.createElement('div');
      text.className = 'sv-text';
      text.textContent = SRemoteCore.t('dialogText');

      const persistable = SRemoteCore.isPersistableOrigin(origin);
      const rememberLabel = document.createElement('label');
      rememberLabel.className = 'sv-remember';
      if (!persistable) rememberLabel.style.display = 'none';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      const rememberSpan = document.createElement('span');
      rememberSpan.textContent = SRemoteCore.t('rememberChoice');
      rememberLabel.append(chk, rememberSpan);

      function closeDialog(result) {
        const remember = persistable && chk.checked;
        try {
          dialog.close();
        } catch {}
        host.remove();
        topPermissionHost = null;

        if (remember && allowKey && denyKey) {
          if (result) {
            SRemoteCore.Storage.set(allowKey, '1');
            SRemoteCore.Storage.remove(denyKey);
          } else {
            SRemoteCore.Storage.set(denyKey, '1');
            SRemoteCore.Storage.remove(allowKey);
          }
        }

        // Notify storage decision token to dismiss any open prompt in child iframes
        SRemoteCore.Storage.set('sremote:permission_decision', {
          origin,
          allowed: result,
          timestamp: Date.now(),
        });

        onDecision?.(result);
      }

      const buttons = document.createElement('div');
      buttons.className = 'sv-buttons';
      const btnDeny = SRemoteCore.createButton({
        className: 'sv-btn sv-btn-deny',
        text: SRemoteCore.t('denyBtn'),
        onClick: () => closeDialog(false),
      });
      const btnAllow = SRemoteCore.createButton({
        className: 'sv-btn sv-btn-allow',
        text: SRemoteCore.t('allowBtn'),
        onClick: () => closeDialog(true),
      });
      buttons.append(btnDeny, btnAllow);

      box.append(title, text, rememberLabel, buttons);
      dialog.append(box);
      shadow.append(style, dialog);
      dialog.addEventListener('cancel', e => {
        e.preventDefault();
      });

      const mountHost = () => {
        const targetMount = document.body || document.documentElement;
        if (targetMount && !host.isConnected) {
          targetMount.appendChild(host);
        }
      };
      mountHost();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountHost, { once: true });
      }

      topPermissionHost = host;
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute('open', '');
      }
    }

    // 1. Menu commands
    function registerMenuCommands() {
      try {
        if (!SRemoteCore.GM.register) return;
        const origin = location.origin;
        const hostDomain = location.hostname || 'this_domain';
        const domainKeyStorage = `sremote:passkey:${hostDomain}`;
        const domainLockStorage = `sremote:locked:${hostDomain}`;

        // 1. Generate & Copy Passkey for Domain (16-character alphanumeric uppercase in 4x4 block: SR-XXXX-XXXX-XXXX-XXXX)
        SRemoteCore.GM.register(SRemoteCore.t('menuGenerateKey', { domain: hostDomain }), () => {
          const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const randomBlock = len => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
          const currentKey = `SR-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
          SRemoteCore.Storage.set(domainKeyStorage, currentKey);

          navigator.clipboard.writeText?.(currentKey).catch(() => {});
          alert(SRemoteCore.t('alertKeyGenerated', { domain: hostDomain, key: currentKey }));
        });

        // 2. Delete Passkey for Domain
        SRemoteCore.GM.register(SRemoteCore.t('menuDeleteKey', { domain: hostDomain }), () => {
          SRemoteCore.Storage.remove(domainKeyStorage);
          alert(SRemoteCore.t('alertKeyDeleted', { domain: hostDomain }));
        });

        // 3. Toggle Active Lock for Domain
        SRemoteCore.GM.register(SRemoteCore.t('menuToggleLock', { domain: hostDomain }), () => {
          const isCurrentlyLocked = SRemoteCore.Storage.get(domainLockStorage) === '1';
          if (isCurrentlyLocked) {
            SRemoteCore.Storage.remove(domainLockStorage);
            alert(SRemoteCore.t('alertLockDisabled', { domain: hostDomain }));
          } else {
            SRemoteCore.Storage.set(domainLockStorage, '1');
            alert(SRemoteCore.t('alertLockEnabled', { domain: hostDomain }));
          }
        });

        SRemoteCore.GM.register(SRemoteCore.t('menuReset', { target: SRemoteCore.t('targetTop') }), () => {
          const { allowKey, denyKey, hideBadgeKey } = SRemoteCore.getOriginStorageKeys(origin);
          [allowKey, denyKey, hideBadgeKey].forEach(k => k && SRemoteCore.Storage.remove(k));
          alert(SRemoteCore.t('alertResetDone', { origin }));
        });

        SRemoteCore.GM.register(SRemoteCore.t('menuUnhideBadge'), () => {
          const keys = SRemoteCore.Storage.list();
          keys.forEach(k => {
            if (k && (k.startsWith('sremote:hide_badge:') || k === 'sremote:hide_badge')) {
              SRemoteCore.Storage.remove(k);
            }
          });
          alert(SRemoteCore.t('alertUnhideDone'));
        });

        SRemoteCore.GM.register(SRemoteCore.t('menuClearAll'), () => {
          if (!confirm(SRemoteCore.t('confirmClearAll'))) return;
          SRemoteCore.Storage.clearAllsremoteData();
          alert(SRemoteCore.t('alertClearDone'));
        });
      } catch (e) {
        console_warn('[sremote] Failed to register menu commands:', e);
      }
    }
    registerMenuCommands();

    // 2. Broadcast / Multi-Instance Event Emitters
    function notifyMediaCountChange() {
      const activeInstances = Array.from(instances.entries()).map(([id, item]) => ({
        instanceId: id,
        location: item.location,
        note: item.note,
        mediaType: item.mediaType,
      }));
      const count = activeInstances.length;

      if (count > 1) {
        const payload = { type: `${SRemoteCore.NS}multipleMediaDetected`, source: 'parent', count, instances: activeInstances };
        console_debug(`%c[SRemote:signal] Emit -> multipleMediaDetected (source: parent)`, 'color: #06b6d4;', payload);
        broadcastToPorts(payload);
        window.postMessage(payload, '*');
      } else if (count === 1) {
        const payload = { type: `${SRemoteCore.NS}singleMediaDetected`, source: 'parent', count: 1, instance: activeInstances[0] };
        console_debug(`%c[SRemote:signal] Emit -> singleMediaDetected (source: parent)`, 'color: #06b6d4;', payload);
        broadcastToPorts(payload);
        window.postMessage(payload, '*');
      }
    }

    function broadcastToPorts(payload, excludeInstanceId = null) {
      for (const [id, item] of instances.entries()) {
        if (id === excludeInstanceId) continue;
        try {
          item.port?.postMessage(payload);
        } catch {}
      }
    }

    function emitWhereIsInstanceIdError(cmd) {
      const msg = `[sremote] Bro forgot that bro inserted many medias at the same time but forgot to point out this command '${cmd}' should be sent to whom. If this is intentional, pass 'all' to instanceID`;
      console_error(msg);
      const payload = { type: `${SRemoteCore.NS}whereIsInstanceID`, source: 'parent', command: cmd, message: msg };
      console_debug(`%c[SRemote:signal] Emit -> whereIsInstanceID (source: parent)`, 'color: #ef4444;', payload);
      window.postMessage(payload, '*');
    }

    // 3. Blob Cloner (Bypass SOP for Artwork Blobs)
    async function cloneBlobFromParent(blobUrl, instanceId) {
      try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        const item = instances.get(instanceId);
        if (item?.port) {
          item.port.postMessage({ type: `${SRemoteCore.NS}resendBlobObject`, originalUrl: blobUrl, blob });
        }
      } catch (err) {
        console_warn(`[sremote] Failed to clone blob '${blobUrl}' for instance '${instanceId}':`, err);
      }
    }

    const globalEventListeners = new Map();
    let lastAcceptedData = null;

    function emitGlobalEvent(event, payload = {}) {
      const ev = String(event || '').toLowerCase();
      if (ev === 'accept' && payload?.instanceId) {
        lastAcceptedData = payload;
      } else if (ev === 'disconnect' && payload?.instanceId && lastAcceptedData?.instanceId === payload.instanceId) {
        lastAcceptedData = null;
      }

      const specificListeners = globalEventListeners.get(ev);
      if (specificListeners) {
        for (const fn of specificListeners) {
          try {
            fn(payload);
          } catch (e) {
            console_warn('[sremote] Error in event listener:', e);
          }
        }
      }

      const wildcardListeners = globalEventListeners.get('*');
      if (wildcardListeners) {
        const starPayload = typeof payload === 'object' && payload !== null ? { action: ev, ...payload } : { action: ev, value: payload };
        for (const fn of wildcardListeners) {
          try {
            fn(starPayload);
          } catch (e) {
            console_warn('[sremote] Error in wildcard listener:', e);
          }
        }
      }
    }

    // 4. Register Safe Callbacks on window.sremote
    function initExportedApi() {
      const exportedApi = {
        play: (instanceId, key) => dispatchCommand('play', undefined, instanceId, key),
        pause: (instanceId, key) => dispatchCommand('pause', undefined, instanceId, key),
        toggle: (instanceId, key) => dispatchCommand('toggle', undefined, instanceId, key),
        stop: (instanceId, key) => dispatchCommand('stop', undefined, instanceId, key),
        seek: (offset, instanceId, key) => dispatchCommand('seek', offset, instanceId, key),
        seekTo: (time, instanceId, key) => dispatchCommand('currentTime', time, instanceId, key),
        volume: (vol, instanceId, key) => dispatchCommand('volume', vol, instanceId, key),
        mute: (muted, instanceId, key) => dispatchCommand('muted', muted, instanceId, key),
        pip: (enable, instanceId, key) => {
          const _instanceId = typeof enable === 'string' ? enable : instanceId;
          const _enabled = typeof enable === 'boolean' ? enable : undefined;
          return dispatchCommand(_enabled === true ? 'enterpip' : _enabled === false ? 'exitpip' : 'pip', undefined, _instanceId, key);
        },
        status: (instanceId, key) => {
          if (!validateDomainAccess(key)) {
            console_error('[SRemote:auth] Blocked status()! Valid Passkey is required.');
            return null;
          }
          const targetId = instanceId || currentActiveInstanceId || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
          if (!targetId) return null;
          if (instances.has(targetId)) return instances.get(targetId).state || null;
          if (parentAdaptersMap.has(targetId)) {
            const adapter = parentAdaptersMap.get(targetId);
            return {
              paused: typeof adapter.paused === 'function' ? adapter.paused() : Boolean(adapter.paused),
              currentTime: typeof adapter.getCurrentTime === 'function' ? adapter.getCurrentTime() : 0,
              duration: typeof adapter.getDuration === 'function' ? adapter.getDuration() : 0,
              volume: typeof adapter.getVolume === 'function' ? adapter.getVolume() : 1,
              muted: typeof adapter.getMuted === 'function' ? adapter.getMuted() : false,
            };
          }
          return null;
        },
        bindMediaSession: (instanceId, key) => dispatchCommand('bindMediaSession', undefined, instanceId, key),
        bindMetadata: (meta, instanceId, key) => dispatchCommand('bindMetadata', meta, instanceId, key),
        useAdapter: (adapter, instanceId, key) => {
          if (!validateDomainAccess(key)) {
            console_error('[SRemote:auth] Blocked useAdapter()! Valid Passkey is required.');
            return null;
          }
          return handleUseAdapter(adapter, instanceId);
        },
        getCustomAdapter: (instanceId, key) => {
          if (!validateDomainAccess(key)) {
            console_error('[SRemote:auth] Blocked getCustomAdapter()! Valid Passkey is required.');
            return null;
          }
          if (instanceId) return parentAdaptersMap.get(instanceId) || null;
          if (parentAdaptersMap.size === 1) return Array.from(parentAdaptersMap.values())[0] || null;
          return parentAdaptersMap.get(currentActiveInstanceId) || null;
        },
        list: key => {
          if (!validateDomainAccess(key)) {
            console_error('[SRemote:auth] Blocked list()! Valid Passkey is required.');
            return [];
          }
          const result = Array.from(instances.entries()).map(([id, info]) => ({
            instanceId: id,
            location: info.location,
            origin: info.origin,
            note: info.note || '',
            mediaType: info.mediaType,
            state: info.state,
          }));
          for (const [id, adapter] of parentAdaptersMap.entries()) {
            result.push({
              instanceId: id,
              location: location.href,
              origin: location.origin,
              note: 'Parent Custom Adapter',
              mediaType: 'adapter',
              state: {
                paused: typeof adapter.paused === 'function' ? adapter.paused() : Boolean(adapter.paused),
                currentTime: typeof adapter.getCurrentTime === 'function' ? adapter.getCurrentTime() : 0,
                duration: typeof adapter.getDuration === 'function' ? adapter.getDuration() : 0,
                volume: typeof adapter.getVolume === 'function' ? adapter.getVolume() : 1,
                muted: typeof adapter.getMuted === 'function' ? adapter.getMuted() : false,
              },
            });
          }
          return result;
        },
        note: (notesDict, key) => {
          if (!validateDomainAccess(key)) {
            console_error('[SRemote:auth] Blocked note()! Valid Passkey is required.');
            return;
          }
          if (typeof notesDict === 'object' && notesDict) {
            for (const [id, note] of Object.entries(notesDict)) {
              const inst = instances.get(id);
              if (inst) inst.note = String(note);
            }
          }
        },
        setMultiMode: (mode, key) => {
          if (!validateDomainAccess(key)) {
            console_error('[SRemote:auth] Blocked setMultiMode()! Valid Passkey is required.');
            return;
          }
          if (typeof mode === 'boolean' || mode === null) {
            multiModeConfig = mode;
          }
        },
        isMultiMode: key => {
          if (!validateDomainAccess(key)) {
            console_error('[SRemote:auth] Blocked isMultiMode()! Valid Passkey is required.');
            return false;
          }
          return isMultiModeActive();
        },
        setExclusive: (mode, key) => {
          if (!validateDomainAccess(key)) {
            console_error('[SRemote:auth] Blocked setExclusive()! Valid Passkey is required.');
            return;
          }
          exclusiveMode = mode;
          if (mode && mode !== 'auto' && instances.has(mode)) {
            pauseOthersExcept(mode);
          }
        },
        query: key => {
          if (!validateDomainAccess(key)) {
            console_error('[SRemote:auth] Blocked query()! Valid Passkey is required.');
            return [];
          }
          return queryMediaInstancesViaGM();
        },
        on: (event, handler, key) => {
          if (!validateDomainAccess(key)) {
            console_error('[SRemote:auth] Blocked on()! Valid Passkey is required.');
            return () => {};
          }
          const ev = String(event || '').toLowerCase();
          if (!globalEventListeners.has(ev)) globalEventListeners.set(ev, new Set());
          globalEventListeners.get(ev).add(handler);

          // Sticky replay: If this listener listens to 'accept' or '*' and we already have an active instance accepted, replay it immediately
          if (
            (ev === 'accept' || ev === '*') &&
            lastAcceptedData &&
            (instances.has(lastAcceptedData.instanceId) || parentAdaptersMap.has(lastAcceptedData.instanceId))
          ) {
            try {
              const payload = ev === '*' ? { action: 'accept', ...lastAcceptedData } : lastAcceptedData;
              setTimeout(() => {
                try {
                  handler(payload);
                } catch {}
              }, 0);
            } catch {}
          }

          return () => exportedApi.off(ev, handler);
        },
        off: (event, handler) => {
          const ev = String(event || '').toLowerCase();
          globalEventListeners.get(ev)?.delete(handler);
        },
        lock: () => {
          isSessionLocked = true;
          console_log(`%c[SRemote:lock] SRemote is now session-locked for this page`, 'background: #0f172a; color: #38bdf8; font-weight: bold;');
          return true;
        },
        hello: (options = {}, target = null) => {
          let targetIframeWindow = target;
          let providedKey = null;

          if (options && typeof options === 'object') {
            if (typeof options.multiMode === 'boolean' || options.multiMode === null) {
              multiModeConfig = options.multiMode;
            }
            if (!targetIframeWindow && options.target) {
              targetIframeWindow = options.target;
            }
            if (options.key) {
              providedKey = String(options.key).trim();
            }
          }

          if (!validateDomainAccess(providedKey)) {
            const hostDomain = location.hostname || 'this_domain';
            console_error(
              `%c[SRemote:auth] Blocked hello() on locked domain '${hostDomain}'! Valid Passkey is required in hello({ key: '...' }).`,
              'color: #ef4444; font-weight: bold;',
            );
            return false;
          }

          console_log(`%c[SRemote:auth] Access authorized for domain '${location.hostname}'`, 'color: #10b981; font-weight: bold;');

          const handshakeId = SRemoteCore.generateInstanceId('hs');
          const handshakeToken = SRemoteCore.generateInstanceId('tok');
          SRemoteCore.setHandshakeSecret(handshakeId, handshakeToken);

          // Increment GM hello sequence & store active handshake context
          const currentSeq = Number(SRemoteCore.Storage.get('sremote:hello_seq', 0)) || 0;
          const nextSeq = currentSeq + 1;
          SRemoteCore.Storage.set('sremote:hello_seq', nextSeq);
          SRemoteCore.Storage.set('sremote:latest_handshake', {
            seq: nextSeq,
            handshakeId,
            handshakeToken,
            parentOrigin: location.origin,
            timestamp: Date.now(),
          });

          // Clean handshake payload strictly for child iframe
          const helloPayload = {
            type: `${SRemoteCore.NS}hello`,
            source: 'parent',
            handshakeId,
            handshakeToken,
            seq: nextSeq,
          };

          console_log(`%c[SRemote:hello] Parent sending hello (seq: ${nextSeq}) ->`, 'color: #38bdf8; font-weight: bold;', {
            hasTarget: !!targetIframeWindow,
            handshakeId,
            seq: nextSeq,
          });

          if (targetIframeWindow && typeof targetIframeWindow.postMessage === 'function') {
            try {
              targetIframeWindow.postMessage(helloPayload, '*');
            } catch (err) {
              console_warn('[sremote] Error posting hello to target iframe:', err);
            }
            return;
          }

          // Broadcast down to all child iframes in document
          try {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
              try {
                iframes[i].contentWindow?.postMessage(helloPayload, '*');
              } catch {}
            }
          } catch {}

          // Fallback broadcast to window.frames
          try {
            for (let i = 0; i < window.frames.length; i++) {
              try {
                window.frames[i].postMessage(helloPayload, '*');
              } catch {}
            }
          } catch {}
        },
      };

      // Freeze exportedApi deeply to prevent runtime tampering or property overwrites from external scripts
      Object.freeze(exportedApi);

      try {
        Object.defineProperty(pageWindow, 'sremote', {
          value: exportedApi,
          writable: false,
          configurable: false,
          enumerable: true,
        });
      } catch {
        pageWindow.sremote = exportedApi;
      }
      console_log(`%c[sremote] window.svideo is created (note: it's frozen & read-only)`, 'background: #065f46; color: #34d399; font-weight: bold;');
      return exportedApi;
    }

    // Initial boot: export window.sremote so window.sremote.hello() is available
    initExportedApi();

    // 5. Parent-Side Adapter Dispatcher
    function handleUseAdapter(adapterVal, instanceId = null) {
      if (!adapterVal || typeof adapterVal !== 'object') return null;
      const targetId = instanceId || SRemoteCore.generateInstanceId('adapter');

      // Inject standard emit function for adapter to report playback events
      adapterVal.emit = (event, payload = {}) => {
        const ev = String(event || '').toLowerCase();
        const fullPayload = {
          source: 'adapter',
          instanceId: targetId,
          mediaType: 'adapter',
          ...(typeof payload === 'object' && payload !== null ? payload : { value: payload }),
        };

        if (ev === 'play' || ev === 'playing') {
          if (exclusiveMode === 'auto') {
            pauseOthersExcept(targetId);
          }
        }

        emitGlobalEvent(ev, fullPayload);
      };

      parentAdaptersMap.set(targetId, adapterVal);
      currentActiveInstanceId = targetId;
      console_log(`%c[SRemote:adapter] Registered custom adapter for instance '${targetId}'`, 'color: #06b6d4; font-weight: bold;');

      // Emit accept event for the new adapter instance so listeners (React app) can recognize it
      const acceptPayload = {
        source: 'adapter',
        instanceId: targetId,
        mediaType: 'adapter',
        location: location.href,
        origin: location.origin,
      };
      emitGlobalEvent('accept', acceptPayload);

      return targetId;
    }

    function executeParentAdapterAction(action, value, targetInstanceId = null) {
      let targetId = targetInstanceId;
      if (!targetId) {
        if (parentAdaptersMap.size === 1) {
          targetId = Array.from(parentAdaptersMap.keys())[0];
        } else if (parentAdaptersMap.has(currentActiveInstanceId)) {
          targetId = currentActiveInstanceId;
        }
      }
      if (!targetId || !parentAdaptersMap.has(targetId)) return false;

      const adapter = parentAdaptersMap.get(targetId);
      const norm = action.toLowerCase();
      try {
        if (norm === 'play' && typeof adapter.play === 'function') return adapter.play();
        if (norm === 'pause' && typeof adapter.pause === 'function') return adapter.pause();
        if (norm === 'toggle' && typeof adapter.toggle === 'function') return adapter.toggle();
        if ((norm === 'currenttime' || norm === 'seekto') && typeof adapter.seekTo === 'function') return adapter.seekTo(Number(value));
        if (norm === 'volume' && typeof adapter.setVolume === 'function') return adapter.setVolume(Number(value));
        if ((norm === 'muted' || norm === 'mute') && typeof adapter.setMuted === 'function') return adapter.setMuted(Boolean(value));
        if (norm === 'stop') {
          if (typeof adapter.stop === 'function') return adapter.stop();
          if (typeof adapter.pause === 'function') adapter.pause();
          if (typeof adapter.seekTo === 'function') adapter.seekTo(0);
          return true;
        }
      } catch (e) {
        console_warn(`[sremote] Error invoking parent adapter action for '${targetId}':`, e);
      }
      return false;
    }

    function pauseOthersExcept(activeInstanceId) {
      for (const [id, item] of instances.entries()) {
        if (id !== activeInstanceId) {
          try {
            item.port?.postMessage({ type: `${SRemoteCore.NS}pause` });
          } catch {}
        }
      }
    }

    const pendingCommandQueue = []; // [{ action, value, targetInstanceId, timestamp }]

    function flushPendingCommands(forInstanceId, port) {
      if (!port || pendingCommandQueue.length === 0) return;
      const now = Date.now();
      const MAX_AGE = 5000; // 5s expiration for queued commands
      const remaining = [];
      const dedupedMap = new Map();

      for (const cmd of pendingCommandQueue) {
        if (now - cmd.timestamp > MAX_AGE) continue; // Drop expired command
        if (!cmd.targetInstanceId || cmd.targetInstanceId === forInstanceId || !isMultiModeActive()) {
          const act = String(cmd.action || '').toLowerCase();
          // Mutually exclusive playback commands: latest decision wins
          if (act === 'play' || act === 'pause' || act === 'toggle' || act === 'stop') {
            dedupedMap.delete('play');
            dedupedMap.delete('pause');
            dedupedMap.delete('toggle');
            dedupedMap.delete('stop');
          }
          dedupedMap.set(act, cmd);
        } else {
          remaining.push(cmd);
        }
      }

      // Prioritize: configure parameters (volume, seek, mute) first, then trigger playback (play/pause/stop)
      const sortedActions = Array.from(dedupedMap.values()).sort((a, b) => {
        const isPlayA = ['play', 'pause', 'toggle', 'stop'].includes(String(a.action || '').toLowerCase());
        const isPlayB = ['play', 'pause', 'toggle', 'stop'].includes(String(b.action || '').toLowerCase());
        return isPlayA - isPlayB;
      });

      for (const cmd of sortedActions) {
        try {
          port.postMessage({ type: `${SRemoteCore.NS}${cmd.action}`, source: 'parent', value: cmd.value });
          console_log(`%c[SRemote:queue] Flushed deduplicated command -> ${cmd.action}`, 'color: #10b981; font-weight: bold;', {
            value: cmd.value,
            instanceId: forInstanceId,
          });
        } catch (e) {
          console_warn('[sremote:queue] Error flushing command:', e);
        }
      }

      pendingCommandQueue.length = 0;
      for (const r of remaining) pendingCommandQueue.push(r);
    }

    function dispatchCommand(action, value, targetInstanceId = null, key = null) {
      if (!validateDomainAccess(key)) {
        console_error(`%c[SRemote:auth] Blocked command '${action}'! Valid Passkey is required.`, 'color: #ef4444; font-weight: bold;');
        return false;
      }

      console_log(`%c[SRemote:command] Parent dispatching -> ${action}`, 'color: #3b82f6; font-weight: bold;', { action, value, targetInstanceId });

      // 1. Try parent-side adapters first for targeted instance
      if (parentAdaptersMap.size > 0) {
        const handled = executeParentAdapterAction(action, value, targetInstanceId);
        if (handled) return;
      }

      // 2. Multi-instance validation
      const multi = isMultiModeActive();
      if (multi && instances.size > 1 && !targetInstanceId) {
        emitWhereIsInstanceIdError(action);
        return;
      }

      if (targetInstanceId === 'all') {
        broadcastToPorts({ type: `${SRemoteCore.NS}${action}`, source: 'parent', value });
        return;
      }

      let targetId = targetInstanceId || getLatestActiveInstanceId();
      let target = targetId ? instances.get(targetId) : null;

      // In single mode or when only 1 instance exists, if passed targetId was stale, fallback to active instance
      if (!target && !isMultiModeActive() && instances.size === 1) {
        targetId = Array.from(instances.keys())[0];
        target = instances.get(targetId);
      }

      if (target?.port) {
        target.port.postMessage({ type: `${SRemoteCore.NS}${action}`, source: 'parent', value });
      } else {
        console_log(`%c[SRemote:queue] No active port for instance '${targetId || 'pending'}'. Queueing command '${action}'...`, 'color: #f59e0b;');
        pendingCommandQueue.push({
          action,
          value,
          targetInstanceId,
          timestamp: Date.now(),
        });
      }
    }

    // 6. Safe Discovery via GM Storage (sremote:query)
    function queryMediaInstancesViaGM() {
      const queryToken = `query_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      SRemoteCore.Storage.set(`sremote:query_req`, queryToken);

      const keys = SRemoteCore.Storage.list();
      const found = [];
      for (const k of keys) {
        if (k && k.startsWith('sremote:report:')) {
          const raw = SRemoteCore.Storage.get(k);
          try {
            const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (data && data.hasMedia) {
              found.push(data);
            }
          } catch {}
          // Clean up report
          SRemoteCore.Storage.remove(k);
        }
      }
      return found;
    }

    function removeInstance(instanceId, reason = 'disconnected') {
      const item = instances.get(instanceId);
      if (!item) return;
      console_log(`%c[SRemote:lifecycle] Instance removed: ${instanceId} (reason: ${reason})`, 'color: #ef4444; font-weight: bold;');
      try {
        item.port?.close();
      } catch {}
      instances.delete(instanceId);
      if (currentActiveInstanceId === instanceId) {
        currentActiveInstanceId = null;
      }
      notifyMediaCountChange();
      emitGlobalEvent('disconnect', { instanceId, reason });
    }

    // 7. MessagePort Channel Setup & Event Routing from Iframes
    function setupPortForInstance(instanceId, port, initialLocation, initialOrigin) {
      // In Single Mode, if another instance already exists, purge old instance to prevent ghost ID retention
      if (!isMultiModeActive() && instances.size > 0) {
        for (const oldId of Array.from(instances.keys())) {
          if (oldId !== instanceId) {
            console_log(`%c[SRemote:lifecycle] Replacing stale instance in Single Mode: ${oldId} -> ${instanceId}`, 'color: #f59e0b;');
            removeInstance(oldId, 'replaced_by_new_instance');
          }
        }
      }

      currentActiveInstanceId = instanceId;

      const item = {
        port,
        location: initialLocation,
        origin: initialOrigin,
        note: '',
        state: null,
        mediaType: null,
        lastSeen: Date.now(),
      };
      instances.set(instanceId, item);
      flushPendingCommands(instanceId, port);

      port.onmessage = e => {
        const data = e.data;
        if (!data || typeof data !== 'object') return;
        const type = String(data.type || '');
        if (!type.startsWith(SRemoteCore.NS)) return;

        // Activity-based Liveness: Any incoming valid signal refreshes lastSeen timestamp
        item.lastSeen = Date.now();
        currentActiveInstanceId = instanceId;

        const action = type.slice(SRemoteCore.NS.length);
        const lowerAction = action.toLowerCase();

        console_debug(`%c[SRemote:signal] Parent received from iframe (port) -> ${action}`, 'color: #10b981;', { instanceId, data });

        // Handle Pong from Iframe (Confirms bidirectional MessagePort communication)
        if (lowerAction === 'pong') {
          if (item.pendingConsumeHandshakeId) {
            console_log(
              `%c[SRemote:handshake] Mutual Ping-Pong confirmed on port for '${instanceId}'. Consuming token '${item.pendingConsumeHandshakeId}'.`,
              'color: #10b981;',
            );
            SRemoteCore.consumeHandshakeSecret(item.pendingConsumeHandshakeId);
            item.pendingConsumeHandshakeId = null;
          }
          if (data.state) item.state = data.state;
          if (data.mediaType) item.mediaType = data.mediaType;
          return;
        }

        // Handle explicit Disconnect / Unload / Media Detached from Iframe
        if (lowerAction === 'disconnect' || lowerAction === 'mediadisconnected' || lowerAction === 'unload') {
          removeInstance(instanceId, lowerAction);
          return;
        }

        // Handle Handshake Accept on Port
        if (lowerAction === 'accept') {
          if (item.authenticated) return; // Already accepted during handshake setup

          let isValid = false;
          if (data.handshakeId && data.handshakeToken) {
            isValid = SRemoteCore.verifyHandshakeSecret(data.handshakeId, data.handshakeToken);
          } else {
            isValid = true; // Port was already transferred securely via window.onmessage verification
          }
          if (!isValid) {
            console_warn(`[sremote] SPOOF DETECTED on port for instance ${instanceId}! Closing port immediately.`);
            removeInstance(instanceId, 'spoof_detected');
            return;
          }
          item.authenticated = true;
          currentActiveInstanceId = instanceId;
          if (data.state) item.state = data.state;
          if (data.mediaType) item.mediaType = data.mediaType;
          notifyMediaCountChange();

          // Emit accept event directly to window.sremote listeners
          emitGlobalEvent('accept', data);
          return;
        }

        if (data.state) item.state = data.state;
        if (data.mediaType) item.mediaType = data.mediaType;

        // Auto exclusive playback handling
        if (lowerAction === 'play' || lowerAction === 'playing') {
          if (exclusiveMode === 'auto') {
            pauseOthersExcept(instanceId);
          } else if (exclusiveMode && exclusiveMode !== instanceId) {
            // If another instance is exclusive, pause this one
            port.postMessage({ type: `${SRemoteCore.NS}pause`, source: 'parent' });
            return;
          }
        }

        // SOP Blob Clone Request
        if (lowerAction === 'requestblobclone' && data.blobUrl) {
          cloneBlobFromParent(data.blobUrl, instanceId);
          return;
        }

        // Forward event strictly to direct API listeners (window.sremote.on)
        emitGlobalEvent(action, data);
      };

      notifyMediaCountChange();
    }

    // 8. Cross-Frame Handshake Listener (window.onmessage)
    // Only handles initial connection signals from child iframe windows
    window.addEventListener('message', event => {
      // Ignore any messages originating from the same top window
      if (event.source === window) return;

      const data = event.data;
      if (!data || typeof data !== 'object') return;
      const type = String(data.type || '');
      if (!type.startsWith(SRemoteCore.NS)) return;

      const action = type.slice(SRemoteCore.NS.length);
      const lowerAction = action.toLowerCase();
      const callerOrigin = event.origin || 'unknown_origin';

      console_log(`%c[SRemote:signal] Parent received cross-frame signal -> ${action}`, 'color: #6366f1; font-weight: bold;', { origin: callerOrigin, data });

      // Iframe Handshake Response (accept)
      if (lowerAction === 'accept') {
        const instanceId = data.instanceId || SRemoteCore.generateInstanceId();
        const iframeLoc = data.location || '';
        const iframeOrigin = event.origin && event.origin !== 'null' ? event.origin : data.origin || '*';

        // 1. Verify Handshake Secret (Check only, DO NOT consume until port ping-pong confirms)
        let isValidSecret = false;
        let pendingConsumeHandshakeId = null;
        if (data.handshakeId && data.handshakeToken) {
          isValidSecret = SRemoteCore.checkHandshakeSecret(data.handshakeId, data.handshakeToken);
          if (isValidSecret) {
            pendingConsumeHandshakeId = data.handshakeId;
          }
        }

        // Fallback validation: If event has transferred MessagePort or valid origin permission
        if (!isValidSecret && event.ports && event.ports.length > 0) {
          const { allowKey: parentAllowKey } = SRemoteCore.getOriginStorageKeys(location.origin);
          const { allowKey: iframeAllowKey } = SRemoteCore.getOriginStorageKeys(iframeOrigin);
          const isPersisted =
            (parentAllowKey && SRemoteCore.Storage.get(parentAllowKey) === '1') || (iframeAllowKey && SRemoteCore.Storage.get(iframeAllowKey) === '1');
          if (
            isPersisted ||
            iframeOrigin === location.origin ||
            iframeOrigin === '*' ||
            iframeOrigin === 'null' ||
            callerOrigin === 'null' ||
            callerOrigin.startsWith('http') ||
            callerOrigin.startsWith('file:')
          ) {
            isValidSecret = true;
          }
        }

        if (!isValidSecret) {
          console_warn(`[sremote] Dropped unverified accept for instance: ${instanceId}`);
          return;
        }

        // 2. Setup Dedicated MessagePort or Proactively Request Hardware Port Transfer
        if (event.ports && event.ports.length > 0) {
          const port = event.ports[0];
          setupPortForInstance(instanceId, port, iframeLoc, iframeOrigin);
          const inst = instances.get(instanceId);
          if (inst) {
            inst.authenticated = true;
            if (pendingConsumeHandshakeId) {
              inst.pendingConsumeHandshakeId = pendingConsumeHandshakeId;
            }
            currentActiveInstanceId = instanceId;
            if (data.state) inst.state = data.state;
            if (data.mediaType) inst.mediaType = data.mediaType;
            inst.lastSeen = Date.now();
          }
          notifyMediaCountChange();

          // Send handshake confirmation ping on port
          try {
            port.postMessage({ type: `${SRemoteCore.NS}ping`, source: 'parent', handshakeVerify: true });
          } catch {}

          // 3. Emit accept event directly to window.sremote listeners
          emitGlobalEvent('accept', data);
        } else if (event.source) {
          // No MessagePort in accept payload -> Proactively create a fresh MessageChannel and transfer port2 to iframe
          console_log(
            `%c[SRemote:port] Accept received without port for '${instanceId}'. Proactively renegotiating MessagePort...`,
            'color: #f59e0b; font-weight: bold;',
          );
          const channel = new MessageChannel();
          setupPortForInstance(instanceId, channel.port1, iframeLoc, iframeOrigin);
          const inst = instances.get(instanceId);
          if (inst) {
            inst.authenticated = true;
            if (pendingConsumeHandshakeId) {
              inst.pendingConsumeHandshakeId = pendingConsumeHandshakeId;
            }
            currentActiveInstanceId = instanceId;
            if (data.state) inst.state = data.state;
            if (data.mediaType) inst.mediaType = data.mediaType;
            inst.lastSeen = Date.now();
          }
          notifyMediaCountChange();

          try {
            event.source.postMessage(
              {
                type: `${SRemoteCore.NS}handshake_port`,
                source: 'parent',
                instanceId,
              },
              iframeOrigin && iframeOrigin !== 'null' ? iframeOrigin : '*',
              [channel.port2],
            );
          } catch (err) {
            console_warn('[sremote] Failed to transfer proactive MessagePort to iframe:', err);
          }

          // Emit accept event to listeners
          emitGlobalEvent('accept', data);
        }
        return;
      }

      // Iframe requests Central Permission Dialog on Top Window
      if (lowerAction === 'request_permission' || lowerAction === 'requestpermission') {
        showParentPermissionDialog(allowed => {
          if (event.source) {
            try {
              event.source.postMessage(
                {
                  type: `${SRemoteCore.NS}permission_response`,
                  source: 'parent',
                  allowed: !!allowed,
                  parentOrigin: location.origin,
                },
                '*',
              );
            } catch {}
          }
        });
        return;
      }

      // Fast Handshake broadcast down to child iframes
      if (lowerAction === 'hello') {
        const handshakeId = SRemoteCore.generateInstanceId('hs');
        const handshakeToken = SRemoteCore.generateInstanceId('tok');
        SRemoteCore.setHandshakeSecret(handshakeId, handshakeToken);

        const helloPayload = {
          type: `${SRemoteCore.NS}hello`,
          source: 'parent',
          handshakeId,
          handshakeToken,
        };

        if (event.source) {
          const targetOrigin = event.origin && event.origin !== 'null' ? event.origin : '*';
          try {
            event.source.postMessage(helloPayload, targetOrigin);
          } catch {}
        }
      }
    });

    // 9. Liveness Reaper & Heartbeat (Sliding Expiration)
    setInterval(() => {
      const now = Date.now();
      const PING_THRESHOLD = 3000; // If idle for > 3s, send ping check
      const DEAD_TIMEOUT = 8000; // If no signal for > 8s, reap ghost instance

      for (const [id, item] of instances.entries()) {
        const elapsed = now - (item.lastSeen || 0);
        if (elapsed > DEAD_TIMEOUT) {
          console_warn(`[sremote] Instance '${id}' timed out (${elapsed}ms without signal). Reaping...`);
          removeInstance(id, 'timeout');
        } else if (elapsed > PING_THRESHOLD) {
          try {
            item.port?.postMessage({ type: `${SRemoteCore.NS}ping`, source: 'parent' });
          } catch {
            removeInstance(id, 'port_error');
          }
        }
      }
    }, 2000);

    // 10. Parent DOM Observer for removed iframes
    const parentIframeObserver = new MutationObserver(mutations => {
      let shouldCheck = false;
      for (const m of mutations) {
        if (m.removedNodes.length > 0) {
          for (let i = 0; i < m.removedNodes.length; i++) {
            const node = m.removedNodes[i];
            if (node.nodeType === 1 && (node.tagName === 'IFRAME' || (node.querySelector && node.querySelector('iframe')))) {
              shouldCheck = true;
              break;
            }
          }
        }
        if (shouldCheck) break;
      }

      if (shouldCheck && instances.size > 0) {
        // Probe all instances immediately to verify liveness after DOM mutation
        for (const [id, item] of instances.entries()) {
          try {
            item.port?.postMessage({ type: `${SRemoteCore.NS}ping`, source: 'parent' });
          } catch {
            removeInstance(id, 'iframe_detached');
          }
        }
      }
    });
    parentIframeObserver.observe(document.documentElement || document, { childList: true, subtree: true });
  }

  // ==========================================================================
  // MODULE 2: Iframe Agent IIFE (Media Hunter, Mock MediaSession, ShadowDOM)
  // ==========================================================================
  function initIframeAgent() {
    let topOrigin = null;
    try {
      if (window.top && window.top !== window.self) {
        topOrigin = window.top.location.origin;
      }
    } catch {}

    if (!topOrigin && location.ancestorOrigins && location.ancestorOrigins.length > 0) {
      topOrigin = location.ancestorOrigins[location.ancestorOrigins.length - 1];
    }

    if (!topOrigin && document.referrer) {
      try {
        topOrigin = new URL(document.referrer).origin;
      } catch {}
    }

    const selfDenyKey = SRemoteCore.getOriginStorageKeys(location.origin).denyKey;
    const topDenyKey = topOrigin ? SRemoteCore.getOriginStorageKeys(topOrigin).denyKey : null;

    if ((selfDenyKey && SRemoteCore.Storage.get(selfDenyKey) === '1') || (topDenyKey && SRemoteCore.Storage.get(topDenyKey) === '1')) {
      return; // Silently abort without logging or hooking DOM
    }

    console_log(
      `%c[sremote v${SRemoteCore.VERSION}] Injected into frame:`,
      'background: #0284c7; color: #fff; font-weight: bold; padding: 2px 6px;',
      location.href,
    );

    const instanceId = SRemoteCore.generateInstanceId();
    let mediaPort = null;
    let primaryAuthorizedOrigin = null;
    let activeMedia = null;
    let mediaType = null; // 'video' | 'audio' | 'mediasession'
    let permissionPopup = null;
    let indicatorHost = null;
    let configuredVolume = null;
    let configuredMuted = null;
    const mediaWaiters = [];
    const boundMediaElements = new WeakSet();
    const createdMediaPool = new WeakSet();
    const authorizedOrigins = new Set();
    let currentHandshakeId = null;
    let currentHandshakeToken = null;
    let treatAlmostEndAsEnd = false;
    let programmaticActionTimestamp = 0;

    // 1. Mock MediaSession Implementation
    class MockMediaSession {
      constructor() {
        this.metadata = null;
        this.playbackState = 'none';
        this._handlers = new Map();
      }

      setActionHandler(action, handler) {
        if (typeof handler === 'function') {
          this._handlers.set(action, handler);
        } else {
          this._handlers.delete(action);
        }
        if (mediaPort) {
          sendMediaSessionState();
        }
      }

      setPositionState(state) {
        this.positionState = state;
      }

      async invoke(action, details = {}) {
        const handler = this._handlers.get(action);
        if (typeof handler === 'function') {
          try {
            await handler({ action, ...details });
            return true;
          } catch (e) {
            console_warn(`[sremote] MockMediaSession handler for ${action} error:`, e);
          }
        }
        return false;
      }
    }

    const mockMediaSessionInstance = new MockMediaSession();
    const activeMediaSession = navigator?.mediaSession || mockMediaSessionInstance;

    // 2. MediaSession Hooking
    function hookMediaSession() {
      try {
        const ms = pageWindow.navigator?.mediaSession || navigator?.mediaSession;
        if (!ms) return;
        const proto = Object.getPrototypeOf(ms);
        const originalSet = proto?.setActionHandler || ms.setActionHandler;
        if (!originalSet) return;

        const wrappedSet = function (action, handler) {
          mockMediaSessionInstance.setActionHandler(action, handler);
          return originalSet.call(this, action, handler);
        };

        if (proto) proto.setActionHandler = wrappedSet;
        try {
          ms.setActionHandler = wrappedSet;
        } catch {}
      } catch (e) {
        console_warn('[sremote] MediaSession hook warning:', e);
      }
    }
    hookMediaSession();

    // 3. Constructor Hooking (Off-DOM Capture on both Page & Sandbox Contexts)
    function trackMediaElement(el) {
      if (!el) return;
      createdMediaPool.add(el);
      if (configuredVolume !== null) SRemoteCore.safeSetProp(el, SRemoteCore.descriptors.volume, 'volume', configuredVolume);
      if (configuredMuted !== null) SRemoteCore.safeSetProp(el, SRemoteCore.descriptors.muted, 'muted', configuredMuted);
      bindVideoEvents(el);
      if (!activeMedia) {
        resolveActiveMedia();
        if (activeMedia) onMediaAvailable();
      }
    }

    function hookMediaConstructors() {
      try {
        // Hook Audio constructor on both pageWindow and window
        const hookAudioConstructorOn = targetWin => {
          if (!targetWin) return;
          try {
            const NativeAudio = targetWin.Audio;
            if (typeof NativeAudio === 'function' && !NativeAudio.__sremote_hooked__) {
              const HookedAudio = function (...args) {
                const instance = new NativeAudio(...args);
                trackMediaElement(instance);
                return instance;
              };
              HookedAudio.prototype = NativeAudio.prototype;
              HookedAudio.__sremote_hooked__ = true;
              targetWin.Audio = HookedAudio;
            }
          } catch {}
        };

        hookAudioConstructorOn(window);
        if (pageWindow && pageWindow !== window) hookAudioConstructorOn(pageWindow);

        // Hook Document.prototype.createElement on both sandbox and page contexts
        const hookCreateElementOn = targetDocProto => {
          if (!targetDocProto || targetDocProto.__sremote_hooked__) return;
          try {
            const nativeCreateElement = targetDocProto.createElement;
            if (typeof nativeCreateElement === 'function') {
              targetDocProto.createElement = function (tagName, options) {
                const el = nativeCreateElement.call(this, tagName, options);
                if (typeof tagName === 'string') {
                  const lower = tagName.toLowerCase();
                  if (lower === 'audio' || lower === 'video') {
                    trackMediaElement(el);
                  }
                }
                return el;
              };
              targetDocProto.__sremote_hooked__ = true;
            }
          } catch {}
        };

        hookCreateElementOn(Document.prototype);
        if (pageWindow?.Document?.prototype && pageWindow.Document.prototype !== Document.prototype) {
          hookCreateElementOn(pageWindow.Document.prototype);
        }

        // Hook HTMLMediaElement.prototype.play on both contexts (Captures elements created before hook or off-DOM)
        const hookMediaPlayOn = targetMediaProto => {
          if (!targetMediaProto || targetMediaProto.__sremote_play_hooked__) return;
          try {
            const nativePlay = targetMediaProto.play;
            if (typeof nativePlay === 'function') {
              targetMediaProto.play = function (...args) {
                trackMediaElement(this);
                return nativePlay.apply(this, args);
              };
              targetMediaProto.__sremote_play_hooked__ = true;
            }
          } catch {}
        };

        hookMediaPlayOn(HTMLMediaElement.prototype);
        if (pageWindow?.HTMLMediaElement?.prototype && pageWindow.HTMLMediaElement.prototype !== HTMLMediaElement.prototype) {
          hookMediaPlayOn(pageWindow.HTMLMediaElement.prototype);
        }

        // Global capture-phase event listener for media activity
        const onAnyMediaActivity = ev => {
          const el = ev.target;
          if (el && (el.tagName === 'AUDIO' || el.tagName === 'VIDEO' || el instanceof HTMLMediaElement)) {
            trackMediaElement(el);
          }
        };
        window.addEventListener('play', onAnyMediaActivity, true);
        window.addEventListener('loadeddata', onAnyMediaActivity, true);
        if (pageWindow && pageWindow !== window) {
          try {
            pageWindow.addEventListener('play', onAnyMediaActivity, true);
            pageWindow.addEventListener('loadeddata', onAnyMediaActivity, true);
          } catch {}
        }
      } catch (e) {
        console_warn('[sremote] Media constructors hook warning:', e);
      }
    }
    hookMediaConstructors();

    // 4. Deep Media Search (Shadow DOM, Nested Same-Origin Frames & Pool)
    function queryMediaDeep(root = document) {
      const list = [];
      try {
        if (!root) return list;
        if (root.querySelectorAll) {
          const found = root.querySelectorAll('video, audio');
          for (let i = 0; i < found.length; i++) list.push(found[i]);
        }
        const allElements = root.querySelectorAll ? root.querySelectorAll('*') : [];
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          if (el.shadowRoot) {
            list.push(...queryMediaDeep(el.shadowRoot));
          }
          // Search inside child same-origin iframes if present
          if (el.tagName === 'IFRAME' || el.tagName === 'FRAME') {
            try {
              const childDoc = el.contentDocument || el.contentWindow?.document;
              if (childDoc) {
                list.push(...queryMediaDeep(childDoc));
              }
            } catch {}
          }
        }
      } catch {}
      return list;
    }

    function findAllMedia() {
      return queryMediaDeep(document);
    }

    function resolveActiveMedia() {
      // 1. Keep currently active media if it's still attached to DOM or in createdMediaPool
      if (activeMedia && (activeMedia.isConnected || createdMediaPool.has(activeMedia))) {
        return true;
      }

      const all = findAllMedia();
      if (all.length > 0) {
        // Prioritize: playing > non-paused > valid src/duration > first found
        const valid =
          all.find(el => !el.paused && !el.ended && el.currentTime > 0) ||
          all.find(el => !el.paused) ||
          all.find(el => (el.duration && el.duration > 0) || el.currentSrc || el.src) ||
          all[0];

        activeMedia = valid;
        mediaType = valid.tagName ? valid.tagName.toLowerCase() : 'video';
        bindVideoEvents(valid);
        return true;
      }

      const ms = pageWindow.navigator?.mediaSession || navigator?.mediaSession;
      if (mockMediaSessionInstance._handlers.size > 0 || (ms && (ms.metadata || ms.playbackState !== 'none'))) {
        activeMedia = activeMediaSession;
        mediaType = 'mediasession';
        return true;
      }

      activeMedia = null;
      mediaType = null;
      return false;
    }

    function getVideoState(targetMedia = null) {
      const media = targetMedia || activeMedia || (resolveActiveMedia() ? activeMedia : null);
      if (!media) return null;

      const curVol = SRemoteCore.safeGetProp(media, SRemoteCore.descriptors.volume, 'volume') ?? (media.volume !== undefined ? media.volume : 1);
      const curMuted = SRemoteCore.safeGetProp(media, SRemoteCore.descriptors.muted, 'muted') ?? (media.muted !== undefined ? media.muted : false);
      const curTime =
        SRemoteCore.safeGetProp(media, SRemoteCore.descriptors.currentTime, 'currentTime') ?? (media.currentTime !== undefined ? media.currentTime : 0);
      const rawDur = SRemoteCore.safeGetProp(media, SRemoteCore.descriptors.duration, 'duration') ?? media.duration;
      const curRate =
        SRemoteCore.safeGetProp(media, SRemoteCore.descriptors.playbackRate, 'playbackRate') ?? (media.playbackRate !== undefined ? media.playbackRate : 1);
      const isPaused = SRemoteCore.safeGetProp(media, SRemoteCore.descriptors.paused, 'paused') ?? (media.paused !== undefined ? media.paused : true);
      const isEnded = SRemoteCore.safeGetProp(media, SRemoteCore.descriptors.ended, 'ended') ?? (media.ended !== undefined ? media.ended : false);
      const curReadyState =
        SRemoteCore.safeGetProp(media, SRemoteCore.descriptors.readyState, 'readyState') ?? (media.readyState !== undefined ? media.readyState : 0);
      const curSrc =
        SRemoteCore.safeGetProp(media, SRemoteCore.descriptors.currentSrc, 'currentSrc') ||
        media.currentSrc ||
        SRemoteCore.safeGetProp(media, SRemoteCore.descriptors.src, 'src') ||
        media.src ||
        '';
      const dur = Number.isFinite(rawDur) ? rawDur : null;

      let bufferedEnd = 0;
      try {
        const buf = SRemoteCore.safeGetProp(media, SRemoteCore.descriptors.buffered, 'buffered') || media.buffered;
        if (buf && buf.length > 0) bufferedEnd = buf.end(buf.length - 1);
      } catch {}

      return {
        paused: isPaused,
        ended: Boolean(isEnded || (dur && dur > 0 && curTime >= dur - 0.1)),
        currentTime: curTime,
        duration: dur,
        buffered: bufferedEnd,
        volume: curVol,
        muted: curMuted,
        playbackRate: curRate,
        readyState: curReadyState,
        src: curSrc,
        fullscreen: !!(document.fullscreenElement && (document.fullscreenElement === media || document.fullscreenElement.contains(media))),
        pictureInPicture: document.pictureInPictureElement === media,
      };
    }

    function sendMediaSessionState(action, specificValue) {
      const ms = navigator.mediaSession || mockMediaSessionInstance;
      const payload = {
        playbackState: ms?.playbackState,
        metadata: ms?.metadata ? { title: ms.metadata.title, artist: ms.metadata.artist, album: ms.metadata.album, artwork: ms.metadata.artwork || [] } : null,
        supportedActions: Array.from(mockMediaSessionInstance._handlers.keys()),
      };
      if (action) payload.action = action;
      if (specificValue !== undefined) payload.value = specificValue;

      emitToParent(action || 'mediaSessionState', payload);
    }

    function emitToParent(eventOrAction, payload = {}) {
      const lowerEvt = String(eventOrAction || '').toLowerCase();
      // Only 'accept' or 'requestBlobClone' can be sent without pre-authorization
      if (!primaryAuthorizedOrigin && lowerEvt !== 'accept' && lowerEvt !== 'requestblobclone') {
        return;
      }

      const msg = {
        type: `${SRemoteCore.NS}${eventOrAction}`,
        event: eventOrAction,
        source: 'iframe',
        instanceId,
        location: location.href,
        origin: location.origin,
        ...payload,
      };

      console_debug(`%c[SRemote:signal] Iframe emit -> ${eventOrAction} (source: iframe)`, 'color: #10b981;', msg);

      if (mediaPort) {
        try {
          mediaPort.postMessage(msg);
        } catch {}
      }
    }

    function notifyState(action, specificValue) {
      const isProgrammatic = Date.now() - programmaticActionTimestamp < 500;
      switch (mediaType) {
        case 'adapter':
        case 'video':
        case 'audio':
          emitToParent(action || 'state', {
            ...(action ? { action } : {}),
            ...(specificValue !== undefined ? { value: specificValue } : {}),
            isProgrammatic,
            state: getVideoState(),
          });
          break;
        default:
          sendMediaSessionState(action, specificValue);
      }
    }

    // 5. Video Events Binding
    function bindVideoEvents(video) {
      if (!video || boundMediaElements.has(video)) return;
      boundMediaElements.add(video);

      let hasEmittedAlmostEnd = false;

      for (const evtName of SRemoteCore.MEDIA_EVENTS) {
        video.addEventListener(evtName, () => {
          activeMedia = video;
          mediaType = video.tagName ? video.tagName.toLowerCase() : 'video';

          if (evtName === 'timeupdate') {
            const dur = Number.isFinite(video.duration) ? video.duration : null;
            const curTime = SRemoteCore.safeGetProp(video, SRemoteCore.descriptors.currentTime, 'currentTime') ?? video.currentTime ?? 0;
            if (dur && dur > 3 && curTime >= dur - 0.8 && curTime < dur - 0.1) {
              if (!hasEmittedAlmostEnd) {
                hasEmittedAlmostEnd = true;
                emitToParent(treatAlmostEndAsEnd ? 'ended' : 'almostend', { state: getVideoState(video) });
              }
            } else if (curTime < dur - 1.5) {
              hasEmittedAlmostEnd = false;
            }
          }

          if (evtName === 'ended') {
            hasEmittedAlmostEnd = false;
            const dur = Number.isFinite(video.duration) ? video.duration : null;
            const curTime = SRemoteCore.safeGetProp(video, SRemoteCore.descriptors.currentTime, 'currentTime') ?? video.currentTime ?? 0;
            if (dur && dur > 0 && Math.abs(dur - curTime) > 1.5) return; // Drop false ended
          }

          const isProgrammatic = Date.now() - programmaticActionTimestamp < 500;
          emitToParent(evtName, { isProgrammatic, state: getVideoState(video) });
        });
      }
    }

    // 6. Media Actions & Control Engine
    async function safePlayMedia(el) {
      if (!el) return;
      try {
        const isEnded = Boolean(SRemoteCore.safeGetProp(el, SRemoteCore.descriptors.ended, 'ended') || el.ended);
        const curTime = SRemoteCore.safeGetProp(el, SRemoteCore.descriptors.currentTime, 'currentTime') ?? 0;
        const dur = SRemoteCore.safeGetProp(el, SRemoteCore.descriptors.duration, 'duration') ?? 0;
        if (isEnded || (dur > 0 && Math.abs(dur - curTime) <= 0.1)) {
          SRemoteCore.safeSetProp(el, SRemoteCore.descriptors.currentTime, 'currentTime', 0);
        }

        let res;
        if (typeof el.play === 'function') {
          try {
            res = el.play();
          } catch {}
        }
        if (!res && SRemoteCore.descriptors.play) {
          try {
            res = SRemoteCore.descriptors.play.call(el);
          } catch {}
        }
        if (res && typeof res.then === 'function') await res;
        return res;
      } catch (err) {
        console_warn('[sremote] safePlayMedia error:', err);
      }
    }

    function safePauseMedia(el) {
      if (SRemoteCore.descriptors.pause) {
        try {
          SRemoteCore.descriptors.pause.call(el);
        } catch {}
      } else {
        try {
          el.pause();
        } catch {}
      }
    }

    // 7. MediaSession Auto-Binding & Custom Stop
    function bindMediaSessionDefaults() {
      resolveActiveMedia();

      const ms = navigator.mediaSession || mockMediaSessionInstance;

      const title = SRemoteCore.getMeta(['meta[property="og:title"]', 'meta[name="twitter:title"]', 'meta[name="title"]']) || document.title || 'Unknown Title';

      // 2. Artist / Site
      const artist = SRemoteCore.getMeta(['meta[property="og:site_name"]', 'meta[name="author"]', 'meta[name="twitter:site"]']) || window.location.hostname;

      // 3. Poster / Artwork
      const artworkSrc =
        SRemoteCore.getMeta(['meta[property="og:image"]', 'meta[name="twitter:image"]', 'link[rel="image_src"]']) ||
        (activeMedia?.tagName === 'VIDEO' ? activeMedia.poster : '');

      // Set fallback metadata if not already defined
      if (!ms.metadata) {
        const defaultArtwork = artworkSrc ? [{ src: artworkSrc }] : [];
        const metaObj = {
          title,
          artist,
          album: '',
          artwork: defaultArtwork,
        };
        try {
          if (typeof MediaMetadata !== 'undefined' && navigator.mediaSession) {
            navigator.mediaSession.metadata = new MediaMetadata(metaObj);
          }
          mockMediaSessionInstance.metadata = metaObj;
        } catch (e) {
          console_warn('[sremote] Error setting fallback MediaMetadata:', e);
        }
      }

      const registerIfMissing = (action, handler) => {
        if (!mockMediaSessionInstance._handlers.has(action)) {
          try {
            ms.setActionHandler?.(action, handler);
            mockMediaSessionInstance.setActionHandler(action, handler);
          } catch {}
        }
      };

      registerIfMissing('play', async () => {
        if (activeMedia && (mediaType === 'video' || mediaType === 'audio')) await safePlayMedia(activeMedia);
      });
      registerIfMissing('pause', () => {
        if (activeMedia && (mediaType === 'video' || mediaType === 'audio')) safePauseMedia(activeMedia);
      });
      registerIfMissing('stop', () => {
        if (activeMedia && (mediaType === 'video' || mediaType === 'audio')) {
          safePauseMedia(activeMedia);
          SRemoteCore.safeSetProp(activeMedia, SRemoteCore.descriptors.currentTime, 'currentTime', 0);
        }
      });
      registerIfMissing('seekto', details => {
        if (activeMedia && typeof details.seekTime === 'number') {
          SRemoteCore.safeSetProp(activeMedia, SRemoteCore.descriptors.currentTime, 'currentTime', details.seekTime);
        }
      });
      registerIfMissing('seekforward', details => {
        if (activeMedia) {
          const offset = details.seekOffset || 10;
          const cur = SRemoteCore.safeGetProp(activeMedia, SRemoteCore.descriptors.currentTime, 'currentTime') || 0;
          SRemoteCore.safeSetProp(activeMedia, SRemoteCore.descriptors.currentTime, 'currentTime', cur + offset);
        }
      });
      registerIfMissing('seekbackward', details => {
        if (activeMedia) {
          const offset = details.seekOffset || 10;
          const cur = SRemoteCore.safeGetProp(activeMedia, SRemoteCore.descriptors.currentTime, 'currentTime') || 0;
          SRemoteCore.safeSetProp(activeMedia, SRemoteCore.descriptors.currentTime, 'currentTime', Math.max(0, cur - offset));
        }
      });
    }

    // 8. Bind Metadata with SOP Blob Cloning
    function handleBindMetadata(metadata) {
      bindMediaSessionDefaults();
      if (!metadata || typeof metadata !== 'object') return;

      const safeArtworks = [];
      if (Array.isArray(metadata.artwork)) {
        for (const art of metadata.artwork) {
          if (!art?.src) continue;
          if (typeof art.src === 'string' && art.src.startsWith('blob:')) {
            console_warn(
              `[sremote] WTF you passed me ${instanceId} a Blob URL, but I told you to send Blob Object to bypass SOP. I just requested parent page to clone the object for me`,
            );
            emitToParent('requestBlobClone', { blobUrl: art.src });
          } else {
            safeArtworks.push(art);
          }
        }
      }

      try {
        const metaObj = {
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          artwork: safeArtworks,
        };
        if (typeof MediaMetadata !== 'undefined') {
          navigator.mediaSession.metadata = new MediaMetadata(metaObj);
        }
        mockMediaSessionInstance.metadata = metaObj;
      } catch (e) {
        console_warn('[sremote] Error setting MediaMetadata:', e);
      }
      sendMediaSessionState();
    }

    // 9. Command Dispatcher inside Iframe
    async function executeControl(action, value, isPureGet = false) {
      if (!isPureGet) programmaticActionTimestamp = Date.now();
      const norm = action.toLowerCase();

      resolveActiveMedia();

      // HTML5 Video/Audio Execution
      if ((mediaType === 'video' || mediaType === 'audio') && activeMedia) {
        let resVal;
        const getPaused = () => Boolean(SRemoteCore.safeGetProp(activeMedia, SRemoteCore.descriptors.paused, 'paused') ?? activeMedia.paused);

        switch (norm) {
          case 'play':
            if (!isPureGet) await safePlayMedia(activeMedia);
            resVal = !getPaused();
            break;
          case 'pause':
            if (!isPureGet) safePauseMedia(activeMedia);
            resVal = !getPaused();
            break;
          case 'toggle':
            if (!isPureGet) {
              if (getPaused()) await safePlayMedia(activeMedia);
              else safePauseMedia(activeMedia);
            }
            resVal = !getPaused();
            break;
          case 'stop':
            if (!isPureGet) {
              safePauseMedia(activeMedia);
              SRemoteCore.safeSetProp(activeMedia, SRemoteCore.descriptors.currentTime, 'currentTime', 0);
              notifyState('stop', 0);
            }
            resVal = SRemoteCore.safeGetProp(activeMedia, SRemoteCore.descriptors.currentTime, 'currentTime');
            break;
          case 'currenttime':
            if (!isPureGet && value !== undefined && value !== null) {
              SRemoteCore.safeSetProp(activeMedia, SRemoteCore.descriptors.currentTime, 'currentTime', Math.max(0, Number(value)));
            }
            resVal = SRemoteCore.safeGetProp(activeMedia, SRemoteCore.descriptors.currentTime, 'currentTime');
            break;
          case 'seek':
            if (!isPureGet && value !== undefined && value !== null) {
              const cur = SRemoteCore.safeGetProp(activeMedia, SRemoteCore.descriptors.currentTime, 'currentTime') || 0;
              SRemoteCore.safeSetProp(activeMedia, SRemoteCore.descriptors.currentTime, 'currentTime', Math.max(0, cur + Number(value)));
            }
            resVal = SRemoteCore.safeGetProp(activeMedia, SRemoteCore.descriptors.currentTime, 'currentTime');
            break;
          case 'volume':
            if (!isPureGet && value !== undefined && value !== null) {
              let num = Number(value);
              if (num > 1 && num <= 100) num /= 100;
              num = Math.min(1, Math.max(0, num));
              configuredVolume = num;
              SRemoteCore.safeSetProp(activeMedia, SRemoteCore.descriptors.volume, 'volume', num);
              for (const el of findAllMedia()) {
                if (el !== activeMedia) SRemoteCore.safeSetProp(el, SRemoteCore.descriptors.volume, 'volume', num);
              }
            }
            resVal = SRemoteCore.safeGetProp(activeMedia, SRemoteCore.descriptors.volume, 'volume');
            break;
          case 'muted':
            if (!isPureGet) {
              const curM = SRemoteCore.safeGetProp(activeMedia, SRemoteCore.descriptors.muted, 'muted');
              const nextM = value !== undefined && value !== null ? Boolean(value) : !curM;
              configuredMuted = nextM;
              SRemoteCore.safeSetProp(activeMedia, SRemoteCore.descriptors.muted, 'muted', nextM);
              for (const el of findAllMedia()) {
                if (el !== activeMedia) SRemoteCore.safeSetProp(el, SRemoteCore.descriptors.muted, 'muted', nextM);
              }
            }
            resVal = SRemoteCore.safeGetProp(activeMedia, SRemoteCore.descriptors.muted, 'muted');
            break;
          case 'playbackrate':
            if (!isPureGet && value !== undefined) {
              SRemoteCore.safeSetProp(activeMedia, SRemoteCore.descriptors.playbackRate, 'playbackRate', Number(value) || 1);
            }
            resVal = SRemoteCore.safeGetProp(activeMedia, SRemoteCore.descriptors.playbackRate, 'playbackRate');
            break;
          case 'enterpip':
            if (!isPureGet && activeMedia.requestPictureInPicture) {
              try {
                await activeMedia.requestPictureInPicture();
              } catch {}
            }
            break;
          case 'exitpip':
            if (!isPureGet && document.exitPictureInPicture) {
              try {
                await document.exitPictureInPicture();
              } catch {}
            }
            break;
          case 'pip':
            if (!isPureGet) {
              if (document.pictureInPictureElement) {
                try {
                  await document.exitPictureInPicture();
                } catch {}
              } else if (activeMedia.requestPictureInPicture) {
                try {
                  await activeMedia.requestPictureInPicture();
                } catch {}
              }
            }
            break;
          case 'bindmediasession':
            if (!navigator?.mediaSession) {
              console_error('[sremote] bindmediasession: navigator.mediaSession is not defined');
              return false;
            }
            bindMediaSessionDefaults();
            break;
          case 'bindmetadata':
            handleBindMetadata(value);
            break;
          case 'nexttrack':
          case 'previoustrack':
            if (!isPureGet) {
              await mockMediaSessionInstance.invoke(norm);
            }
            break;
          default:
            return false;
        }

        if (isPureGet) notifyState(action, resVal);
        return true;
      }

      // MediaSession Fallback
      if (mockMediaSessionInstance._handlers.size > 0 || navigator.mediaSession) {
        if (!isPureGet) {
          if (norm === 'toggle') {
            const isPaused = navigator.mediaSession?.playbackState === 'paused' || mockMediaSessionInstance.playbackState === 'paused';
            await mockMediaSessionInstance.invoke(isPaused ? 'play' : 'pause');
          } else {
            await mockMediaSessionInstance.invoke(norm, { seekOffset: Number(value) || undefined });
          }
        }
        sendMediaSessionState(action);
        return true;
      }

      return false;
    }

    // 10. ShadowDOM UI (Badge & Permission Dialog)
    function showConnectedIndicator(origin) {
      const targetOrigin = origin || primaryAuthorizedOrigin || 'unknown_parent';
      const { hideBadgeKey } = SRemoteCore.getOriginStorageKeys(targetOrigin);
      if (SRemoteCore.Storage.get(hideBadgeKey) === '1') return;
      if (indicatorHost && indicatorHost.isConnected) return;

      indicatorHost = document.createElement('div');
      indicatorHost.id = 'sremote-indicator-host';
      const shadow = indicatorHost.attachShadow({ mode: 'closed' });

      const style = document.createElement('style');
      style.textContent = SRemoteCore.UI_CSS;

      const wrapper = document.createElement('div');
      wrapper.className = 'sv-badge-wrapper';

      const dotBtn = SRemoteCore.createButton({
        className: 'sv-dot-btn',
        text: '✕',
        title: SRemoteCore.t('badgeCloseTitle'),
        onClick: () => {
          indicatorHost?.remove();
          indicatorHost = null;
        },
      });

      const label = document.createElement('span');
      label.className = 'sv-label';
      label.textContent = 'sremote';

      const actions = document.createElement('div');
      actions.className = 'sv-actions';
      const btnDontShow = SRemoteCore.createButton({
        className: 'sv-action-btn',
        text: SRemoteCore.t('badgeDontShow'),
        title: SRemoteCore.t('badgeDontShowTitle'),
        onClick: () => {
          SRemoteCore.Storage.set(hideBadgeKey, '1');
          indicatorHost?.remove();
          indicatorHost = null;
        },
      });
      actions.append(btnDontShow);

      const tooltip = document.createElement('div');
      tooltip.className = 'sv-tooltip';
      const tooltipInner = document.createElement('div');
      tooltipInner.className = 'sv-tooltip-inner';
      tooltipInner.textContent = `${SRemoteCore.t('badgeTooltipPrefix')}${targetOrigin}${SRemoteCore.t('badgeTooltipSuffix')}sremote`;
      tooltip.append(tooltipInner);

      wrapper.append(dotBtn, label, actions, tooltip);
      shadow.append(style, wrapper);

      const mount = () => {
        const target = document.body || document.documentElement;
        if (target && !indicatorHost.isConnected) target.appendChild(indicatorHost);
      };
      mount();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount, { once: true });
      }
    }

    function showPermissionPopup(source, origin) {
      if (permissionPopup) return;
      const { allowKey, denyKey } = SRemoteCore.getOriginStorageKeys(origin);
      if (SRemoteCore.Storage.get(denyKey) === '1') return;
      if (SRemoteCore.Storage.get(allowKey) === '1') {
        grantAccess(origin);
        return;
      }

      // First priority: Ask Top Window to display Central Permission Dialog in parent's Shadow DOM
      if (window.parent && window.parent !== window) {
        try {
          window.parent.postMessage(
            {
              type: `${SRemoteCore.NS}request_permission`,
              source: 'iframe',
              origin: location.origin,
            },
            origin || '*',
          );
          // Give Top Window a brief window to display central dialog
          return;
        } catch {}
      }

      const host = document.createElement('div');
      host.id = 'sremote-permission-host';
      const shadow = host.attachShadow({ mode: 'closed' });

      const style = document.createElement('style');
      style.textContent = SRemoteCore.UI_CSS;

      const dialog = document.createElement('dialog');
      const box = document.createElement('div');
      box.className = 'sv-box';

      const title = document.createElement('div');
      title.className = 'sv-title';
      title.textContent = SRemoteCore.t('dialogTitle');

      const text = document.createElement('div');
      text.className = 'sv-text';
      text.textContent = SRemoteCore.t('dialogText');

      const persistable = SRemoteCore.isPersistableOrigin(origin);
      const rememberLabel = document.createElement('label');
      rememberLabel.className = 'sv-remember';
      if (!persistable) rememberLabel.style.display = 'none';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      const rememberSpan = document.createElement('span');
      rememberSpan.textContent = SRemoteCore.t('rememberChoice');
      rememberLabel.append(chk, rememberSpan);

      function closeDialog(result) {
        const remember = persistable && chk.checked;
        try {
          dialog.close();
        } catch {}
        host.remove();
        permissionPopup = null;

        if (remember && allowKey && denyKey) {
          if (result) {
            SRemoteCore.Storage.set(allowKey, '1');
            SRemoteCore.Storage.remove(denyKey);
          } else {
            SRemoteCore.Storage.set(denyKey, '1');
            SRemoteCore.Storage.remove(allowKey);
          }
        }

        if (result) {
          grantAccess(origin);
        }
      }

      const buttons = document.createElement('div');
      buttons.className = 'sv-buttons';
      const btnDeny = SRemoteCore.createButton({
        className: 'sv-btn sv-btn-deny',
        text: SRemoteCore.t('denyBtn'),
        onClick: () => closeDialog(false),
      });
      const btnAllow = SRemoteCore.createButton({
        className: 'sv-btn sv-btn-allow',
        text: SRemoteCore.t('allowBtn'),
        onClick: () => closeDialog(true),
      });
      buttons.append(btnDeny, btnAllow);

      box.append(title, text, rememberLabel, buttons);
      dialog.append(box);
      shadow.append(style, dialog);
      dialog.addEventListener('cancel', e => {
        e.preventDefault(); // Don't close on ESC/cancel
      });

      const mountHost = () => {
        const targetMount = document.body || document.documentElement;
        if (targetMount && !host.isConnected) {
          targetMount.appendChild(host);
        }
      };
      mountHost();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountHost, { once: true });
      }

      permissionPopup = host;
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute('open', '');
      }
    }

    function grantAccess(origin) {
      primaryAuthorizedOrigin = origin;
      if (origin) authorizedOrigins.add(origin);

      let transferredPort = null;
      if (mediaPort) {
        try {
          mediaPort.close();
        } catch {}
        mediaPort = null;
      }
      const channel = new MessageChannel();
      bindPort(channel.port1);
      transferredPort = channel.port2;

      const payload = {
        type: `${SRemoteCore.NS}accept`,
        event: 'accept',
        source: 'iframe',
        instanceId,
        location: location.href,
        origin: location.origin,
        version: SRemoteCore.VERSION,
        mediaType,
        state: getVideoState(),
      };

      if (currentHandshakeId && currentHandshakeToken) {
        payload.handshakeId = currentHandshakeId;
        payload.handshakeToken = currentHandshakeToken;
      }

      console_log(`%c[SRemote:handshake] Iframe sending 'accept' to parent ->`, 'color: #10b981; font-weight: bold;', {
        origin,
        instanceId,
        hasPort: !!transferredPort,
        payload,
      });

      try {
        if (transferredPort) {
          window.top.postMessage(payload, origin || '*', [transferredPort]);
        } else {
          window.top.postMessage(payload, origin || '*');
        }
      } catch (err) {
        console_warn('[sremote] Error posting accept to top window with targetOrigin:', err);
        if (transferredPort) {
          window.top.postMessage(payload, '*', [transferredPort]);
        } else {
          window.top.postMessage(payload, '*');
        }
      }

      notifyState();
      showConnectedIndicator(origin);
    }

    function onMediaAvailable() {
      if ((mediaType === 'video' || mediaType === 'audio') && activeMedia) {
        bindVideoEvents(activeMedia);
      }
      notifyState();
      if (primaryAuthorizedOrigin) showConnectedIndicator(primaryAuthorizedOrigin);
      const waiters = mediaWaiters.splice(0, mediaWaiters.length);
      for (const w of waiters) w(true);
    }

    // 11. MessagePort Handler inside Iframe
    function bindPort(port) {
      mediaPort = port;
      port.onmessage = e => {
        const data = e.data;
        if (!data || typeof data !== 'object') return;
        const type = String(data.type || '');
        if (!type.startsWith(SRemoteCore.NS)) return;

        const action = type.slice(SRemoteCore.NS.length);
        const lowerAction = action.toLowerCase();

        console_log(`%c[SRemote:command] Iframe received command (port) -> ${action}`, 'color: #8b5cf6; font-weight: bold;', data);

        // Handle Resent Blob Object
        if (lowerAction === 'resendblobobject' && data.blob) {
          try {
            const localBlobUrl = URL.createObjectURL(data.blob);
            if (mockMediaSessionInstance.metadata) {
              const arts = mockMediaSessionInstance.metadata.artwork || [];
              arts.push({ src: localBlobUrl });
              mockMediaSessionInstance.metadata.artwork = arts;
              if (navigator.mediaSession && typeof MediaMetadata !== 'undefined') {
                navigator.mediaSession.metadata = new MediaMetadata(mockMediaSessionInstance.metadata);
              }
            }
          } catch (err) {
            console_warn('[sremote] Error creating local object URL for blob:', err);
          }
          return;
        }

        // Heartbeat Ping response
        if (lowerAction === 'ping') {
          resolveActiveMedia();
          const state = getVideoState();
          try {
            port.postMessage({
              type: `${SRemoteCore.NS}pong`,
              source: 'iframe',
              instanceId,
              mediaType,
              hasMedia: !!activeMedia,
              state,
            });
          } catch {}
          return;
        }

        if (lowerAction === 'options' || lowerAction === 'config') {
          const opts = data.options || data.value || data;
          if (opts && typeof opts === 'object') {
            if (typeof opts.treatAlmostEndAsEnd === 'boolean') treatAlmostEndAsEnd = opts.treatAlmostEndAsEnd;
          }
          return;
        }

        executeControl(action, data.value);
      };
    }

    // 12. GM Storage Query Listener for Discovery
    function listenToGMQueries() {
      let lastQueryToken = null;
      setInterval(() => {
        try {
          const queryReq = SRemoteCore.Storage.get('sremote:query_req');
          if (queryReq && queryReq !== lastQueryToken) {
            lastQueryToken = queryReq;
            resolveActiveMedia();
            const reportKey = `sremote:report:${instanceId}`;
            SRemoteCore.Storage.set(reportKey, {
              instanceId,
              location: location.href,
              origin: location.origin,
              title: document.title,
              hasMedia: !!activeMedia,
              mediaType,
              lastActive: Date.now(),
            });
          }
        } catch {}
      }, 800);
    }
    listenToGMQueries();

    // 13. Window Handshake Listener (window.onmessage)
    window.addEventListener('message', async event => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      const type = String(data.type || '');
      if (!type.startsWith(SRemoteCore.NS)) return;

      // Ignore messages originating from the same iframe or if source is iframe
      if (event.source === window || data.source === 'iframe') return;

      const action = type.slice(SRemoteCore.NS.length);
      const lowerAction = action.toLowerCase();
      const callerOrigin = event.origin || 'unknown_parent';

      console_log(`%c[SRemote:command] Iframe received command/message (window) -> ${action}`, 'color: #ec4899; font-weight: bold;', {
        origin: callerOrigin,
        data,
      });

      // Handshake Port received from parent
      if (lowerAction === 'handshake_port' && event.ports && event.ports.length > 0) {
        bindPort(event.ports[0]);
        grantAccess(callerOrigin);
        return;
      }

      // Permission response from Central Dialog on Top Window
      if (lowerAction === 'permission_response') {
        if (permissionPopup) {
          permissionPopup.remove();
          permissionPopup = null;
        }
        if (data.allowed) {
          grantAccess(data.parentOrigin || callerOrigin);
        }
        return;
      }

      // Handshake Hello from Parent
      if (lowerAction === 'hello') {
        // Only iframe windows that have or are expecting media should handle hello & display permission popup
        if (event.source === window) return;

        // If port is attached in hello message, bind it immediately
        if (event.ports && event.ports.length > 0) {
          bindPort(event.ports[0]);
        }

        // Store handshake secret context
        if (data.handshakeId && data.handshakeToken) {
          currentHandshakeId = data.handshakeId;
          currentHandshakeToken = data.handshakeToken;
        }

        const isAlreadyAccepted = authorizedOrigins.has(callerOrigin);

        // If already accepted, re-send accept immediately so parent gets synced
        if (isAlreadyAccepted) {
          grantAccess(callerOrigin);
          return;
        }

        const { allowKey, denyKey } = SRemoteCore.getOriginStorageKeys(callerOrigin);
        if (allowKey && SRemoteCore.Storage.get(denyKey) === '1') return;
        if (allowKey && SRemoteCore.Storage.get(allowKey) === '1') {
          grantAccess(callerOrigin);
          return;
        }

        if (permissionPopup) return;
        showPermissionPopup(event.source, callerOrigin);
        return;
      }

      // Dedicated Options Command via Window
      if (lowerAction === 'options' || lowerAction === 'config') {
        const opts = data.options || data.value || data;
        if (opts && typeof opts === 'object') {
          if (typeof opts.treatAlmostEndAsEnd === 'boolean') treatAlmostEndAsEnd = opts.treatAlmostEndAsEnd;
        }
      }
    });

    // 14. Boot & Observer
    async function checkPendingHelloFromGM() {
      try {
        const helloSeq = Number(SRemoteCore.Storage.get('sremote:hello_seq', 0)) || 0;
        if (helloSeq <= 0) return;

        const latestHandshake = SRemoteCore.Storage.get('sremote:latest_handshake');
        if (!latestHandshake) return;

        const parentOrigin = latestHandshake.parentOrigin || 'unknown_parent';
        if (latestHandshake.handshakeId && latestHandshake.handshakeToken) {
          currentHandshakeId = latestHandshake.handshakeId;
          currentHandshakeToken = latestHandshake.handshakeToken;
        }

        console_log(`%c[SRemote:boot] Iframe detected active hello_seq (${helloSeq}) from Parent (${parentOrigin})`, 'color: #06b6d4; font-weight: bold;');

        const { allowKey, denyKey } = SRemoteCore.getOriginStorageKeys(parentOrigin);
        if (allowKey && SRemoteCore.Storage.get(denyKey) === '1') return;
        if (allowKey && SRemoteCore.Storage.get(allowKey) === '1') {
          grantAccess(parentOrigin);
          return;
        }

        if (permissionPopup) return;
        showPermissionPopup(window.parent, parentOrigin);
      } catch (err) {
        console_warn('[sremote] Error in checkPendingHelloFromGM:', err);
      }
    }

    function boot() {
      if (resolveActiveMedia()) onMediaAvailable();

      const checkActiveMediaLiveness = () => {
        const had = !!activeMedia;
        const oldType = mediaType;
        const isCurrentAttached = activeMedia && (activeMedia.isConnected || createdMediaPool.has(activeMedia));

        if (!isCurrentAttached || !resolveActiveMedia()) {
          // Current media element was removed, garbage-collected or no media left
          if (had) {
            console_log(`%c[SRemote:media] Active media detached / dropped in iframe`, 'color: #f59e0b;');
            if (!resolveActiveMedia()) {
              activeMedia = null;
              mediaType = null;
              emitToParent('mediaDisconnected', { instanceId, hasMedia: false });
              return;
            }
          }
        }

        if (resolveActiveMedia() && (!had || oldType !== mediaType)) {
          onMediaAvailable();
        }
      };

      const observer = new MutationObserver(checkActiveMediaLiveness);
      observer.observe(document.documentElement || document, { childList: true, subtree: true });

      // Check pool / non-DOM audio liveness periodically (every 1s)
      const poolCheckInterval = setInterval(checkActiveMediaLiveness, 1000);

      // Startup media hunt poller (checks every 250ms for first 5s to catch late Audio creation)
      let huntAttempts = 0;
      const huntTimer = setInterval(() => {
        huntAttempts++;
        if (resolveActiveMedia()) {
          onMediaAvailable();
          if (activeMedia) clearInterval(huntTimer);
        } else if (huntAttempts > 20) {
          clearInterval(huntTimer);
        }
      }, 250);

      // Lifecycle teardown listeners (page unload/hide/freeze)
      let teardownDone = false;
      const handleTeardown = ev => {
        if (teardownDone) return;
        teardownDone = true;
        clearInterval(huntTimer);
        clearInterval(poolCheckInterval);
        try {
          emitToParent('disconnect', { instanceId, reason: ev?.type || 'page_unload' });
          if (mediaPort) {
            mediaPort.close();
            mediaPort = null;
          }
        } catch {}
      };

      try {
        window.addEventListener('pagehide', handleTeardown, { capture: true });
      } catch {}
      // try {
      //   window.addEventListener('beforeunload', handleTeardown, { capture: true });
      //   window.addEventListener('unload', handleTeardown, { capture: true });
      // } catch {}

      // Check if Parent already triggered hello before iframe loaded
      checkPendingHelloFromGM();
    }

    // Check GM pending hello immediately on script injection
    checkPendingHelloFromGM();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }
  }

  // ==========================================================================
  // ENTRY POINT: Conditional Dispatcher (Parent vs Iframe)
  // ==========================================================================
  if (window.top === window.self) {
    initParentController();
  } else {
    initIframeAgent();
  }
})();

/**
 * SRemote Demo - Lightweight i18n Module
 * Handles loading translations from lang/[lang].json, interpolation,
 * DOM element auto-translation, event broadcasting, and localStorage persistence.
 */

(function initI18nModule() {
  'use strict';

  const STORAGE_KEY = 'sremote_demo_lang';
  const SUPPORTED_LANGS = ['vi', 'en'];
  const DEFAULT_LANG = 'vi';

  const cache = {};
  let currentLang = DEFAULT_LANG;
  const listeners = new Set();

  /**
   * Determine initial language
   */
  function detectInitialLang() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LANGS.includes(stored)) {
        return stored;
      }
    } catch {}

    const navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (navLang.startsWith('vi')) return 'vi';
    if (navLang.startsWith('en')) return 'en';

    return DEFAULT_LANG;
  }

  /**
   * Fetch dictionary JSON for specified lang
   */
  async function loadTranslations(lang) {
    if (cache[lang]) return cache[lang];

    try {
      const res = await fetch(`lang/${lang}.json`);
      if (!res.ok) {
        throw new Error(`Failed to load lang/${lang}.json: HTTP ${res.status}`);
      }
      const data = await res.json();
      cache[lang] = data;
      return data;
    } catch (err) {
      console.error(`[i18n] Error loading translation file for '${lang}':`, err);
      // Fallback to cache if available
      return cache[lang] || {};
    }
  }

  /**
   * Resolve nested key (e.g. "status.conn_connected")
   */
  function getNestedValue(obj, keyPath) {
    if (!obj || !keyPath) return undefined;
    const parts = keyPath.split('.');
    let cur = obj;
    for (const part of parts) {
      if (cur && typeof cur === 'object' && part in cur) {
        cur = cur[part];
      } else {
        return undefined;
      }
    }
    return cur;
  }

  /**
   * Interpolate parameters in translation template: "Hello {name}" -> "Hello World"
   */
  function interpolate(template, params) {
    if (typeof template !== 'string') return template;
    if (!params || typeof params !== 'object') return template;

    return template.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
  }

  /**
   * Translation function
   */
  function t(key, params = {}) {
    const dict = cache[currentLang] || cache[DEFAULT_LANG] || {};
    let val = getNestedValue(dict, key);

    if (val === undefined) {
      // Fallback to default lang if different
      if (currentLang !== DEFAULT_LANG && cache[DEFAULT_LANG]) {
        val = getNestedValue(cache[DEFAULT_LANG], key);
      }
    }

    if (val === undefined) {
      return key; // return raw key if missing
    }

    return interpolate(val, params);
  }

  /**
   * Apply translations to DOM elements with data-i18n attributes
   */
  function updateDOM() {
    document.documentElement.lang = currentLang;

    // 1. Text content
    const textEls = document.querySelectorAll('[data-i18n]');
    textEls.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      let params = {};
      const paramsAttr = el.getAttribute('data-i18n-params');
      if (paramsAttr) {
        try {
          params = JSON.parse(paramsAttr);
        } catch {}
      }
      el.textContent = t(key, params);
    });

    // 2. Placeholders
    const placeholderEls = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderEls.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (!key) return;
      el.setAttribute('placeholder', t(key));
    });

    // 3. Titles / Tooltips
    const titleEls = document.querySelectorAll('[data-i18n-title]');
    titleEls.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (!key) return;
      el.setAttribute('title', t(key));
    });

    // 4. Aria-labels
    const ariaEls = document.querySelectorAll('[data-i18n-aria-label]');
    ariaEls.forEach(el => {
      const key = el.getAttribute('data-i18n-aria-label');
      if (!key) return;
      let params = {};
      const paramsAttr = el.getAttribute('data-i18n-params');
      if (paramsAttr) {
        try {
          params = JSON.parse(paramsAttr);
        } catch {}
      }
      el.setAttribute('aria-label', t(key, params));
    });

    // 5. Page Title & Meta Description
    const pageTitle = t('app.page_title');
    if (pageTitle && pageTitle !== 'app.page_title') {
      document.title = pageTitle;
    }
  }

  /**
   * Switch active language
   */
  async function setLanguage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) {
      console.warn(`[i18n] Unsupported language: ${lang}`);
      return;
    }

    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}

    await loadTranslations(lang);
    updateDOM();

    // Notify listeners
    listeners.forEach(fn => {
      try {
        fn(lang);
      } catch (err) {
        console.error('[i18n] Error in language change listener:', err);
      }
    });

    // Dispatch custom DOM event
    window.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }));
  }

  /**
   * Register listener for language change
   */
  function onLanguageChange(fn) {
    if (typeof fn === 'function') {
      listeners.add(fn);
    }
  }

  /**
   * Initialize module
   */
  async function init() {
    currentLang = detectInitialLang();
    // Preload both default and current language dictionaries
    await Promise.all([loadTranslations(DEFAULT_LANG), currentLang !== DEFAULT_LANG ? loadTranslations(currentLang) : Promise.resolve()]);

    updateDOM();

    // Hook language switcher select if present in DOM
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
      langSelect.value = currentLang;
      langSelect.addEventListener('change', e => {
        setLanguage(e.target.value);
      });
    }
  }

  // Export i18n API to window
  window.i18n = {
    t,
    setLanguage,
    onLanguageChange,
    getLanguage: () => currentLang,
    getSupportedLanguages: () => [...SUPPORTED_LANGS],
    updateDOM,
    init,
  };

  // Run initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
})();

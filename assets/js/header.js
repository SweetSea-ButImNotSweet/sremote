/**
 * SRemote Shared Header Web Component (<sremote-header>)
 *
 * Provides a unified top navigation bar with:
 * - Brand logo & version badge
 * - Navigation links (Home, Docs, Cookbook, Live Demo)
 * - GitHub repository link
 * - Shared Language Switcher (EN/VI) with automatic localStorage sync and event broadcasting
 */

(function initSRemoteHeaderComponent() {
  'use strict';

  const STORAGE_KEY = 'sremote_lang';
  const SUPPORTED_LANGS = ['vi', 'en'];
  const DEFAULT_LANG = 'vi';

  const i18nNav = {
    vi: {
      brandTitle: 'SRemote',
      home: 'Trang chủ',
      docs: 'Hướng dẫn sử dụng',
      cookbook: 'Hướng dẫn triển khai',
      demo: 'Live Demo',
      changelog: 'Changelog',
      install: 'Cài đặt Userscript',
      optUnmin: 'Bản tiêu chuẩn (Mặc định)',
      optMin: 'Bản nén (Minified)',
      optDev: 'Môi trường phát triển (Local Dev)',
      langLabel: 'Ngôn ngữ',
      github: 'GitHub',
      devModalTitle: 'Cấu hình Userscript Local Dev',
      devModalDesc: 'Tạo một Userscript mới trong Tampermonkey / Violentmonkey và dán đoạn mã sau để nạp trực tiếp file build từ máy cục bộ:',
      copied: 'Đã sao chép!',
      copyBtn: 'Sao chép mã',
      closeBtn: 'Đóng',
    },
    en: {
      brandTitle: 'SRemote',
      home: 'Home',
      docs: 'Documentation',
      cookbook: 'Integration Recipes',
      demo: 'Live Demo',
      changelog: 'Changelog',
      install: 'Install Userscript',
      optUnmin: 'Standard Build (Default)',
      optMin: 'Minified Build',
      optDev: 'Local Dev Environment',
      langLabel: 'Language',
      github: 'GitHub',
      devModalTitle: 'Local Dev Userscript Setup',
      devModalDesc: 'Create a new script in Tampermonkey / Violentmonkey and paste the header snippet below to load the local build directly from your machine:',
      copied: 'Copied!',
      copyBtn: 'Copy Code',
      closeBtn: 'Close',
    },
  };

  const DEV_HEADER_SNIPPET = `// ==UserScript==
// @name         SRemote Local Dev
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @run-at       document-start
// @require      http://localhost:5173/dist/sremote.user.js
// ==/UserScript==`;

  class SRemoteHeader extends HTMLElement {
    constructor() {
      super();
      this._lang = this.detectLanguage();
    }

    connectedCallback() {
      this.render();
      this.setupEventListeners();
    }

    detectLanguage() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('sremote_demo_lang');
        if (saved && SUPPORTED_LANGS.includes(saved)) {
          return saved;
        }
      } catch {}

      if (document.documentElement.lang && SUPPORTED_LANGS.includes(document.documentElement.lang)) {
        return document.documentElement.lang;
      }

      return DEFAULT_LANG;
    }

    getBasePath() {
      // Allow manual override via base-path attribute (e.g. "./" or "../")
      if (this.hasAttribute('base-path')) {
        return this.getAttribute('base-path');
      }

      // Auto-detect based on current URL path
      const path = window.location.pathname.replace(/\\/g, '/');
      if (path.includes('/demo/') || path.includes('/docs/')) {
        return '../';
      }
      return './';
    }

    getActivePage() {
      if (this.hasAttribute('active')) {
        return this.getAttribute('active').toLowerCase();
      }

      const path = window.location.pathname.replace(/\\/g, '/');
      if (path.endsWith('/demo/') || path.endsWith('/demo/index.html')) return 'demo';
      if (path.endsWith('/docs/recipes.html') || path.includes('recipes.html')) return 'cookbook';
      if (path.includes('/docs/')) return 'docs';
      if (path.includes('changelog.html')) return 'changelog';
      return 'home';
    }

    render() {
      const base = this.getBasePath();
      const active = this.getActivePage();
      const dict = i18nNav[this._lang] || i18nNav[DEFAULT_LANG];

      const homeHref = `${base}index.html`;
      const docsHref = `${base}docs/index.html`;
      const cookbookHref = `${base}docs/recipes.html`;
      const demoHref = `${base}demo/index.html`;
      const changelogHref = `${base}changelog.html`;

      this.innerHTML = `
        <header class="app-header">
          <div class="header-left">
            <a href="${homeHref}" class="header-brand" title="SRemote Home">
              <span class="header-title">${dict.brandTitle}</span>
              <span class="header-version-badge">v2.1.0</span>
            </a>

            <nav class="header-nav" aria-label="Main navigation">
              <a href="${homeHref}" class="header-nav-link ${active === 'home' ? 'active' : ''}" data-nav="home">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span class="nav-text">${dict.home}</span>
              </a>

              <a href="${docsHref}" class="header-nav-link ${active === 'docs' ? 'active' : ''}" data-nav="docs">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <span class="nav-text">${dict.docs}</span>
              </a>

              <a href="${cookbookHref}" class="header-nav-link ${active === 'cookbook' || active === 'recipes' ? 'active' : ''}" data-nav="cookbook">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                <span class="nav-text">${dict.cookbook}</span>
              </a>

              <a href="${demoHref}" class="header-nav-link ${active === 'demo' ? 'active' : ''}" data-nav="demo">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span class="nav-text">${dict.demo}</span>
              </a>

              <a href="${changelogHref}" class="header-nav-link ${active === 'changelog' ? 'active' : ''}" data-nav="changelog">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span class="nav-text">${dict.changelog}</span>
              </a>
            </nav>
          </div>

          <div class="header-right">
            <!-- Install Userscript Dropdown -->
            <div class="header-dropdown" id="header-install-dropdown">
              <a href="${base}dist/sremote.user.js" class="header-btn header-btn-success" id="header-btn-install" title="${dict.install}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span class="header-btn-text">${dict.install}</span>
              </a>
              <button type="button" class="header-dropdown-toggle" id="header-install-toggle" aria-label="Install options" title="Install options">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div class="header-dropdown-menu" id="header-install-menu">
                <a href="${base}dist/sremote.user.js" class="header-dropdown-item">
                  <strong>${dict.optUnmin}</strong>
                  <small>dist/sremote.user.js</small>
                </a>
                <a href="${base}dist/sremote.min.user.js" class="header-dropdown-item">
                  <strong>${dict.optMin}</strong>
                  <small>dist/sremote.min.user.js</small>
                </a>
                <div class="header-dropdown-divider"></div>
                <button type="button" class="header-dropdown-item header-dropdown-btn" id="header-btn-dev-snippet">
                  <strong>${dict.optDev}</strong>
                  <small>Local @require file:/// template</small>
                </button>
              </div>
            </div>

            <label for="header-lang-select" class="visually-hidden">${dict.langLabel}</label>
            <select id="header-lang-select" class="header-select" aria-label="${dict.langLabel}">
              <option value="vi" ${this._lang === 'vi' ? 'selected' : ''}>Tiếng Việt</option>
              <option value="en" ${this._lang === 'en' ? 'selected' : ''}>English</option>
            </select>

            <a href="https://github.com/sweetsea/sremote" class="header-link-btn" target="_blank" rel="noopener noreferrer" title="GitHub Repository">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span>${dict.github}</span>
            </a>
          </div>
        </header>

        <!-- Dev Snippet Modal -->
        <div class="header-modal-overlay" id="header-dev-modal" style="display: none;">
          <div class="header-modal-card">
            <div class="header-modal-header">
              <h3 class="header-modal-title">${dict.devModalTitle}</h3>
              <button type="button" class="header-modal-close" id="header-modal-close-btn">&times;</button>
            </div>
            <div class="header-modal-body">
              <p class="header-modal-desc">${dict.devModalDesc}</p>
              <pre class="header-modal-code"><code>${DEV_HEADER_SNIPPET}</code></pre>
            </div>
            <div class="header-modal-footer">
              <button type="button" class="header-btn header-btn-secondary" id="header-modal-cancel-btn">${dict.closeBtn}</button>
              <button type="button" class="header-btn header-btn-success" id="header-modal-copy-btn">
                <span id="header-modal-copy-text">${dict.copyBtn}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    setupEventListeners() {
      const select = this.querySelector('#header-lang-select');
      if (select) {
        select.addEventListener('change', e => {
          this.setLanguage(e.target.value);
        });
      }

      // Dropdown toggle
      const dropdown = this.querySelector('#header-install-dropdown');
      const toggle = this.querySelector('#header-install-toggle');
      const menu = this.querySelector('#header-install-menu');
      if (toggle && menu) {
        toggle.addEventListener('click', e => {
          e.stopPropagation();
          menu.classList.toggle('show');
        });

        document.addEventListener('click', e => {
          if (!dropdown.contains(e.target)) {
            menu.classList.remove('show');
          }
        });
      }

      // Modal handling
      const devSnippetBtn = this.querySelector('#header-btn-dev-snippet');
      const modal = this.querySelector('#header-dev-modal');
      const closeBtn = this.querySelector('#header-modal-close-btn');
      const cancelBtn = this.querySelector('#header-modal-cancel-btn');
      const copyBtn = this.querySelector('#header-modal-copy-btn');
      const copyText = this.querySelector('#header-modal-copy-text');
      const dict = i18nNav[this._lang] || i18nNav[DEFAULT_LANG];

      const openModal = () => {
        if (menu) menu.classList.remove('show');
        if (modal) modal.style.display = 'flex';
      };

      const closeModal = () => {
        if (modal) modal.style.display = 'none';
      };

      if (devSnippetBtn) {
        devSnippetBtn.addEventListener('click', openModal);
      }

      if (closeBtn) closeBtn.addEventListener('click', closeModal);
      if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

      if (modal) {
        modal.addEventListener('click', e => {
          if (e.target === modal) closeModal();
        });
      }

      if (copyBtn && copyText) {
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(DEV_HEADER_SNIPPET);
            copyText.textContent = dict.copied;
            setTimeout(() => {
              copyText.textContent = dict.copyBtn;
            }, 2000);
          } catch {
            // Fallback copy
            const textarea = document.createElement('textarea');
            textarea.value = DEV_HEADER_SNIPPET;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            copyText.textContent = dict.copied;
            setTimeout(() => {
              copyText.textContent = dict.copyBtn;
            }, 2000);
          }
        });
      }

      // Sync if another module triggers i18n change
      window.addEventListener('i18n:changed', e => {
        if (e.detail?.lang && e.detail.lang !== this._lang) {
          this._lang = e.detail.lang;
          this.render();
          this.setupEventListeners();
        }
      });
    }

    setLanguage(lang) {
      if (!SUPPORTED_LANGS.includes(lang)) return;
      this._lang = lang;
      localStorage.setItem(STORAGE_KEY, lang);
      localStorage.setItem('sremote_demo_lang', lang);
      document.documentElement.lang = lang;

      this.render();
      this.setupEventListeners();

      // 1. If page has demo i18n instance
      if (window.i18n && typeof window.i18n.setLanguage === 'function') {
        window.i18n.setLanguage(lang);
      }

      // 2. If page has root index.html setLanguage function
      if (typeof window.setLanguage === 'function') {
        window.setLanguage(lang);
      }

      // 3. If page has recipes.html setLang function
      if (typeof window.setLang === 'function') {
        window.setLang(lang);
      }

      // 4. Dispatch custom event for any other listeners
      window.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }));
    }
  }

  // Register custom element
  if (!customElements.get('sremote-header')) {
    customElements.define('sremote-header', SRemoteHeader);
  }
})();

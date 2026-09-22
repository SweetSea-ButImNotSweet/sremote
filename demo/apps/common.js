/**
 * SRemote Demo Apps - Common UI & Theme Manager (Flat 2.0)
 * Handles auto OS theme detection, localStorage sync, top bar rendering, and SVG icons.
 */

(function initDemoCommon() {
  'use strict';

  const STORAGE_KEY = 'sremote_demo_theme';

  // 1. Icon Library (Clean SVG Lucide/Heroicons Style)
  const Icons = {
    play: '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3" fill="currentColor"/></svg>',
    pause:
      '<svg class="svg-icon" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>',
    replay: '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    volumeHigh:
      '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
    volumeMute:
      '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
    prev: '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>',
    next: '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>',
    sun: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    moon: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    arrowLeft: '<svg class="svg-icon" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    book: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    trash:
      '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  };

  window.DemoIcons = Icons;

  // 2. Theme State Manager
  function getPreferredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const toggleBtn = document.getElementById('btn-theme-toggle');
    if (toggleBtn) {
      toggleBtn.innerHTML = theme === 'light' ? Icons.moon : Icons.sun;
      toggleBtn.setAttribute('title', theme === 'light' ? 'Chuyển sang chế độ Tối (Dark)' : 'Chuyển sang chế độ Sáng (Light)');
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  // Listen to OS theme changes if user has not overridden
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? 'light' : 'dark');
      }
    });
  }

  // 3. Inject Common Top Bar
  window.setupDemoTopBar = function ({ appName, tutorialPath }) {
    const existing = document.querySelector('.demo-top-bar');
    if (existing) existing.remove();

    const nav = document.createElement('nav');
    nav.className = 'demo-top-bar';
    nav.innerHTML = `
      <div class="demo-top-left">
        <a href="../../index.html" class="demo-nav-link" title="Về Demo Showcase Hub">
          ${Icons.arrowLeft} <span>Demo Hub</span>
        </a>
        <span class="demo-app-badge">${appName}</span>
      </div>
      <div class="demo-top-right">
        <button type="button" id="btn-theme-toggle" class="btn-theme-toggle" aria-label="Toggle Theme">
          ${Icons.sun}
        </button>
        <a href="../../../docs/index.html?path=${tutorialPath}" target="_blank" class="demo-nav-link" title="Mở hướng dẫn chi tiết">
          ${Icons.book} <span>Tutorial</span>
        </a>
      </div>
    `;

    document.body.prepend(nav);
    document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);
    applyTheme(getPreferredTheme());
  };

  // Auto initialize theme on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(getPreferredTheme());
  });
})();

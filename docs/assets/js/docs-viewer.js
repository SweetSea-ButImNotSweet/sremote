/**
 * SRemote Documentation Engine: Marked.js + Highlight.js, TOC Search, i18n & History Routing
 */

// i18n Dictionaries
const i18nDocs = {
  vi: {
    pageTitle: 'SRemote - Tài liệu Kỹ thuật & Tra cứu API',
    homeBtn: 'Trang chủ',
    cookbookBtn: '⚡ Mẫu Embed & Adapter (Cookbook)',
    demoBtn: '▶ Mở Demo Live',
    searchPlaceholder: '🔍 Tìm nhanh API hoặc tài liệu...',
    langTitle: 'Ngôn ngữ:',
    copyLink: 'Sao chép Link',
    copied: '✓ Đã chép!',
    groupGeneral: '📖 Giới thiệu chung',
    groupConnect: '🔌 Kết nối & Chế độ phát',
    groupPlayback: '🎮 Điều khiển & Âm thanh',
    groupConfig: '🎨 CSS Iframe',
    groupState: '📊 Trạng thái & Danh sách',
    groupEvents: '📡 Sự kiện & Tích hợp',
    groupDebug: '🛠️ Chẩn đoán & Debug',
    loading: 'Đang nạp và định dạng nội dung...',
    sourcePrefix: 'Nguồn file:',
    renderedBy: 'Rendered by <strong>Marked.js</strong>',
    footerText: 'SRemote Frame Controller © 2026 sweetsea • Giấy phép LGPL-3.0 • Hỗ trợ mọi trình duyệt & Tampermonkey.',
    errorTitle: '⚠️ Không thể tải tài liệu',
    errorDesc: 'Chi tiết lỗi:',
    errorFallback: 'Vui lòng kiểm tra lại đường dẫn file hoặc quay lại',
    fallbackLinkText: 'Hướng dẫn tích hợp',
  },
  en: {
    pageTitle: 'SRemote - Technical Documentation & API Reference',
    homeBtn: 'Home',
    cookbookBtn: '⚡ Embed & Adapter Cookbook',
    demoBtn: '▶ Open Live Demo',
    searchPlaceholder: '🔍 Quick search API or docs...',
    langTitle: 'Language:',
    copyLink: 'Copy Link',
    copied: '✓ Copied!',
    groupGeneral: '📖 General & Overview',
    groupConnect: '🔌 Connection & Mode',
    groupPlayback: '🎮 Playback & Audio',
    groupConfig: '🎨 Iframe CSS',
    groupState: '📊 Status & Inspection',
    groupEvents: '📡 Events & Integration',
    groupDebug: '🛠️ Diagnostics & Debug',
    loading: 'Loading and rendering document...',
    sourcePrefix: 'File source:',
    renderedBy: 'Rendered by <strong>Marked.js</strong>',
    footerText: 'SRemote Frame Controller © 2026 sweetsea • Licensed under LGPL-3.0 • Supports all browsers & Tampermonkey.',
    errorTitle: '⚠️ Unable to load documentation',
    errorDesc: 'Error details:',
    errorFallback: 'Please verify the file path or return to',
    fallbackLinkText: 'Integration Guide',
  },
};

let currentLang = 'vi';

// Helper: Generate URL-safe slug from raw text for heading IDs
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '') // remove any HTML tags like <code> for ID slug
    .replace(/`([^`]+)`/g, '$1') // remove markdown inline code ticks
    .replace(/[^\p{L}\p{N}\s_-]/gu, '') // Keep Unicode letters/numbers, whitespace, hyphen, underscore
    .replace(/\s+/g, '-') // Replace spaces with hyphen
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
}

// Configure Marked.js with Custom Heading Renderer and Highlight.js
if (typeof marked !== 'undefined') {
  const renderer = new marked.Renderer();

  // Custom heading renderer that preserves inline markdown/HTML formatting inside headings
  renderer.heading = function (tokenOrText, level, raw) {
    let renderedContent = '';
    let rawText = '';
    let depth = level || 1;

    // Marked v5+ uses token object: { tokens: [...], text: '...', depth: 1 }
    if (typeof tokenOrText === 'object' && tokenOrText !== null) {
      depth = tokenOrText.depth || depth;
      rawText = tokenOrText.raw || tokenOrText.text || '';
      if (this.parser && typeof this.parser.parseInline === 'function' && tokenOrText.tokens) {
        renderedContent = this.parser.parseInline(tokenOrText.tokens);
      } else {
        renderedContent = tokenOrText.text || '';
      }
    } else {
      // Marked legacy syntax (text, level, raw)
      renderedContent = tokenOrText || '';
      rawText = raw || tokenOrText || '';
    }

    const id = slugify(rawText || renderedContent);
    return `<h${depth}${id ? ` id="${id}"` : ''}>${renderedContent}</h${depth}>\n`;
  };

  marked.use({
    renderer,
    gfm: true,
    breaks: true,
    mangle: false,
    highlight: function (code, lang) {
      if (typeof hljs !== 'undefined') {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
      }
      return code;
    },
  });
}

// Helper: Parse GitHub Alerts (> [!NOTE], > [!TIP], etc.)
function renderGfmAlerts(html) {
  const alertTypes = {
    NOTE: { title: 'Note', icon: 'ℹ️', class: 'gfm-alert-note' },
    TIP: { title: 'Tip', icon: '💡', class: 'gfm-alert-tip' },
    IMPORTANT: { title: 'Important', icon: '🔔', class: 'gfm-alert-important' },
    WARNING: { title: 'Warning', icon: '⚠️', class: 'gfm-alert-warning' },
    CAUTION: { title: 'Caution', icon: '🛑', class: 'gfm-alert-caution' },
  };

  return html.replace(
    /<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br>|\n)?([\s\S]*?)<\/p>\s*<\/blockquote>/gi,
    (match, type, content) => {
      const upperType = type.toUpperCase();
      const alert = alertTypes[upperType] || alertTypes.NOTE;
      return `
      <div class="gfm-alert ${alert.class}">
        <div class="gfm-alert-title">${alert.icon} ${alert.title}</div>
        <p>${content}</p>
      </div>
    `;
    },
  );
}

function scrollToHashElement(hash) {
  if (!hash) return;
  const targetId = decodeURIComponent(hash.replace(/^#/, ''));
  if (!targetId) return;

  const targetEl = document.getElementById(targetId) || document.querySelector(`[name="${targetId}"]`);
  if (targetEl) {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    targetEl.classList.add('highlight-target');
    setTimeout(() => targetEl.classList.remove('highlight-target'), 2000);
  }
}

function getDefaultDocPath(lang) {
  return lang === 'en' ? 'content/setup/en.md' : 'content/setup/vi.md';
}

function getDocPathForLang(docPath, targetLang) {
  if (!docPath) return getDefaultDocPath(targetLang);
  if (targetLang === 'en') {
    if (docPath === 'content/guides/vi.md' || docPath === 'docs/content/guides/vi.md' || docPath === 'content/guides/README_vi.md') return '../README.md';
    if (docPath === 'content/setup/vi.md' || docPath === 'docs/content/setup/vi.md') return 'content/setup/en.md';
    if (docPath === 'content/guides/vi/errors.md') return 'content/guides/en/errors.md';
    return docPath
      .replace(/^docs\//, '')
      .replace('content/api/vi/', 'content/api/en/')
      .replace('content/setup/vi.md', 'content/setup/en.md');
  } else {
    if (docPath === '../README.md' || docPath === 'README.md') return 'content/guides/README_vi.md';
    if (docPath === 'content/setup/en.md' || docPath === 'docs/content/setup/en.md') return 'content/setup/vi.md';
    if (docPath === 'content/guides/en/errors.md') return 'content/guides/vi/errors.md';
    return docPath
      .replace(/^docs\//, '')
      .replace('content/api/en/', 'content/api/vi/')
      .replace('content/setup/en.md', 'content/setup/vi.md');
  }
}

// Router function: Fetch and render Markdown based on requested path
async function renderDoc(docPath, pushToHistory = true, targetHash = null) {
  if (!docPath) docPath = getDefaultDocPath(currentLang);

  // Normalize legacy doc paths
  if (docPath.startsWith('API/')) docPath = 'content/api/' + docPath.substring(4);
  if (docPath.startsWith('SETUP/')) docPath = 'content/setup/' + docPath.substring(6);
  if (docPath.startsWith('README/')) docPath = 'content/guides/' + docPath.substring(7);

  // Clean leading slashes
  docPath = docPath.replace(/^\/+/, '');

  const container = document.getElementById('markdown-container');
  const headingTitle = document.getElementById('doc-heading-title');
  const dict = i18nDocs[currentLang];

  // Update active TOC item
  highlightTOC(docPath);

  // Update URL query ?path=... and hash
  if (pushToHistory) {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('path', docPath);
    if (targetHash) {
      newUrl.hash = targetHash;
    } else {
      newUrl.hash = '';
    }
    window.history.pushState({ path: docPath, hash: targetHash || '' }, '', newUrl.toString());
  }

  try {
    container.innerHTML = `<div class="loading-spinner">${dict.loading}</div>`;

    const fetchUrl = docPath;
    const res = await fetch(fetchUrl + '?t=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    let markdownText = await res.text();

    // Extract main title for page title / heading if present
    const titleMatch = markdownText.match(/^#\s+(.+)$/m);
    if (titleMatch && titleMatch[1]) {
      document.title = `${titleMatch[1]} - SRemote Docs`;
      if (headingTitle) headingTitle.textContent = titleMatch[1];
    } else {
      document.title = `SRemote Docs`;
    }

    // Render Markdown
    if (typeof marked !== 'undefined') {
      let html = marked.parse(markdownText);
      html = renderGfmAlerts(html);
      container.innerHTML = html;
    } else {
      container.innerHTML = `<pre>${markdownText}</pre>`;
    }

    // Apply Highlight.js to all code blocks in container
    if (typeof hljs !== 'undefined') {
      container.querySelectorAll('pre code').forEach(block => {
        hljs.highlightElement(block);
      });
    }

    // Intercept internal markdown links in rendered content
    interceptContentLinks(container, docPath);

    // Scroll to target hash or top
    const activeHash = targetHash || window.location.hash;
    if (activeHash) {
      setTimeout(() => scrollToHashElement(activeHash), 50);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (err) {
    console.error('Lỗi khi tải tài liệu:', err);
    container.innerHTML = `
      <div style="border-left: 4px solid #d9534f; background: #fdf7f7; color: #a94442; padding: 16px; border-radius: 3px;">
        <h4 style="margin-bottom: 6px; font-size: 15px;">${dict.errorTitle} (${displayPath})</h4>
        <p style="margin-bottom: 8px;">${dict.errorDesc} ${err.message}.</p>
        <p style="font-size: 12px; color: #777;">${dict.errorFallback} <a href="?path=${getDefaultDocPath(currentLang)}" style="color: #337ab7; font-weight: 600;">${dict.fallbackLinkText}</a>.</p>
      </div>
    `;
  }
}

// Highlight active link in sidebar TOC
function highlightTOC(activePath) {
  const links = document.querySelectorAll('.toc-link');
  const normalizedActive = activePath.replace(/^docs\//, '').replace(/^\/+/, '');
  const viVariant = normalizedActive
    .replace('content/api/en/', 'content/api/vi/')
    .replace('content/guides/en/', 'content/guides/vi/')
    .replace('../README.md', 'content/guides/README_vi.md');
  const enVariant = normalizedActive
    .replace('content/api/vi/', 'content/api/en/')
    .replace('content/guides/vi/', 'content/guides/en/')
    .replace('content/guides/README_vi.md', '../README.md');

  links.forEach(link => {
    const linkPath = link.getAttribute('data-path') || '';
    const enPath = link.getAttribute('data-en-path') || '';
    if (
      linkPath === normalizedActive ||
      enPath === normalizedActive ||
      linkPath === viVariant ||
      enPath === enVariant ||
      linkPath.replace('content/api/vi/', 'content/api/en/') === enVariant ||
      linkPath.replace('content/guides/vi/', 'content/guides/en/') === enVariant
    ) {
      link.classList.add('active');
      link.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } else {
      link.classList.remove('active');
    }
  });
}

// Intercept .md anchor clicks within rendered content to navigate as SPA
function interceptContentLinks(container, currentDocPath) {
  const anchors = container.querySelectorAll('a');
  anchors.forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;

    // External links
    if (href.startsWith('http://') || href.startsWith('https://')) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      return;
    }

    if (href.startsWith('javascript:')) return;

    // In-page hash anchor (e.g. href="#auth_failed" or href="#auth-failed")
    if (href.startsWith('#')) {
      a.addEventListener('click', e => {
        e.preventDefault();
        const hash = href;
        if (history.pushState) {
          history.pushState(null, null, hash);
        } else {
          location.hash = hash;
        }
        scrollToHashElement(hash);
      });
      return;
    }

    // Cross-doc link with hash (e.g. href="../../guides/errors.md#auth_failed")
    if (href.endsWith('.md') || href.includes('.md#') || href.includes('.md?')) {
      a.addEventListener('click', e => {
        e.preventDefault();
        const currentDir = currentDocPath.includes('/') ? currentDocPath.substring(0, currentDocPath.lastIndexOf('/') + 1) : '';
        const hashPart = href.includes('#') ? '#' + href.split('#')[1] : null;
        let targetPath = href.split('#')[0].split('?')[0];

        if (targetPath.startsWith('docs/')) {
          targetPath = targetPath.replace('docs/', '');
        } else if (!targetPath.startsWith('/') && !targetPath.startsWith('..') && !targetPath.startsWith('content/')) {
          targetPath = currentDir + targetPath;
        }
        targetPath = targetPath.replace(/\/\.\//g, '/').replace(/^\.\//, '');

        renderDoc(targetPath, true, hashPart);
      });
    }
  });
}

// Language switcher
function setLanguage(lang) {
  if (!i18nDocs[lang]) return;
  currentLang = lang;
  localStorage.setItem('sremote_lang', lang);
  document.documentElement.lang = lang;

  const dict = i18nDocs[lang];

  // Update switcher active buttons
  const btnEn = document.getElementById('btn-lang-en');
  const btnVi = document.getElementById('btn-lang-vi');
  if (btnEn) btnEn.classList.toggle('active', lang === 'en');
  if (btnVi) btnVi.classList.toggle('active', lang === 'vi');

  // Update UI Labels
  const homeBtn = document.getElementById('label-home-btn');
  if (homeBtn) homeBtn.textContent = dict.homeBtn;
  const cookbookBtn = document.getElementById('label-cookbook-btn');
  if (cookbookBtn) cookbookBtn.textContent = dict.cookbookBtn;
  const demoBtn = document.getElementById('label-demo-btn');
  if (demoBtn) demoBtn.textContent = dict.demoBtn;
  const searchInputEl = document.getElementById('toc-search-input');
  if (searchInputEl) searchInputEl.placeholder = dict.searchPlaceholder;
  const langTitleEl = document.getElementById('label-lang-title');
  if (langTitleEl) langTitleEl.textContent = dict.langTitle;
  const copyBtnText = document.getElementById('copy-btn-text');
  if (copyBtnText) copyBtnText.textContent = dict.copyLink;
  document.getElementById('toc-group-general').textContent = dict.groupGeneral;
  document.getElementById('toc-group-connect').textContent = dict.groupConnect;
  document.getElementById('toc-group-playback').textContent = dict.groupPlayback;
  document.getElementById('toc-group-config').textContent = dict.groupConfig;
  document.getElementById('toc-group-state').textContent = dict.groupState;
  document.getElementById('toc-group-events').textContent = dict.groupEvents;
  document.getElementById('toc-group-debug').textContent = dict.groupDebug;
  document.getElementById('footer-text').textContent = dict.footerText;

  // Update TOC link labels
  document.querySelectorAll('.toc-label').forEach(el => {
    const txt = el.getAttribute(`data-${lang}`);
    if (txt) el.textContent = txt;
  });

  // Switch current viewed document to the appropriate language
  const params = new URLSearchParams(window.location.search);
  let currentPath = params.get('path');
  const targetDocPath = getDocPathForLang(currentPath, lang);
  renderDoc(targetDocPath, true);
}

// Handle TOC search filtering
const searchInput = document.getElementById('toc-search-input');
if (searchInput) {
  searchInput.addEventListener('input', e => {
    const query = e.target.value.trim().toLowerCase();
    const groups = document.querySelectorAll('.toc-group');

    groups.forEach(group => {
      let hasMatchInGroup = false;
      const links = group.querySelectorAll('.toc-link');

      links.forEach(link => {
        const text = link.textContent.toLowerCase();
        const path = (link.getAttribute('data-path') || '').toLowerCase();
        if (text.includes(query) || path.includes(query)) {
          link.parentElement.style.display = '';
          hasMatchInGroup = true;
        } else {
          link.parentElement.style.display = 'none';
        }
      });

      group.style.display = hasMatchInGroup ? '' : 'none';
    });
  });
}

// Intercept clicks on sidebar TOC links
const tocContainer = document.getElementById('toc-container');
if (tocContainer) {
  tocContainer.addEventListener('click', e => {
    const link = e.target.closest('.toc-link');
    if (link) {
      e.preventDefault();
      let docPath = link.getAttribute('data-path');
      if (currentLang === 'en') {
        if (link.hasAttribute('data-en-path')) {
          docPath = link.getAttribute('data-en-path');
        } else if (docPath && docPath.startsWith('content/api/vi/')) {
          docPath = docPath.replace('content/api/vi/', 'content/api/en/');
        }
      }
      if (docPath) {
        renderDoc(docPath, true);
      }
    }
  });
}

// Copy link button handler
const copyBtn = document.getElementById('btn-copy-link');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      const textSpan = document.getElementById('copy-btn-text');
      if (textSpan) {
        const originalText = textSpan.textContent;
        textSpan.textContent = i18nDocs[currentLang].copied;
        setTimeout(() => {
          textSpan.textContent = originalText;
        }, 2000);
      }
    } catch (err) {
      console.warn('Không thể sao chép URL:', err);
    }
  });
}

// Listen to browser Back/Forward (popstate)
window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const docPath = params.get('path') || getDefaultDocPath(currentLang);
  renderDoc(docPath, false);
});

// Initial load based on ?path param or saved language
document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('sremote_lang') || 'vi';
  const params = new URLSearchParams(window.location.search);
  const requestedPath = params.get('path');

  currentLang = savedLang;
  document.documentElement.lang = savedLang;

  const dict = i18nDocs[savedLang];
  const btnEn = document.getElementById('btn-lang-en');
  const btnVi = document.getElementById('btn-lang-vi');
  if (btnEn) btnEn.classList.toggle('active', savedLang === 'en');
  if (btnVi) btnVi.classList.toggle('active', savedLang === 'vi');

  // Update UI Labels
  const homeBtn = document.getElementById('label-home-btn');
  if (homeBtn) homeBtn.textContent = dict.homeBtn;
  const cookbookBtn = document.getElementById('label-cookbook-btn');
  if (cookbookBtn) cookbookBtn.textContent = dict.cookbookBtn;
  const demoBtn = document.getElementById('label-demo-btn');
  if (demoBtn) demoBtn.textContent = dict.demoBtn;
  const searchInputEl = document.getElementById('toc-search-input');
  if (searchInputEl) searchInputEl.placeholder = dict.searchPlaceholder;
  const langTitleEl = document.getElementById('label-lang-title');
  if (langTitleEl) langTitleEl.textContent = dict.langTitle;
  const copyBtnText = document.getElementById('copy-btn-text');
  if (copyBtnText) copyBtnText.textContent = dict.copyLink;
  document.getElementById('toc-group-general').textContent = dict.groupGeneral;
  document.getElementById('toc-group-connect').textContent = dict.groupConnect;
  document.getElementById('toc-group-playback').textContent = dict.groupPlayback;
  document.getElementById('toc-group-config').textContent = dict.groupConfig;
  document.getElementById('toc-group-state').textContent = dict.groupState;
  document.getElementById('toc-group-events').textContent = dict.groupEvents;
  document.getElementById('toc-group-debug').textContent = dict.groupDebug;
  document.getElementById('footer-text').textContent = dict.footerText;

  document.querySelectorAll('.toc-label').forEach(el => {
    const txt = el.getAttribute(`data-${savedLang}`);
    if (txt) el.textContent = txt;
  });

  const initialPath = requestedPath ? requestedPath : getDefaultDocPath(savedLang);
  renderDoc(initialPath, false);
});

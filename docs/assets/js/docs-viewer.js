/**
 * SRemote Documentation Engine: Marked.js + Highlight.js, TOC Search, i18n & History Routing
 */

// i18n Dictionaries
const i18nDocs = {
  vi: {
    pageTitle: 'SRemote - Hướng dẫn sử dụng & Tra cứu API',
    homeBtn: 'Trang chủ',
    cookbookBtn: '⚡ Hướng dẫn triển khai (Cookbook)',
    demoBtn: '▶ Mở Demo Live',
    searchPlaceholder: '🔍 Tìm nhanh API hoặc tài liệu...',
    langTitle: 'Ngôn ngữ:',
    copyLink: 'Sao chép Link',
    copied: '✓ Đã chép!',
    groupGeneral: '🚀 Bắt đầu (Getting Started)',
    groupPlayback: '🎮 Điều khiển phát nhanh',
    groupInstances: '🗂️ Quản lý Instance (instances.*)',
    groupReady2use: '📦 SRemote Ready2use',
    groupAdapters: '🔌 Custom Adapters (adapters.*)',
    groupRpc: '⚡ Giao tiếp & RPC (rpc.*)',
    groupConfig: '🎨 CSS Iframe (css.*)',
    groupEvents: '📡 Sự kiện & Vòng đời',
    groupDebug: '🛠️ Chẩn đoán & Debug',
    loading: 'Đang nạp và định dạng nội dung...',
    sourcePrefix: 'Nguồn file:',
    renderedBy: 'Rendered by <strong>Marked.js</strong>',
    footerText: 'SRemote Frame Controller © 2026 sweetsea • Giấy phép LGPL-3.0 • Hỗ trợ mọi trình duyệt & Tampermonkey.',
    errorTitle: '⚠️ Không thể tải tài liệu',
    errorDesc: 'Chi tiết lỗi:',
    errorFallback: 'Vui lòng kiểm tra lại đường dẫn file hoặc quay lại',
    fallbackLinkText: '01. Tạo thẻ Iframe đúng chuẩn',
  },
  en: {
    pageTitle: 'SRemote - Documentation & API Reference',
    homeBtn: 'Home',
    cookbookBtn: '⚡ Integration Recipes',
    demoBtn: '▶ Open Live Demo',
    searchPlaceholder: '🔍 Quick search API or docs...',
    langTitle: 'Language:',
    copyLink: 'Copy Link',
    copied: '✓ Copied!',
    groupGeneral: '🚀 Getting Started',
    groupPlayback: '🎮 Quick Playback Controls',
    groupInstances: '🗂️ Instance Management (instances.*)',
    groupReady2use: '📦 SRemote Ready2use',
    groupAdapters: '🔌 Custom Adapters (adapters.*)',
    groupRpc: '⚡ RPC & Messaging (rpc.*)',
    groupConfig: '🎨 Iframe CSS (css.*)',
    groupEvents: '📡 Lifecycle & Events',
    groupDebug: '🛠️ Diagnostics & Debug',
    loading: 'Loading and rendering document...',
    sourcePrefix: 'File source:',
    renderedBy: 'Rendered by <strong>Marked.js</strong>',
    footerText: 'SRemote Frame Controller © 2026 sweetsea • Licensed under LGPL-3.0 • Supports all browsers & Tampermonkey.',
    errorTitle: '⚠️ Unable to load documentation',
    errorDesc: 'Error details:',
    errorFallback: 'Please verify the file path or return to',
    fallbackLinkText: '01. Iframe Setup Guide',
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

// Initialize Mermaid if available
if (typeof mermaid !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    themeVariables: {
      darkMode: true,
      background: '#0f172a',
      primaryColor: '#1e293b',
      primaryTextColor: '#f8fafc',
      primaryBorderColor: '#38bdf8',
      lineColor: '#38bdf8',
      secondaryColor: '#334155',
      tertiaryColor: '#1e293b',
    },
  });
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

  // Custom code renderer to wrap mermaid diagrams in <pre class="mermaid">
  renderer.code = function (tokenOrCode, info) {
    let code = '';
    let lang = '';

    if (typeof tokenOrCode === 'object' && tokenOrCode !== null) {
      code = tokenOrCode.text || '';
      lang = tokenOrCode.lang || '';
    } else {
      code = tokenOrCode || '';
      lang = info || '';
    }

    if (lang === 'mermaid') {
      return `<pre class="mermaid">${code}</pre>`;
    }

    if (typeof hljs !== 'undefined') {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.highlight(code, { language }).value;
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
    }

    return `<pre><code>${code}</code></pre>`;
  };

  marked.use({ renderer, gfm: true, breaks: true, mangle: false });
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

  return html.replace(/<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br>|\n)?([\s\S]*?)<\/p>\s*<\/blockquote>/gi, (match, type, content) => {
    const upperType = type.toUpperCase();
    const alert = alertTypes[upperType] || alertTypes.NOTE;
    return `
      <div class="gfm-alert ${alert.class}">
        <div class="gfm-alert-title">${alert.icon} ${alert.title}</div>
        <p>${content}</p>
      </div>
    `;
  });
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
  return lang === 'en' ? 'content/guides/en/00-developer-overview.md' : 'content/guides/vi/00-developer-overview.md';
}

// Cleanly normalize shorthand paths, relative paths, and legacy query paths into an exact content/... path
function normalizeDocPath(inputPath, currentDir = '', lang = currentLang) {
  if (!inputPath) return getDefaultDocPath(lang);

  let p = inputPath
    .trim()
    .replace(/^docs\//, '')
    .replace(/^\/+/, '');

  // Extract from ?path=... if present
  if (p.startsWith('?path=')) {
    p = p.substring(6).split('&')[0];
  }

  // Shorthands: /guides/... -> content/guides/{lang}/...
  if (p.startsWith('guides/')) {
    p = `content/guides/${lang}/` + p.substring(7);
  } else if (p.startsWith('api/')) {
    // Shorthands: /api/... -> content/api/{lang}/...
    p = `content/api/${lang}/` + p.substring(4);
  } else if (p.startsWith('setup/')) {
    p = `content/guides/${lang}/01-iframe-setup.md`;
  } else if (!p.startsWith('content/') && !p.startsWith('..') && currentDir) {
    p = currentDir + p;
  }

  // Normalize relative ../ and ./
  const parts = p.split('/');
  const stack = [];
  for (const seg of parts) {
    if (seg === '.' || !seg) continue;
    if (seg === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(seg);
    }
  }

  let resolved = stack.join('/');
  return resolved;
}

function getDocPathForLang(docPath, targetLang) {
  if (!docPath) return getDefaultDocPath(targetLang);
  if (targetLang === 'en') {
    if (docPath === 'content/guides/vi.md' || docPath === 'docs/content/guides/vi.md' || docPath === 'content/guides/README_vi.md') return '../README.md';
    if (docPath === 'content/setup/vi.md' || docPath === 'docs/content/setup/vi.md') return 'content/guides/en/01-iframe-setup.md';
    return docPath
      .replace(/^docs\//, '')
      .replace('content/api/vi/', 'content/api/en/')
      .replace('content/guides/vi/', 'content/guides/en/')
      .replace('content/setup/vi.md', 'content/guides/en/01-iframe-setup.md');
  } else {
    if (docPath === '../README.md' || docPath === 'README.md') return 'content/guides/README_vi.md';
    if (docPath === 'content/setup/en.md' || docPath === 'docs/content/setup/en.md') return 'content/guides/vi/01-iframe-setup.md';
    return docPath
      .replace(/^docs\//, '')
      .replace('content/api/en/', 'content/api/vi/')
      .replace('content/guides/en/', 'content/guides/vi/')
      .replace('content/setup/en.md', 'content/guides/vi/01-iframe-setup.md');
  }
}

// Router function: Fetch and render Markdown based on requested path
async function renderDoc(docPath, pushToHistory = true, targetHash = null) {
  docPath = normalizeDocPath(docPath);

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

    // Apply Highlight.js to all code blocks in container (excluding mermaid)
    if (typeof hljs !== 'undefined') {
      container.querySelectorAll('pre code:not(.language-mermaid)').forEach(block => {
        hljs.highlightElement(block);
      });
    }

    // Render Mermaid diagrams
    if (typeof mermaid !== 'undefined') {
      try {
        await mermaid.run({ nodes: container.querySelectorAll('.mermaid') });
      } catch (mErr) {
        console.warn('[sremote:docs] Mermaid render error:', mErr);
      }
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

    // Handle ?path=... query parameter links or .md file links
    const isDocQuery = href.startsWith('?path=') || href.includes('?path=');
    const isMdFile = href.endsWith('.md') || href.includes('.md#') || href.includes('.md?');

    if (isDocQuery || isMdFile) {
      a.addEventListener('click', e => {
        e.preventDefault();
        let targetPath = '';
        let hashPart = null;

        if (isDocQuery) {
          try {
            const parsedUrl = new URL(href, window.location.href);
            targetPath = parsedUrl.searchParams.get('path') || '';
            hashPart = parsedUrl.hash || null;
          } catch {
            targetPath = href.replace(/^\?path=/, '').split('#')[0];
            hashPart = href.includes('#') ? '#' + href.split('#')[1] : null;
          }
        } else {
          const currentDir = currentDocPath.includes('/') ? currentDocPath.substring(0, currentDocPath.lastIndexOf('/') + 1) : '';
          hashPart = href.includes('#') ? '#' + href.split('#')[1] : null;
          let rawPath = href.split('#')[0].split('?')[0];

          if (rawPath.startsWith('docs/')) {
            rawPath = rawPath.replace('docs/', '');
          }

          if (rawPath.startsWith('content/')) {
            targetPath = rawPath;
          } else {
            // Resolve relative path against currentDir
            const combined = (currentDir + rawPath).split('/');
            const resolvedParts = [];
            for (const part of combined) {
              if (!part || part === '.') continue;
              if (part === '..') {
                resolvedParts.pop();
              } else {
                resolvedParts.push(part);
              }
            }
            targetPath = resolvedParts.join('/');
          }
        }

        if (targetPath) {
          renderDoc(targetPath, true, hashPart);
        }
      });
      return;
    }

    // Relative HTML page link (e.g. href="../../recipes.html" or href="../recipes.html")
    if (href.endsWith('.html') || href.includes('.html#') || href.includes('.html?')) {
      const currentDir = currentDocPath.includes('/') ? currentDocPath.substring(0, currentDocPath.lastIndexOf('/') + 1) : '';
      let rawPath = href;
      if (rawPath.startsWith('docs/')) rawPath = rawPath.replace('docs/', '');

      const combined = (currentDir + rawPath).split('/');
      const resolvedParts = [];
      for (const part of combined) {
        if (!part || part === '.') continue;
        if (part === '..') {
          resolvedParts.pop();
        } else {
          resolvedParts.push(part);
        }
      }
      const finalHref = resolvedParts.join('/');
      a.setAttribute('href', finalHref);
    }
  });
}

// Language switcher
function setLanguage(lang, renderOnSwitch = true) {
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
  if (document.getElementById('toc-group-playback')) document.getElementById('toc-group-playback').textContent = dict.groupPlayback;
  if (document.getElementById('toc-group-instances')) document.getElementById('toc-group-instances').innerHTML = dict.groupInstances;
  if (document.getElementById('toc-group-ready2use')) document.getElementById('toc-group-ready2use').innerHTML = dict.groupReady2use;
  if (document.getElementById('toc-group-adapters')) document.getElementById('toc-group-adapters').innerHTML = dict.groupAdapters;
  if (document.getElementById('toc-group-rpc')) document.getElementById('toc-group-rpc').innerHTML = dict.groupRpc;
  if (document.getElementById('toc-group-config')) document.getElementById('toc-group-config').innerHTML = dict.groupConfig;
  if (document.getElementById('toc-group-events')) document.getElementById('toc-group-events').textContent = dict.groupEvents;
  if (document.getElementById('toc-group-debug')) document.getElementById('toc-group-debug').innerHTML = dict.groupDebug;
  document.getElementById('footer-text').textContent = dict.footerText;

  // Update TOC link labels
  document.querySelectorAll('.toc-label').forEach(el => {
    const txt = el.getAttribute(`data-${lang}`);
    if (txt) el.textContent = txt;
  });

  if (renderOnSwitch) {
    // Switch current viewed document to the appropriate language
    const params = new URLSearchParams(window.location.search);
    let currentPath = params.get('path');
    const targetDocPath = getDocPathForLang(currentPath, lang);
    renderDoc(targetDocPath, true);
  }
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
        } else if (docPath && docPath.startsWith('content/guides/vi/')) {
          docPath = docPath.replace('content/guides/vi/', 'content/guides/en/');
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

  // Initialize UI language state and TOC headers without triggering premature render
  setLanguage(savedLang, false);

  const initialPath = requestedPath ? requestedPath : getDefaultDocPath(savedLang);
  renderDoc(initialPath, false);
});

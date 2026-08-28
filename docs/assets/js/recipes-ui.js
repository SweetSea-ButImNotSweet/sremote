/**
 * SRemote Recipes UI Controller: Sidebar navigation, tab switching, copy-to-clipboard, seekbar sync & i18n
 */

let currentPlatformId = 'youtube';
let currentCodeTab = 'html';
let currentLang = localStorage.getItem('sremote_lang') || 'vi';

function renderSidebar() {
  const { categories, platforms } = window.RECIPES_DATA;
  const container = document.getElementById('platform-list');
  if (!container) return;
  container.innerHTML = '';

  categories.forEach(cat => {
    const catPlatforms = platforms.filter(p => p.category === cat.id);
    if (catPlatforms.length === 0) return;

    const header = document.createElement('div');
    header.className = 'platform-category-header';
    header.textContent = currentLang === 'en' ? cat.titleEn : cat.titleVi;
    container.appendChild(header);

    catPlatforms.forEach(p => {
      const item = document.createElement('div');
      item.className = `platform-item ${p.id === currentPlatformId ? 'active' : ''}`;
      item.onclick = () => selectPlatform(p.id);
      item.innerHTML = `
        <span>${p.name}</span>
        <span class="platform-tag">${p.tag}</span>
      `;
      container.appendChild(item);
    });
  });
}

function formatTime(sec) {
  if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

let isUserDraggingSeek = false;

function onSeekSliderInput(val) {
  isUserDraggingSeek = true;
  const slider = document.getElementById('preview-seek-slider');
  const label = document.getElementById('preview-time-label');
  const max = Number(slider?.max) || 100;
  if (label) label.textContent = `${formatTime(val)} / ${formatTime(max)}`;
}

function onSeekSliderChange(val) {
  isUserDraggingSeek = false;
  const sec = Number(val);
  const { dict } = window.RECIPES_DATA;
  const statusEl = document.getElementById('status-indicator');
  if (statusEl && dict[currentLang]) {
    statusEl.textContent = `${dict[currentLang].statusCommand}: sremote.seekTo(${sec.toFixed(1)})`;
  }
  if (window.sremote && typeof window.sremote.seekTo === 'function') {
    window.sremote.seekTo(sec);
  } else if (window.sremote && typeof window.sremote.currentTime === 'function') {
    window.sremote.currentTime(sec);
  }
}

// Sync live progress from SRemote state updates
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    if (window.sremote && typeof window.sremote.on === 'function') {
      window.sremote.on('timeupdate', data => {
        if (isUserDraggingSeek) return;
        const state = data?.state || data;
        const cur = state?.currentTime ?? 0;
        const dur = state?.duration ?? 0;
        const slider = document.getElementById('preview-seek-slider');
        const label = document.getElementById('preview-time-label');
        if (slider && dur > 0) {
          slider.max = dur;
          slider.value = cur;
        }
        if (label) {
          label.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
        }
      });
    }
  });
}

function triggerAction(action, arg) {
  const { dict } = window.RECIPES_DATA;
  const statusEl = document.getElementById('status-indicator');
  if (statusEl && dict[currentLang]) {
    statusEl.textContent = `${dict[currentLang].statusCommand}: sremote.${action}(${arg !== undefined ? JSON.stringify(arg) : ''})`;
  }

  // Dispatch real command to active platform adapter
  if (window.sremote && typeof window.sremote[action] === 'function') {
    if (action === 'seek') {
      window.sremote.seek(arg);
    } else if (action === 'volume') {
      window.sremote.volume(arg);
    } else if (action === 'mute') {
      window.sremote.mute(arg);
    } else if (action === 'pip') {
      window.sremote.pip(arg);
    } else {
      window.sremote[action]();
    }
  }
}

function getPreviewEmbed(platform) {
  if (platform.id === 'youtube') {
    const origin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'http://localhost:5173';
    return `<iframe id="yt-player-frame" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?enablejsapi=1&autoplay=1&mute=1&origin=${encodeURIComponent(origin)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  }
  return platform.previewEmbed;
}

function selectPlatform(id) {
  const { platforms } = window.RECIPES_DATA;
  currentPlatformId = id;
  const platform = platforms.find(p => p.id === id);
  if (!platform) return;

  // Hủy adapter cũ nếu đang ở chế độ đổi nền tảng
  if (window.sremote && typeof window.sremote.removeAdapter === 'function') {
    window.sremote.removeAdapter();
  }

  const nameEl = document.getElementById('current-platform-name');
  if (nameEl) nameEl.textContent = platform.name;

  const modeEl = document.getElementById('current-platform-mode');
  if (modeEl) modeEl.textContent = platform.mode;

  const mountPoint = document.getElementById('player-mount-point');
  if (mountPoint) mountPoint.innerHTML = getPreviewEmbed(platform);

  const noteEl = document.getElementById('platform-note-box');
  if (noteEl) noteEl.innerHTML = currentLang === 'en' ? platform.noteEn : platform.noteVi;

  renderSidebar();
  renderCodeSnippet();

  // Khi đổi nguồn, luôn gọi sremote.hello() để frame con kích hoạt bắt tay & hiện badge
  const iframeEl = mountPoint?.querySelector('iframe');
  if (iframeEl) {
    iframeEl.addEventListener('load', () => {
      if (window.sremote && typeof window.sremote.hello === 'function') {
        console.log('🔄 Đổi nguồn: Gọi sremote.hello() tới iframe:', platform.id);
        try {
          window.sremote.hello({
            target: iframeEl.contentWindow,
          });
        } catch {
          window.sremote.hello();
        }
      }
      // Khởi tạo runtime adapter thực tế cho các bên có API SDK
      if (window.RECIPES_RUNTIME?.initPlatformRuntime) {
        window.RECIPES_RUNTIME.initPlatformRuntime(platform.id, iframeEl);
      }
    });
  } else {
    // Với trường hợp container mount (Spotify)
    if (window.RECIPES_RUNTIME?.initPlatformRuntime) {
      window.RECIPES_RUNTIME.initPlatformRuntime(platform.id, null);
    }
  }
}

function switchCodeTab(tab) {
  currentCodeTab = tab;
  document.getElementById('tab-btn-html')?.classList.toggle('active', tab === 'html');
  document.getElementById('tab-btn-js')?.classList.toggle('active', tab === 'js');
  renderCodeSnippet();
}

function renderCodeSnippet() {
  const { platforms } = window.RECIPES_DATA;
  const platform = platforms.find(p => p.id === currentPlatformId);
  if (!platform) return;

  let code = '';
  if (currentCodeTab === 'html') {
    code = currentLang === 'en' ? platform.htmlCodeEn || platform.htmlCode : platform.htmlCodeVi || platform.htmlCode;
  } else {
    code = currentLang === 'en' ? platform.jsCodeEn || platform.jsCode : platform.jsCodeVi || platform.jsCode;
  }

  const codeDisplay = document.getElementById('code-snippet-display');
  if (!codeDisplay) return;

  if (typeof hljs !== 'undefined') {
    const lang = currentCodeTab === 'html' ? 'xml' : 'javascript';
    codeDisplay.innerHTML = hljs.highlight(code, { language: lang }).value;
  } else {
    codeDisplay.textContent = code;
  }
}

async function copyCurrentCode() {
  const { dict } = window.RECIPES_DATA;
  const codeDisplay = document.getElementById('code-snippet-display');
  if (!codeDisplay) return;
  try {
    await navigator.clipboard.writeText(codeDisplay.textContent);
    const label = document.getElementById('copy-btn-label');
    if (label && dict[currentLang]) {
      label.textContent = dict[currentLang].copied;
      setTimeout(() => {
        label.textContent = dict[currentLang].copyBtn;
      }, 2000);
    }
  } catch (e) {
    console.error('Không thể copy code:', e);
  }
}

function setLang(lang) {
  const { dict } = window.RECIPES_DATA;
  currentLang = lang;
  localStorage.setItem('sremote_lang', lang);
  document.documentElement.lang = lang;

  document.getElementById('btn-lang-en')?.classList.toggle('active', lang === 'en');
  document.getElementById('btn-lang-vi')?.classList.toggle('active', lang === 'vi');

  const d = dict[lang];
  if (d) {
    const el = id => document.getElementById(id);
    if (el('btn-back-docs')) el('btn-back-docs').textContent = d.backDocs;
    if (el('btn-demo-link')) el('btn-demo-link').textContent = d.demoLink;
    if (el('label-sidebar-title')) el('label-sidebar-title').textContent = d.sidebarTitle;
    if (el('label-info-title')) el('label-info-title').textContent = d.infoTitle;
    if (el('label-live-preview')) el('label-live-preview').textContent = d.livePreview;
    if (el('tab-btn-html')) el('tab-btn-html').textContent = d.htmlTab;
    if (el('tab-btn-js')) el('tab-btn-js').textContent = d.jsTab;
    if (el('copy-btn-label')) el('copy-btn-label').textContent = d.copyBtn;
    if (el('footer-text')) el('footer-text').textContent = d.footer;
    if (el('sidebar-tips-text')) el('sidebar-tips-text').innerHTML = d.tipsText;
    if (el('status-indicator')) el('status-indicator').textContent = d.statusReady;
  }

  selectPlatform(currentPlatformId);
}

// Initialize on page ready
document.addEventListener('DOMContentLoaded', () => {
  setLang(currentLang);
  selectPlatform('youtube');
});

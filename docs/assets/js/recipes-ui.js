/**
 * SRemote Recipes UI Controller: Sidebar navigation, dual code blocks rendering, copy-to-clipboard, seekbar sync & i18n
 */

let currentPlatformId = 'youtube';
let currentJsTab = 'ready2use'; // 'ready2use' | 'wrapper' | 'vanilla'
let currentLang = localStorage.getItem('sremote_lang') || 'vi';

function switchJsTab(tab) {
  currentJsTab = tab;
  document.getElementById('tab-js-ready2use')?.classList.toggle('active', tab === 'ready2use');
  document.getElementById('tab-js-wrapper')?.classList.toggle('active', tab === 'wrapper');
  document.getElementById('tab-js-vanilla')?.classList.toggle('active', tab === 'vanilla');

  // Nếu là ready2use thì ẩn khối HTML Embed, nếu là wrapper/vanilla thì hiện lại
  const htmlWrapper = document.getElementById('code-block-html-wrapper');
  if (htmlWrapper) {
    htmlWrapper.style.display = tab === 'ready2use' ? 'none' : 'block';
  }

  // Cập nhật tiêu đề khối JS theo tab
  const jsBlockTitle = document.getElementById('label-js-block');
  const dict = window.RECIPES_DATA?.dict?.[currentLang];
  if (jsBlockTitle && dict) {
    jsBlockTitle.textContent = tab === 'ready2use' ? dict.ready2useBlockTitle || '✨ Cài đặt & Sử dụng (JavaScript)' : dict.jsBlockTitle || '⚡ 2. Cài đặt JS (JavaScript Setup)';
  }

  renderCodeSnippets();
}

function renderSidebar() {
  const data = window.RECIPES_DATA;
  if (!data) return;
  const { categories, platforms } = data;
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
      item.textContent = p.name;
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
  const dict = window.RECIPES_DATA?.dict;
  const statusEl = document.getElementById('status-indicator');
  if (statusEl && dict?.[currentLang]) {
    statusEl.textContent = `${dict[currentLang].statusCommand}: sremote.seekTo(${sec.toFixed(1)})`;
  }
  const sremoteClient = getSRemote();
  if (sremoteClient && typeof sremoteClient.seekTo === 'function') {
    sremoteClient.seekTo(sec);
  }
}

let platformSessionToken = 0;

// Sync live progress and connection events from SRemote
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const sremoteClient = getSRemote();
    if (sremoteClient && typeof sremoteClient.on === 'function') {
      sremoteClient.on('accept', data => {
        const instanceId = data?.instanceId || 'media';
        const statusEl = document.getElementById('status-indicator');
        if (statusEl) {
          statusEl.textContent = `🟢 Connected: ${instanceId}`;
          statusEl.style.background = '#ecfdf5';
          statusEl.style.color = '#047857';
          statusEl.style.borderColor = '#a7f3d0';
        }
        console.log('🎉 [SRemote UI] Handshake accept received:', data);
      });

      sremoteClient.on('timeupdate', data => {
        if (isUserDraggingSeek) return;

        const state = data?.state || data;
        const cur = Number(state?.currentTime ?? 0);
        const dur = Number(state?.duration ?? 0);

        const slider = document.getElementById('preview-seek-slider');
        const label = document.getElementById('preview-time-label');

        if (slider && dur > 0) {
          slider.max = dur;
          slider.value = cur;
        }
        if (label && dur > 0) {
          label.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
        }
      });
    }
  });
}

function onVolumeSliderInput(val) {
  const percent = Math.round(Number(val) * 100);
  const label = document.getElementById('preview-vol-label');
  if (label) label.textContent = `${percent}%`;
}

function onVolumeSliderChange(val) {
  const volume = Number(val);
  const dict = window.RECIPES_DATA?.dict;
  const statusEl = document.getElementById('status-indicator');
  if (statusEl && dict?.[currentLang]) {
    statusEl.textContent = `${dict[currentLang].statusCommand}: sremote.volume(${volume.toFixed(2)})`;
  }
  if (window.sremote && typeof window.sremote.volume === 'function') {
    window.sremote.volume(volume);
  }
}

function onRateSelectChange(val) {
  const rate = Number(val);
  const dict = window.RECIPES_DATA?.dict;
  const statusEl = document.getElementById('status-indicator');
  if (statusEl && dict?.[currentLang]) {
    statusEl.textContent = `${dict[currentLang].statusCommand}: sremote.playbackRate(${rate})`;
  }
  if (window.sremote && typeof window.sremote.playbackRate === 'function') {
    window.sremote.playbackRate(rate);
  }
}

function onQualitySelectChange(val) {
  const dict = window.RECIPES_DATA?.dict;
  const statusEl = document.getElementById('status-indicator');
  if (statusEl && dict?.[currentLang]) {
    statusEl.textContent = `${dict[currentLang].statusCommand}: sremote.quality("${val}")`;
  }
  const sremoteClient = getSRemote();
  if (sremoteClient && typeof sremoteClient.quality === 'function') {
    sremoteClient.quality(val);
  }
}

function onSubtitleSelectChange(val) {
  const dict = window.RECIPES_DATA?.dict;
  const statusEl = document.getElementById('status-indicator');
  const track = val === 'off' ? null : val;
  if (statusEl && dict?.[currentLang]) {
    statusEl.textContent = `${dict[currentLang].statusCommand}: sremote.subtitle(${track ? `"${track}"` : 'null'})`;
  }
  const sremoteClient = getSRemote();
  if (sremoteClient && typeof sremoteClient.subtitle === 'function') {
    sremoteClient.subtitle(track);
  }
}

function reloadCurrentPlayer() {
  const dict = window.RECIPES_DATA?.dict;
  const statusEl = document.getElementById('status-indicator');
  if (statusEl && dict?.[currentLang]) {
    statusEl.textContent = `${dict[currentLang].statusCommand}: reloadCurrentPlayer()`;
  }
  selectPlatform(currentPlatformId);
}

function triggerAction(action, arg) {
  const dict = window.RECIPES_DATA?.dict;
  const statusEl = document.getElementById('status-indicator');
  if (statusEl && dict?.[currentLang]) {
    statusEl.textContent = `${dict[currentLang].statusCommand}: sremote.${action}(${arg !== undefined ? JSON.stringify(arg) : ''})`;
  }

  // Dispatch real command to active platform adapter via SDK client
  const sremoteClient = getSRemote();
  if (sremoteClient) {
    if (action === 'seek' && typeof sremoteClient.seek === 'function') {
      sremoteClient.seek(arg);
    } else if (action === 'volume' && typeof sremoteClient.volume === 'function') {
      sremoteClient.volume(arg);
    } else if (action === 'mute' && typeof sremoteClient.mute === 'function') {
      sremoteClient.mute(arg);
    } else if (action === 'pip' && typeof sremoteClient.pip === 'function') {
      sremoteClient.pip(arg);
    } else if (action === 'fullscreen') {
      if (typeof sremoteClient.fullscreen === 'function') {
        sremoteClient.fullscreen(arg);
      } else if (typeof sremoteClient.fs === 'function') {
        sremoteClient.fs(arg);
      } else {
        const mountPoint = document.getElementById('player-mount-point');
        if (mountPoint && !document.fullscreenElement) {
          mountPoint.requestFullscreen?.().catch(() => {});
        } else if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
      }
    } else if (action === 'stop') {
      if (typeof sremoteClient.stop === 'function') {
        sremoteClient.stop();
      } else if (typeof sremoteClient.pause === 'function') {
        sremoteClient.pause();
        if (typeof sremoteClient.seekTo === 'function') sremoteClient.seekTo(0);
      }
    } else if (action === 'next' && typeof sremoteClient.next === 'function') {
      sremoteClient.next();
    } else if (action === 'previous' && typeof sremoteClient.previous === 'function') {
      sremoteClient.previous();
    } else if (action === 'shuffle' && typeof sremoteClient.shuffle === 'function') {
      sremoteClient.shuffle();
    } else if (action === 'repeat' && typeof sremoteClient.repeat === 'function') {
      sremoteClient.repeat();
    } else if (typeof sremoteClient[action] === 'function') {
      sremoteClient[action]();
    }
  }
}

function getPreviewEmbed(platform) {
  if (platform.id === 'youtube') {
    const origin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'http://localhost:5173';
    return `<iframe id="yt-player-frame" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?enablejsapi=1&autoplay=1&mute=1&origin=${encodeURIComponent(origin)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  }
  return platform.previewEmbed;
}

async function selectPlatform(id) {
  const data = window.RECIPES_DATA;
  if (!data) return;
  const { platforms } = data;
  currentPlatformId = id;
  const platform = platforms.find(p => p.id === id);
  if (!platform) return;

  const sremoteClient = getSRemote();

  // Hủy adapter cũ nếu đang ở chế độ đổi nền tảng
  if (sremoteClient) {
    if (sremoteClient.adapters?.unregister) {
      sremoteClient.adapters.unregister();
    } else if (typeof sremoteClient.removeAdapter === 'function') {
      sremoteClient.removeAdapter();
    }
  }

  const nameEl = document.getElementById('current-platform-name');
  if (nameEl) nameEl.textContent = platform.name;

  const modeEl = document.getElementById('current-platform-mode');
  if (modeEl) modeEl.textContent = platform.mode;

  const noteEl = document.getElementById('platform-note-box');
  if (noteEl) noteEl.innerHTML = currentLang === 'en' ? platform.noteEn : platform.noteVi;

  // Reset status badge
  const dict = window.RECIPES_DATA?.dict;
  const statusEl = document.getElementById('status-indicator');
  if (statusEl && dict?.[currentLang]) {
    statusEl.textContent = dict[currentLang].statusReady || 'Sẵn sàng';
    statusEl.style.background = '#eef2ff';
    statusEl.style.color = '#4338ca';
    statusEl.style.borderColor = '#c7d2fe';
  }

  // Reset seekbar state
  const slider = document.getElementById('preview-seek-slider');
  const label = document.getElementById('preview-time-label');
  if (slider) {
    slider.value = 0;
    slider.max = 100;
  }
  if (label) label.textContent = '0:00 / 0:00';

  renderSidebar();
  renderCodeSnippets();

  const mountPoint = document.getElementById('player-mount-point');
  if (!mountPoint) return;

  // Gắn player trực tiếp bằng @sremote/ready2use
  if (window.RECIPES_RUNTIME?.mountPlatform) {
    const session = await window.RECIPES_RUNTIME.mountPlatform(platform.id, mountPoint);
    if (session?.instanceId && statusEl) {
      statusEl.textContent = `🟢 Connected: ${session.instanceId}`;
      statusEl.style.background = '#ecfdf5';
      statusEl.style.color = '#047857';
      statusEl.style.borderColor = '#a7f3d0';
    }
  }
}

function generateReady2UseSnippet(platformId, lang = 'vi') {
  const providerNames = {
    youtube: { mod: 'youtube', opts: "videoId: 'dQw4w9WgXcQ'" },
    vimeo: { mod: 'vimeo', opts: "videoId: '76979871'" },
    soundcloud: { mod: 'soundcloud', opts: "trackUrl: 'https://api.soundcloud.com/tracks/293'" },
    spotify: { mod: 'spotify', opts: "uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT'" },
    dailymotion: { mod: 'dailymotion', opts: "video: 'x7tgad0'" },
    twitch: { mod: 'twitch', opts: "channel: 'monstercat', parent: window.location.hostname" },
    mixcloud: { mod: 'mixcloud', opts: "feed: '/spartacus/party-time/'" },
    tiktok: { mod: 'tiktok', opts: "videoId: '6718335390845095173'" },
    niconico: { mod: 'niconico', opts: "watchId: 'so46693656'" },
    bilibili: { mod: 'bilibili', opts: "bvid: 'BV1xx411c7mD'" },
    facebook: { mod: 'facebook', opts: "videoUrl: 'https://www.facebook.com/facebook/videos/10153231379946729/'" },
    twitter: { mod: 'twitter', opts: "tweetId: '20', theme: 'dark'" },
    peertube: { mod: 'peertube', opts: "videoUrl: 'https://peertube.tv/videos/watch/78e0e6aa-d575-4752-9ef8-e047c870233d'" },
    rumble: { mod: 'rumble', opts: "video: 'v397yeg'" },
    kick: { mod: 'kick', opts: "channel: 'xqc'" },
    streamable: { mod: 'streamable', opts: "shortcode: 'moo'" },
    odysee: { mod: 'odysee', opts: "video: '@lbry:3f/lbry-in-a-nutshell:1'" },
    bandcamp: { mod: 'bandcamp', opts: "albumId: '2747195448'" },
  };

  const info = providerNames[platformId] || { mod: platformId, opts: "id: '123'" };

  const rawTemplate = `// [cmt_install_ready2use]
import { ${info.mod} } from '@sremote/ready2use';

// [cmt_mount_auto]
const { remote, player, destroy } = await ${info.mod}.mount('#player-mount-point', {
  ${info.opts}
});

// [cmt_control_via_client]
await remote.play();
await remote.seek(30);
await remote.volume(0.8);

// [cmt_listen_realtime]
remote.on('timeupdate', ({ state }) => {
  console.log('// [cmt_progress_log]', state.currentTime, '/', state.duration);
});`;

  const translateFn = window.RECIPES_DATA?.translateComments || (t => t);
  return translateFn(rawTemplate, lang);
}

async function renderCodeSnippets() {
  const data = window.RECIPES_DATA;
  if (!data) return;
  const platform = data.platforms.find(p => p.id === currentPlatformId);
  if (!platform) return;

  const targetPlatformId = currentPlatformId;
  let jsCode = '';

  if (currentJsTab === 'ready2use') {
    jsCode = generateReady2UseSnippet(targetPlatformId, currentLang);
  } else {
    const jsFileName = currentJsTab === 'wrapper' ? 'wrapper.js' : 'vanilla.js';
    jsCode = await data.fetchSnippet(targetPlatformId, jsFileName, currentLang);
  }

  const htmlCode = await data.fetchSnippet(targetPlatformId, 'embed.html', currentLang);

  // Tránh race condition khi người dùng click nhanh giữa các platform
  if (targetPlatformId !== currentPlatformId) return;

  const htmlDisplay = document.getElementById('code-snippet-html');
  const jsDisplay = document.getElementById('code-snippet-js');

  if (htmlDisplay) {
    if (typeof hljs !== 'undefined') {
      htmlDisplay.innerHTML = hljs.highlight(htmlCode || '', { language: 'xml' }).value;
    } else {
      htmlDisplay.textContent = htmlCode || '';
    }
  }

  if (jsDisplay) {
    if (typeof hljs !== 'undefined') {
      jsDisplay.innerHTML = hljs.highlight(jsCode || '', { language: 'javascript' }).value;
    } else {
      jsDisplay.textContent = jsCode || '';
    }
  }
}

async function copyCodeSnippet(type) {
  const data = window.RECIPES_DATA;
  if (!data) return;
  const { dict } = data;
  const targetId = type === 'html' ? 'code-snippet-html' : 'code-snippet-js';
  const labelId = type === 'html' ? 'copy-html-label' : 'copy-js-label';
  const codeEl = document.getElementById(targetId);
  const labelEl = document.getElementById(labelId);
  if (!codeEl) return;

  try {
    await navigator.clipboard.writeText(codeEl.textContent);
    if (labelEl && dict[currentLang]) {
      labelEl.textContent = dict[currentLang].copied;
      setTimeout(() => {
        labelEl.textContent = type === 'html' ? dict[currentLang].copyHtmlBtn : dict[currentLang].copyJsBtn;
      }, 2000);
    }
  } catch (e) {
    console.error('Không thể copy code:', e);
  }
}

function setLang(lang) {
  const data = window.RECIPES_DATA;
  if (!data) return;
  const { dict } = data;
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
    if (el('label-live-preview')) el('label-live-preview').textContent = d.livePreview;
    if (el('label-html-block')) el('label-html-block').textContent = d.htmlBlockTitle;
    if (el('label-js-block'))
      el('label-js-block').textContent =
        currentJsTab === 'ready2use' ? d.ready2useBlockTitle || '✨ Cài đặt & Sử dụng (JavaScript)' : d.jsBlockTitle || '⚡ 2. Cài đặt JS (JavaScript Setup)';
    if (el('copy-html-label')) el('copy-html-label').textContent = d.copyHtmlBtn;
    if (el('copy-js-label')) el('copy-js-label').textContent = d.copyJsBtn;
    if (el('footer-text')) el('footer-text').textContent = d.footer;
    if (el('status-indicator')) el('status-indicator').textContent = d.statusReady;

    // Control buttons & labels translation
    if (el('btn-play')) el('btn-play').textContent = d.btnPlay || '▶ Play';
    if (el('btn-pause')) el('btn-pause').textContent = d.btnPause || '⏸ Pause';
    if (el('btn-stop')) el('btn-stop').textContent = d.btnStop || '⏹ Stop';
    if (el('btn-toggle')) el('btn-toggle').textContent = d.btnToggle || '🔄 Toggle';
    if (el('btn-seek-back')) el('btn-seek-back').textContent = d.btnSeekBack || '⏪ -10s';
    if (el('btn-seek-fwd')) el('btn-seek-fwd').textContent = d.btnSeekFwd || '⏩ +10s';
    if (el('btn-mute')) el('btn-mute').textContent = d.btnMute || '🔇 Mute';
    if (el('btn-pip')) el('btn-pip').textContent = d.btnPip || '🖼️ PiP';
    if (el('btn-fullscreen')) el('btn-fullscreen').textContent = d.btnFullscreen || '⛶ Toàn màn hình';
    if (el('btn-reload')) el('btn-reload').textContent = d.btnReload || '🔁 Nạp lại';
    if (el('label-vol')) el('label-vol').textContent = d.volLabel || 'Volume:';
    if (el('label-rate')) el('label-rate').textContent = d.rateLabel || 'Speed:';
  }

  selectPlatform(currentPlatformId);
}

// Initialize on page ready
document.addEventListener('DOMContentLoaded', async () => {
  if (window.RECIPES_LOADER?.loadRecipesMetadata) {
    await window.RECIPES_LOADER.loadRecipesMetadata();
  }
  setLang(currentLang);
});

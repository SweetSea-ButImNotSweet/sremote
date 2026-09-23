import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

if (window.setupDemoTopBar) {
  window.setupDemoTopBar({ appName: 'App 07: Global Keyboard Shortcuts', tutorialPath: 'content/guides/vi/blueprints/07-global-shortcuts.md' });
}

const osdToast = document.getElementById('osd-toast');
let osdTimeout = null;

function showOSD(text) {
  osdToast.textContent = text;
  osdToast.classList.remove('hidden');

  if (osdTimeout) {
    clearTimeout(osdTimeout);
  }

  osdTimeout = setTimeout(() => {
    osdToast.classList.add('hidden');
  }, 1000);
}

async function initPlayer() {
  await youtube.mount('#video-container', { videoId: 'M7lc1UVf-VE', playerVars: { controls: 1, autoplay: 0 } });
  setupGlobalShortcuts();
}

function isUserTyping() {
  const activeEl = document.activeElement;
  if (!activeEl) return false;

  const tag = activeEl.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || activeEl.isContentEditable;
}

function setupGlobalShortcuts() {
  window.addEventListener('keydown', async e => {
    if (isUserTyping()) return;

    const key = e.key.toLowerCase();

    if (e.code === 'Space' || key === 'k') {
      e.preventDefault();
      await sremote.toggle();
      const state = await sremote.getState();
      showOSD(state === 'playing' ? '▶ Play' : '⏸ Pause');
    } else if (key === 'j') {
      e.preventDefault();
      const cur = await sremote.getCurrentTime();
      const target = Math.max(0, cur - 10);
      await sremote.seekTo(target);
      showOSD(`⏪ -10s (${Math.floor(target)}s)`);
    } else if (key === 'l') {
      e.preventDefault();
      const cur = await sremote.getCurrentTime();
      const dur = await sremote.getDuration();
      const target = Math.min(dur || 9999, cur + 10);
      await sremote.seekTo(target);
      showOSD(`⏩ +10s (${Math.floor(target)}s)`);
    } else if (key === 'm') {
      e.preventDefault();
      const curVol = await sremote.getVolume();
      if (curVol > 0) {
        window._lastVol = curVol;
        await sremote.setVolume(0);
        showOSD('🔇 Mute');
      } else {
        const restore = window._lastVol || 0.8;
        await sremote.setVolume(restore);
        showOSD(`🔊 Âm lượng: ${Math.round(restore * 100)}%`);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const curVol = await sremote.getVolume();
      const nextVol = Math.min(1, curVol + 0.1);
      await sremote.setVolume(nextVol);
      showOSD(`🔊 Âm lượng: ${Math.round(nextVol * 100)}%`);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const curVol = await sremote.getVolume();
      const nextVol = Math.max(0, curVol - 0.1);
      await sremote.setVolume(nextVol);
      showOSD(`🔉 Âm lượng: ${Math.round(nextVol * 100)}%`);
    }
  });
}

initPlayer();

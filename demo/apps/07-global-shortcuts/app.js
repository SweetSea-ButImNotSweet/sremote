import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

const osdToast = document.getElementById('osd-toast');
let osdTimeout = null;

// Hàm hiển thị OSD Toast nổi giữa màn hình
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

// Khởi tạo Player
async function initPlayer() {
  await youtube.mount('#video-container', {
    videoId: 'M7lc1UVf-VE',
    playerVars: { controls: 1, autoplay: 0 }
  });
  console.log('✅ Player sẵn sàng nhận phím tắt toàn cục!');
  setupGlobalShortcuts();
}


function isUserTyping() {
  const activeEl = document.activeElement;
  if (!activeEl) return false;

  const tag = activeEl.tagName.toLowerCase();
  const isInputOrTextarea = tag === 'input' || tag === 'textarea';
  const isContentEditable = activeEl.isContentEditable;

  return isInputOrTextarea || isContentEditable;
}


function setupGlobalShortcuts() {
  window.addEventListener('keydown', async (e) => {
    // 1. Kiểm tra Input Guard
    if (isUserTyping()) {
      return; // Người dùng đang gõ chữ, bỏ qua phím tắt media!
    }

    const key = e.key.toLowerCase();

    // 2. Phím Space hoặc K: Play / Pause
    if (e.code === 'Space' || key === 'k') {
      e.preventDefault(); // Ngăn trình duyệt cuộn trang xuống dưới khi bấm Space
      await sremote.toggle();
      const state = await sremote.getState();
      showOSD(state === 'playing' ? '▶ Play' : '⏸ Pause');
    }

    // 3. Phím J: Tua lùi 10 giây
    else if (key === 'j') {
      e.preventDefault();
      const cur = await sremote.getCurrentTime();
      const target = Math.max(0, cur - 10);
      await sremote.seekTo(target);
      showOSD(`⏪ -10s (${Math.floor(target)}s)`);
    }

    // 4. Phím L: Tua tới 10 giây
    else if (key === 'l') {
      e.preventDefault();
      const cur = await sremote.getCurrentTime();
      const dur = await sremote.getDuration();
      const target = Math.min(dur || 9999, cur + 10);
      await sremote.seekTo(target);
      showOSD(`⏩ +10s (${Math.floor(target)}s)`);
    }

    // 5. Phím M: Bật / Tắt tiếng (Mute)
    else if (key === 'm') {
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
    }

    // 6. Phím Mũi tên Lên / Xuống: Tăng giảm 10% âm lượng
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const curVol = await sremote.getVolume();
      const nextVol = Math.min(1, curVol + 0.1);
      await sremote.setVolume(nextVol);
      showOSD(`🔊 Âm lượng: ${Math.round(nextVol * 100)}%`);
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const curVol = await sremote.getVolume();
      const nextVol = Math.max(0, curVol - 0.1);
      await sremote.setVolume(nextVol);
      showOSD(`🔉 Âm lượng: ${Math.round(nextVol * 100)}%`);
    }
  });
}

// Khởi chạy
initPlayer();



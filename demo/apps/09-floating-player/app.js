import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

const videoAnchor = document.getElementById('video-anchor');
const pipPlayerBox = document.getElementById('pip-player-box');
const btnMiniToggle = document.getElementById('btn-mini-toggle');
const btnMiniClose = document.getElementById('btn-mini-close');

let isFloatingManuallyDismissed = false;
let isCurrentlyPlaying = false;

async function init() {
  await youtube.mount('#media-embed-slot', {
    videoId: 'dQw4w9WgXcQ',
    playerVars: { controls: 1, autoplay: 0 }
  });

  console.log('✅ Player sẵn sàng kết nối!');

  // Theo dõi trạng thái phát của video
  sremote.on('play', () => {
    isCurrentlyPlaying = true;
    btnMiniToggle.textContent = '⏸';
  });

  sremote.on('pause', () => {
    isCurrentlyPlaying = false;
    btnMiniToggle.textContent = '▶';
  });

  setupIntersectionObserver();
  setupMiniControls();
}


function setupIntersectionObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // entry.isIntersecting = true tức là khung neo vẫn đang nằm trong màn hình
      if (entry.isIntersecting) {
        // Độc giả đã cuộn về lại vị trí ban đầu -> Tắt chế độ nổi
        pipPlayerBox.classList.remove('floating-pip');
        isFloatingManuallyDismissed = false;
      } else {
        // Khung neo đã bị cuộn khuất khỏi màn hình!
        // Chỉ bật Floating nếu video ĐANG PHÁT và người dùng CHƯA bấm nút tắt
        if (isCurrentlyPlaying && !isFloatingManuallyDismissed) {
          pipPlayerBox.classList.add('floating-pip');
        }
      }
    });
  }, {
    threshold: 0.1 // Kích hoạt khi ít hơn 10% khung hình video còn nhìn thấy
  });

  // Bắt đầu theo dõi khung neo
  observer.observe(videoAnchor);
}


function setupMiniControls() {
  // Nút Play / Pause trên widget nổi
  btnMiniToggle.addEventListener('click', async () => {
    await sremote.toggle();
  });

  // Nút Đóng (Tạm dừng video và gập widget nổi lại)
  btnMiniClose.addEventListener('click', async () => {
    await sremote.pause();
    pipPlayerBox.classList.remove('floating-pip');
    isFloatingManuallyDismissed = true; // Đánh dấu người dùng đã chủ động tắt
  });
}

// Khởi chạy
init();



import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

// 1. Dữ liệu Playlist mẫu
const playlist = [
  { id: 'jfKfPfyJRdk', title: 'Tập 1: Lofi Beats to Relax / Study to', artist: 'Lofi Girl', duration: 'Live' },
  { id: 'dQw4w9WgXcQ', title: 'Tập 2: Never Gonna Give You Up', artist: 'Rick Astley', duration: '03:32' },
  { id: '4xDzrJKXOOY', title: 'Tập 3: Synthwave Chill Radio', artist: 'Lofi Records', duration: 'Live' }
];

let currentIndex = 0;
let currentMountHandle = null;

// Lấy DOM elements
const currentTitleEl = document.getElementById('current-title');
const currentArtistEl = document.getElementById('current-artist');
const trackListEl = document.getElementById('track-list');
const btnTogglePlay = document.getElementById('btn-toggle-play');
const btnNext = document.getElementById('btn-next');
const btnPrev = document.getElementById('btn-prev');

// 2. Hàm render danh sách ra UI
function renderTracklist() {
  trackListEl.innerHTML = '';
  playlist.forEach((track, index) => {
    const li = document.createElement('li');
    li.className = `track-item ${index === currentIndex ? 'active' : ''}`;
    li.innerHTML = `
      <div>
        <div class="track-item-title">${index + 1}. ${track.title}</div>
        <div style="font-size: 12px; color: #94a3b8;">${track.artist}</div>
      </div>
      <div class="track-item-duration">${track.duration}</div>
    `;

    // Nhấp vào bài bất kỳ trong danh sách -> phát bài đó
    li.addEventListener('click', () => {
      if (currentIndex !== index) {
        loadTrack(index, true);
      }
    });

    trackListEl.appendChild(li);
  });
}


async function loadTrack(index, autoPlay = true) {
  currentIndex = index;
  const track = playlist[currentIndex];

  // Cập nhật thông tin trên header & highlight tracklist
  currentTitleEl.textContent = track.title;
  currentArtistEl.textContent = track.artist;
  renderTracklist();

  // 1. DỌN DẸP INSTANCE CŨ TRƯỚC KHI TẠO MỚI (Tránh memory leak)
  if (currentMountHandle) {
    console.log('🧹 Đang hủy player cũ...');
    currentMountHandle.destroy();
    currentMountHandle = null;
  }

  // 2. Khởi tạo player mới
  console.log(`🎵 Đang nạp track [${index + 1}]: ${track.title}`);
  currentMountHandle = await youtube.mount('#media-embed-slot', {
    videoId: track.id,
    playerVars: {
      autoplay: autoPlay ? 1 : 0,
      controls: 1
    }
  });
}


// Lắng nghe sự kiện kết thúc bài hát từ SRemote
sremote.on('ended', () => {
  console.log('🎉 Bài hiện tại đã hết! Đang tự động nạp bài kế tiếp...');
  const nextIndex = (currentIndex + 1) % playlist.length;
  loadTrack(nextIndex, true); // true = tự động phát
});

// Đồng bộ trạng thái nút Play / Pause
sremote.on('play', () => { btnTogglePlay.textContent = '⏸ Tạm dừng'; });
sremote.on('pause', () => { btnTogglePlay.textContent = '▶ Tiếp tục'; });


btnTogglePlay.addEventListener('click', async () => {
  await sremote.toggle();
});

btnNext.addEventListener('click', () => {
  const nextIndex = (currentIndex + 1) % playlist.length;
  loadTrack(nextIndex, true);
});

btnPrev.addEventListener('click', () => {
  const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(prevIndex, true);
});


// Khởi tạo trang: Nạp bài đầu tiên nhưng KHÔNG tự động phát
loadTrack(0, false);


import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

const playlist = [
  { id: 'jfKfPfyJRdk', title: 'Tập 1: Lofi Beats to Relax / Study to', artist: 'Lofi Girl', duration: 'Live' },
  { id: 'dQw4w9WgXcQ', title: 'Tập 2: Never Gonna Give You Up', artist: 'Rick Astley', duration: '03:32' },
  { id: '4xDzrJKXOOY', title: 'Tập 3: Synthwave Chill Radio', artist: 'Lofi Records', duration: 'Live' }
];

let currentIndex = 0;
let currentMountHandle = null;

const currentTitleEl = document.getElementById('current-title');
const currentArtistEl = document.getElementById('current-artist');
const trackListEl = document.getElementById('track-list');
const btnTogglePlay = document.getElementById('btn-toggle-play');
const btnNext = document.getElementById('btn-next');
const btnPrev = document.getElementById('btn-prev');

function renderTracklist() {
  trackListEl.innerHTML = '';
  playlist.forEach((track, index) => {
    const li = document.createElement('li');
    li.className = `track-item ${index === currentIndex ? 'active' : ''}`;
    li.innerHTML = `
      <div>
        <div class="track-item-title">${index + 1}. ${track.title}</div>
        <div style="font-size: 12px; color: #94a3b8;">${track.artist}</div>
      </div>
      <div class="track-item-duration">${track.duration}</div>
    `;

    li.addEventListener('click', () => {
      if (currentIndex !== index) {
        loadTrack(index, true);
      }
    });

    trackListEl.appendChild(li);
  });
}

async function loadTrack(index, autoPlay = true) {
  currentIndex = index;
  const track = playlist[currentIndex];

  currentTitleEl.textContent = track.title;
  currentArtistEl.textContent = track.artist;
  renderTracklist();

  if (currentMountHandle) {
    currentMountHandle.destroy();
  }

  currentMountHandle = await youtube.mount('#media-embed-slot', {
    videoId: track.id,
    playerVars: {
      autoplay: autoPlay ? 1 : 0,
      controls: 1
    }
  });
}

// Lắng nghe sự kiện kết thúc từ SRemote
sremote.on('ended', () => {
  const nextIndex = (currentIndex + 1) % playlist.length;
  loadTrack(nextIndex, true);
});

sremote.on('play', () => { btnTogglePlay.textContent = '⏸ Tạm dừng'; });
sremote.on('pause', () => { btnTogglePlay.textContent = '▶ Tiếp tục'; });

btnTogglePlay.addEventListener('click', () => sremote.toggle());

btnNext.addEventListener('click', () => {
  const nextIndex = (currentIndex + 1) % playlist.length;
  loadTrack(nextIndex, true);
});

btnPrev.addEventListener('click', () => {
  const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(prevIndex, true);
});

// Khởi chạy
loadTrack(0, false);



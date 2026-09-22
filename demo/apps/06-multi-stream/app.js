import { SRemoteClient } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

// Cấu hình 4 luồng video độc lập
const streamsData = [
  { id: 'cam-1', name: 'Camera 1: Toàn Cảnh Sân Vận Động', videoId: 'jfKfPfyJRdk' },
  { id: 'cam-2', name: 'Camera 2: Góc Quay Flycam Trên Cao', videoId: 'dQw4w9WgXcQ' },
  { id: 'cam-3', name: 'Camera 3: Khoang Lái Tuyển Thủ', videoId: '4xDzrJKXOOY' },
  { id: 'cam-4', name: 'Camera 4: Bàn Bình Luận Viên', videoId: 'M7lc1UVf-VE' }
];

// Mảng lưu trữ các instance SRemoteClient
const activeStreams = [];

const streamGrid = document.getElementById('stream-grid');
const btnMuteAll = document.getElementById('btn-mute-all');
const btnToggleAll = document.getElementById('btn-toggle-all');

// Render 4 card ra giao diện
streamsData.forEach((stream, index) => {
  const card = document.createElement('div');
  card.className = `stream-card ${index === 0 ? 'solo-active' : ''}`;
  card.id = `card-${stream.id}`;
  card.innerHTML = `
    <div id="slot-${stream.id}" class="stream-video-slot"></div>
    <div class="stream-footer">
      <span class="camera-label">🎥 ${stream.name}</span>
      <button class="solo-btn" id="btn-solo-${stream.id}">🔊 Solo Audio</button>
    </div>
  `;
  streamGrid.appendChild(card);
});


async function initMultiStreams() {
  console.log('⚡ Đang khởi tạo 4 luồng video song song...');

  for (let i = 0; i < streamsData.length; i++) {
    const data = streamsData[i];
    
    // Mount YouTube vào slot tương ứng
    const handle = await youtube.mount(`#slot-${data.id}`, {
      videoId: data.videoId,
      playerVars: { controls: 0, autoplay: 1 }
    });

    // Tạo SRemoteClient riêng gắn với iframe này
    const client = new SRemoteClient({ target: handle.iframe });

    activeStreams.push({
      id: data.id,
      client: client,
      card: document.getElementById(`card-${data.id}`)
    });

    // Gắn sự kiện click vào nút Solo Audio hoặc click vào cả khung hình
    document.getElementById(`btn-solo-${data.id}`).addEventListener('click', () => {
      setSoloAudio(data.id);
    });
  }

  // Mặc định ban đầu: Chỉ mở tiếng Camera 1, tắt tiếng 3 camera còn lại
  await setSoloAudio('cam-1');
  console.log('✅ Cả 4 camera đã sẵn sàng!');
}


async function setSoloAudio(targetCamId) {
  console.log(`🎧 Đang kích hoạt Solo Audio cho: ${targetCamId}`);

  // Thực hiện song song để đảm bảo tốc độ phản hồi tức thì
  await Promise.all(activeStreams.map(async (stream) => {
    if (stream.id === targetCamId) {
      // Bật tiếng 100% cho camera được chọn
      await stream.client.setVolume(1);
      stream.card.classList.add('solo-active');
      stream.card.querySelector('.solo-btn').textContent = '🔊 Đang Nghe';
    } else {
      // Tắt tiếng tất cả các camera khác
      await stream.client.setVolume(0);
      stream.card.classList.remove('solo-active');
      stream.card.querySelector('.solo-btn').textContent = '🔇 Solo Audio';
    }
  }));
}


// 1. Tắt tiếng toàn bộ 4 màn hình
btnMuteAll.addEventListener('click', async () => {
  console.log('🔇 Đang mute toàn bộ các luồng...');
  await Promise.all(activeStreams.map(async (s) => {
    await s.client.setVolume(0);
    s.card.classList.remove('solo-active');
    s.card.querySelector('.solo-btn').textContent = '🔇 Bật Tiếng';
  }));
});

// 2. Play / Pause đồng loạt cả 4 màn hình
let areAllPlaying = true;
btnToggleAll.addEventListener('click', async () => {
  areAllPlaying = !areAllPlaying;
  console.log(`⏯ Đang chuyển trạng thái toàn bộ sang: ${areAllPlaying ? 'Play' : 'Pause'}`);
  
  await Promise.all(activeStreams.map(async (s) => {
    if (areAllPlaying) {
      await s.client.play();
    } else {
      await s.client.pause();
    }
  }));
});

// Khởi chạy hệ thống
initMultiStreams();



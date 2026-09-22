import { SRemoteClient } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

// Tạo kênh đồng bộ chung
const syncChannel = new BroadcastChannel('watchparty_theater_room');

// Hàm ghi log ra giao diện
const logList = document.getElementById('log-list');
function logMessage(text) {
  const div = document.createElement('div');
  div.className = 'log-item';
  div.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  logList.prepend(div);
}


let hostClient = null;
let guestClient = null;

async function initTheater() {
  logMessage('⚡ Đang khởi tạo phòng chiếu phim...');

  // 1. Mount Host Player
  const hostHandle = await youtube.mount('#host-player', {
    videoId: 'dQw4w9WgXcQ',
    playerVars: { controls: 1 }
  });
  // Tạo client riêng cho Host
  hostClient = new SRemoteClient({ target: hostHandle.iframe });

  // 2. Mount Guest Player
  const guestHandle = await youtube.mount('#guest-player', {
    videoId: 'dQw4w9WgXcQ',
    playerVars: { controls: 0 } // Guest không cần controls để tránh thao tác nhầm
  });
  // Tạo client riêng cho Guest
  guestClient = new SRemoteClient({ target: guestHandle.iframe });

  // Tắt tiếng Guest để tránh dội âm trên cùng 1 máy
  await guestClient.setVolume(0);

  logMessage('✅ Cả 2 màn hình đã kết nối SRemote thành công!');
  setupSyncLogic();
}


let isRemoteAction = false;

function setupSyncLogic() {
  const hostTimeEl = document.getElementById('host-time');
  const guestTimeEl = document.getElementById('guest-time');
  const hostStateEl = document.getElementById('host-state');
  const guestStateEl = document.getElementById('guest-state');

  // ==========================================
  // PHÍA HOST: Lắng nghe hành động và gửi gói tin
  // ==========================================
  
  hostClient.on('play', async () => {
    hostStateEl.textContent = 'Playing';
    const currentTime = await hostClient.getCurrentTime();
    logMessage(`👑 Host bấm Play tại giây ${currentTime.toFixed(1)} -> Gửi gói tin`);
    
    syncChannel.postMessage({
      action: 'PLAY',
      time: currentTime
    });
  });

  hostClient.on('pause', async () => {
    hostStateEl.textContent = 'Paused';
    const currentTime = await hostClient.getCurrentTime();
    logMessage(`👑 Host bấm Pause tại giây ${currentTime.toFixed(1)} -> Gửi gói tin`);

    syncChannel.postMessage({
      action: 'PAUSE',
      time: currentTime
    });
  });

  hostClient.on('seeked', async ({ currentTime }) => {
    logMessage(`👑 Host tua video tới ${currentTime.toFixed(1)}s -> Gửi gói tin`);
    syncChannel.postMessage({
      action: 'SEEK',
      time: currentTime
    });
  });

  hostClient.on('timeupdate', ({ currentTime }) => {
    hostTimeEl.textContent = `${currentTime.toFixed(1)}s`;
  });

  // ==========================================
  // PHÍA GUEST: Nhận gói tin và đồng bộ video
  // ==========================================

  guestClient.on('timeupdate', ({ currentTime }) => {
    guestTimeEl.textContent = `${currentTime.toFixed(1)}s`;
  });

  syncChannel.onmessage = async (event) => {
    const { action, time } = event.data;
    const currentGuestTime = await guestClient.getCurrentTime();
    const timeDelta = Math.abs(currentGuestTime - time);

    logMessage(`👥 Guest nhận lệnh: [${action}] mốc ${time.toFixed(1)}s (Lệch: ${timeDelta.toFixed(2)}s)`);

    // Bật cờ chặn Echo Loop
    isRemoteAction = true;

    if (action === 'PLAY') {
      guestStateEl.textContent = 'Playing';
      // Nếu lệch quá 1.5 giây thì mới tua lại cho khớp
      if (timeDelta > 1.5) {
        await guestClient.seekTo(time);
      }
      await guestClient.play();
    } 
    else if (action === 'PAUSE') {
      guestStateEl.textContent = 'Paused';
      await guestClient.pause();
      if (timeDelta > 0.5) {
        await guestClient.seekTo(time);
      }
    } 
    else if (action === 'SEEK') {
      await guestClient.seekTo(time);
    }

    // Tắt cờ sau khi lệnh thực thi xong
    setTimeout(() => {
      isRemoteAction = false;
    }, 200);
  };
}


initTheater();



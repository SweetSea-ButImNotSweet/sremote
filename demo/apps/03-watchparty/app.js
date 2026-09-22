import { SRemoteClient } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

if (window.setupDemoTopBar) {
  window.setupDemoTopBar({ appName: 'App 03: WatchParty SyncTheater', tutorialPath: 'content/guides/vi/blueprints/03-watchparty.md' });
}

const syncChannel = new BroadcastChannel('watchparty_theater_room');
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

  const hostHandle = await youtube.mount('#host-player', { videoId: 'dQw4w9WgXcQ', playerVars: { controls: 1 } });
  hostClient = new SRemoteClient({ target: hostHandle.iframe });

  const guestHandle = await youtube.mount('#guest-player', { videoId: 'dQw4w9WgXcQ', playerVars: { controls: 0 } });
  guestClient = new SRemoteClient({ target: guestHandle.iframe });

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

  // HOST
  hostClient.on('play', async () => {
    hostStateEl.textContent = 'Playing';
    const currentTime = await hostClient.getCurrentTime();
    logMessage(`👑 Host Play tại ${currentTime.toFixed(1)}s -> Gửi broadcast`);
    syncChannel.postMessage({ action: 'PLAY', time: currentTime });
  });

  hostClient.on('pause', async () => {
    hostStateEl.textContent = 'Paused';
    const currentTime = await hostClient.getCurrentTime();
    logMessage(`👑 Host Pause tại ${currentTime.toFixed(1)}s -> Gửi broadcast`);
    syncChannel.postMessage({ action: 'PAUSE', time: currentTime });
  });

  hostClient.on('seeked', async ({ currentTime }) => {
    logMessage(`👑 Host Seek tới ${currentTime.toFixed(1)}s -> Gửi broadcast`);
    syncChannel.postMessage({ action: 'SEEK', time: currentTime });
  });

  hostClient.on('timeupdate', ({ currentTime }) => {
    hostTimeEl.textContent = `${currentTime.toFixed(1)}s`;
  });

  // GUEST
  guestClient.on('timeupdate', ({ currentTime }) => {
    guestTimeEl.textContent = `${currentTime.toFixed(1)}s`;
  });

  syncChannel.onmessage = async event => {
    const { action, time } = event.data;
    const currentGuestTime = await guestClient.getCurrentTime();
    const timeDelta = Math.abs(currentGuestTime - time);

    logMessage(`👥 Guest nhận lệnh: [${action}] mốc ${time.toFixed(1)}s (Lệch: ${timeDelta.toFixed(2)}s)`);

    isRemoteAction = true;

    if (action === 'PLAY') {
      guestStateEl.textContent = 'Playing';
      if (timeDelta > 1.5) {
        await guestClient.seekTo(time);
      }
      await guestClient.play();
    } else if (action === 'PAUSE') {
      guestStateEl.textContent = 'Paused';
      await guestClient.pause();
      if (timeDelta > 0.5) {
        await guestClient.seekTo(time);
      }
    } else if (action === 'SEEK') {
      await guestClient.seekTo(time);
    }

    setTimeout(() => {
      isRemoteAction = false;
    }, 200);
  };
}

initTheater();

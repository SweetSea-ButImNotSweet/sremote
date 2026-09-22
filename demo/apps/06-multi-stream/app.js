import { SRemoteClient } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

if (window.setupDemoTopBar) {
  window.setupDemoTopBar({ appName: 'App 06: Multi-Stream Dashboard', tutorialPath: 'content/guides/vi/blueprints/06-multi-stream.md' });
}

const streamsData = [
  { id: 'cam-1', name: 'Camera 1: Toàn Cảnh', videoId: 'jfKfPfyJRdk' },
  { id: 'cam-2', name: 'Camera 2: Flycam Trên Cao', videoId: 'dQw4w9WgXcQ' },
  { id: 'cam-3', name: 'Camera 3: Tuyển Thủ', videoId: '4xDzrJKXOOY' },
  { id: 'cam-4', name: 'Camera 4: Bình Luận Viên', videoId: 'M7lc1UVf-VE' },
];

const activeStreams = [];
const streamGrid = document.getElementById('stream-grid');
const btnMuteAll = document.getElementById('btn-mute-all');
const btnToggleAll = document.getElementById('btn-toggle-all');

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
  for (let i = 0; i < streamsData.length; i++) {
    const data = streamsData[i];

    const handle = await youtube.mount(`#slot-${data.id}`, { videoId: data.videoId, playerVars: { controls: 0, autoplay: 1 } });

    const client = new SRemoteClient({ target: handle.iframe });

    activeStreams.push({ id: data.id, client: client, card: document.getElementById(`card-${data.id}`) });

    document.getElementById(`btn-solo-${data.id}`).addEventListener('click', () => {
      setSoloAudio(data.id);
    });
  }

  await setSoloAudio('cam-1');
}

async function setSoloAudio(targetCamId) {
  await Promise.all(
    activeStreams.map(async stream => {
      if (stream.id === targetCamId) {
        await stream.client.setVolume(1);
        stream.card.classList.add('solo-active');
        stream.card.querySelector('.solo-btn').textContent = '🔊 Đang Nghe';
      } else {
        await stream.client.setVolume(0);
        stream.card.classList.remove('solo-active');
        stream.card.querySelector('.solo-btn').textContent = '🔇 Solo Audio';
      }
    }),
  );
}

btnMuteAll.addEventListener('click', async () => {
  await Promise.all(
    activeStreams.map(async s => {
      await s.client.setVolume(0);
      s.card.classList.remove('solo-active');
      s.card.querySelector('.solo-btn').textContent = '🔇 Bật Tiếng';
    }),
  );
});

let areAllPlaying = true;
btnToggleAll.addEventListener('click', async () => {
  areAllPlaying = !areAllPlaying;
  await Promise.all(
    activeStreams.map(async s => {
      if (areAllPlaying) {
        await s.client.play();
      } else {
        await s.client.pause();
      }
    }),
  );
});

initMultiStreams();

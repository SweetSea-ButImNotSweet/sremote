import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

if (window.setupDemoTopBar) {
  window.setupDemoTopBar({ appName: 'App 02: Playlist & Podcast Queue', tutorialPath: 'content/guides/vi/blueprints/02-playlist-queue.md' });
}

const Icons = window.DemoIcons || { play: '▶', pause: '⏸', prev: '⏮', next: '⏭' };

const playlist = [
  { id: 'jfKfPfyJRdk', title: 'Tập 1: Lofi Beats to Relax / Study to', artist: 'Lofi Girl', duration: 'Live' },
  { id: 'dQw4w9WgXcQ', title: 'Tập 2: Never Gonna Give You Up', artist: 'Rick Astley', duration: '03:32' },
  { id: '4xDzrJKXOOY', title: 'Tập 3: Synthwave Chill Radio', artist: 'Lofi Records', duration: 'Live' },
];

let currentIndex = 0;
let currentMountHandle = null;

const currentTitleEl = document.getElementById('current-title');
const currentArtistEl = document.getElementById('current-artist');
const trackListEl = document.getElementById('track-list');
const btnTogglePlay = document.getElementById('btn-toggle-play');
const btnNext = document.getElementById('btn-next');
const btnPrev = document.getElementById('btn-prev');

btnPrev.innerHTML = `${Icons.prev} <span>Trước</span>`;
btnNext.innerHTML = `<span>Sau</span> ${Icons.next}`;
btnTogglePlay.innerHTML = `${Icons.play} <span>Phát</span>`;

function renderTracklist() {
  trackListEl.innerHTML = '';
  playlist.forEach((track, index) => {
    const li = document.createElement('li');
    li.className = `track-item ${index === currentIndex ? 'active' : ''}`;
    li.innerHTML = `
      <div>
        <div class="track-item-title">${index + 1}. ${track.title}</div>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${track.artist}</div>
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

  currentMountHandle = await youtube.mount('#media-embed-slot', { videoId: track.id, playerVars: { autoplay: autoPlay ? 1 : 0, controls: 1 } });
}

sremote.on('ended', () => {
  const nextIndex = (currentIndex + 1) % playlist.length;
  loadTrack(nextIndex, true);
});

sremote.on('play', () => {
  btnTogglePlay.innerHTML = `${Icons.pause} <span>Tạm dừng</span>`;
});
sremote.on('pause', () => {
  btnTogglePlay.innerHTML = `${Icons.play} <span>Tiếp tục</span>`;
});

btnTogglePlay.addEventListener('click', () => sremote.toggle());

btnNext.addEventListener('click', () => {
  const nextIndex = (currentIndex + 1) % playlist.length;
  loadTrack(nextIndex, true);
});

btnPrev.addEventListener('click', () => {
  const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(prevIndex, true);
});

loadTrack(0, false);

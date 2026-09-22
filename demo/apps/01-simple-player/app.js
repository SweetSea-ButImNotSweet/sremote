import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

const btnPlay = document.getElementById('btn-play');
const timeDisplay = document.getElementById('time-display');
const seekBar = document.getElementById('seek-bar');
const btnMute = document.getElementById('btn-mute');
const volumeBar = document.getElementById('volume-bar');

let isScrubbing = false;
let videoDuration = 0;
let lastVolume = 1;

function formatTime(seconds) {
  if (isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function init() {
  await youtube.mount('#video-container', {
    videoId: 'M7lc1UVf-VE',
    playerVars: { controls: 0, autoplay: 0 }
  });

  // State Sync
  sremote.on('play', () => { btnPlay.textContent = '⏸'; });
  sremote.on('pause', () => { btnPlay.textContent = '▶'; });
  sremote.on('ended', () => { btnPlay.textContent = '🔄'; });

  sremote.on('durationchange', ({ duration }) => {
    videoDuration = duration;
    seekBar.max = duration;
  });

  sremote.on('timeupdate', ({ currentTime }) => {
    if (!isScrubbing && videoDuration > 0) {
      seekBar.value = currentTime;
      timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(videoDuration)}`;
    }
  });

  // Controls Event Listeners
  btnPlay.addEventListener('click', () => sremote.toggle());

  seekBar.addEventListener('input', () => {
    isScrubbing = true;
    timeDisplay.textContent = `${formatTime(seekBar.value)} / ${formatTime(videoDuration)}`;
  });

  seekBar.addEventListener('change', async () => {
    await sremote.seekTo(parseFloat(seekBar.value));
    isScrubbing = false;
  });

  volumeBar.addEventListener('input', async () => {
    const val = parseFloat(volumeBar.value);
    await sremote.setVolume(val);
    btnMute.textContent = val === 0 ? '🔇' : '🔊';
    if (val > 0) lastVolume = val;
  });

  btnMute.addEventListener('click', async () => {
    const cur = parseFloat(volumeBar.value);
    if (cur > 0) {
      lastVolume = cur;
      volumeBar.value = 0;
      await sremote.setVolume(0);
      btnMute.textContent = '🔇';
    } else {
      const res = lastVolume || 0.5;
      volumeBar.value = res;
      await sremote.setVolume(res);
      btnMute.textContent = '🔊';
    }
  });
}

init();

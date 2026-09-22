import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

// Setup common top bar
if (window.setupDemoTopBar) {
  window.setupDemoTopBar({ appName: 'App 01: Simple Custom Player', tutorialPath: 'content/guides/vi/blueprints/01-simple-player.md' });
}

const btnPlay = document.getElementById('btn-play');
const timeDisplay = document.getElementById('time-display');
const seekBar = document.getElementById('seek-bar');
const btnMute = document.getElementById('btn-mute');
const volumeBar = document.getElementById('volume-bar');

const Icons = window.DemoIcons || { play: '▶', pause: '⏸', replay: '🔄', volumeHigh: '🔊', volumeMute: '🔇' };

// Set initial SVG icons
btnPlay.innerHTML = Icons.play;
btnMute.innerHTML = Icons.volumeHigh;

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
  await youtube.mount('#video-container', { videoId: 'M7lc1UVf-VE', playerVars: { controls: 0, autoplay: 0 } });

  // State Sync with SVG icons
  sremote.on('play', () => {
    btnPlay.innerHTML = Icons.pause;
  });
  sremote.on('pause', () => {
    btnPlay.innerHTML = Icons.play;
  });
  sremote.on('ended', () => {
    btnPlay.innerHTML = Icons.replay;
  });

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
    btnMute.innerHTML = val === 0 ? Icons.volumeMute : Icons.volumeHigh;
    if (val > 0) lastVolume = val;
  });

  btnMute.addEventListener('click', async () => {
    const cur = parseFloat(volumeBar.value);
    if (cur > 0) {
      lastVolume = cur;
      volumeBar.value = 0;
      await sremote.setVolume(0);
      btnMute.innerHTML = Icons.volumeMute;
    } else {
      const res = lastVolume || 0.5;
      volumeBar.value = res;
      await sremote.setVolume(res);
      btnMute.innerHTML = Icons.volumeHigh;
    }
  });
}

init();

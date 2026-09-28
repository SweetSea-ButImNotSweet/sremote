import { sremote } from '@sremote/sdk';
import { youtube } from '@sremote/ready2use';

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
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function init() {
  const ytHandle = await youtube.mount('#video-container', { videoId: 'M7lc1UVf-VE', playerVars: { controls: 0, autoplay: 0, rel: 0, modestbranding: 1 } });

  const playerRemote = ytHandle?.remote || sremote;

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

  sremote.on('durationchange', payload => {
    const duration = payload?.duration ?? payload?.state?.duration ?? 0;
    if (duration > 0) {
      videoDuration = duration;
      seekBar.max = duration;
      timeDisplay.textContent = `${formatTime(seekBar.value)} / ${formatTime(videoDuration)}`;
    }
  });

  sremote.on('timeupdate', payload => {
    debugger;
    const curTime = payload?.currentTime ?? payload?.state?.currentTime ?? 0;
    const duration = payload?.duration ?? payload?.state?.duration ?? videoDuration;

    if (duration > 0 && videoDuration !== duration) {
      videoDuration = duration;
      seekBar.max = duration;
    }

    if (!isScrubbing && videoDuration > 0) {
      seekBar.value = curTime;
      timeDisplay.textContent = `${formatTime(curTime)} / ${formatTime(videoDuration)}`;
    }
  });

  sremote.on('volumechange', payload => {
    const vol = payload?.volume ?? payload?.state?.volume ?? parseFloat(volumeBar.value);
    const muted = payload?.muted ?? payload?.state?.muted ?? vol === 0;
    const displayVol = muted ? 0 : vol;
    volumeBar.value = displayVol;
    btnMute.innerHTML = displayVol === 0 ? Icons.volumeMute : Icons.volumeHigh;
    if (displayVol > 0) lastVolume = displayVol;
  });

  // Controls Event Listeners
  btnPlay.addEventListener('click', async () => {
    try {
      await playerRemote.toggle();
    } catch {
      await sremote.toggle();
    }
  });

  seekBar.addEventListener('input', () => {
    isScrubbing = true;
    timeDisplay.textContent = `${formatTime(seekBar.value)} / ${formatTime(videoDuration)}`;
  });

  seekBar.addEventListener('change', async () => {
    const targetTime = parseFloat(seekBar.value);
    try {
      await playerRemote.seekTo(targetTime);
    } catch {
      await sremote.seekTo(targetTime);
    }
    isScrubbing = false;
  });

  volumeBar.addEventListener('input', async () => {
    const val = parseFloat(volumeBar.value);
    try {
      await playerRemote.setVolume(val);
    } catch {
      await sremote.volume(val);
    }
    btnMute.innerHTML = val === 0 ? Icons.volumeMute : Icons.volumeHigh;
    if (val > 0) lastVolume = val;
  });

  btnMute.addEventListener('click', async () => {
    const cur = parseFloat(volumeBar.value);
    if (cur > 0) {
      lastVolume = cur;
      volumeBar.value = 0;
      try {
        await playerRemote.setVolume(0);
      } catch {
        await sremote.volume(0);
      }
      btnMute.innerHTML = Icons.volumeMute;
    } else {
      const res = lastVolume || 0.5;
      volumeBar.value = res;
      try {
        await playerRemote.setVolume(res);
      } catch {
        await sremote.volume(res);
      }
      btnMute.innerHTML = Icons.volumeHigh;
    }
  });
}

init();

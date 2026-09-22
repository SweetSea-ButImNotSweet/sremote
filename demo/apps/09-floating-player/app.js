import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

if (window.setupDemoTopBar) {
  window.setupDemoTopBar({
    appName: 'App 09: Sticky Floating Mini-Player',
    tutorialPath: 'content/guides/vi/blueprints/09-floating-player.md'
  });
}

const Icons = window.DemoIcons || { play: '▶', pause: '⏸' };

const videoAnchor = document.getElementById('video-anchor');
const pipPlayerBox = document.getElementById('pip-player-box');
const btnMiniToggle = document.getElementById('btn-mini-toggle');
const btnMiniClose = document.getElementById('btn-mini-close');

btnMiniToggle.innerHTML = Icons.pause;

let isFloatingManuallyDismissed = false;
let isCurrentlyPlaying = false;

async function init() {
  await youtube.mount('#media-embed-slot', {
    videoId: 'dQw4w9WgXcQ',
    playerVars: { controls: 1, autoplay: 0 }
  });

  sremote.on('play', () => {
    isCurrentlyPlaying = true;
    btnMiniToggle.innerHTML = Icons.pause;
  });

  sremote.on('pause', () => {
    isCurrentlyPlaying = false;
    btnMiniToggle.innerHTML = Icons.play;
  });

  setupIntersectionObserver();
  setupMiniControls();
}

function setupIntersectionObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        pipPlayerBox.classList.remove('floating-pip');
        isFloatingManuallyDismissed = false;
      } else {
        if (isCurrentlyPlaying && !isFloatingManuallyDismissed) {
          pipPlayerBox.classList.add('floating-pip');
        }
      }
    });
  }, {
    threshold: 0.1
  });

  observer.observe(videoAnchor);
}

function setupMiniControls() {
  btnMiniToggle.addEventListener('click', async () => {
    await sremote.toggle();
  });

  btnMiniClose.addEventListener('click', async () => {
    await sremote.pause();
    pipPlayerBox.classList.remove('floating-pip');
    isFloatingManuallyDismissed = true;
  });
}

init();

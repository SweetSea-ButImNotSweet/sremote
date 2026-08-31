// [cmt_tiktok_adapter]
const iframe = document.getElementById('tiktok-player-frame');
let isPlaying = false;
let isMuted = false;
let currentTime = 0;
let duration = 0;

// [cmt_tiktok_postmessage]
function sendToTikTok(type, value) {
  if (iframe?.contentWindow) {
    const payload = { 'x-tiktok-player': true, type: type };
    if (value !== undefined) payload.value = value;
    iframe.contentWindow.postMessage(payload, 'https://www.tiktok.com');
  }
}

// [cmt_register_adapter]
const adapter = {
  play() {
    sendToTikTok('play');
  },
  pause() {
    sendToTikTok('pause');
  },
  toggle() {
    isPlaying ? adapter.pause() : adapter.play();
  },
  seek(offset) {
    const target = Math.max(0, currentTime + offset);
    adapter.seekTo(target);
  },
  seekTo(seconds) {
    currentTime = seconds;
    sendToTikTok('seekTo', seconds);
  },
  volume(vol) {
    if (vol <= 0) {
      adapter.mute(true);
    } else {
      if (isMuted) adapter.mute(false);
    }
  },
  mute(m) {
    const shouldMute = m !== undefined ? m : !isMuted;
    isMuted = shouldMute;
    sendToTikTok(shouldMute ? 'mute' : 'unMute');
  },
  getDuration() {
    return duration;
  },
  getCurrentTime() {
    return currentTime;
  },
  paused() {
    return !isPlaying;
  },
};

const adapterId = window.sremote.adapters.set(adapter, 'tiktok_player');

// [cmt_tiktok_listen]
window.addEventListener('message', e => {
  if (e.origin !== 'https://www.tiktok.com') return;
  if (!e.data || !e.data['x-tiktok-player']) return;

  const { type, value } = e.data;

  if (type === 'onPlayerReady') {
    console.log('✅ TikTok Embed Player Ready');
  } else if (type === 'onStateChange') {
    // [cmt_tiktok_state_desc]
    if (value === 1) {
      isPlaying = true;
      adapter.emit('play', { state: { paused: false, currentTime, duration } });
    } else if (value === 2) {
      isPlaying = false;
      adapter.emit('pause', { state: { paused: true, currentTime, duration } });
    } else if (value === 0) {
      isPlaying = false;
      adapter.emit('ended', { state: { ended: true, currentTime: duration, duration } });
    }
  } else if (type === 'onCurrentTime') {
    if (value) {
      if (typeof value.currentTime === 'number') currentTime = value.currentTime;
      if (typeof value.duration === 'number') duration = value.duration;
      adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
    }
  } else if (type === 'onMute') {
    isMuted = Boolean(value);
  }
});

console.log('✅ TikTok Official Player Adapter ready:', adapterId);

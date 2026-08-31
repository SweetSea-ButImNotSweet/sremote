// [cmt_nico_adapter]
const iframe = document.getElementById('niconico-player');
const playerId = 'niconico-player';
let duration = 0;
let currentTime = 0;
let isPlaying = false;

// [cmt_nico_postmessage]
function sendToNico(eventName, data = {}) {
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage({ sourceConnectorType: 1, playerId: playerId, eventName: eventName, data: data }, 'https://embed.nicovideo.jp');
  }
}

// [cmt_register_adapter]
const adapter = {
  play() {
    sendToNico('play');
  },
  pause() {
    sendToNico('pause');
  },
  toggle() {
    isPlaying ? sendToNico('pause') : sendToNico('play');
  },
  seekTo(seconds) {
    sendToNico('seek', { time: seconds * 1000 });
  },
  setVolume(vol) {
    sendToNico('volumeChange', { volume: vol });
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

const adapterId = window.sremote.adapters.set(adapter, 'niconico_player');

// [cmt_nico_listen]
window.addEventListener('message', e => {
  if (e.origin !== 'https://embed.nicovideo.jp') return;
  if (e.data?.playerId !== playerId) return;

  const { eventName, data } = e.data;

  if (eventName === 'loadComplete') {
    if (data?.videoInfo?.lengthInSeconds) {
      duration = data.videoInfo.lengthInSeconds / 1000;
    }
  } else if (eventName === 'playerMetadataChange') {
    if (data?.duration !== undefined) duration = data.duration / 1000;
    if (data?.currentTime !== undefined) {
      currentTime = data.currentTime / 1000;
      adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
    }
  } else if (eventName === 'playerStatusChange') {
    if (data?.playerStatus === 2) {
      isPlaying = true;
      adapter.emit('play', { state: { paused: false, currentTime, duration } });
    } else if (data?.playerStatus === 3) {
      isPlaying = false;
      adapter.emit('pause', { state: { paused: true, currentTime, duration } });
    } else if (data?.playerStatus === 4) {
      isPlaying = false;
      adapter.emit('ended', { state: { ended: true, currentTime, duration, duration } });
    }
  }
});

console.log('✅ NicoNico Adapter ready:', adapterId);

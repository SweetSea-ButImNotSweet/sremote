// [cmt_vimeo_adapter]
const vimeoIframe = document.getElementById('vimeo-player');
const vimeoPlayer = new Vimeo.Player(vimeoIframe);

vimeoPlayer.ready().then(async () => {
  let isPaused = true;
  let duration = await vimeoPlayer.getDuration().catch(() => 0);
  let currentTime = 0;

  const adapter = {
    play() {
      vimeoPlayer.play();
    },
    pause() {
      vimeoPlayer.pause();
    },
    toggle() {
      vimeoPlayer.getPaused().then(paused => {
        paused ? vimeoPlayer.play() : vimeoPlayer.pause();
      });
    },
    seek(offset) {
      vimeoPlayer.getCurrentTime().then(t => vimeoPlayer.setCurrentTime(Math.max(0, t + offset)));
    },
    seekTo(seconds) {
      vimeoPlayer.setCurrentTime(seconds);
    },
    setVolume(vol) {
      vimeoPlayer.setVolume(vol);
    },
    setMuted(muted) {
      vimeoPlayer.setMuted(muted);
    },
    getDuration() {
      return duration;
    },
    getCurrentTime() {
      return currentTime;
    },
    paused() {
      return isPaused;
    },
  };

  const adapterId = window.sremote.adapters.set(adapter, 'vimeo_player');

  // [cmt_vimeo_sync]
  vimeoPlayer.on('play', () => {
    isPaused = false;
    adapter.emit('play', { state: { paused: false, currentTime, duration } });
  });

  vimeoPlayer.on('pause', () => {
    isPaused = true;
    adapter.emit('pause', { state: { paused: true, currentTime, duration } });
  });

  vimeoPlayer.on('timeupdate', data => {
    currentTime = data.seconds || 0;
    duration = data.duration || duration;
    adapter.emit('timeupdate', { state: { paused: isPaused, currentTime, duration } });
  });

  vimeoPlayer.on('seeked', data => {
    currentTime = data.seconds || 0;
    adapter.emit('seeked', { state: { paused: isPaused, currentTime, duration } });
    adapter.emit('timeupdate', { state: { paused: isPaused, currentTime, duration } });
  });

  console.log('✅ Vimeo Adapter ready:', adapterId);
});

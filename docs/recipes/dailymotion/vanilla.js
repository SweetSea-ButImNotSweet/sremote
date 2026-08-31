// [cmt_dailymotion_adapter]
const dmIframe = document.getElementById('dailymotion-player');
dailymotion.createPlayer(dmIframe, { video: 'x7tgad0' }).then(player => {
  let isPaused = true;
  let duration = 0;
  let currentTime = 0;

  const adapter = {
    play() {
      player.play();
    },
    pause() {
      player.pause();
    },
    toggle() {
      isPaused ? player.play() : player.pause();
    },
    seekTo(seconds) {
      player.seek(seconds);
    },
    setVolume(vol) {
      player.setVolume(vol);
    },
    setMuted(muted) {
      player.setMuted(muted);
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

  const adapterId = window.sremote.adapters.set(adapter, 'dailymotion_player');

  // [cmt_dailymotion_sync]
  player.on(dailymotion.events.PLAYER_PLAY, () => {
    isPaused = false;
    adapter.emit('play', { state: { paused: false, currentTime, duration } });
  });

  player.on(dailymotion.events.PLAYER_PAUSE, () => {
    isPaused = true;
    adapter.emit('pause', { state: { paused: true, currentTime, duration } });
  });

  player.on(dailymotion.events.PLAYER_TIMEUPDATE, state => {
    currentTime = state?.videoTime ?? state?.time ?? currentTime;
    duration = state?.videoDuration ?? state?.duration ?? duration;
    adapter.emit('timeupdate', { state: { paused: isPaused, currentTime, duration } });
  });

  player.on(dailymotion.events.PLAYER_SEEKED, state => {
    currentTime = state?.videoTime ?? state?.time ?? currentTime;
    adapter.emit('seeked', { state: { paused: isPaused, currentTime, duration } });
    adapter.emit('timeupdate', { state: { paused: isPaused, currentTime, duration } });
  });

  console.log('✅ Dailymotion Adapter ready:', adapterId);
});

import { sremote } from '@sremote/wrapper';

// [cmt_twitch_adapter]
const currentHost = window.location.hostname || 'localhost';
const player = new Twitch.Player('twitch-player-container', { width: '100%', height: '100%', channel: 'the8bitdrummer', autoplay: true, muted: true, parent: [currentHost] });

player.addEventListener(Twitch.Player.READY, () => {
  const adapter = {
    play() {
      player.play();
    },
    pause() {
      player.pause();
    },
    toggle() {
      player.isPaused() ? player.play() : player.pause();
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
      return player.getDuration();
    },
    getCurrentTime() {
      return player.getCurrentTime();
    },
    paused() {
      return player.isPaused();
    },
  };

  const adapterId = sremote.adapters.set(adapter, 'twitch_player');

  player.addEventListener(Twitch.Player.PLAY, () => {
    adapter.emit('play', { state: { paused: false, currentTime: player.getCurrentTime(), duration: player.getDuration() } });
  });

  player.addEventListener(Twitch.Player.PAUSE, () => {
    adapter.emit('pause', { state: { paused: true, currentTime: player.getCurrentTime(), duration: player.getDuration() } });
  });

  console.log('✅ Twitch Adapter ready with Wrapper:', adapterId);
});

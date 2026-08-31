import { sremote } from '@sremote/wrapper';

// [cmt_mixcloud_adapter]
const mcIframe = document.getElementById('mixcloud-widget');
const widget = Mixcloud.PlayerWidget(mcIframe);

widget.ready.then(() => {
  let isPlaying = true;
  let duration = 0;
  let currentTime = 0;

  widget.getDuration().then(d => {
    duration = d;
  });

  const adapter = {
    play() {
      widget.play();
      isPlaying = true;
    },
    pause() {
      widget.pause();
      isPlaying = false;
    },
    toggle() {
      widget.togglePlay();
      isPlaying = !isPlaying;
    },
    seekTo(seconds) {
      widget.seek(seconds);
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

  const adapterId = sremote.adapters.set(adapter, 'mixcloud_player');

  widget.events.play.on(() => {
    isPlaying = true;
    adapter.emit('play', { state: { paused: false, currentTime, duration } });
  });

  widget.events.pause.on(() => {
    isPlaying = false;
    adapter.emit('pause', { state: { paused: true, currentTime, duration } });
  });

  widget.events.progress.on((pos, dur) => {
    currentTime = pos;
    duration = dur;
    adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
  });

  console.log('✅ Mixcloud Adapter ready with Wrapper:', adapterId);
});

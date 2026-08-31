import { sremote } from '@sremote/wrapper';

// [cmt_soundcloud_adapter]
const widgetIframe = document.getElementById('sc-widget');
const widget = SC.Widget(widgetIframe);

widget.bind(SC.Widget.Events.READY, () => {
  widget.setVolume(0); // Start muted for autoplay policy

  let isPlaying = true;
  let duration = 0;
  let currentTime = 0;

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
      widget.toggle();
      isPlaying = !isPlaying;
    },
    seek(offset) {
      widget.getPosition(pos => {
        widget.seekTo(Math.max(0, pos + offset * 1000));
      });
    },
    seekTo(seconds) {
      widget.seekTo(seconds * 1000);
    },
    setVolume(vol) {
      widget.setVolume(vol * 100);
    },
    setMuted(muted) {
      widget.setVolume(muted ? 0 : 100);
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

  const adapterId = sremote.adapters.set(adapter, 'soundcloud_player');

  // [cmt_soundcloud_sync]
  widget.bind(SC.Widget.Events.PLAY, () => {
    isPlaying = true;
    adapter.emit('play', { state: { paused: false, currentTime, duration } });
  });

  widget.bind(SC.Widget.Events.PAUSE, () => {
    isPlaying = false;
    adapter.emit('pause', { state: { paused: true, currentTime, duration } });
  });

  widget.bind(SC.Widget.Events.PLAY_PROGRESS, data => {
    currentTime = (data.currentPosition || 0) / 1000;
    adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
  });

  widget.bind(SC.Widget.Events.SEEK, data => {
    currentTime = (data.currentPosition || 0) / 1000;
    adapter.emit('seeked', { state: { paused: !isPlaying, currentTime, duration } });
    adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
  });

  console.log('✅ SoundCloud Adapter registered to SRemote Wrapper:', adapterId);
});

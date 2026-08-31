import { sremote } from '@sremote/wrapper';

// [cmt_spotify_adapter]
window.onSpotifyIframeApiReady = IFrameAPI => {
  const element = document.getElementById('spotify-embed-container');
  const options = { uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT', width: '100%', height: '152' };

  IFrameAPI.createController(element, options, EmbedController => {
    let isPaused = true;
    let position = 0;
    let duration = 0;

    const adapter = {
      play() {
        EmbedController.resume();
      },
      pause() {
        EmbedController.pause();
      },
      toggle() {
        EmbedController.togglePlay();
      },
      seekTo(seconds) {
        EmbedController.seek(seconds);
      },
      getDuration() {
        return duration;
      },
      getCurrentTime() {
        return position;
      },
      paused() {
        return isPaused;
      },
    };

    const adapterId = sremote.adapters.set(adapter, 'spotify_player');

    // [cmt_spotify_sync]
    EmbedController.addListener('playback_started', e => {
      isPaused = false;
      position = (e.data?.position || 0) / 1000;
      duration = (e.data?.duration || 0) / 1000;
      adapter.emit('play', { state: { paused: false, currentTime: position, duration } });
      adapter.emit('timeupdate', { state: { paused: false, currentTime: position, duration } });
    });

    EmbedController.addListener('playback_update', e => {
      isPaused = Boolean(e.data?.isPaused);
      position = (e.data?.position || 0) / 1000;
      duration = (e.data?.duration || 0) / 1000;
      adapter.emit('timeupdate', { state: { paused: isPaused, currentTime: position, duration } });
    });

    console.log('✅ Spotify Adapter connected with Wrapper:', adapterId);
  });
};

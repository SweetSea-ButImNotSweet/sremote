// [cmt_facebook_adapter]
window.fbAsyncInit = function () {
  window.FB.init({ xfbml: true, version: 'v18.0' });

  window.FB.Event.subscribe('xfbml.ready', msg => {
    if (msg.type === 'video' && msg.id === 'my-facebook-video') {
      const fbPlayer = msg.instance;

      // [cmt_register_adapter]
      window.sremote?.adapters?.set({
        play: () => fbPlayer.play(),
        pause: () => fbPlayer.pause(),
        seek: offset => fbPlayer.seek(fbPlayer.getCurrentPosition() + offset),
        seekTo: sec => fbPlayer.seek(sec),
        volume: vol => fbPlayer.setVolume(vol),
        mute: () => fbPlayer.mute(),
        unmute: () => fbPlayer.unmute(),
        getState: () => ({
          paused: !fbPlayer.isPlaying(),
          currentTime: fbPlayer.getCurrentPosition(),
          duration: fbPlayer.getDuration(),
          volume: fbPlayer.getVolume(),
          muted: fbPlayer.isMuted(),
        }),
      });

      // [cmt_facebook_sync]
      fbPlayer.subscribe('startedPlaying', () => window.sremote?.emit?.('play'));
      fbPlayer.subscribe('paused', () => window.sremote?.emit?.('pause'));
      fbPlayer.subscribe('finishedPlaying', () => window.sremote?.emit?.('ended'));
    }
  });
};

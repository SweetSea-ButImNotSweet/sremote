// [cmt_install_wrapper]
import { sremote } from '@sremote/wrapper';

let ytPlayer;

// [cmt_init_yt_adapter]
function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('my-youtube-frame', {
    events: {
      onReady: event => {
        // [cmt_register_adapter]
        const adapterId = sremote.adapters.set(
          {
            play() {
              ytPlayer.playVideo();
            },
            pause() {
              ytPlayer.pauseVideo();
            },
            toggle() {
              ytPlayer.getPlayerState() === 1 ? ytPlayer.pauseVideo() : ytPlayer.playVideo();
            },
            seekTo(seconds) {
              ytPlayer.seekTo(seconds, true);
            },
            setVolume(vol) {
              ytPlayer.setVolume(vol * 100);
            },
            setMuted(muted) {
              muted ? ytPlayer.mute() : ytPlayer.unMute();
            },
            getCurrentTime() {
              return ytPlayer.getCurrentTime();
            },
            getDuration() {
              return ytPlayer.getDuration();
            },
            paused() {
              return ytPlayer.getPlayerState() !== 1;
            },
          },
          'youtube_player',
        );

        console.log('✅ YouTube SRemote Adapter Ready:', adapterId);
      },
    },
  });
}

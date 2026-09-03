// [cmt_peertube_adapter]
document.addEventListener('DOMContentLoaded', async () => {
  const iframe = document.getElementById('peertube-player');
  const player = new window.PeerTubePlayer(iframe);

  await player.ready;

  // [cmt_register_adapter]
  window.sremote?.adapters?.set({
    play: () => player.play(),
    pause: () => player.pause(),
    seek: async offset => {
      const pos = (await player.getCurrentPosition()) || 0;
      player.seek(pos + offset);
    },
    seekTo: sec => player.seek(sec),
    volume: vol => player.setVolume(vol),
    setPlaybackRate: rate => player.setPlaybackRate(rate),
  });

  // [cmt_peertube_sync]
  player.addEventListener('playbackStatusChange', status => {
    if (status === 'playing') window.sremote?.emit?.('play');
    if (status === 'paused') window.sremote?.emit?.('pause');
    if (status === 'ended') window.sremote?.emit?.('ended');
  });

  player.addEventListener('playbackStatusUpdate', data => {
    window.sremote?.emit?.('timeupdate', { state: { currentTime: data.position, duration: data.duration } });
  });
});

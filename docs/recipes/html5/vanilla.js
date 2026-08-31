// [cmt_html5_connect]
document.addEventListener('DOMContentLoaded', () => {
  // [cmt_html5_handshake_send]
  window.sremote.hello();

  // [cmt_html5_handshake_listen]
  window.sremote.on('accept', data => {
    console.log('✅ HTML5 Media connected:', data.instanceId);
  });

  // [cmt_html5_track_progress]
  window.sremote.on('timeupdate', data => {
    console.log('Progress:', data.state.currentTime, '/', data.state.duration);
  });
});

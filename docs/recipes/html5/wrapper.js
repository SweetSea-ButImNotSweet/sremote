import { sremote } from '@sremote/wrapper';

// [cmt_html5_connect]
document.addEventListener('DOMContentLoaded', async () => {
  await sremote.ready();

  // [cmt_html5_handshake_send]
  sremote.hello();

  // [cmt_html5_handshake_listen]
  sremote.on('accept', data => {
    console.log('✅ HTML5 Media connected via Wrapper:', data.instanceId);
  });

  // [cmt_html5_track_progress]
  sremote.on('timeupdate', data => {
    console.log('Progress:', data.state.currentTime, '/', data.state.duration);
  });
});

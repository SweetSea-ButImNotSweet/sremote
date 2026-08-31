// [cmt_bilibili_no_adapter]
document.addEventListener('DOMContentLoaded', () => {
  // [cmt_bilibili_handshake]
  window.sremote.hello();

  window.sremote.on('accept', data => {
    console.log('✅ Connected to Bilibili media:', data.instanceId);
  });
});

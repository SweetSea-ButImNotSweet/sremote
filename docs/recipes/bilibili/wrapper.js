import { sremote } from '@sremote/wrapper';

// [cmt_bilibili_no_adapter]
document.addEventListener('DOMContentLoaded', async () => {
  await sremote.ready();

  // [cmt_bilibili_handshake]
  sremote.hello();

  sremote.on('accept', data => {
    console.log('✅ Connected to Bilibili media via Wrapper:', data.instanceId);
  });
});

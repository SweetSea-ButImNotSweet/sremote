import { sremote } from '@sremote/sdk';

// [cmt_rumble_no_adapter]
document.addEventListener('DOMContentLoaded', async () => {
  await sremote.ready();
  sremote.hello();

  sremote.on('accept', data => {
    console.log('✅ Connected to Rumble media via SRemote:', data.instanceId);
  });
});

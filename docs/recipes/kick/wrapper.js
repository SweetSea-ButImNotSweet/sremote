import { sremote } from '@sremote/sdk';

// [cmt_kick_no_adapter]
document.addEventListener('DOMContentLoaded', async () => {
  await sremote.ready();
  sremote.hello();

  sremote.on('accept', data => {
    console.log('✅ Connected to Kick stream via SRemote:', data.instanceId);
  });
});

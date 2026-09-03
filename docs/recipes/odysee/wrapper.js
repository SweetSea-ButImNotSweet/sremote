import { sremote } from '@sremote/wrapper';

// [cmt_odysee_no_adapter]
document.addEventListener('DOMContentLoaded', async () => {
  await sremote.ready();
  sremote.hello();

  sremote.on('accept', data => {
    console.log('✅ Connected to Odysee media via SRemote:', data.instanceId);
  });
});

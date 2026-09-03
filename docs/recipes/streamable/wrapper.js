import { sremote } from '@sremote/wrapper';

// [cmt_streamable_no_adapter]
document.addEventListener('DOMContentLoaded', async () => {
  await sremote.ready();
  sremote.hello();

  sremote.on('accept', data => {
    console.log('✅ Connected to Streamable video via SRemote:', data.instanceId);
  });
});

import { sremote } from '@sremote/wrapper';

// [cmt_facebook_test]
document.addEventListener('DOMContentLoaded', async () => {
  await sremote.ready();
  sremote.hello();
});

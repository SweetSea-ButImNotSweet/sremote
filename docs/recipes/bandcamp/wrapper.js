import { sremote } from '@sremote/wrapper';

// [cmt_bandcamp_adapter]
document.addEventListener('DOMContentLoaded', async () => {
  const iframe = document.getElementById('bandcamp-frame');

  // [cmt_register_adapter_wrapper]
  sremote.adapters.register({
    load: options => {
      const albumId = options?.albumId || options?.album || options;
      if (iframe && albumId) {
        iframe.src = `https://bandcamp.com/EmbeddedPlayer/album=${albumId}/size=large/bgcol=333333/linkcol=0f91ff/artwork=small/transparent=true/`;
      }
    },
    getState: () => ({ iframe }),
  });
});

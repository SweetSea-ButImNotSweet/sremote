// [cmt_bandcamp_adapter]
document.addEventListener('DOMContentLoaded', () => {
  const iframe = document.getElementById('bandcamp-frame');

  // [cmt_register_adapter]
  window.sremote?.adapters?.set({
    load: options => {
      const albumId = options?.albumId || options?.album || options;
      if (iframe && albumId) {
        iframe.src = `https://bandcamp.com/EmbeddedPlayer/album=${albumId}/size=large/bgcol=333333/linkcol=0f91ff/artwork=small/transparent=true/`;
      }
    },
    getState: () => ({ iframe }),
  });
});

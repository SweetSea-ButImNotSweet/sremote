// [cmt_streamable_no_adapter]
document.addEventListener('DOMContentLoaded', () => {
  window.sremote?.hello?.();

  window.sremote?.on?.('accept', data => {
    console.log('✅ Connected to Streamable video via Vanilla SRemote:', data.instanceId);
  });
});

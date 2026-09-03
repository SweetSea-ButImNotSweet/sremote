// [cmt_odysee_no_adapter]
document.addEventListener('DOMContentLoaded', () => {
  window.sremote?.hello?.();

  window.sremote?.on?.('accept', data => {
    console.log('✅ Connected to Odysee media via Vanilla SRemote:', data.instanceId);
  });
});

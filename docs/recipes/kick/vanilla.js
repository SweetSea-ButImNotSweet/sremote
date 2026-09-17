// [cmt_kick_no_adapter]
document.addEventListener('DOMContentLoaded', () => {
  window.sremote?.hello?.();

  window.sremote?.on?.('accept', data => {
    console.log('✅ Connected to Kick stream via Vanilla SRemote:', data.instanceId);
  });
});

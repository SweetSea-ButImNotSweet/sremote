// [cmt_rumble_no_adapter]
document.addEventListener('DOMContentLoaded', () => {
  window.sremote?.hello?.();

  window.sremote?.on?.('accept', data => {
    console.log('✅ Connected to Rumble media via Vanilla SRemote:', data.instanceId);
  });
});

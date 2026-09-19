export function createIframeDebugApi({
  activeMediaGetter,
  resolveActiveMedia,
  findAllMedia,
  getVideoState,
  getIframeCapabilities,
  mockMediaSessionInstance,
  originalMediaSrcBeforeDebugGetter,
  originalMediaSrcBeforeDebugSetter,
}) {
  return {
    get activeMedia() {
      resolveActiveMedia();
      return activeMediaGetter();
    },
    get capabilities() {
      resolveActiveMedia();
      return typeof getIframeCapabilities === 'function' ? getIframeCapabilities(null, activeMediaGetter(), resolveActiveMedia) : null;
    },
    getCapabilities() {
      resolveActiveMedia();
      return typeof getIframeCapabilities === 'function' ? getIframeCapabilities(null, activeMediaGetter(), resolveActiveMedia) : null;
    },
    inspect() {
      resolveActiveMedia();
      const target = activeMediaGetter() || findAllMedia()[0];
      if (target) {
        console.log('%c[sremote.debug.inspect] Active Media Element:', 'color: #10b981; font-weight: bold;', target);
        if (typeof inspect === 'function') {
          inspect(target);
        }
      } else {
        console.warn('[sremote.debug] No active media element found to inspect.');
      }
      return target;
    },
    getAllMedia() {
      return findAllMedia();
    },
    getState() {
      resolveActiveMedia();
      return getVideoState();
    },
    getMediaSession() {
      const ms = navigator.mediaSession || mockMediaSessionInstance;
      return { supported: !navigator.mediaSession, playbackState: ms?.playbackState, metadata: ms?.metadata, handlers: Array.from(mockMediaSessionInstance._handlers.keys()) };
    },
    dump(index = 0) {
      const all = findAllMedia();
      const target = all[index] || activeMediaGetter();
      console.log(`%c[sremote.debug] Frame Media Dump (Element #${index}):`, 'color: #10b981; font-weight: bold;');
      if (target) {
        console.table({
          tagName: target.tagName,
          src: target.currentSrc || target.src,
          currentTime: target.currentTime,
          duration: target.duration,
          paused: target.paused,
          muted: target.muted,
          volume: target.volume,
          playbackRate: target.playbackRate,
          readyState: target.readyState,
          networkState: target.networkState,
        });
      } else {
        console.log('No media element found in DOM or pool.');
      }
      console.log('MediaSession Details:', this.getMediaSession());
    },
    setSource(sourceUrlOrBlob, index = 0) {
      const all = findAllMedia();
      const target = all[index] || activeMediaGetter();
      if (!target) return console.warn('[sremote.debug] No media element to set source');
      if (!originalMediaSrcBeforeDebugGetter()) originalMediaSrcBeforeDebugSetter(target.currentSrc || target.src);
      const url = typeof sourceUrlOrBlob === 'string' ? sourceUrlOrBlob : URL.createObjectURL(sourceUrlOrBlob);
      target.src = url;
      target.load();
      target.play().catch(e => console.warn('[sremote.debug] Autoplay prevented:', e));
    },
    restoreOriginal(index = 0) {
      const all = findAllMedia();
      const target = all[index] || activeMediaGetter();
      const originalSrc = originalMediaSrcBeforeDebugGetter();
      if (target && originalSrc) {
        target.src = originalSrc;
        target.load();
        target.play().catch(() => {});
        originalMediaSrcBeforeDebugSetter(null);
        console.log('[sremote.debug] Restored original source:', target.src);
      }
    },
  };
}

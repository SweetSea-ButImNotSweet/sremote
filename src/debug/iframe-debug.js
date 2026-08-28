import { SRemoteDebugUtils } from './audio-generator.js';

export function createIframeDebugApi({
  activeMediaGetter,
  resolveActiveMedia,
  findAllMedia,
  getVideoState,
  mockMediaSessionInstance,
  IframeStyleEngine,
  originalMediaSrcBeforeDebugGetter,
  originalMediaSrcBeforeDebugSetter,
}) {
  return {
    get activeMedia() {
      resolveActiveMedia();
      return activeMediaGetter();
    },
    inspect() {
      resolveActiveMedia();
      const target = activeMediaGetter() || findAllMedia()[0];
      if (target) {
        console.log('%c[sremote_debug.inspect] Active Media Element:', 'color: #10b981; font-weight: bold;', target);
        if (typeof inspect === 'function') {
          inspect(target);
        }
      } else {
        console.warn('[sremote_debug] No active media element found to inspect.');
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
      return {
        supported: !navigator.mediaSession,
        playbackState: ms?.playbackState,
        metadata: ms?.metadata,
        handlers: Array.from(mockMediaSessionInstance._handlers.keys()),
      };
    },
    dump(index = 0) {
      const all = findAllMedia();
      const target = all[index] || activeMediaGetter();
      console.log(`%c[sremote_debug] Frame Media Dump (Element #${index}):`, 'color: #10b981; font-weight: bold;');
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
    setSource(url, index = 0) {
      const all = findAllMedia();
      const target = all[index] || activeMediaGetter();
      if (!target) return console.warn('[sremote_debug] No media element to set source');
      if (!originalMediaSrcBeforeDebugGetter()) originalMediaSrcBeforeDebugSetter(target.currentSrc || target.src);
      target.src = url;
      target.load();
      target.play().catch(e => console.warn('[sremote_debug] Autoplay prevented:', e));
    },
    setBlob(blobOrFile, index = 0) {
      const url = typeof blobOrFile === 'string' ? blobOrFile : URL.createObjectURL(blobOrFile);
      this.setSource(url, index);
    },
    playTone(freq = 440, duration = 3, index = 0) {
      const blob = SRemoteDebugUtils.createToneBlob(freq, duration);
      this.setBlob(blob, index);
    },
    playSilent(duration = 5, index = 0) {
      const blob = SRemoteDebugUtils.createSilentBlob(duration);
      this.setBlob(blob, index);
    },
    playNoise(duration = 3, index = 0) {
      const blob = SRemoteDebugUtils.createNoiseBlob(duration);
      this.setBlob(blob, index);
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
        console.log('[sremote_debug] Restored original source:', target.src);
      }
    },
    setCSS(css) {
      IframeStyleEngine.setDynamicCSS(css);
      return IframeStyleEngine.getDynamicCSS();
    },
    getCSS() {
      return IframeStyleEngine.getDynamicCSS();
    },
    removeCSS() {
      IframeStyleEngine.removeDynamicCSS();
    },
  };
}

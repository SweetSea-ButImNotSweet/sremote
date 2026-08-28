import { SRemoteDebugUtils } from '../debug/audio-generator.js';

export function createParentDebugApi({ instances, currentActiveInstanceIdGetter, assignedIframeIdMap, iframeToAssignedIdMap, dispatchCommand, exportedApi }) {
  return Object.freeze({
    // 1. Quét toàn bộ iframe trong trang và trả về báo cáo
    scan: async () => {
      const iframes = Array.from(document.querySelectorAll('iframe'));
      const report = [];
      for (let i = 0; i < iframes.length; i++) {
        const ifr = iframes[i];
        const assignedId = ifr.getAttribute('data-sremote-id') || iframeToAssignedIdMap.get(ifr) || `unregistered_#${i + 1}`;
        const inst = instances.get(assignedId);
        let state = inst?.state || null;
        let isConnected = !!inst?.port;
        let mediaType = inst?.mediaType || null;

        report.push({
          index: i,
          instanceId: assignedId,
          src: ifr.src || '(about:blank or dynamic)',
          connected: isConnected,
          mediaType: mediaType || 'unknown',
          hasActiveMedia: !!state,
          paused: state?.paused ?? 'unknown',
          currentTime: state?.currentTime ? Number(state.currentTime).toFixed(2) : 0,
          duration: state?.duration ? Number(state.duration).toFixed(2) : 0,
        });
      }
      console.log('%c[sremote.debug] Frame & Media Scan Result:', 'color: #38bdf8; font-weight: bold;');
      console.table(report);
      return report;
    },

    // 2. Trả về Element để inspect trực tiếp trong DevTools
    getMediaElement: (instanceId = null) => {
      const targetId = instanceId || currentActiveInstanceIdGetter() || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
      if (!targetId) {
        console.warn('[sremote.debug] No target instance ID found.');
        return null;
      }
      const inst = instances.get(targetId);
      const iframeEl = inst?.iframeEl || assignedIframeIdMap.get(targetId);
      if (!iframeEl) {
        console.warn(`[sremote.debug] Iframe element not found in Parent DOM for instance '${targetId}'.`);
        return null;
      }

      // Same-Origin access attempt to get inside <video>/<audio> directly
      try {
        if (iframeEl.contentDocument) {
          const innerMedia = iframeEl.contentDocument.querySelector('video, audio');
          if (innerMedia) return innerMedia;
        }
      } catch {}

      return iframeEl;
    },

    inspect: (instanceId = null) => {
      const el = exportedApi.debug.getMediaElement(instanceId);
      if (el) {
        console.log('%c[sremote.debug.inspect] Target Element:', 'color: #10b981; font-weight: bold;', el);
        if (typeof inspect === 'function') {
          inspect(el);
        }
      }
      return el;
    },

    // 3. Đọc chi tiết State và MediaSession Metadata của frame
    getState: async (instanceId = null) => {
      const targetId = instanceId || currentActiveInstanceIdGetter() || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
      if (!targetId) {
        console.warn('[sremote.debug] No target instance found.');
        return null;
      }
      try {
        const res = await exportedApi.call('debug_getState', {}, targetId);
        return res?.data || res;
      } catch (err) {
        const inst = instances.get(targetId);
        return { instanceId: targetId, state: inst?.state || null, mediaType: inst?.mediaType || null, error: String(err) };
      }
    },

    dump: async (instanceId = null) => {
      const targetId = instanceId || currentActiveInstanceIdGetter() || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
      const data = await exportedApi.debug.getState(targetId);
      console.log(`%c[sremote.debug] Detailed Dump for '${targetId}':`, 'color: #10b981; font-weight: bold;');
      if (data?.mediaElements) {
        console.log('Media Elements:');
        console.table(data.mediaElements);
      }
      if (data?.mediaSession) {
        console.log('MediaSession:', data.mediaSession);
      }
      if (data?.state) {
        console.log('Active Media State:', data.state);
      }
      return data;
    },

    // Thao túng trực tiếp (Bypass Passkey & Permission)
    play: (instanceId = null) => dispatchCommand('play', undefined, instanceId, '__DEBUG_BYPASS__'),
    pause: (instanceId = null) => dispatchCommand('pause', undefined, instanceId, '__DEBUG_BYPASS__'),
    toggle: (instanceId = null) => dispatchCommand('toggle', undefined, instanceId, '__DEBUG_BYPASS__'),
    seek: (offset, instanceId = null) => dispatchCommand('seek', offset, instanceId, '__DEBUG_BYPASS__'),
    seekTo: (time, instanceId = null) => dispatchCommand('currentTime', time, instanceId, '__DEBUG_BYPASS__'),
    setVolume: (vol, instanceId = null) => dispatchCommand('volume', vol, instanceId, '__DEBUG_BYPASS__'),
    setMute: (muted, instanceId = null) => dispatchCommand('muted', muted, instanceId, '__DEBUG_BYPASS__'),
    setRate: (rate, instanceId = null) => dispatchCommand('playbackRate', rate, instanceId, '__DEBUG_BYPASS__'),
    toggleLoop: (instanceId = null) => exportedApi.call('debug_toggleLoop', {}, instanceId),

    // Thay thế Source / Inject Blob / Test Audio Generator
    setSource: async (sourceUrlOrBlob, instanceId = null) => {
      let url = sourceUrlOrBlob;
      if (sourceUrlOrBlob instanceof Blob || sourceUrlOrBlob instanceof File) {
        url = URL.createObjectURL(sourceUrlOrBlob);
      }
      return exportedApi.call('debug_setSource', { src: url }, instanceId);
    },

    injectTestTone: async (freq = 440, duration = 3, instanceId = null) => {
      const blob = SRemoteDebugUtils.createToneBlob(freq, duration);
      const url = URL.createObjectURL(blob);
      console.log(`%c[sremote.debug] Generated Tone ${freq}Hz (${duration}s) -> ${url}`, 'color: #a855f7; font-weight: bold;');
      return exportedApi.call('debug_setSource', { src: url, isBlob: true, title: `Test Tone (${freq}Hz)` }, instanceId);
    },

    injectSilentTrack: async (duration = 5, instanceId = null) => {
      const blob = SRemoteDebugUtils.createSilentBlob(duration);
      const url = URL.createObjectURL(blob);
      console.log(`%c[sremote.debug] Generated Silent Track (${duration}s) -> ${url}`, 'color: #a855f7; font-weight: bold;');
      return exportedApi.call('debug_setSource', { src: url, isBlob: true, title: `Silent Track (${duration}s)` }, instanceId);
    },

    injectWhiteNoise: async (duration = 3, instanceId = null) => {
      const blob = SRemoteDebugUtils.createNoiseBlob(duration);
      const url = URL.createObjectURL(blob);
      console.log(`%c[sremote.debug] Generated White Noise (${duration}s) -> ${url}`, 'color: #a855f7; font-weight: bold;');
      return exportedApi.call('debug_setSource', { src: url, isBlob: true, title: `White Noise (${duration}s)` }, instanceId);
    },

    injectSampleVideo: async (instanceId = null) =>
      exportedApi.call('debug_setSource', { src: SRemoteDebugUtils.SAMPLE_VIDEO_URL, title: 'Mozilla Flower Sample (MP4)' }, instanceId),

    restoreOriginal: async (instanceId = null) => exportedApi.call('debug_restoreOriginal', {}, instanceId),

    simulateStall: async (instanceId = null) => exportedApi.call('debug_simulateStall', {}, instanceId),
  });
}

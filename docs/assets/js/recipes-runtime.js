/**
 * SRemote Recipes Runtime: Powered directly by @sremote/ready2use & @sremote/wrapper
 */

// Active mounted player handle { remote, player, element, iframe, destroy, instanceId }
let activeMountedSession = null;
let liveTimeSyncTimer = null;
let currentMountToken = 0;

function cleanupPlatformRuntime() {
  if (liveTimeSyncTimer) {
    clearInterval(liveTimeSyncTimer);
    liveTimeSyncTimer = null;
  }
  if (activeMountedSession) {
    try {
      if (typeof activeMountedSession.destroy === 'function') {
        activeMountedSession.destroy();
      }
    } catch (e) {
      console.warn('[RecipesRuntime] Error destroying previous session:', e);
    }
    activeMountedSession = null;
  }
}

// SRemote Client from SDK Wrapper (or fallback to window.sremote)
const getSRemote = () => (window.SRemoteWrapper ? window.SRemoteWrapper.sremote : window.sremote);

// Provider configuration presets for showcase
const providerPresets = {
  youtube: { videoId: 'dQw4w9WgXcQ', playerVars: { autoplay: 1, mute: 1 } },
  vimeo: { videoId: '76979871', autoplay: true, muted: true },
  soundcloud: { trackUrl: 'https://api.soundcloud.com/tracks/293', auto_play: true, showTeaser: false },
  dailymotion: { video: 'x7tgad0', autoplay: true, mute: true },
  spotify: { uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT', compact: true },
  twitch: { channel: 'the8bitdrummer', autoplay: true, muted: true, parent: typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost' },
  mixcloud: { feed: '/spartacus/party-time/', autoplay: true, mini: true, hideCover: true },
  tiktok: { videoId: '6718335390845095173', autoplay: true },
  niconico: { watchId: 'so46693656', autoplay: true },
  bilibili: { bvid: 'BV1xx411c7mD', autoplay: true },
  facebook: { videoUrl: 'https://www.facebook.com/facebook/videos/10153231379946729/', showText: false },
  twitter: { tweetId: '20', theme: 'dark' },
  peertube: { videoUrl: 'https://peertube.tv/videos/watch/78e0e6aa-d575-4752-9ef8-e047c870233d' },
  rumble: { video: 'v397yeg' },
  kick: { channel: 'xqc' },
  streamable: { shortcode: 'moo' },
  odysee: { video: '@lbry:3f/lbry-in-a-nutshell:1' },
  bandcamp: { albumId: '2747195448' },
};

/**
 * Mount a platform player directly into the preview container using @sremote/ready2use
 * @param {string} platformId
 * @param {HTMLElement|string} mountContainer
 */
async function mountPlatform(platformId, mountContainer = '#player-mount-point') {
  const mountToken = ++currentMountToken;
  cleanupPlatformRuntime();
  const container = typeof mountContainer === 'string' ? document.querySelector(mountContainer) : mountContainer;
  if (!container) return null;
  container.innerHTML = '';

  const ready2use = window.SRemoteReady2Use || window.ready2use;
  const sremoteClient = getSRemote();

  // 1. Nếu có Provider tương ứng trong @sremote/ready2use
  if (ready2use && ready2use[platformId] && typeof ready2use[platformId].mount === 'function') {
    try {
      console.log(`🚀 [Ready2Use] Mounting provider '${platformId}' via @sremote/ready2use...`);
      const options = { ...(providerPresets[platformId] || {}), sremote: sremoteClient };
      const session = await ready2use[platformId].mount(container, options);

      // Nếu người dùng đã chuyển sang platform khác trong lúc chờ mount async
      if (mountToken !== currentMountToken) {
        try {
          session.destroy?.();
        } catch {}
        return null;
      }

      activeMountedSession = session;

      // Đồng bộ tiến độ phát từ adapter ra slider
      if (session.adapter) {
        const origEmit = typeof session.adapter.emit === 'function' ? session.adapter.emit.bind(session.adapter) : null;
        session.adapter.emit = (event, payload) => {
          if (origEmit) {
            try {
              origEmit(event, payload);
            } catch {}
          }
          if (sremoteClient && typeof sremoteClient.emit === 'function') {
            sremoteClient.emit(event, payload);
          }
        };
      }

      // Khởi động live polling đồng bộ seekbar
      startLiveProgressSync(session);

      // Kích hoạt sremote.hello() để Userscript trong iframe (nếu có) thực hiện Handshake & cấp quyền MessagePort
      if (sremoteClient && typeof sremoteClient.hello === 'function') {
        try {
          const iframeEl = session.iframe || (session.element?.tagName === 'IFRAME' ? session.element : session.element?.querySelector('iframe'));
          if (iframeEl && iframeEl.contentWindow) {
            sremoteClient.hello({ target: iframeEl.contentWindow });
          } else {
            sremoteClient.hello();
          }
        } catch {
          sremoteClient.hello?.();
        }
      }

      console.log(`✅ [Ready2Use] Successfully mounted '${platformId}' (Instance ID: ${session.instanceId})`);
      return session;
    } catch (err) {
      console.warn(`[Ready2Use] Failed to mount via @sremote/ready2use, falling back:`, err);
    }
  }

  // 2. Fallback cho HTML5 hoặc iframe native
  if (platformId === 'html5' || !ready2use || !ready2use[platformId]) {
    console.log(`📺 [Native] Loading raw embed frame for '${platformId}'...`);
    const iframe = document.createElement('iframe');
    iframe.id = `raw-player-frame-${platformId}`;
    iframe.src = platformId === 'html5' ? 'demo-frames/sample-player.html' : 'about:blank';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    // Tự động gọi sremote.hello() khi iframe nạp xong để bắt tay (handshake)
    iframe.addEventListener('load', () => {
      if (sremoteClient && typeof sremoteClient.hello === 'function') {
        console.log(`🔄 [Native] Iframe loaded, calling sremote.hello() for '${platformId}'...`);
        try {
          sremoteClient.hello({ target: iframe.contentWindow });
        } catch {
          sremoteClient.hello();
        }
      }
    });

    container.appendChild(iframe);

    activeMountedSession = {
      element: iframe,
      iframe,
      remote: sremoteClient,
      destroy: () => {
        try {
          container.innerHTML = '';
        } catch {}
      },
    };
    return activeMountedSession;
  }
}

function startLiveProgressSync(session) {
  if (liveTimeSyncTimer) clearInterval(liveTimeSyncTimer);
  liveTimeSyncTimer = setInterval(() => {
    if (!activeMountedSession || !session.adapter) return;
    try {
      const adapter = session.adapter;
      const cur = typeof adapter.getCurrentTime === 'function' ? adapter.getCurrentTime() : 0;
      const dur = typeof adapter.getDuration === 'function' ? adapter.getDuration() : 0;
      const paused = typeof adapter.paused === 'function' ? adapter.paused() : Boolean(adapter.paused);

      if (dur > 0 && typeof adapter.emit === 'function') {
        adapter.emit('timeupdate', { state: { paused, currentTime: cur, duration: dur } });
      }
    } catch {}
  }, 500);
}

// Global hook
if (typeof window !== 'undefined') {
  window.RECIPES_RUNTIME = { cleanupPlatformRuntime, mountPlatform, getSRemote, providerPresets };
}

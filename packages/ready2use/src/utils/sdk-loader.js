/**
 * Dynamic script loader with singleton promise caching
 */
const loadedScripts = new Map();

export function loadScript(src) {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window is not available'));
  if (loadedScripts.has(src)) return loadedScripts.get(src);

  const promise = new Promise((resolve, reject) => {
    // Check if script tag already exists in DOM
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', e => reject(e), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = err => {
      loadedScripts.delete(src);
      reject(err);
    };
    document.head.appendChild(script);
  });

  loadedScripts.set(src, promise);
  return promise;
}

let ytSdkPromise = null;
/**
 * Loads the YouTube IFrame Player API and resolves when window.YT and window.YT.Player are ready.
 * @returns {Promise<typeof window.YT>}
 */
export function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window is not available'));
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (ytSdkPromise) return ytSdkPromise;

  ytSdkPromise = new Promise((resolve, reject) => {
    const prevOnYouTubeIframeAPIReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevOnYouTubeIframeAPIReady === 'function') {
        try {
          prevOnYouTubeIframeAPIReady();
        } catch {}
      }
      resolve(window.YT);
    };

    loadScript('https://www.youtube.com/iframe_api').catch(err => {
      ytSdkPromise = null;
      reject(err);
    });
  });

  return ytSdkPromise;
}

let vimeoSdkPromise = null;
/**
 * Loads the Vimeo Player SDK and resolves when window.Vimeo is ready.
 * @returns {Promise<typeof window.Vimeo>}
 */
export function loadVimeoSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window is not available'));
  if (window.Vimeo && window.Vimeo.Player) {
    return Promise.resolve(window.Vimeo);
  }

  if (vimeoSdkPromise) return vimeoSdkPromise;

  vimeoSdkPromise = loadScript('https://player.vimeo.com/api/player.js')
    .then(() => window.Vimeo)
    .catch(err => {
      vimeoSdkPromise = null;
      throw err;
    });

  return vimeoSdkPromise;
}

let scSdkPromise = null;
/**
 * Loads the SoundCloud Widget API and resolves when window.SC is ready.
 * @returns {Promise<typeof window.SC>}
 */
export function loadSoundCloudSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window is not available'));
  if (window.SC && window.SC.Widget) {
    return Promise.resolve(window.SC);
  }

  if (scSdkPromise) return scSdkPromise;

  scSdkPromise = loadScript('https://w.soundcloud.com/player/api.js')
    .then(() => window.SC)
    .catch(err => {
      scSdkPromise = null;
      throw err;
    });

  return scSdkPromise;
}

let dailymotionSdkPromise = null;
/**
 * Loads the Dailymotion Player SDK and resolves when window.dailymotion is ready.
 * @returns {Promise<typeof window.dailymotion>}
 */
export function loadDailymotionSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window is not available'));
  if (window.dailymotion && window.dailymotion.createPlayer) {
    return Promise.resolve(window.dailymotion);
  }

  if (dailymotionSdkPromise) return dailymotionSdkPromise;

  dailymotionSdkPromise = loadScript('https://player.dailymotion.com/api/player.js')
    .then(() => window.dailymotion)
    .catch(err => {
      dailymotionSdkPromise = null;
      throw err;
    });

  return dailymotionSdkPromise;
}

let twitchSdkPromise = null;
/**
 * Loads the Twitch Interactive Player SDK and resolves when window.Twitch is ready.
 * @returns {Promise<typeof window.Twitch>}
 */
export function loadTwitchSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window is not available'));
  if (window.Twitch && window.Twitch.Player) {
    return Promise.resolve(window.Twitch);
  }

  if (twitchSdkPromise) return twitchSdkPromise;

  twitchSdkPromise = loadScript('https://player.twitch.tv/js/embed/v1.js')
    .then(() => window.Twitch)
    .catch(err => {
      twitchSdkPromise = null;
      throw err;
    });

  return twitchSdkPromise;
}

let mixcloudSdkPromise = null;
/**
 * Loads the Mixcloud Widget API and resolves when window.Mixcloud is ready.
 * @returns {Promise<typeof window.Mixcloud>}
 */
export function loadMixcloudSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window is not available'));
  if (window.Mixcloud && window.Mixcloud.PlayerWidget) {
    return Promise.resolve(window.Mixcloud);
  }

  if (mixcloudSdkPromise) return mixcloudSdkPromise;

  mixcloudSdkPromise = loadScript('https://widget.mixcloud.com/media/js/widgetApi.js')
    .then(() => window.Mixcloud)
    .catch(err => {
      mixcloudSdkPromise = null;
      throw err;
    });

  return mixcloudSdkPromise;
}

let spotifySdkPromise = null;
/**
 * Loads the Spotify IFrame API SDK and resolves when window.onSpotifyIframeApiReady fires with IFrameAPI.
 * @returns {Promise<any>}
 */
export function loadSpotifySdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window is not available'));
  if (window.SpotifyIframeApi) {
    return Promise.resolve(window.SpotifyIframeApi);
  }

  if (spotifySdkPromise) return spotifySdkPromise;

  spotifySdkPromise = new Promise((resolve, reject) => {
    const prevReady = window.onSpotifyIframeApiReady;

    window.onSpotifyIframeApiReady = IFrameAPI => {
      window.SpotifyIframeApi = IFrameAPI;
      if (typeof prevReady === 'function') {
        try {
          prevReady(IFrameAPI);
        } catch {}
      }
      resolve(IFrameAPI);
    };

    loadScript('https://open.spotify.com/embed/iframe-api/v1').catch(err => {
      spotifySdkPromise = null;
      reject(err);
    });
  });

  return spotifySdkPromise;
}

let facebookSdkPromise = null;
/**
 * Loads the Facebook JavaScript SDK and resolves when window.FB is ready.
 * @returns {Promise<typeof window.FB>}
 */
export function loadFacebookSdk(appId = null) {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window is not available'));
  if (window.FB) {
    return Promise.resolve(window.FB);
  }

  if (facebookSdkPromise) return facebookSdkPromise;

  facebookSdkPromise = new Promise((resolve, reject) => {
    const prevFbAsyncInit = window.fbAsyncInit;

    window.fbAsyncInit = () => {
      if (window.FB && appId) {
        window.FB.init({ appId, xfbml: true, version: 'v18.0' });
      }
      if (typeof prevFbAsyncInit === 'function') {
        try {
          prevFbAsyncInit();
        } catch {}
      }
      resolve(window.FB);
    };

    loadScript('https://connect.facebook.net/en_US/sdk.js').catch(err => {
      facebookSdkPromise = null;
      reject(err);
    });
  });

  return facebookSdkPromise;
}

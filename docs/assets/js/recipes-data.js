/**
 * SRemote Recipes Data: Platforms list, code snippets, notes & translations
 */
const categories = [
  {
    id: 'api_html5',
    titleVi: '🟢 Có API SDK + Dùng HTML5 chuẩn',
    titleEn: '🟢 Official API SDK + Standard HTML5',
  },
  {
    id: 'api_no_html5',
    titleVi: '🟡 Có API SDK (Không dùng HTML5)',
    titleEn: '🟡 Official API SDK (Non-HTML5 / DRM)',
  },
  {
    id: 'external_postmessage_html5',
    titleVi: '🔵 API xuất ngoài không chính thức + HTML5',
    titleEn: '🔵 Unofficial / PostMessage API + HTML5',
  },
  {
    id: 'no_api_html5',
    titleVi: '⚪ Không có API + Dùng HTML5 chuẩn',
    titleEn: '⚪ No API Needed + Standard HTML5 (Zero-Config)',
  },
];

const platforms = [
  // Danh mục 1: Có API + dùng HTML5 chuẩn
  {
    id: 'youtube',
    category: 'api_html5',
    name: 'YouTube Iframe API',
    icon: '▶️',
    tag: 'SDK Adapter',
    mode: 'Adapter Mode',
    previewEmbed:
      '<iframe id="yt-player-frame" src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?enablejsapi=1&autoplay=1&mute=1&origin=' +
      encodeURIComponent(window.location.origin) +
      '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>',
    noteVi:
      '<strong>Lưu ý với YouTube:</strong> Thêm tham số <code>enablejsapi=1&autoplay=1&mute=1</code> vào URL embed và nhúng script <code>https://www.youtube.com/iframe_api</code> để lắng nghe trạng thái player qua <code>sremote.useAdapter()</code>.',
    noteEn:
      '<strong>YouTube Note:</strong> Append <code>enablejsapi=1&autoplay=1&mute=1</code> to the embed URL and load <code>https://www.youtube.com/iframe_api</code> to bind player events via <code>sremote.useAdapter()</code>.',
    htmlCodeVi: `<!-- 1. Nạp iframe YouTube với autoplay, mute và enablejsapi=1 -->
<iframe
  id="my-youtube-frame"
  src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?enablejsapi=1&autoplay=1&mute=1"
  allow="autoplay; encrypted-media; picture-in-picture"
  allowfullscreen
  style="width: 100%; aspect-ratio: 16/9; border: none;">
</iframe>

<!-- 2. Nạp script YouTube Iframe API -->
<script src="https://www.youtube.com/iframe_api"><\/script>`,
    htmlCodeEn: `<!-- 1. Load YouTube iframe with autoplay, mute and enablejsapi=1 -->
<iframe
  id="my-youtube-frame"
  src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?enablejsapi=1&autoplay=1&mute=1"
  allow="autoplay; encrypted-media; picture-in-picture"
  allowfullscreen
  style="width: 100%; aspect-ratio: 16/9; border: none;">
</iframe>

<!-- 2. Load YouTube Iframe API script -->
<script src="https://www.youtube.com/iframe_api"><\/script>`,
    jsCodeVi: `// 3. Khởi tạo YT.Player và kết nối với SRemote Adapter
let ytPlayer;

function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('my-youtube-frame', {
    events: {
      onReady: (event) => {
        // Đăng ký adapter với SRemote
        const adapterId = window.sremote.useAdapter({
          play() { ytPlayer.playVideo(); },
          pause() { ytPlayer.pauseVideo(); },
          toggle() { ytPlayer.getPlayerState() === 1 ? ytPlayer.pauseVideo() : ytPlayer.playVideo(); },
          seekTo(seconds) { ytPlayer.seekTo(seconds, true); },
          setVolume(vol) { ytPlayer.setVolume(vol * 100); },
          setMuted(muted) { muted ? ytPlayer.mute() : ytPlayer.unMute(); },
          getCurrentTime() { return ytPlayer.getCurrentTime(); },
          getDuration() { return ytPlayer.getDuration(); },
          paused() { return ytPlayer.getPlayerState() !== 1; }
        }, 'youtube_player');

        console.log('✅ YouTube SRemote Adapter Ready:', adapterId);
      }
    }
  });
}`,
    jsCodeEn: `// 3. Initialize YT.Player and bind with SRemote Adapter
let ytPlayer;

function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('my-youtube-frame', {
    events: {
      onReady: (event) => {
        // Register adapter with SRemote
        const adapterId = window.sremote.useAdapter({
          play() { ytPlayer.playVideo(); },
          pause() { ytPlayer.pauseVideo(); },
          toggle() { ytPlayer.getPlayerState() === 1 ? ytPlayer.pauseVideo() : ytPlayer.playVideo(); },
          seekTo(seconds) { ytPlayer.seekTo(seconds, true); },
          setVolume(vol) { ytPlayer.setVolume(vol * 100); },
          setMuted(muted) { muted ? ytPlayer.mute() : ytPlayer.unMute(); },
          getCurrentTime() { return ytPlayer.getCurrentTime(); },
          getDuration() { return ytPlayer.getDuration(); },
          paused() { return ytPlayer.getPlayerState() !== 1; }
        }, 'youtube_player');

        console.log('✅ YouTube SRemote Adapter Ready:', adapterId);
      }
    }
  });
}`,
  },
  {
    id: 'soundcloud',
    category: 'api_html5',
    name: 'SoundCloud Widget',
    icon: '☁️',
    tag: 'Widget API',
    mode: 'Adapter Mode',
    previewEmbed:
      '<iframe id="sc-widget-frame" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/293&color=%23ff5500&auto_play=true&show_teaser=false" allow="autoplay"></iframe>',
    noteVi:
      '<strong>Lưu ý với SoundCloud:</strong> Thêm <code>auto_play=true</code> và sử dụng SoundCloud Widget API (<code>api.soundcloud.com/widget.js</code>) để điều khiển qua SRemote Adapter.',
    noteEn:
      '<strong>SoundCloud Note:</strong> Use <code>auto_play=true</code> and bind with SoundCloud Widget API (<code>api.soundcloud.com/widget.js</code>) wrapped inside an SRemote Custom Adapter.',
    htmlCodeVi: `<!-- 1. Iframe SoundCloud Widget với auto_play=true -->
<iframe
  id="sc-widget"
  src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/293&color=%23ff5500&auto_play=true"
  allow="autoplay"
  style="width: 100%; height: 166px; border: none;">
</iframe>

<!-- 2. SoundCloud Widget API Script -->
<script src="https://w.soundcloud.com/player/api.js"><\/script>`,
    htmlCodeEn: `<!-- 1. SoundCloud Widget Iframe with auto_play=true -->
<iframe
  id="sc-widget"
  src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/293&color=%23ff5500&auto_play=true"
  allow="autoplay"
  style="width: 100%; height: 166px; border: none;">
</iframe>

<!-- 2. SoundCloud Widget API Script -->
<script src="https://w.soundcloud.com/player/api.js"><\/script>`,
    jsCodeVi: `// 3. Khởi tạo SC.Widget và đăng ký SRemote Adapter
const widgetIframe = document.getElementById('sc-widget');
const widget = SC.Widget(widgetIframe);

widget.bind(SC.Widget.Events.READY, () => {
  // Đặt âm lượng khởi đầu (hoặc mute qua setVolume(0))
  widget.setVolume(0);

  let isPlaying = true;
  let duration = 0;
  let currentTime = 0;

  widget.getDuration((d) => { duration = d / 1000; });

  const adapter = {
    play() { widget.play(); isPlaying = true; },
    pause() { widget.pause(); isPlaying = false; },
    toggle() { widget.toggle(); isPlaying = !isPlaying; },
    seek(offset) {
      widget.getPosition((pos) => {
        const target = Math.max(0, pos + offset * 1000);
        widget.seekTo(target);
      });
    },
    seekTo(seconds) { widget.seekTo(seconds * 1000); },
    setVolume(vol) { widget.setVolume(vol * 100); },
    setMuted(muted) { widget.setVolume(muted ? 0 : 100); },
    getDuration() { return duration; },
    getCurrentTime() { return currentTime; },
    paused() { return !isPlaying; }
  };

  const adapterId = window.sremote.useAdapter(adapter, 'soundcloud_player');

  // Lắng nghe các sự kiện phát của SoundCloud và đồng bộ với SRemote
  widget.bind(SC.Widget.Events.PLAY, () => {
    isPlaying = true;
    adapter.emit('play', { state: { paused: false, currentTime, duration } });
  });

  widget.bind(SC.Widget.Events.PAUSE, () => {
    isPlaying = false;
    adapter.emit('pause', { state: { paused: true, currentTime, duration } });
  });

  widget.bind(SC.Widget.Events.PLAY_PROGRESS, (data) => {
    currentTime = (data.currentPosition || 0) / 1000;
    adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
  });

  widget.bind(SC.Widget.Events.SEEK, (data) => {
    currentTime = (data.currentPosition || 0) / 1000;
    adapter.emit('seeked', { state: { paused: !isPlaying, currentTime, duration } });
    adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
  });

  console.log('✅ SoundCloud Adapter registered:', adapterId);
});`,
    jsCodeEn: `// 3. Initialize SC.Widget and register SRemote Adapter
const widgetIframe = document.getElementById('sc-widget');
const widget = SC.Widget(widgetIframe);

widget.bind(SC.Widget.Events.READY, () => {
  // Set initial volume (or mute via setVolume(0))
  widget.setVolume(0);

  let isPlaying = true;
  let duration = 0;
  let currentTime = 0;

  widget.getDuration((d) => { duration = d / 1000; });

  const adapter = {
    play() { widget.play(); isPlaying = true; },
    pause() { widget.pause(); isPlaying = false; },
    toggle() { widget.toggle(); isPlaying = !isPlaying; },
    seek(offset) {
      widget.getPosition((pos) => {
        const target = Math.max(0, pos + offset * 1000);
        widget.seekTo(target);
      });
    },
    seekTo(seconds) { widget.seekTo(seconds * 1000); },
    setVolume(vol) { widget.setVolume(vol * 100); },
    setMuted(muted) { widget.setVolume(muted ? 0 : 100); },
    getDuration() { return duration; },
    getCurrentTime() { return currentTime; },
    paused() { return !isPlaying; }
  };

  const adapterId = window.sremote.useAdapter(adapter, 'soundcloud_player');

  // Listen to SoundCloud playback events and sync with SRemote
  widget.bind(SC.Widget.Events.PLAY, () => {
    isPlaying = true;
    adapter.emit('play', { state: { paused: false, currentTime, duration } });
  });

  widget.bind(SC.Widget.Events.PAUSE, () => {
    isPlaying = false;
    adapter.emit('pause', { state: { paused: true, currentTime, duration } });
  });

  widget.bind(SC.Widget.Events.PLAY_PROGRESS, (data) => {
    currentTime = (data.currentPosition || 0) / 1000;
    adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
  });

  widget.bind(SC.Widget.Events.SEEK, (data) => {
    currentTime = (data.currentPosition || 0) / 1000;
    adapter.emit('seeked', { state: { paused: !isPlaying, currentTime, duration } });
    adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
  });

  console.log('✅ SoundCloud Adapter registered:', adapterId);
});`,
  },
  {
    id: 'vimeo',
    category: 'api_html5',
    name: 'Vimeo Player SDK',
    icon: '🔷',
    tag: 'Player SDK',
    mode: 'Adapter Mode',
    previewEmbed:
      '<iframe id="vimeo-frame" src="https://player.vimeo.com/video/76979871?autoplay=1&muted=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="width: 100%; height: 100%; border: none;"></iframe>',
    noteVi: '<strong>Lưu ý với Vimeo:</strong> Thêm tham số <code>autoplay=1&muted=1</code> vào URL embed và nhúng thư viện <code>@vimeo/player</code> qua CDN.',
    noteEn: '<strong>Vimeo Note:</strong> Append <code>autoplay=1&muted=1</code> to embed URL and link via <code>@vimeo/player</code> SDK.',
    htmlCodeVi: `<!-- 1. Vimeo Embed Iframe với autoplay=1&muted=1 -->
<iframe
  id="vimeo-player"
  src="https://player.vimeo.com/video/76979871?autoplay=1&muted=1"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen
  style="width: 100%; aspect-ratio: 16/9; border: none;">
</iframe>`,
    htmlCodeEn: `<!-- 1. Vimeo Embed Iframe with autoplay=1&muted=1 -->
<iframe
  id="vimeo-player"
  src="https://player.vimeo.com/video/76979871?autoplay=1&muted=1"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen
  style="width: 100%; aspect-ratio: 16/9; border: none;">
</iframe>`,
    jsCodeVi: `// 3. Khởi tạo Vimeo.Player và SRemote Adapter
const vimeoIframe = document.getElementById('vimeo-player');
const vimeoPlayer = new Vimeo.Player(vimeoIframe);

vimeoPlayer.ready().then(() => {
  const adapterId = window.sremote.useAdapter({
    play() { vimeoPlayer.play(); },
    pause() { vimeoPlayer.pause(); },
    toggle() {
      vimeoPlayer.getPaused().then(paused => {
        paused ? vimeoPlayer.play() : vimeoPlayer.pause();
      });
    },
    seekTo(seconds) { vimeoPlayer.setCurrentTime(seconds); },
    setVolume(vol) { vimeoPlayer.setVolume(vol); },
    setMuted(muted) { vimeoPlayer.setMuted(muted); }
  }, 'vimeo_player');

  console.log('✅ Vimeo Adapter ready:', adapterId);
});`,
    jsCodeEn: `// 3. Initialize Vimeo.Player and SRemote Adapter
const vimeoIframe = document.getElementById('vimeo-player');
const vimeoPlayer = new Vimeo.Player(vimeoIframe);

vimeoPlayer.ready().then(() => {
  const adapterId = window.sremote.useAdapter({
    play() { vimeoPlayer.play(); },
    pause() { vimeoPlayer.pause(); },
    toggle() {
      vimeoPlayer.getPaused().then(paused => {
        paused ? vimeoPlayer.play() : vimeoPlayer.pause();
      });
    },
    seekTo(seconds) { vimeoPlayer.setCurrentTime(seconds); },
    setVolume(vol) { vimeoPlayer.setVolume(vol); },
    setMuted(muted) { vimeoPlayer.setMuted(muted); }
  }, 'vimeo_player');

  console.log('✅ Vimeo Adapter ready:', adapterId);
});`,
  },
  {
    id: 'dailymotion',
    category: 'api_html5',
    name: 'Dailymotion Player SDK',
    icon: '🇩',
    tag: 'Player SDK',
    mode: 'Adapter Mode',
    previewEmbed:
      '<iframe id="dailymotion-frame" src="https://geo.dailymotion.com/player.html?video=x7tgad0&autoplay=1&mute=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="width: 100%; height: 100%; border: none;"></iframe>',
    noteVi:
      '<strong>Lưu ý với Dailymotion:</strong> Thêm tham số <code>autoplay=1&mute=1</code> vào URL embed và nhúng thư viện <code>@dailymotion/player-sdk</code> qua CDN để liên kết với SRemote qua <code>sremote.useAdapter()</code>.',
    noteEn:
      '<strong>Dailymotion Note:</strong> Add <code>autoplay=1&mute=1</code> to the embed URL and load <code>@dailymotion/player-sdk</code> via CDN to bind with SRemote via <code>sremote.useAdapter()</code>.',
    htmlCodeVi: `<!-- 1. Dailymotion Embed Iframe với autoplay=1&mute=1 -->
<iframe
  id="dailymotion-player"
  src="https://geo.dailymotion.com/player.html?video=x7tgad0&autoplay=1&mute=1"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen
  style="width: 100%; aspect-ratio: 16/9; border: none;">
</iframe>

<!-- 2. Nạp Dailymotion Player SDK Script -->
<script src="https://player.dailymotion.com/api/player.js"><\/script>`,
    htmlCodeEn: `<!-- 1. Dailymotion Embed Iframe with autoplay=1&mute=1 -->
<iframe
  id="dailymotion-player"
  src="https://geo.dailymotion.com/player.html?video=x7tgad0&autoplay=1&mute=1"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen
  style="width: 100%; aspect-ratio: 16/9; border: none;">
</iframe>

<!-- 2. Load Dailymotion Player SDK Script -->
<script src="https://player.dailymotion.com/api/player.js"><\/script>`,
    jsCodeVi: `// 3. Khởi tạo Dailymotion Player và kết nối SRemote Adapter
const dmIframe = document.getElementById('dailymotion-player');
dailymotion.createPlayer(dmIframe, {
  video: 'x7tgad0'
}).then(player => {
  let isPaused = true;
  let duration = 0;
  let currentTime = 0;

  const adapter = {
    play() { player.play(); },
    pause() { player.pause(); },
    toggle() { isPaused ? player.play() : player.pause(); },
    seekTo(seconds) { player.seek(seconds); },
    setVolume(vol) { player.setVolume(vol); },
    setMuted(muted) { player.setMuted(muted); },
    getDuration() { return duration; },
    getCurrentTime() { return currentTime; },
    paused() { return isPaused; }
  };

  const adapterId = window.sremote.useAdapter(adapter, 'dailymotion_player');

  player.on(dailymotion.events.PLAYER_PLAY, () => {
    isPaused = false;
    adapter.emit('play', { state: { paused: false, currentTime, duration } });
  });

  player.on(dailymotion.events.PLAYER_PAUSE, () => {
    isPaused = true;
    adapter.emit('pause', { state: { paused: true, currentTime, duration } });
  });

  player.on(dailymotion.events.PLAYER_TIMEUPDATE, state => {
    currentTime = state.videoTime || 0;
    duration = state.videoDuration || duration;
    adapter.emit('timeupdate', { state: { paused: isPaused, currentTime, duration } });
  });

  console.log('✅ Dailymotion Adapter ready:', adapterId);
});`,
    jsCodeEn: `// 3. Initialize Dailymotion Player and bind SRemote Adapter
const dmIframe = document.getElementById('dailymotion-player');
dailymotion.createPlayer(dmIframe, {
  video: 'x7tgad0'
}).then(player => {
  let isPaused = true;
  let duration = 0;
  let currentTime = 0;

  const adapter = {
    play() { player.play(); },
    pause() { player.pause(); },
    toggle() { isPaused ? player.play() : player.pause(); },
    seekTo(seconds) { player.seek(seconds); },
    setVolume(vol) { player.setVolume(vol); },
    setMuted(muted) { player.setMuted(muted); },
    getDuration() { return duration; },
    getCurrentTime() { return currentTime; },
    paused() { return isPaused; }
  };

  const adapterId = window.sremote.useAdapter(adapter, 'dailymotion_player');

  player.on(dailymotion.events.PLAYER_PLAY, () => {
    isPaused = false;
    adapter.emit('play', { state: { paused: false, currentTime, duration } });
  });

  player.on(dailymotion.events.PLAYER_PAUSE, () => {
    isPaused = true;
    adapter.emit('pause', { state: { paused: true, currentTime, duration } });
  });

  player.on(dailymotion.events.PLAYER_TIMEUPDATE, state => {
    currentTime = state.videoTime || 0;
    duration = state.videoDuration || duration;
    adapter.emit('timeupdate', { state: { paused: isPaused, currentTime, duration } });
  });

  console.log('✅ Dailymotion Adapter ready:', adapterId);
});`,
  },
  {
    id: 'twitch',
    category: 'api_html5',
    name: 'Twitch Interactive Player',
    icon: '🟣',
    tag: 'Player SDK',
    mode: 'Adapter Mode',
    previewEmbed:
      '<div id="twitch-mount-node" style="width: 100%; height: 100%; aspect-ratio: 16/9; background: #0e0e10;"></div>',
    noteVi:
      '<strong>Lưu ý với Twitch:</strong> Twitch bắt buộc tham số <code>parent</code> trùng với domain của trang web (ví dụ: <code>parent=localhost</code>). Dùng Twitch Interactive Player JS SDK (<code>https://player.twitch.tv/js/embed/v1.js</code>).',
    noteEn:
      '<strong>Twitch Note:</strong> Twitch requires matching <code>parent</code> domain parameter (e.g. <code>parent=localhost</code>). Use the official Twitch Interactive Player SDK (<code>https://player.twitch.tv/js/embed/v1.js</code>).',
    htmlCodeVi: `<!-- 1. Mount point cho Twitch Player -->
<div id="twitch-player-container" style="width: 100%; aspect-ratio: 16/9;"></div>

<!-- 2. Twitch Interactive Player SDK -->
<script src="https://player.twitch.tv/js/embed/v1.js"><\/script>`,
    htmlCodeEn: `<!-- 1. Mount point for Twitch Player -->
<div id="twitch-player-container" style="width: 100%; aspect-ratio: 16/9;"></div>

<!-- 2. Twitch Interactive Player SDK -->
<script src="https://player.twitch.tv/js/embed/v1.js"><\/script>`,
    jsCodeVi: `// 3. Khởi tạo Twitch.Player (Kênh: the8bitdrummer) và kết nối SRemote Adapter
const currentHost = window.location.hostname || 'localhost';
const player = new Twitch.Player('twitch-player-container', {
  width: '100%',
  height: '100%',
  channel: 'the8bitdrummer',
  autoplay: true,
  muted: true,
  parent: [currentHost]
});

player.addEventListener(Twitch.Player.READY, () => {
  const adapter = {
    play() { player.play(); },
    pause() { player.pause(); },
    toggle() { player.isPaused() ? player.play() : player.pause(); },
    seekTo(seconds) { player.seek(seconds); },
    setVolume(vol) { player.setVolume(vol); },
    setMuted(muted) { player.setMuted(muted); },
    getDuration() { return player.getDuration(); },
    getCurrentTime() { return player.getCurrentTime(); },
    paused() { return player.isPaused(); }
  };

  const adapterId = window.sremote.useAdapter(adapter, 'twitch_player');

  player.addEventListener(Twitch.Player.PLAY, () => {
    adapter.emit('play', { state: { paused: false, currentTime: player.getCurrentTime(), duration: player.getDuration() } });
  });

  player.addEventListener(Twitch.Player.PAUSE, () => {
    adapter.emit('pause', { state: { paused: true, currentTime: player.getCurrentTime(), duration: player.getDuration() } });
  });

  console.log('✅ Twitch Adapter ready:', adapterId);
});`,
    jsCodeEn: `// 3. Initialize Twitch.Player (Channel: the8bitdrummer) and bind SRemote Adapter
const currentHost = window.location.hostname || 'localhost';
const player = new Twitch.Player('twitch-player-container', {
  width: '100%',
  height: '100%',
  channel: 'the8bitdrummer',
  autoplay: true,
  muted: true,
  parent: [currentHost]
});

player.addEventListener(Twitch.Player.READY, () => {
  const adapter = {
    play() { player.play(); },
    pause() { player.pause(); },
    toggle() { player.isPaused() ? player.play() : player.pause(); },
    seekTo(seconds) { player.seek(seconds); },
    setVolume(vol) { player.setVolume(vol); },
    setMuted(muted) { player.setMuted(muted); },
    getDuration() { return player.getDuration(); },
    getCurrentTime() { return player.getCurrentTime(); },
    paused() { return player.isPaused(); }
  };

  const adapterId = window.sremote.useAdapter(adapter, 'twitch_player');

  player.addEventListener(Twitch.Player.PLAY, () => {
    adapter.emit('play', { state: { paused: false, currentTime: player.getCurrentTime(), duration: player.getDuration() } });
  });

  player.addEventListener(Twitch.Player.PAUSE, () => {
    adapter.emit('pause', { state: { paused: true, currentTime: player.getCurrentTime(), duration: player.getDuration() } });
  });

  console.log('✅ Twitch Adapter ready:', adapterId);
});`,
  },
  {
    id: 'mixcloud',
    category: 'api_html5',
    name: 'Mixcloud Widget API',
    icon: '🎧',
    tag: 'Widget SDK',
    mode: 'Adapter Mode',
    previewEmbed:
      '<iframe id="mixcloud-frame" src="https://player-widget.mixcloud.com/widget/iframe/?feed=%2Fspartacus%2Fparty-time%2F&hide_cover=1&mini=1&light=1&autoplay=1" allow="autoplay" style="width: 100%; height: 60px; border: none;"></iframe>',
    noteVi:
      '<strong>Lưu ý với Mixcloud:</strong> Thêm <code>autoplay=1</code> vào URL widget và nhúng <code>https://widget.mixcloud.com/media/js/widgetApi.js</code> để khởi tạo <code>Mixcloud.PlayerWidget</code>.',
    noteEn:
      '<strong>Mixcloud Note:</strong> Append <code>autoplay=1</code> to widget URL and import <code>https://widget.mixcloud.com/media/js/widgetApi.js</code> for <code>Mixcloud.PlayerWidget</code>.',
    htmlCodeVi: `<!-- 1. Iframe Mixcloud Widget với autoplay=1 -->
<iframe
  id="mixcloud-widget"
  src="https://player-widget.mixcloud.com/widget/iframe/?feed=%2Fspartacus%2Fparty-time%2F&hide_cover=1&mini=1&light=1&autoplay=1"
  allow="autoplay"
  style="width: 100%; height: 60px; border: none;">
</iframe>

<!-- 2. Mixcloud Widget API Script -->
<script src="https://widget.mixcloud.com/media/js/widgetApi.js"><\/script>`,
    htmlCodeEn: `<!-- 1. Mixcloud Widget Iframe with autoplay=1 -->
<iframe
  id="mixcloud-widget"
  src="https://player-widget.mixcloud.com/widget/iframe/?feed=%2Fspartacus%2Fparty-time%2F&hide_cover=1&mini=1&light=1&autoplay=1"
  allow="autoplay"
  style="width: 100%; height: 60px; border: none;">
</iframe>

<!-- 2. Mixcloud Widget API Script -->
<script src="https://widget.mixcloud.com/media/js/widgetApi.js"><\/script>`,
    jsCodeVi: `// 3. Khởi tạo Mixcloud.PlayerWidget và đăng ký SRemote Adapter
const mcIframe = document.getElementById('mixcloud-widget');
const widget = Mixcloud.PlayerWidget(mcIframe);

widget.ready.then(() => {
  let isPlaying = true;
  let duration = 0;
  let currentTime = 0;

  widget.getDuration().then(d => { duration = d; });

  const adapter = {
    play() { widget.play(); isPlaying = true; },
    pause() { widget.pause(); isPlaying = false; },
    toggle() { widget.togglePlay(); isPlaying = !isPlaying; },
    seekTo(seconds) { widget.seek(seconds); },
    getDuration() { return duration; },
    getCurrentTime() { return currentTime; },
    paused() { return !isPlaying; }
  };

  const adapterId = window.sremote.useAdapter(adapter, 'mixcloud_player');

  widget.events.play.on(() => {
    isPlaying = true;
    adapter.emit('play', { state: { paused: false, currentTime, duration } });
  });

  widget.events.pause.on(() => {
    isPlaying = false;
    adapter.emit('pause', { state: { paused: true, currentTime, duration } });
  });

  widget.events.progress.on((pos, dur) => {
    currentTime = pos;
    duration = dur;
    adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
  });

  console.log('✅ Mixcloud Adapter ready:', adapterId);
});`,
    jsCodeEn: `// 3. Initialize Mixcloud.PlayerWidget and register SRemote Adapter
const mcIframe = document.getElementById('mixcloud-widget');
const widget = Mixcloud.PlayerWidget(mcIframe);

widget.ready.then(() => {
  let isPlaying = true;
  let duration = 0;
  let currentTime = 0;

  widget.getDuration().then(d => { duration = d; });

  const adapter = {
    play() { widget.play(); isPlaying = true; },
    pause() { widget.pause(); isPlaying = false; },
    toggle() { widget.togglePlay(); isPlaying = !isPlaying; },
    seekTo(seconds) { widget.seek(seconds); },
    getDuration() { return duration; },
    getCurrentTime() { return currentTime; },
    paused() { return !isPlaying; }
  };

  const adapterId = window.sremote.useAdapter(adapter, 'mixcloud_player');

  widget.events.play.on(() => {
    isPlaying = true;
    adapter.emit('play', { state: { paused: false, currentTime, duration } });
  });

  widget.events.pause.on(() => {
    isPlaying = false;
    adapter.emit('pause', { state: { paused: true, currentTime, duration } });
  });

  widget.events.progress.on((pos, dur) => {
    currentTime = pos;
    duration = dur;
    adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
  });

  console.log('✅ Mixcloud Adapter ready:', adapterId);
});`,
  },

  // Danh mục 2: Có API nhưng không dùng hàng HTML5 (Spotify)
  {
    id: 'spotify',
    category: 'api_no_html5',
    name: 'Spotify Embed Controller',
    icon: '🟢',
    tag: 'DRM Controller',
    mode: 'Adapter Mode',
    previewEmbed:
      '<div id="spotify-mount-node" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #121212;"><iframe id="spotify-frame" src="https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT?utm_source=generator" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" style="width: 100%; height: 152px; border: none; border-radius: 8px;"></iframe></div>',
    noteVi:
      '<strong>Lưu ý với Spotify:</strong> Spotify dùng WebAssembly + EME DRM (không có thẻ HTML5 &lt;audio&gt;). Cần nạp Spotify IFrame API (<code>open.spotify.com/embed/iframe-api/v1</code>) để tạo Controller điều khiển.',
    noteEn:
      '<strong>Spotify Note:</strong> Spotify utilizes WebAssembly + DRM (no HTML5 &lt;audio&gt; tag). Load the Spotify IFrame API script (<code>open.spotify.com/embed/iframe-api/v1</code>) to bind with EmbedController.',
    htmlCodeVi: `<!-- 1. Mount point cho Spotify Iframe -->
<div id="spotify-embed-container"></div>

<!-- 2. Spotify IFrame API SDK -->
<script src="https://open.spotify.com/embed/iframe-api/v1" async><\/script>`,
    htmlCodeEn: `<!-- 1. Mount point for Spotify Iframe -->
<div id="spotify-embed-container"></div>

<!-- 2. Spotify IFrame API SDK -->
<script src="https://open.spotify.com/embed/iframe-api/v1" async><\/script>`,
    jsCodeVi: `// 3. Tạo Embed Controller và đăng ký SRemote Adapter
window.onSpotifyIframeApiReady = (IFrameAPI) => {
  const element = document.getElementById('spotify-embed-container');
  const options = {
    uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
    width: '100%',
    height: '152'
  };

  IFrameAPI.createController(element, options, (EmbedController) => {
    let isPaused = true;
    let position = 0;
    let duration = 0;

    const adapter = {
      play() { EmbedController.resume(); },
      pause() { EmbedController.pause(); },
      toggle() { EmbedController.togglePlay(); },
      seekTo(seconds) { EmbedController.seek(seconds); },
      getDuration() { return duration; },
      getCurrentTime() { return position; },
      paused() { return isPaused; }
    };

    const adapterId = window.sremote.useAdapter(adapter, 'spotify_player');

    // Lắng nghe sự kiện phát của Spotify và chuyển tiếp vào SRemote
    EmbedController.addListener('playback_started', (e) => {
      isPaused = false;
      position = (e.data?.position || 0) / 1000;
      duration = (e.data?.duration || 0) / 1000;
      adapter.emit('play', { state: { paused: false, currentTime: position, duration } });
      adapter.emit('timeupdate', { state: { paused: false, currentTime: position, duration } });
    });

    EmbedController.addListener('playback_update', (e) => {
      isPaused = Boolean(e.data?.isPaused);
      position = (e.data?.position || 0) / 1000;
      duration = (e.data?.duration || 0) / 1000;
      adapter.emit('timeupdate', { state: { paused: isPaused, currentTime: position, duration } });
    });

    console.log('✅ Spotify Adapter connected with live events:', adapterId);
  });
};`,
    jsCodeEn: `// 3. Create Embed Controller and register SRemote Adapter
window.onSpotifyIframeApiReady = (IFrameAPI) => {
  const element = document.getElementById('spotify-embed-container');
  const options = {
    uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
    width: '100%',
    height: '152'
  };

  IFrameAPI.createController(element, options, (EmbedController) => {
    let isPaused = true;
    let position = 0;
    let duration = 0;

    const adapter = {
      play() { EmbedController.resume(); },
      pause() { EmbedController.pause(); },
      toggle() { EmbedController.togglePlay(); },
      seekTo(seconds) { EmbedController.seek(seconds); },
      getDuration() { return duration; },
      getCurrentTime() { return position; },
      paused() { return isPaused; }
    };

    const adapterId = window.sremote.useAdapter(adapter, 'spotify_player');

    // Listen to Spotify playback events and forward to SRemote
    EmbedController.addListener('playback_started', (e) => {
      isPaused = false;
      position = (e.data?.position || 0) / 1000;
      duration = (e.data?.duration || 0) / 1000;
      adapter.emit('play', { state: { paused: false, currentTime: position, duration } });
      adapter.emit('timeupdate', { state: { paused: false, currentTime: position, duration } });
    });

    EmbedController.addListener('playback_update', (e) => {
      isPaused = Boolean(e.data?.isPaused);
      position = (e.data?.position || 0) / 1000;
      duration = (e.data?.duration || 0) / 1000;
      adapter.emit('timeupdate', { state: { paused: isPaused, currentTime: position, duration } });
    });

    console.log('✅ Spotify Adapter connected with live events:', adapterId);
  });
};`,
  },

  // Danh mục 3: Có API xuất ngoài nhưng không có tài liệu chính thức + dùng HTML5 chuẩn
  {
    id: 'niconico',
    category: 'external_postmessage_html5',
    name: 'NicoNico Player',
    icon: '📺',
    tag: 'PostMessage API',
    mode: 'PostMessage Adapter Mode',
    previewEmbed:
      '<iframe id="niconico-frame" src="https://embed.nicovideo.jp/watch/so46693656?jsapi=1&playerId=nico_sremote_player&autoplay=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen style="width: 100%; height: 100%; border: none;"></iframe>',
    noteVi:
      '<strong>Đặc thù NicoNico (Niconico Douga):</strong> Sử dụng giao thức <code>postMessage</code> nội bộ xuất ngoài (<code>sourceConnectorType: 1</code>, <code>jsapi=1</code> và <code>playerId</code>) điều khiển HTML5 player bên trong iframe. Thời gian gửi đi tính theo milliseconds (<code>time: sec * 1000</code>).',
    noteEn:
      '<strong>NicoNico Technical Note:</strong> NicoNico Douga utilizes an undocumented internal 2-way <code>postMessage</code> protocol with <code>sourceConnectorType: 1</code>, <code>jsapi=1</code> and <code>playerId</code> controlling its internal HTML5 video. Seeking expects milliseconds (<code>time: sec * 1000</code>).',
    htmlCodeVi: `<!-- 1. Nhúng iframe NicoNico với jsapi=1 và playerId -->
<iframe
  id="niconico-player"
  src="https://embed.nicovideo.jp/watch/so46693656?jsapi=1&playerId=my_nico_player&autoplay=1"
  allow="autoplay; encrypted-media; fullscreen"
  allowfullscreen
  style="width: 100%; aspect-ratio: 16/9; border: none;">
</iframe>`,
    htmlCodeEn: `<!-- 1. Embed NicoNico iframe with jsapi=1 and playerId -->
<iframe
  id="niconico-player"
  src="https://embed.nicovideo.jp/watch/so46693656?jsapi=1&playerId=my_nico_player&autoplay=1"
  allow="autoplay; encrypted-media; fullscreen"
  allowfullscreen
  style="width: 100%; aspect-ratio: 16/9; border: none;">
</iframe>`,
    jsCodeVi: `// 2. Tạo SRemote Adapter kết nối NicoNico qua postMessage 2 chiều
const iframe = document.getElementById('niconico-player');
const playerId = 'my_nico_player';
let duration = 0;
let currentTime = 0;
let isPlaying = false;

// Hàm gửi postMessage tới iframe NicoNico
function sendToNico(eventName, data = {}) {
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage({
      sourceConnectorType: 1,
      playerId: playerId,
      eventName: eventName,
      data: data
    }, 'https://embed.nicovideo.jp');
  }
}

// Đăng ký SRemote Adapter
const adapter = {
  play() { sendToNico('play'); },
  pause() { sendToNico('pause'); },
  toggle() { isPlaying ? sendToNico('pause') : sendToNico('play'); },
  seekTo(seconds) { sendToNico('seek', { time: seconds * 1000 }); },
  setVolume(vol) { sendToNico('volumeChange', { volume: vol }); },
  getDuration() { return duration; },
  getCurrentTime() { return currentTime; },
  paused() { return !isPlaying; }
};

const adapterId = window.sremote.useAdapter(adapter, 'niconico_player');

// Lắng nghe phản hồi từ NicoNico Embed Player
window.addEventListener('message', (e) => {
  if (e.origin !== 'https://embed.nicovideo.jp') return;
  if (e.data?.playerId !== playerId) return;

  const { eventName, data } = e.data;

  if (eventName === 'loadComplete') {
    if (data?.videoInfo?.lengthInSeconds) {
      duration = data.videoInfo.lengthInSeconds / 1000;
    }
  } else if (eventName === 'playerMetadataChange') {
    if (data?.duration !== undefined) duration = data.duration / 1000;
    if (data?.currentTime !== undefined) {
      currentTime = data.currentTime / 1000;
      adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
    }
  } else if (eventName === 'playerStatusChange') {
    // 2: Playing, 3: Paused, 4: Ended
    if (data?.playerStatus === 2) {
      isPlaying = true;
      adapter.emit('play', { state: { paused: false, currentTime, duration } });
    } else if (data?.playerStatus === 3) {
      isPlaying = false;
      adapter.emit('pause', { state: { paused: true, currentTime, duration } });
    } else if (data?.playerStatus === 4) {
      isPlaying = false;
      adapter.emit('ended', { state: { ended: true, currentTime: duration, duration } });
    }
  }
});

console.log('✅ NicoNico Adapter ready:', adapterId);`,
    jsCodeEn: `// 2. Create SRemote Adapter connecting NicoNico via 2-way postMessage
const iframe = document.getElementById('niconico-player');
const playerId = 'my_nico_player';
let duration = 0;
let currentTime = 0;
let isPlaying = false;

// Helper to send postMessage to NicoNico iframe
function sendToNico(eventName, data = {}) {
  if (iframe?.contentWindow) {
    iframe.contentWindow.postMessage({
      sourceConnectorType: 1,
      playerId: playerId,
      eventName: eventName,
      data: data
    }, 'https://embed.nicovideo.jp');
  }
}

// Register SRemote Adapter
const adapter = {
  play() { sendToNico('play'); },
  pause() { sendToNico('pause'); },
  toggle() { isPlaying ? sendToNico('pause') : sendToNico('play'); },
  seekTo(seconds) { sendToNico('seek', { time: seconds * 1000 }); },
  setVolume(vol) { sendToNico('volumeChange', { volume: vol }); },
  getDuration() { return duration; },
  getCurrentTime() { return currentTime; },
  paused() { return !isPlaying; }
};

const adapterId = window.sremote.useAdapter(adapter, 'niconico_player');

// Listen for messages from NicoNico Embed Player
window.addEventListener('message', (e) => {
  if (e.origin !== 'https://embed.nicovideo.jp') return;
  if (e.data?.playerId !== playerId) return;

  const { eventName, data } = e.data;

  if (eventName === 'loadComplete') {
    if (data?.videoInfo?.lengthInSeconds) {
      duration = data.videoInfo.lengthInSeconds / 1000;
    }
  } else if (eventName === 'playerMetadataChange') {
    if (data?.duration !== undefined) duration = data.duration / 1000;
    if (data?.currentTime !== undefined) {
      currentTime = data.currentTime / 1000;
      adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
    }
  } else if (eventName === 'playerStatusChange') {
    // 2: Playing, 3: Paused, 4: Ended
    if (data?.playerStatus === 2) {
      isPlaying = true;
      adapter.emit('play', { state: { paused: false, currentTime, duration } });
    } else if (data?.playerStatus === 3) {
      isPlaying = false;
      adapter.emit('pause', { state: { paused: true, currentTime, duration } });
    } else if (data?.playerStatus === 4) {
      isPlaying = false;
      adapter.emit('ended', { state: { ended: true, currentTime: duration, duration } });
    }
  }
});

console.log('✅ NicoNico Adapter ready:', adapterId);`,
  },

  // Danh mục 4: Không có API + Dùng HTML5 chuẩn (Zero-Config)
  {
    id: 'bilibili',
    category: 'no_api_html5',
    name: 'Bilibili Player',
    icon: '📺',
    tag: 'HTML5 Native Frame',
    mode: 'Zero-Config Native',
    previewEmbed:
      '<iframe id="bilibili-frame" src="https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&page=1&autoplay=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>',
    noteVi:
      '<strong>Đặc thù Bilibili:</strong> Bilibili dùng thẻ HTML5 Media tiêu chuẩn bên trong iframe nên <strong>SRemote hỗ trợ trực tiếp 100% không cần viết adapter</strong>! Thêm <code>autoplay=1</code> để tự chạy.',
    noteEn:
      '<strong>Bilibili Technical Note:</strong> Bilibili uses standard HTML5 media inside its iframe, so <strong>SRemote works natively out-of-the-box with zero adapter code</strong>! Use <code>autoplay=1</code> for autoplay.',
    htmlCodeVi: `<!-- Nhúng Bilibili Player với autoplay=1 và đầy đủ quyền allow -->
<iframe
  id="bilibili-player"
  src="https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&page=1&autoplay=1"
  allow="autoplay; encrypted-media; fullscreen"
  allowfullscreen
  style="width: 100%; aspect-ratio: 16/9; border: none;">
</iframe>`,
    htmlCodeEn: `<!-- Embed Bilibili Player with autoplay=1 and allow permissions -->
<iframe
  id="bilibili-player"
  src="https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&page=1&autoplay=1"
  allow="autoplay; encrypted-media; fullscreen"
  allowfullscreen
  style="width: 100%; aspect-ratio: 16/9; border: none;">
</iframe>`,
    jsCodeVi: `// Bilibili KHÔNG CẦN Adapter - Chỉ cần gọi sremote.hello()
document.addEventListener('DOMContentLoaded', () => {
  // Bắt đầu tìm kiếm & kết nối tới media bên trong Bilibili iframe
  window.sremote.hello();

  window.sremote.on('accept', (data) => {
    console.log('✅ Đã kết nối tới Bilibili media:', data.instanceId);
  });
});`,
    jsCodeEn: `// Bilibili DOES NOT need an Adapter - Simply call sremote.hello()
document.addEventListener('DOMContentLoaded', () => {
  // Start discovery & handshake with media inside Bilibili iframe
  window.sremote.hello();

  window.sremote.on('accept', (data) => {
    console.log('✅ Connected to Bilibili media:', data.instanceId);
  });
});`,
  },
  {
    id: 'html5',
    category: 'no_api_html5',
    name: 'HTML5 Video & Audio',
    icon: '🎬',
    tag: 'Native Zero-Config',
    mode: 'Zero-Config Native',
    previewEmbed:
      '<iframe id="html5-sample-frame" src="demo-frames/sample-player.html" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="width: 100%; height: 100%; border: none;"></iframe>',
    noteVi:
      '<strong>HTML5 Chuẩn:</strong> Các thẻ <code>&lt;video autoplay muted&gt;</code> nhúng qua iframe hoạt động hoàn toàn tự động với SRemote mà không cần bất kỳ adapter nào.',
    noteEn:
      '<strong>Standard HTML5:</strong> <code>&lt;video autoplay muted&gt;</code> elements embedded via iframes work out-of-the-box natively with zero configuration.',
    htmlCodeVi: `<!-- 1. Nhúng trang phát Video HTML5 chuẩn (autoplay & muted) qua Iframe -->
<iframe
  id="my-html5-frame"
  src="demo-frames/sample-player.html"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen
  style="width: 100%; aspect-ratio: 16/9; border: none;">
</iframe>`,
    htmlCodeEn: `<!-- 1. Embed standard HTML5 Video player page (autoplay & muted) via Iframe -->
<iframe
  id="my-html5-frame"
  src="demo-frames/sample-player.html"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen
  style="width: 100%; aspect-ratio: 16/9; border: none;">
</iframe>`,
    jsCodeVi: `// 2. Tự động kết nối Native HTML5 Media (Không cần Adapter)
document.addEventListener('DOMContentLoaded', () => {
  // Gửi bắt tay tới iframe
  window.sremote.hello();

  // Lắng nghe kết nối thành công
  window.sremote.on('accept', (data) => {
    console.log('✅ HTML5 Media connected:', data.instanceId);
  });

  // Lắng nghe tiến độ phát
  window.sremote.on('timeupdate', (data) => {
    console.log('Tiến độ:', data.state.currentTime, '/', data.state.duration);
  });
});`,
    jsCodeEn: `// 2. Automatically connect Native HTML5 Media (Zero-Adapter)
document.addEventListener('DOMContentLoaded', () => {
  // Send handshake to iframe
  window.sremote.hello();

  // Listen for successful handshake
  window.sremote.on('accept', (data) => {
    console.log('✅ HTML5 Media connected:', data.instanceId);
  });

  // Track playback progress
  window.sremote.on('timeupdate', (data) => {
    console.log('Progress:', data.state.currentTime, '/', data.state.duration);
  });
});`,
  },
];

const dict = {
  vi: {
    backDocs: '📖 Tài liệu API',
    demoLink: '▶ Live Demo',
    sidebarTitle: '🎯 Chọn nền tảng',
    infoTitle: '💡 Mẹo tích hợp nhanh',
    livePreview: '▶ Live Preview & Test',
    htmlTab: '📄 HTML Embed',
    jsTab: '⚡ JS Adapter / Setup',
    copyBtn: 'Copy Code',
    copied: '✓ Đã chép!',
    statusReady: 'Sẵn sàng nạp',
    statusCommand: 'Lệnh',
    tipsText:
      '- Các dịch vụ có SDK chính thức (YouTube, Dailymotion, Twitch, Vimeo, SoundCloud, Mixcloud, Spotify) khuyên dùng <code>useAdapter()</code>.<br>- NicoNico hỗ trợ qua giao thức postMessage 2 chiều.<br>- Bilibili &amp; HTML5 video hỗ trợ trực tiếp không cần adapter qua <code>sremote.hello()</code>.',
    footer: 'SRemote Frame Controller © 2026 sweetsea • Giấy phép LGPL-3.0 • Sẵn sàng cho mọi nền tảng Media.',
  },
  en: {
    backDocs: '📖 API Docs',
    demoLink: '▶ Live Demo',
    sidebarTitle: '🎯 Select Platform',
    infoTitle: '💡 Quick Integration Tips',
    livePreview: '▶ Live Preview & Test',
    htmlTab: '📄 HTML Embed',
    jsTab: '⚡ JS Adapter / Setup',
    copyBtn: 'Copy Code',
    copied: '✓ Copied!',
    statusReady: 'Ready to load',
    statusCommand: 'Command',
    tipsText:
      '- Services with an official SDK (YouTube, Dailymotion, Twitch, Vimeo, SoundCloud, Mixcloud, Spotify) should use <code>useAdapter()</code>.<br>- NicoNico is supported via 2-way postMessage adapter.<br>- Bilibili &amp; HTML5 video work natively with no adapter via <code>sremote.hello()</code>.',
    footer: 'SRemote Frame Controller © 2026 sweetsea • Licensed under LGPL-3.0 • Ready for all Media platforms.',
  },
};

// Global export for recipes runtime and UI
window.RECIPES_DATA = {
  categories,
  platforms,
  dict,
};

/**
 * SRemote Recipes Runtime: Dynamic SDK loading, live adapter creation & player synchronization
 */

// SDK Script loader helper
const loadedScripts = new Set();
function loadScript(src) {
  if (loadedScripts.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => {
      loadedScripts.add(src);
      resolve();
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Live Player & Adapter Instances Manager
let activeYouTubePlayer = null;
let activeSoundCloudWidget = null;
let activeVimeoPlayer = null;

async function initPlatformRuntime(platformId, iframeEl) {
  if (!window.sremote) return;

  if (platformId === 'youtube') {
    // Nạp YouTube Iframe API
    await loadScript('https://www.youtube.com/iframe_api');

    const initYT = () => {
      if (window.YT && window.YT.Player) {
        activeYouTubePlayer = new YT.Player(iframeEl, {
          events: {
            onReady: () => {
              window.sremote.useAdapter(
                {
                  play() {
                    activeYouTubePlayer.playVideo();
                  },
                  pause() {
                    activeYouTubePlayer.pauseVideo();
                  },
                  toggle() {
                    activeYouTubePlayer.getPlayerState() === 1 ? activeYouTubePlayer.pauseVideo() : activeYouTubePlayer.playVideo();
                  },
                  seek(offset) {
                    const t = activeYouTubePlayer.getCurrentTime();
                    activeYouTubePlayer.seekTo(t + offset, true);
                  },
                  seekTo(sec) {
                    activeYouTubePlayer.seekTo(sec, true);
                  },
                  volume(v) {
                    activeYouTubePlayer.setVolume(v * 100);
                  },
                  mute(m) {
                    m !== undefined
                      ? m
                        ? activeYouTubePlayer.mute()
                        : activeYouTubePlayer.unMute()
                      : activeYouTubePlayer.isMuted()
                        ? activeYouTubePlayer.unMute()
                        : activeYouTubePlayer.mute();
                  },
                  getCurrentTime() {
                    return activeYouTubePlayer.getCurrentTime();
                  },
                  getDuration() {
                    return activeYouTubePlayer.getDuration();
                  },
                  paused() {
                    return activeYouTubePlayer.getPlayerState() !== 1;
                  },
                },
                'youtube_player',
              );
              console.log('✅ Live YouTube Adapter registered to SRemote');
            },
          },
        });
      } else {
        setTimeout(initYT, 100);
      }
    };
    initYT();
  } else if (platformId === 'soundcloud') {
    // Nạp SoundCloud Widget SDK
    await loadScript('https://w.soundcloud.com/player/api.js');
    if (window.SC && window.SC.Widget) {
      activeSoundCloudWidget = SC.Widget(iframeEl);
      activeSoundCloudWidget.bind(SC.Widget.Events.READY, () => {
        let isPlaying = true;
        let duration = 0;
        let currentTime = 0;
        activeSoundCloudWidget.getDuration(d => {
          duration = d / 1000;
        });

        const adapter = {
          play() {
            activeSoundCloudWidget.play();
            isPlaying = true;
          },
          pause() {
            activeSoundCloudWidget.pause();
            isPlaying = false;
          },
          toggle() {
            activeSoundCloudWidget.toggle();
            isPlaying = !isPlaying;
          },
          seek(offset) {
            activeSoundCloudWidget.getPosition(p => activeSoundCloudWidget.seekTo(Math.max(0, p + offset * 1000)));
          },
          seekTo(sec) {
            activeSoundCloudWidget.seekTo(sec * 1000);
          },
          volume(v) {
            activeSoundCloudWidget.setVolume(v * 100);
          },
          mute(m) {
            activeSoundCloudWidget.setVolume(m ? 0 : 100);
          },
          getDuration() {
            return duration;
          },
          getCurrentTime() {
            return currentTime;
          },
          paused() {
            return !isPlaying;
          },
        };

        window.sremote.useAdapter(adapter, 'soundcloud_player');

        activeSoundCloudWidget.bind(SC.Widget.Events.PLAY, () => {
          isPlaying = true;
          adapter.emit('play', { state: { paused: false, currentTime, duration } });
        });

        activeSoundCloudWidget.bind(SC.Widget.Events.PAUSE, () => {
          isPlaying = false;
          adapter.emit('pause', { state: { paused: true, currentTime, duration } });
        });

        activeSoundCloudWidget.bind(SC.Widget.Events.PLAY_PROGRESS, data => {
          currentTime = (data.currentPosition || 0) / 1000;
          adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
        });

        activeSoundCloudWidget.bind(SC.Widget.Events.SEEK, data => {
          currentTime = (data.currentPosition || 0) / 1000;
          adapter.emit('seeked', { state: { paused: !isPlaying, currentTime, duration } });
          adapter.emit('timeupdate', { state: { paused: !isPlaying, currentTime, duration } });
        });

        console.log('✅ Live SoundCloud Adapter registered to SRemote');
      });
    }
  } else if (platformId === 'spotify') {
    const container = document.getElementById('spotify-mount-node');
    const setupSpotify = IFrameAPI => {
      if (!container) return;
      container.innerHTML = '';
      IFrameAPI.createController(
        container,
        {
          uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
          width: '100%',
          height: '152',
        },
        EmbedController => {
          let isPaused = true;
          let position = 0;
          let duration = 0;

          const adapter = {
            play() {
              EmbedController.resume();
            },
            pause() {
              EmbedController.pause();
            },
            toggle() {
              EmbedController.togglePlay();
            },
            seekTo(sec) {
              EmbedController.seek(sec);
            },
            getDuration() {
              return duration;
            },
            getCurrentTime() {
              return position;
            },
            paused() {
              return isPaused;
            },
          };

          window.sremote.useAdapter(adapter, 'spotify_player');

          // Bắt sự kiện trực tiếp từ Spotify IFrame API và bắn vào SRemote
          EmbedController.addListener('playback_started', e => {
            isPaused = false;
            position = (e.data?.position || 0) / 1000;
            duration = (e.data?.duration || 0) / 1000;
            adapter.emit('play', { state: { paused: false, currentTime: position, duration } });
            adapter.emit('timeupdate', { state: { paused: false, currentTime: position, duration } });
          });

          EmbedController.addListener('playback_update', e => {
            isPaused = Boolean(e.data?.isPaused);
            position = (e.data?.position || 0) / 1000;
            duration = (e.data?.duration || 0) / 1000;
            adapter.emit('timeupdate', { state: { paused: isPaused, currentTime: position, duration } });
          });

          console.log('✅ Live Spotify Adapter registered with event synchronization to SRemote');
        },
      );
    };

    if (window.__spotifyIFrameAPI) {
      setupSpotify(window.__spotifyIFrameAPI);
    } else {
      window.onSpotifyIframeApiReady = IFrameAPI => {
        window.__spotifyIFrameAPI = IFrameAPI;
        setupSpotify(IFrameAPI);
      };
      loadScript('https://open.spotify.com/embed/iframe-api/v1');
    }
  } else if (platformId === 'vimeo') {
    // Nạp Vimeo Player SDK
    await loadScript('https://player.vimeo.com/api/player.js');
    if (window.Vimeo && window.Vimeo.Player) {
      activeVimeoPlayer = new Vimeo.Player(iframeEl);
      activeVimeoPlayer.ready().then(() => {
        window.sremote.useAdapter(
          {
            play() {
              activeVimeoPlayer.play();
            },
            pause() {
              activeVimeoPlayer.pause();
            },
            toggle() {
              activeVimeoPlayer.getPaused().then(p => {
                p ? activeVimeoPlayer.play() : activeVimeoPlayer.pause();
              });
            },
            seek(offset) {
              activeVimeoPlayer.getCurrentTime().then(t => activeVimeoPlayer.setCurrentTime(t + offset));
            },
            seekTo(sec) {
              activeVimeoPlayer.setCurrentTime(sec);
            },
            volume(v) {
              activeVimeoPlayer.setVolume(v);
            },
            mute(m) {
              activeVimeoPlayer.setMuted(m);
            },
            pip(enable) {
              if (enable === false) activeVimeoPlayer.exitPictureInPicture();
              else activeVimeoPlayer.requestPictureInPicture();
            },
          },
          'vimeo_player',
        );
        console.log('✅ Live Vimeo Adapter registered to SRemote');
      });
    }
  } else if (platformId === 'dailymotion') {
    await loadScript('https://player.dailymotion.com/api/player.js');
    if (window.dailymotion && window.dailymotion.createPlayer) {
      window.dailymotion
        .createPlayer(iframeEl, {
          video: 'x7tgad0',
        })
        .then(player => {
          let isPaused = true;
          let duration = 0;
          let currentTime = 0;

          const adapter = {
            play() {
              player.play();
            },
            pause() {
              player.pause();
            },
            toggle() {
              isPaused ? player.play() : player.pause();
            },
            seek(offset) {
              player.seek(currentTime + offset);
            },
            seekTo(sec) {
              player.seek(sec);
            },
            volume(v) {
              player.setVolume(v);
            },
            mute(m) {
              player.setMuted(m);
            },
            getDuration() {
              return duration;
            },
            getCurrentTime() {
              return currentTime;
            },
            paused() {
              return isPaused;
            },
          };

          window.sremote.useAdapter(adapter, 'dailymotion_player');

          player.on(window.dailymotion.events.PLAYER_PLAY, () => {
            isPaused = false;
            adapter.emit('play', { state: { paused: false, currentTime, duration } });
          });

          player.on(window.dailymotion.events.PLAYER_PAUSE, () => {
            isPaused = true;
            adapter.emit('pause', { state: { paused: true, currentTime, duration } });
          });

          player.on(window.dailymotion.events.PLAYER_TIMEUPDATE, state => {
            currentTime = state.videoTime || 0;
            duration = state.videoDuration || duration;
            adapter.emit('timeupdate', { state: { paused: isPaused, currentTime, duration } });
          });

          console.log('✅ Live Dailymotion Adapter registered to SRemote');
        })
        .catch(err => console.warn('Dailymotion init failed:', err));
    }
  } else if (platformId === 'twitch') {
    const twitchMount = document.getElementById('twitch-mount-node');
    if (!twitchMount) return;
    twitchMount.innerHTML = '';

    await loadScript('https://player.twitch.tv/js/embed/v1.js');
    if (window.Twitch && window.Twitch.Player) {
      const currentHost = window.location.hostname || 'localhost';
      const player = new window.Twitch.Player(twitchMount, {
        width: '100%',
        height: '100%',
        channel: 'the8bitdrummer',
        autoplay: true,
        muted: true,
        parent: [currentHost, '127.0.0.1', 'localhost'],
      });

      player.addEventListener(window.Twitch.Player.READY, () => {
        const adapter = {
          play() {
            player.play();
          },
          pause() {
            player.pause();
          },
          toggle() {
            player.isPaused() ? player.play() : player.pause();
          },
          seek(offset) {
            player.seek(player.getCurrentTime() + offset);
          },
          seekTo(sec) {
            player.seek(sec);
          },
          volume(v) {
            player.setVolume(v);
          },
          mute(m) {
            player.setMuted(m);
          },
          getDuration() {
            return player.getDuration();
          },
          getCurrentTime() {
            return player.getCurrentTime();
          },
          paused() {
            return player.isPaused();
          },
        };

        window.sremote.useAdapter(adapter, 'twitch_player');

        player.addEventListener(window.Twitch.Player.PLAY, () => {
          adapter.emit('play', { state: { paused: false, currentTime: player.getCurrentTime(), duration: player.getDuration() } });
        });

        player.addEventListener(window.Twitch.Player.PAUSE, () => {
          adapter.emit('pause', { state: { paused: true, currentTime: player.getCurrentTime(), duration: player.getDuration() } });
        });

        console.log('✅ Live Twitch Adapter registered to SRemote');
      });
    }
  } else if (platformId === 'mixcloud') {
    await loadScript('https://widget.mixcloud.com/media/js/widgetApi.js');
    if (window.Mixcloud && window.Mixcloud.PlayerWidget) {
      const widget = window.Mixcloud.PlayerWidget(iframeEl);
      widget.ready
        .then(() => {
          let isPlaying = true;
          let duration = 0;
          let currentTime = 0;

          widget.getDuration().then(d => {
            duration = d;
          });

          const adapter = {
            play() {
              widget.play();
              isPlaying = true;
            },
            pause() {
              widget.pause();
              isPlaying = false;
            },
            toggle() {
              widget.togglePlay();
              isPlaying = !isPlaying;
            },
            seek(offset) {
              widget.seek(currentTime + offset);
            },
            seekTo(sec) {
              widget.seek(sec);
            },
            getDuration() {
              return duration;
            },
            getCurrentTime() {
              return currentTime;
            },
            paused() {
              return !isPlaying;
            },
          };

          window.sremote.useAdapter(adapter, 'mixcloud_player');

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

          console.log('✅ Live Mixcloud Adapter registered to SRemote');
        })
        .catch(err => console.warn('Mixcloud init failed:', err));
    }
  } else if (platformId === 'niconico') {
    const playerId = 'nico_sremote_player';
    let duration = 0;
    let currentTime = 0;
    let isPlaying = false;

    const sendToNico = (eventName, data = {}) => {
      if (iframeEl?.contentWindow) {
        iframeEl.contentWindow.postMessage(
          {
            sourceConnectorType: 1,
            playerId: playerId,
            eventName: eventName,
            data: data,
          },
          'https://embed.nicovideo.jp',
        );
      }
    };

    const adapter = {
      play() {
        sendToNico('play');
      },
      pause() {
        sendToNico('pause');
      },
      toggle() {
        isPlaying ? sendToNico('pause') : sendToNico('play');
      },
      seek(offset) {
        sendToNico('seek', { time: Math.max(0, (currentTime + offset) * 1000) });
      },
      seekTo(sec) {
        sendToNico('seek', { time: sec * 1000 });
      },
      volume(v) {
        sendToNico('volumeChange', { volume: v });
      },
      mute(m) {
        sendToNico('volumeChange', { volume: m ? 0 : 1 });
      },
      getDuration() {
        return duration;
      },
      getCurrentTime() {
        return currentTime;
      },
      paused() {
        return !isPlaying;
      },
    };

    window.sremote.useAdapter(adapter, 'niconico_player');

    const handleNicoMsg = e => {
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
    };

    window.addEventListener('message', handleNicoMsg);
    console.log('✅ Live NicoNico PostMessage Adapter registered to SRemote');
  }
}

// Global export
window.RECIPES_RUNTIME = {
  loadScript,
  initPlatformRuntime,
};

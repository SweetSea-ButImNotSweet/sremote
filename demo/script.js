/**
 * SRemote Demo - Developer Test Harness Controller
 *
 * Implements 6 fully-isolated iframe slots driven by window.sremote API.
 * Uses consistent iframe templates, proactive instance ID pre-assignment via
 * name / data-sremote-id / SRemote API, consolidated Play/Pause toggle,
 * responsive seek slider with dynamic time format alignment, and per-slot state isolation.
 */

(function initSRemoteDemo() {
  'use strict';

  // SRemote Client from SDK Wrapper (or fallback to window.sremote)
  const client = window.SRemoteWrapper ? window.SRemoteWrapper.createSRemoteClient() : window.sremote;
  const sremoteApi = client || window.sremote;

  // Constants
  const TOTAL_SLOTS = 6;
  const IFRAME_ALLOW_POLICY = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';

  /**
   * Fully Generalized Adaptive Time Formatter.
   * Dynamically aligns digit width and zero-padding between currentTime and duration
   * for any time scale: seconds, minutes, hours, 10h, 100h, 1000h, ...:
   *
   * - Under 10 mins:         m:ss / m:ss             (e.g., 1:10 / 5:50)
   * - 10 mins to < 1 hour:   mm:ss / mm:ss           (e.g., 01:10 / 10:50)
   * - 1 hour to < 10 hours:  h:mm:ss / h:mm:ss       (e.g., 0:01:10 / 1:50:50)
   * - 10h to < 100h:         hh:mm:ss / hh:mm:ss     (e.g., 01:10:00 / 10:00:00)
   * - 100h to < 1000h:       hhh:mm:ss / hhh:mm:ss   (e.g., 001:10:00 / 100:00:00)
   * - 1000h+:                hhhh:mm:ss / hhhh:mm:ss (e.g., 0001:10:00 / 1000:00:00)
   */
  function formatTime(seconds, referenceDuration = 0) {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
      seconds = 0;
    }
    const maxSecs = Math.max(seconds, referenceDuration || 0);
    const totalSecs = Math.floor(seconds);

    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad2 = n => String(n).padStart(2, '0');

    // If total scale is 1 hour or more (>= 3600s)
    if (maxSecs >= 3600) {
      const maxHrs = Math.floor(maxSecs / 3600);
      const hourDigits = String(maxHrs).length; // 1 digit for <10h, 2 digits for <100h, 3 for <1000h, etc.
      const formattedHrs = hourDigits > 1 ? String(hrs).padStart(hourDigits, '0') : String(hrs);
      return `${formattedHrs}:${pad2(mins)}:${pad2(secs)}`;
    }

    // If total scale is 10 minutes to < 1 hour (600s - 3599s)
    if (maxSecs >= 600) {
      return `${pad2(mins)}:${pad2(secs)}`;
    }

    // Under 10 minutes (< 600s)
    return `${mins}:${pad2(secs)}`;
  }

  // Individual Slot Controller Class
  class SlotController {
    constructor(slotNumber) {
      this.slotNumber = slotNumber;
      this.instanceId = `slot_${slotNumber}`;
      this.currentUrl = '';
      this.iframeEl = null;
      this.isUserSeeking = false;

      // State
      this.connectionStatus = 'idle'; // 'idle' | 'loading' | 'connected' | 'disconnected' | 'error'
      this.mediaState = { paused: true, currentTime: 0, duration: 0, volume: 1, muted: false, playbackRate: 1, mediaType: null };

      // Cache DOM Elements
      this.dom = {
        panel: document.getElementById(`slot-panel-${slotNumber}`),
        badge: document.getElementById(`badge-${slotNumber}`),
        urlInput: document.getElementById(`url-input-${slotNumber}`),
        loadBtn: document.getElementById(`load-btn-${slotNumber}`),
        iframeContainer: document.getElementById(`iframe-container-${slotNumber}`),
        seekRange: document.getElementById(`seek-range-${slotNumber}`),
        timeVal: document.getElementById(`time-val-${slotNumber}`),
        toggleBtn: document.getElementById(`toggle-btn-${slotNumber}`),
        seekBackBtn: document.getElementById(`seek-back-btn-${slotNumber}`),
        seekFwdBtn: document.getElementById(`seek-fwd-btn-${slotNumber}`),
        muteBtn: document.getElementById(`mute-btn-${slotNumber}`),
        pipBtn: document.getElementById(`pip-btn-${slotNumber}`),
        fsBtn: document.getElementById(`fs-btn-${slotNumber}`),
        volRange: document.getElementById(`vol-range-${slotNumber}`),
        volVal: document.getElementById(`vol-val-${slotNumber}`),
        rateSelect: document.getElementById(`rate-select-${slotNumber}`),
        connState: document.getElementById(`conn-state-${slotNumber}`),
        mediaState: document.getElementById(`media-state-${slotNumber}`),
      };

      this.bindEvents();
    }

    bindEvents() {
      // Load button click
      this.dom.loadBtn.addEventListener('click', () => {
        const url = this.dom.urlInput.value.trim();
        if (url) {
          this.loadUrl(url);
        }
      });

      // Enter key in URL input
      this.dom.urlInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.dom.loadBtn.click();
        }
      });

      // Consolidated Play / Pause Toggle
      this.dom.toggleBtn.addEventListener('click', () => this.sendSRemoteCommand('toggle'));

      // Seek -10s / +10s
      this.dom.seekBackBtn.addEventListener('click', () => this.sendSRemoteCommand('seek', -10));
      this.dom.seekFwdBtn.addEventListener('click', () => this.sendSRemoteCommand('seek', 10));

      // Interactive Seek Slider
      this.dom.seekRange.addEventListener('input', e => {
        this.isUserSeeking = true;
        const targetTime = parseFloat(e.target.value) || 0;
        const dur = this.mediaState.duration || 0;
        const formattedCur = formatTime(targetTime, dur);
        const formattedDur = dur > 0 ? formatTime(dur, dur) : '--:--';
        this.dom.timeVal.textContent = `${formattedCur} / ${formattedDur}`;
      });

      this.dom.seekRange.addEventListener('change', e => {
        const targetTime = parseFloat(e.target.value) || 0;
        this.sendSRemoteCommand('seekTo', targetTime);
        setTimeout(() => {
          this.isUserSeeking = false;
        }, 300);
      });

      // Mute / Unmute
      this.dom.muteBtn.addEventListener('click', () => {
        const nextMuted = !this.mediaState.muted;
        this.sendSRemoteCommand('mute', nextMuted);
      });

      // PiP
      this.dom.pipBtn.addEventListener('click', () => this.sendSRemoteCommand('pip'));

      // Fullscreen (delegated directly on iframe container or iframe)
      this.dom.fsBtn.addEventListener('click', () => {
        if (this.iframeEl) {
          if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
          } else {
            this.iframeEl.requestFullscreen?.().catch(() => {});
          }
        }
      });

      this.isUserChangingVol = false;
      this.volThrottleTimer = null;

      // Volume Range slider (Throttled real-time input + change)
      this.dom.volRange.addEventListener('input', e => {
        this.isUserChangingVol = true;
        const vol = parseFloat(e.target.value);
        this.dom.volVal.textContent = `${Math.round(vol * 100)}%`;

        // Throttle postMessage commands while sliding to prevent frame stutter
        if (!this.volThrottleTimer) {
          this.sendSRemoteCommand('volume', vol);
          this.volThrottleTimer = setTimeout(() => {
            this.volThrottleTimer = null;
            // Send latest value if still dragging
            const latestVol = parseFloat(this.dom.volRange.value);
            this.sendSRemoteCommand('volume', latestVol);
          }, 60);
        }
      });

      this.dom.volRange.addEventListener('change', e => {
        const vol = parseFloat(e.target.value);
        this.sendSRemoteCommand('volume', vol);
        setTimeout(() => {
          this.isUserChangingVol = false;
        }, 200);
      });

      // Playback Rate
      this.dom.rateSelect.addEventListener('change', e => {
        const rate = parseFloat(e.target.value);
        this.sendSRemoteCommand('playbackRate', rate);
      });
    }

    /**
     * Helper to get translated string safely
     */
    t(key, params) {
      if (window.i18n && typeof window.i18n.t === 'function') {
        return window.i18n.t(key, params);
      }
      return key;
    }

    /**
     * Creates and attaches a fresh <iframe> element according to standard template.
     * Proactively assigns instanceId to window.name, data-sremote-id, and sremote.assignId.
     */
    loadUrl(url) {
      this.currentUrl = url;
      this.setConnectionStatus('loading', this.t('status.conn_loading'));
      this.setControlsEnabled(false);

      // 1. Remove existing iframe from DOM
      this.dom.iframeContainer.innerHTML = '';

      // 2. Create uniform iframe element with exact policy attributes
      const iframe = document.createElement('iframe');
      iframe.className = 'slot-iframe';
      iframe.title = `Slot ${this.slotNumber} Media Frame`;
      iframe.allow = IFRAME_ALLOW_POLICY;
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('loading', 'lazy');

      // Proactively embed instanceId into iframe attributes (Recognized by SRemote Iframe Agent & Parent Controller)
      iframe.name = `sremote_id=${encodeURIComponent(this.instanceId)}`;
      iframe.setAttribute('data-sremote-id', this.instanceId);
      iframe.src = url;

      this.iframeEl = iframe;
      this.dom.iframeContainer.appendChild(iframe);

      // 3. Pre-assign ID in SRemote Parent Controller
      if (sremoteApi?.instances?.assign) {
        sremoteApi.instances.assign(iframe, this.instanceId);
      } else if (sremoteApi && typeof sremoteApi.assignId === 'function') {
        sremoteApi.assignId(iframe, this.instanceId);
      }

      // 4. Multi-stage Handshake Discovery (Immediate + DOMContentLoaded + window.onload + Periodic Handshake Retries)
      // Attempt immediate handshake in case iframe is already evaluating
      this.triggerHandshake();

      // Attempt to listen directly to iframe contentWindow DOMContentLoaded (works for same-origin or local demo frames)
      try {
        iframe.contentWindow?.addEventListener?.('DOMContentLoaded', () => {
          if (this.iframeEl !== iframe) return;
          this.triggerHandshake();
        });
      } catch {}

      // Full iframe window load event
      iframe.addEventListener('load', () => {
        if (this.iframeEl !== iframe) return; // Discard stale load events
        this.triggerHandshake();
      });

      // Clear any prior handshake retry timer
      if (this.handshakeRetryTimer) {
        clearInterval(this.handshakeRetryTimer);
        this.handshakeRetryTimer = null;
      }

      // For slow-loading players like SoundCloud widget / Spotify / Dailymotion:
      // Send handshake retries at increasing intervals until connection is accepted or times out
      let retryCount = 0;
      const maxRetries = 15; // Retry for ~15 seconds
      this.handshakeRetryTimer = setInterval(() => {
        if (this.iframeEl !== iframe || this.connectionStatus === 'connected') {
          clearInterval(this.handshakeRetryTimer);
          this.handshakeRetryTimer = null;
          return;
        }

        retryCount++;
        this.triggerHandshake();

        if (retryCount >= maxRetries) {
          clearInterval(this.handshakeRetryTimer);
          this.handshakeRetryTimer = null;
        }
      }, 1000);
    }

    triggerHandshake() {
      if (!sremoteApi || typeof sremoteApi.hello !== 'function') {
        this.setConnectionStatus('error', this.t('status.conn_error_userscript'));
        return;
      }

      try {
        // Enforce multi-mode so commands require instanceId and don't conflict
        if (sremoteApi?.instances?.setMultiMode) {
          sremoteApi.instances.setMultiMode(true);
        } else {
          sremoteApi.setMultiMode?.(true);
        }

        // Targeted hello to this specific iframe's contentWindow
        if (this.iframeEl?.contentWindow) {
          sremoteApi.hello({ target: this.iframeEl.contentWindow, multiMode: true });
        } else {
          sremoteApi.hello({ multiMode: true });
        }
      } catch (err) {
        console.warn(`[Slot ${this.slotNumber}] Handshake trigger error:`, err);
      }
    }

    sendSRemoteCommand(action, value) {
      if (!sremoteApi) {
        console.warn(`[Slot ${this.slotNumber}] sremote SDK not found.`);
        return;
      }

      try {
        switch (action) {
          case 'play':
            sremoteApi.play(this.instanceId);
            break;
          case 'pause':
            sremoteApi.pause(this.instanceId);
            break;
          case 'toggle':
            sremoteApi.toggle(this.instanceId);
            break;
          case 'seek':
            sremoteApi.seek(value, this.instanceId);
            break;
          case 'seekTo':
            sremoteApi.seekTo(value, this.instanceId);
            break;
          case 'volume':
            sremoteApi.volume(value, this.instanceId);
            break;
          case 'mute':
            sremoteApi.mute(value, this.instanceId);
            break;
          case 'playbackRate':
            sremoteApi.playbackRate(value, this.instanceId);
            break;
          case 'pip':
            sremoteApi.pip(undefined, this.instanceId);
            break;
          default:
            console.warn(`[Slot ${this.slotNumber}] Unknown command action: ${action}`);
        }
      } catch (e) {
        console.error(`[Slot ${this.slotNumber}] Error sending command '${action}':`, e);
      }
    }

    // Handle incoming events from SRemote for this slot
    onSRemoteEvent(event, data) {
      const ev = String(event || '').toLowerCase();

      if (ev === 'accept') {
        this.setConnectionStatus('connected', this.t('status.conn_connected', { instanceId: this.instanceId }));
        this.setControlsEnabled(true);
        if (data.mediaType) {
          this.mediaState.mediaType = data.mediaType;
        }
        if (data.state) {
          this.updateMediaState(data.state);
        }
        return;
      }

      if (ev === 'disconnect' || ev === 'mediadisconnected') {
        const reason = data?.reason || ev;
        this.setConnectionStatus('disconnected', this.t('status.conn_disconnected', { reason }));
        this.setControlsEnabled(false);
        this.dom.mediaState.textContent = this.t('status.media_detached');
        return;
      }

      // If we receive any playback or media event while controls are still disabled, enable them
      if (this.dom.toggleBtn.disabled) {
        this.setConnectionStatus('connected', this.t('status.conn_connected', { instanceId: this.instanceId }));
        this.setControlsEnabled(true);
      }

      // Media State Events
      if (data?.state) {
        this.updateMediaState(data.state);
      }

      // Special event status notifications
      if (ev === 'error') {
        this.dom.mediaState.textContent = this.t('status.media_error');
        this.dom.badge.className = 'slot-badge badge-error';
        this.dom.badge.textContent = this.t('badge.error');
      } else if (ev === 'waiting' || ev === 'stalled') {
        this.dom.mediaState.textContent = this.t('status.media_buffering');
      } else if (ev === 'ended') {
        this.mediaState.paused = true;
        this.dom.toggleBtn.textContent = this.t('controls.play');
        this.dom.mediaState.textContent = this.t('status.media_ended');
      }
    }

    updateMediaState(state) {
      if (!state) return;
      Object.assign(this.mediaState, state);

      // 1. Play / Pause indicator & Toggle button text
      const isPaused = Boolean(state.paused);
      const isEnded = Boolean(state.ended);
      this.dom.toggleBtn.textContent = isPaused ? this.t('controls.play') : this.t('controls.pause');

      let statusStr = isEnded ? this.t('status.media_ended') : isPaused ? this.t('status.media_paused') : this.t('status.media_playing');

      if (this.mediaState.mediaType) {
        statusStr += ` [${this.mediaState.mediaType}]`;
      }
      this.dom.mediaState.textContent = statusStr;

      // 2. Time, Duration & Seek Slider
      const cur = typeof state.currentTime === 'number' ? state.currentTime : 0;
      const dur = typeof state.duration === 'number' ? state.duration : 0;

      if (!this.isUserSeeking) {
        const formattedCur = formatTime(cur, dur);
        const formattedDur = dur > 0 ? formatTime(dur, dur) : '--:--';
        this.dom.timeVal.textContent = `${formattedCur} / ${formattedDur}`;

        if (dur > 0) {
          this.dom.seekRange.max = String(dur);
          this.dom.seekRange.value = String(cur);
        } else {
          this.dom.seekRange.max = '0';
          this.dom.seekRange.value = '0';
        }
      }

      // 3. Volume
      if (typeof state.volume === 'number' && !this.isUserChangingVol) {
        this.dom.volRange.value = state.volume;
        this.dom.volVal.textContent = `${Math.round(state.volume * 100)}%`;
      }

      // 4. Mute status button text
      if (typeof state.muted === 'boolean') {
        this.dom.muteBtn.textContent = state.muted ? this.t('controls.unmute') : this.t('controls.mute');
      }

      // 5. Playback rate
      if (typeof state.playbackRate === 'number') {
        this.dom.rateSelect.value = String(state.playbackRate);
      }
    }

    setConnectionStatus(status, text) {
      this.connectionStatus = status;
      this.dom.connState.textContent = text;

      // Update badge class
      this.dom.badge.className = 'slot-badge';
      switch (status) {
        case 'connected':
          this.dom.badge.classList.add('badge-ready');
          this.dom.badge.textContent = this.t('badge.ready');
          break;
        case 'loading':
          this.dom.badge.classList.add('badge-waiting');
          this.dom.badge.textContent = this.t('badge.loading');
          break;
        case 'error':
        case 'disconnected':
          this.dom.badge.classList.add('badge-error');
          this.dom.badge.textContent = status === 'error' ? this.t('badge.error') : this.t('badge.disconnected');
          break;
        default:
          this.dom.badge.classList.add('badge-idle');
          this.dom.badge.textContent = this.t('badge.idle');
      }
    }

    setControlsEnabled(enabled) {
      const isDis = !enabled;
      this.dom.toggleBtn.disabled = isDis;
      this.dom.seekBackBtn.disabled = isDis;
      this.dom.seekFwdBtn.disabled = isDis;
      this.dom.seekRange.disabled = isDis;
      this.dom.muteBtn.disabled = isDis;
      this.dom.pipBtn.disabled = isDis;
      this.dom.fsBtn.disabled = isDis;
      this.dom.volRange.disabled = isDis;
      this.dom.rateSelect.disabled = isDis;
    }

    /**
     * Refresh text when language changed
     */
    refreshLanguage() {
      // Re-apply connection status string
      switch (this.connectionStatus) {
        case 'connected':
          this.setConnectionStatus('connected', this.t('status.conn_connected', { instanceId: this.instanceId }));
          break;
        case 'loading':
          this.setConnectionStatus('loading', this.t('status.conn_loading'));
          break;
        case 'error':
          this.setConnectionStatus('error', this.t('status.conn_error_userscript'));
          break;
        case 'disconnected':
          this.setConnectionStatus('disconnected', this.t('status.conn_disconnected', { reason: 'detached' }));
          break;
        default:
          this.setConnectionStatus('idle', this.t('status.conn_idle'));
      }

      // Re-apply media state text & button texts
      if (this.connectionStatus === 'connected') {
        this.updateMediaState(this.mediaState);
      } else {
        this.dom.mediaState.textContent = this.t('status.media_none');
      }
    }
  }

  // Orchestrator: Instantiate all 6 slots and connect global SRemote listener
  const slots = [];
  for (let i = 1; i <= TOTAL_SLOTS; i++) {
    slots.push(new SlotController(i));
  }

  // Setup Global SRemote Event Dispatcher
  function setupSRemoteListener() {
    if (!sremoteApi || typeof sremoteApi.on !== 'function') {
      // Retry in case userscript or client initializes slightly after DOMContentLoaded
      setTimeout(setupSRemoteListener, 200);
      return;
    }

    // Force multiMode across SRemote parent controller
    sremoteApi.setMultiMode?.(true);

    // Register wildcard listener to capture all lifecycle & media events
    sremoteApi.on('*', payload => {
      const action = payload.action || payload.event;
      const instanceId = payload.instanceId;

      if (instanceId) {
        // 1. Direct match by pre-assigned slot id (slot_1, slot_2, ...)
        const matchedSlot = slots.find(s => s.instanceId === instanceId);
        if (matchedSlot) {
          matchedSlot.onSRemoteEvent(action, payload);
          return;
        }

        // 2. Match via sremoteApi.getIframe(instanceId)
        if (typeof sremoteApi.getIframe === 'function') {
          try {
            const ifr = sremoteApi.getIframe(instanceId);
            if (ifr) {
              const slotByIfr = slots.find(s => s.iframeEl === ifr);
              if (slotByIfr) {
                slotByIfr.instanceId = instanceId; // Sync instance ID if dynamic
                slotByIfr.onSRemoteEvent(action, payload);
                return;
              }
            }
          } catch {}
        }
      }

      // 3. Fallback: If only 1 slot has an active iframe, route to that slot
      const activeSlots = slots.filter(s => !!s.iframeEl);
      if (activeSlots.length === 1) {
        if (instanceId) {
          activeSlots[0].instanceId = instanceId;
        }
        activeSlots[0].onSRemoteEvent(action, payload);
        return;
      }

      // 4. Fallback for accept event without matched slot: check existing iframes in list()
      if (action === 'accept' && typeof sremoteApi.list === 'function') {
        try {
          const list = sremoteApi.list();
          for (const item of list) {
            const ifr = sremoteApi.getIframe?.(item.instanceId);
            if (ifr) {
              const s = slots.find(slot => slot.iframeEl === ifr);
              if (s) {
                s.instanceId = item.instanceId;
                s.onSRemoteEvent('accept', item);
              }
            }
          }
        } catch {}
      }
    });

    // Periodic state synchronization check (re-enables controls if instance is already accepted/ready)
    setInterval(() => {
      if (typeof sremoteApi?.list === 'function') {
        try {
          const list = sremoteApi.list();
          for (const item of list) {
            if (!item.instanceId) continue;
            let targetSlot = slots.find(s => s.instanceId === item.instanceId);
            if (!targetSlot && typeof sremoteApi.getIframe === 'function') {
              const ifr = sremoteApi.getIframe(item.instanceId);
              if (ifr) {
                targetSlot = slots.find(s => s.iframeEl === ifr);
                if (targetSlot) targetSlot.instanceId = item.instanceId;
              }
            }
            if (targetSlot && targetSlot.connectionStatus !== 'connected') {
              targetSlot.onSRemoteEvent('accept', item);
            }
          }
        } catch {}
      }
    }, 1000);

    console.log('%c[SRemote Demo] Connected to SRemote SDK client', 'color: #10b981; font-weight: bold;');
  }

  // Setup Global Toolbar & Exclusive Mode Controller
  function setupGlobalToolbar() {
    const exclusiveBtnGroup = document.getElementById('exclusive-btn-group');
    const globalPlayAllBtn = document.getElementById('global-play-all');
    const globalPauseAllBtn = document.getElementById('global-pause-all');
    const globalMuteAllBtn = document.getElementById('global-mute-all');
    const globalUnmuteAllBtn = document.getElementById('global-unmute-all');
    const slotFilterSelect = document.getElementById('slot-filter-select');

    // 1. Exclusive Mode Selection Handler (Tắt, Auto, Slot 1..6)
    if (exclusiveBtnGroup) {
      const buttons = exclusiveBtnGroup.querySelectorAll('.btn-exclusive');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const rawMode = btn.dataset.mode;
          let mode = null;
          if (rawMode === 'auto') {
            mode = 'auto';
          } else if (rawMode && rawMode !== 'null') {
            mode = rawMode; // e.g. 'slot_1', 'slot_2', ...
          }

          if (sremoteApi && typeof sremoteApi.setExclusive === 'function') {
            try {
              sremoteApi.setExclusive(mode);
              console.log(`%c[SRemote Demo] Exclusive mode set to: ${mode}`, 'color: #0366d6; font-weight: bold;');
            } catch (err) {
              console.error('[SRemote Demo] Error setting exclusive mode:', err);
            }
          }
        });
      });
    }

    // 3. Global Play All
    if (globalPlayAllBtn) {
      globalPlayAllBtn.addEventListener('click', () => {
        slots.forEach(slot => {
          if (slot.connectionStatus === 'connected') {
            slot.sendSRemoteCommand('play');
          }
        });
      });
    }

    // 4. Global Pause All
    if (globalPauseAllBtn) {
      globalPauseAllBtn.addEventListener('click', () => {
        if (sremoteApi && typeof sremoteApi.pauseAll === 'function') {
          sremoteApi.pauseAll();
        } else {
          slots.forEach(slot => {
            if (slot.connectionStatus === 'connected') {
              slot.sendSRemoteCommand('pause');
            }
          });
        }
      });
    }

    // 5. Global Mute All
    if (globalMuteAllBtn) {
      globalMuteAllBtn.addEventListener('click', () => {
        slots.forEach(slot => {
          if (slot.connectionStatus === 'connected') {
            slot.sendSRemoteCommand('mute', true);
          }
        });
      });
    }

    // 6. Global Unmute All
    if (globalUnmuteAllBtn) {
      globalUnmuteAllBtn.addEventListener('click', () => {
        slots.forEach(slot => {
          if (slot.connectionStatus === 'connected') {
            slot.sendSRemoteCommand('mute', false);
          }
        });
      });
    }

    // 7. Slot Display Filter
    if (slotFilterSelect) {
      slotFilterSelect.addEventListener('change', () => {
        const val = slotFilterSelect.value;
        slots.forEach((slot, index) => {
          const slotNum = index + 1;
          let isVisible = true;

          if (val === '1-3') {
            isVisible = slotNum >= 1 && slotNum <= 3;
          } else if (val === '4-6') {
            isVisible = slotNum >= 4 && slotNum <= 6;
          } else if (val === 'active') {
            isVisible = slot.connectionStatus === 'connected' || slot.connectionStatus === 'loading';
          }

          if (isVisible) {
            slot.dom.panel.classList.remove('hidden');
          } else {
            slot.dom.panel.classList.add('hidden');
          }
        });
      });
    }
  }

  /**
   * Setup copy-to-clipboard handler for sample URLs section.
   */
  function setupSampleUrlsSection() {
    const copyButtons = document.querySelectorAll('.btn-copy');
    copyButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetId = btn.getAttribute('data-target');
        const codeEl = document.getElementById(targetId);
        if (!codeEl) return;

        const textToCopy = codeEl.textContent.trim();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textToCopy);
          } else {
            // Fallback for older browsers / non-HTTPS local contexts
            const textarea = document.createElement('textarea');
            textarea.value = textToCopy;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
          }

          const originalText = btn.textContent;
          const copiedText = window.i18n?.t('samples.copied') || 'Copied!';
          btn.textContent = copiedText;
          btn.classList.add('copied');

          setTimeout(() => {
            btn.textContent = window.i18n?.t('samples.btn_copy') || originalText;
            btn.classList.remove('copied');
          }, 1800);
        } catch (err) {
          console.warn('[SRemote Demo] Failed to copy sample URL:', err);
        }
      });
    });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    setupSRemoteListener();
    setupGlobalToolbar();
    setupSampleUrlsSection();

    // Listen for language changes and refresh all slots dynamic content
    window.i18n?.onLanguageChange(() => {
      slots.forEach(slot => slot.refreshLanguage());
    });

    // 1. Auto-load Slot 1 prefilled URL
    const slot1 = slots[0];
    if (slot1 && slot1.dom.urlInput.value) {
      slot1.loadUrl(slot1.dom.urlInput.value.trim());
    }

    // 2. Trigger independent standalone sremote.hello() handshake once DOM is fully ready
    if (sremoteApi && typeof sremoteApi.hello === 'function') {
      try {
        sremoteApi.setMultiMode?.(true);
        sremoteApi.hello({ multiMode: true });
        console.log('%c[SRemote Demo] Broadcasted standalone sremote.hello() on DOMContentLoaded', 'color: #0366d6;');
      } catch (err) {
        console.warn('[SRemote Demo] Failed to broadcast sremote.hello() on DOMContentLoaded:', err);
      }
    }
  });
})();

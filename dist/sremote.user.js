// ==UserScript==
// @name         SRemote Frame Controller
// @namespace    sweetsea.sremote
// @version      2.0.0
// @author       sweetsea
// @description  Allow a parent page to control media inside an iframe with permission.
// @license      LGPL-3.0
// @include      *
// @match        *://*/*
// @match        http://*/*
// @match        https://*/*
// @match        file:///*
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
	"use strict";
	var _GM_deleteValue = (() => typeof GM_deleteValue != "undefined" ? GM_deleteValue : void 0)();
	var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
	var _GM_listValues = (() => typeof GM_listValues != "undefined" ? GM_listValues : void 0)();
	var _GM_registerMenuCommand = (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
	var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
	var _unsafeWindow = (() => typeof unsafeWindow != "undefined" ? unsafeWindow : void 0)();
	function extractMediaState(media) {
		if (!media) return null;
		if (typeof media.getState === "function") try {
			return media.getState();
		} catch {}
		const curVol = media.volume !== void 0 ? media.volume : 1;
		const curMuted = media.muted !== void 0 ? media.muted : false;
		const curTime = media.currentTime !== void 0 ? media.currentTime : 0;
		const rawDur = media.duration;
		const curRate = media.playbackRate !== void 0 ? media.playbackRate : 1;
		const isPaused = media.paused !== void 0 ? typeof media.paused === "function" ? media.paused() : Boolean(media.paused) : true;
		const isEnded = media.ended !== void 0 ? Boolean(media.ended) : false;
		const curReadyState = media.readyState !== void 0 ? media.readyState : 0;
		const curSrc = media.currentSrc || media.src || "";
		const dur = Number.isFinite(rawDur) ? rawDur : null;
		let bufferedEnd = 0;
		try {
			const buf = media.buffered;
			if (buf && buf.length > 0) bufferedEnd = buf.end(buf.length - 1);
		} catch {}
		const isLoop = media.loop !== void 0 ? Boolean(media.loop) : false;
		const isFullscreen = typeof document !== "undefined" && Boolean(document.fullscreenElement && (document.fullscreenElement === media || document.fullscreenElement.contains(media)));
		const isPip = typeof document !== "undefined" && document.pictureInPictureElement === media;
		return {
			paused: isPaused,
			ended: Boolean(isEnded || dur && dur > 0 && curTime >= dur - .1),
			currentTime: curTime,
			duration: dur,
			buffered: bufferedEnd,
			volume: curVol,
			muted: curMuted,
			playbackRate: curRate,
			readyState: curReadyState,
			src: curSrc,
			loop: isLoop,
			repeat: isLoop ? "one" : "off",
			fullscreen: isFullscreen,
			pictureInPicture: isPip
		};
	}
	function createEventPayload(event, options = {}) {
		const ev = String(event || "").toLowerCase();
		const { instanceId = "unknown", source = "adapter", mediaType = "adapter", state = null, isProgrammatic = false, ...extra } = typeof options === "object" && options !== null ? options : { value: options };
		return {
			source,
			instanceId,
			mediaType,
			action: ev,
			isProgrammatic,
			...state ? { state } : {},
			...extra
		};
	}
	function evaluateCapabilities(target) {
		if (!target) return {
			play: false,
			pause: false,
			toggle: false,
			stop: false,
			seek: false,
			volume: false,
			muted: false,
			speed: false,
			playbackRate: false,
			pip: false,
			quality: false,
			subtitles: false,
			shuffle: false,
			repeat: false,
			next: false,
			previous: false,
			load: false,
			hasAdapter: false,
			hasNative: false,
			hasMediaSession: false
		};
		if (target.capabilities && typeof target.capabilities === "object") return { ...target.capabilities };
		const isVideo = Boolean(target.tagName === "VIDEO");
		const isAudio = Boolean(target.tagName === "AUDIO");
		const hasNative = isVideo || isAudio;
		const hasFn = (fnName) => Boolean(typeof target[fnName] === "function");
		return {
			play: hasNative || hasFn("play"),
			pause: hasNative || hasFn("pause"),
			toggle: hasNative || hasFn("toggle") || hasFn("play") && hasFn("pause"),
			stop: hasNative || hasFn("stop") || hasFn("pause"),
			seek: hasNative || hasFn("seek") || hasFn("seekTo") || hasFn("setCurrentTime"),
			volume: hasNative || hasFn("setVolume"),
			muted: hasNative || hasFn("setMuted"),
			speed: hasNative || hasFn("setPlaybackRate"),
			playbackRate: hasNative || hasFn("setPlaybackRate"),
			pip: isVideo && typeof document !== "undefined" && Boolean(document.pictureInPictureEnabled || target.requestPictureInPicture) || hasFn("requestPip") || hasFn("pip"),
			quality: hasFn("setQuality"),
			subtitles: Boolean(hasNative && target.textTracks && target.textTracks.length > 0) || hasFn("setSubtitle") || hasFn("getSubtitles"),
			shuffle: hasFn("setShuffle"),
			repeat: hasNative || hasFn("setRepeat"),
			next: hasFn("next"),
			previous: hasFn("previous"),
			load: hasNative || hasFn("load"),
			hasAdapter: !hasNative,
			hasNative,
			hasMediaSession: false
		};
	}
	var MEDIA_EVENTS = [
		"play",
		"pause",
		"playing",
		"ended",
		"timeupdate",
		"durationchange",
		"volumechange",
		"ratechange",
		"seeking",
		"seeked",
		"progress",
		"canplay",
		"canplaythrough",
		"waiting",
		"stalled",
		"emptied",
		"abort",
		"error",
		"loadeddata",
		"loadedmetadata",
		"loadstart",
		"suspend",
		"encrypted",
		"enterpictureinpicture",
		"exitpictureinpicture"
	];
	function wrapCustomAdapter(rawAdapter, options = {}) {
		if (!rawAdapter || typeof rawAdapter !== "object") return null;
		const { instanceId, onEmit, source = "adapter" } = options;
		const adapter = Object.create(rawAdapter);
		const originalEmit = typeof rawAdapter.emit === "function" ? rawAdapter.emit.bind(rawAdapter) : null;
		adapter.emit = (event, payload = {}) => {
			if (originalEmit) try {
				originalEmit(event, payload);
			} catch {}
			const ev = String(event || "").toLowerCase();
			const state = extractMediaState(adapter);
			const fullPayload = createEventPayload(ev, {
				source,
				instanceId,
				mediaType: "adapter",
				...state ? { state } : {},
				...typeof payload === "object" && payload !== null ? payload : { value: payload }
			});
			if (typeof onEmit === "function") try {
				onEmit(ev, fullPayload);
			} catch {}
		};
		if (typeof adapter.toggle !== "function" && typeof adapter.play === "function" && typeof adapter.pause === "function") adapter.toggle = async function() {
			if (typeof adapter.paused === "function" ? adapter.paused() : typeof adapter.paused === "boolean" ? adapter.paused : true) return adapter.play();
			else return adapter.pause();
		};
		if (!adapter.capabilities) adapter.capabilities = evaluateCapabilities(adapter);
		return adapter;
	}
	var VERSION = "2.0.0";
	var NS = "sremote:";
	var console_log = console.log.bind(console);
	var console_debug = console.debug.bind(console);
	var console_warn = console.warn.bind(console);
	var console_error = console.error.bind(console);
	var pageWindow = typeof _unsafeWindow !== "undefined" ? _unsafeWindow : window;
	var mediaProto = HTMLMediaElement.prototype;
	var descriptors = {
		volume: Object.getOwnPropertyDescriptor(mediaProto, "volume"),
		muted: Object.getOwnPropertyDescriptor(mediaProto, "muted"),
		currentTime: Object.getOwnPropertyDescriptor(mediaProto, "currentTime"),
		duration: Object.getOwnPropertyDescriptor(mediaProto, "duration"),
		paused: Object.getOwnPropertyDescriptor(mediaProto, "paused"),
		ended: Object.getOwnPropertyDescriptor(mediaProto, "ended"),
		playbackRate: Object.getOwnPropertyDescriptor(mediaProto, "playbackRate"),
		readyState: Object.getOwnPropertyDescriptor(mediaProto, "readyState"),
		currentSrc: Object.getOwnPropertyDescriptor(mediaProto, "currentSrc"),
		src: Object.getOwnPropertyDescriptor(mediaProto, "src"),
		buffered: Object.getOwnPropertyDescriptor(mediaProto, "buffered"),
		play: mediaProto.play,
		pause: mediaProto.pause
	};
	var GM$1 = {
		get: _GM_getValue,
		set: _GM_setValue,
		remove: _GM_deleteValue,
		list: _GM_listValues,
		register: typeof _GM_registerMenuCommand === "function" ? _GM_registerMenuCommand : null
	};
	var Storage = {
		get(key, defaultValue = null) {
			try {
				const val = GM$1.get(key, null);
				if (val !== void 0 && val !== null) return val;
			} catch {}
			return defaultValue;
		},
		set(key, value) {
			try {
				GM$1.set(key, value);
			} catch {}
		},
		remove(key) {
			try {
				GM$1.remove(key);
			} catch {}
		},
		list() {
			try {
				return GM$1.list() || [];
			} catch {
				return [];
			}
		},
		clearAllsremoteData() {
			const allKeys = this.list();
			for (const k of allKeys) if (typeof k === "string" && (k.startsWith("sremote:") || k.startsWith("sremote_"))) this.remove(k);
		}
	};
	var activeHandshakeSecrets = new Map();
	function setHandshakeSecret(handshakeId, token) {
		if (!handshakeId || !token) return;
		const record = {
			token,
			created: Date.now()
		};
		activeHandshakeSecrets.set(handshakeId, record);
		Storage.set(`sremote:hs_${handshakeId}`, record);
	}
	function checkHandshakeSecret(handshakeId, token, maxAgeMs = 3e4) {
		if (!handshakeId || !token) return false;
		const now = Date.now();
		const mem = activeHandshakeSecrets.get(handshakeId);
		if (mem && mem.token === token && now - (mem.created || 0) <= maxAgeMs) return true;
		const raw = Storage.get(`sremote:hs_${handshakeId}`);
		if (raw) try {
			const data = typeof raw === "string" ? JSON.parse(raw) : raw;
			if (data && data.token === token && now - (data.created || 0) <= maxAgeMs) return true;
		} catch {}
		return false;
	}
	function consumeHandshakeSecret(handshakeId) {
		if (!handshakeId) return;
		activeHandshakeSecrets.delete(handshakeId);
		Storage.remove(`sremote:hs_${handshakeId}`);
	}
	function purgeExpiredHandshakeSecrets(maxAgeMs = 6e4) {
		const now = Date.now();
		for (const [id, item] of activeHandshakeSecrets.entries()) if (now - (item.created || 0) > maxAgeMs) activeHandshakeSecrets.delete(id);
		try {
			const keys = Storage.list();
			for (const k of keys) if (typeof k === "string" && k.startsWith("sremote:hs_")) {
				const raw = Storage.get(k);
				if (!raw) {
					Storage.remove(k);
					continue;
				}
				try {
					const data = typeof raw === "string" ? JSON.parse(raw) : raw;
					if (!data || !data.created || now - data.created > maxAgeMs) Storage.remove(k);
				} catch {
					Storage.remove(k);
				}
			}
		} catch {}
	}
	try {
		purgeExpiredHandshakeSecrets();
		setInterval(purgeExpiredHandshakeSecrets, 6e4);
	} catch {}
	function safeGetProp(el, descriptor, fallbackProp) {
		if (!el) return void 0;
		try {
			if (descriptor?.get) return descriptor.get.call(el);
		} catch {}
		return el[fallbackProp];
	}
	function safeSetProp(el, descriptor, fallbackProp, val) {
		if (!el) return;
		try {
			if (descriptor?.set) {
				descriptor.set.call(el, val);
				return;
			}
		} catch {}
		try {
			el[fallbackProp] = val;
		} catch {}
	}
	function isPersistableOrigin(origin) {
		if (!origin || typeof origin !== "string") return false;
		const trimmed = origin.trim();
		if (!trimmed || trimmed === "null" || trimmed === "*" || trimmed === "unknown_parent") return false;
		if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return false;
		return true;
	}
	function getOriginStorageKeys(origin) {
		if (!isPersistableOrigin(origin)) return {
			allowKey: null,
			denyKey: null,
			hideBadgeKey: null
		};
		return {
			allowKey: `sremote:allow:${origin}`,
			denyKey: `sremote:deny:${origin}`,
			hideBadgeKey: `sremote:hide_badge:${origin}`
		};
	}
	function generateInstanceId(prefix = "sv") {
		return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
	}
	function createButton({ className, text, title, onClick }) {
		const btn = document.createElement("button");
		if (className) btn.className = className;
		if (text !== void 0 && text !== null) btn.textContent = text;
		if (title) btn.title = title;
		if (typeof onClick === "function") btn.addEventListener("click", (e) => {
			e.stopPropagation();
			e.preventDefault();
			onClick(e);
		});
		return btn;
	}
	var adapterPreviousVolumeMap = new WeakMap();
	async function executeAdapterAction(adapter, action, value = void 0, isPureGet = false) {
		if (!adapter || typeof adapter !== "object") return false;
		const norm = String(action || "").toLowerCase();
		try {
			switch (norm) {
				case "play":
					if (!isPureGet && typeof adapter.play === "function") await adapter.play();
					return true;
				case "pause":
					if (!isPureGet && typeof adapter.pause === "function") await adapter.pause();
					return true;
				case "toggle":
					if (!isPureGet) {
						if (typeof adapter.toggle === "function") await adapter.toggle();
						else if (typeof adapter.play === "function" && typeof adapter.pause === "function") {
							if (typeof adapter.paused === "function" ? adapter.paused() : typeof adapter.paused === "boolean" ? adapter.paused : true) await adapter.play();
							else await adapter.pause();
						}
					}
					return true;
				case "stop":
					if (!isPureGet) {
						if (typeof adapter.stop === "function") await adapter.stop();
						else {
							if (typeof adapter.pause === "function") await adapter.pause();
							if (typeof adapter.seekTo === "function") await adapter.seekTo(0);
						}
					}
					return true;
				case "seek":
					if (!isPureGet) {
						if (typeof adapter.seek === "function") await adapter.seek(Number(value));
						else if (typeof adapter.seekTo === "function" && typeof adapter.getCurrentTime === "function") {
							const cur = Number(await adapter.getCurrentTime() || 0);
							await adapter.seekTo(Math.max(0, cur + Number(value)));
						}
					}
					return true;
				case "currenttime":
				case "seekto":
					if (!isPureGet && typeof adapter.seekTo === "function") await adapter.seekTo(Number(value));
					return true;
				case "volume":
					if (!isPureGet) {
						const targetVol = Math.max(0, Math.min(1, Number(value)));
						if (targetVol > 0) adapterPreviousVolumeMap.set(adapter, targetVol);
						if (typeof adapter.setVolume === "function") {
							await adapter.setVolume(targetVol);
							if (typeof adapter.setMuted === "function") try {
								await adapter.setMuted(false);
							} catch {}
						} else if (adapter.mediaElement && (adapter.mediaElement.tagName === "AUDIO" || adapter.mediaElement.tagName === "VIDEO")) {
							adapter.mediaElement.volume = targetVol;
							adapter.mediaElement.muted = false;
						}
					}
					return true;
				case "muted":
				case "mute":
					if (!isPureGet) {
						const isMuted = Boolean(value);
						const prevVol = adapterPreviousVolumeMap.get(adapter) || 1;
						if (isMuted) {
							let curVol = 1;
							if (typeof adapter.getVolume === "function") try {
								curVol = Number(await adapter.getVolume());
							} catch {}
							else if (adapter.mediaElement) curVol = adapter.mediaElement.volume;
							if (curVol > 0) adapterPreviousVolumeMap.set(adapter, curVol);
						}
						if (typeof adapter.setMuted === "function") {
							await adapter.setMuted(isMuted);
							if (!isMuted && typeof adapter.setVolume === "function") try {
								if ((typeof adapter.getVolume === "function" ? await adapter.getVolume() : null) === 0) await adapter.setVolume(prevVol);
							} catch {}
						} else if (typeof adapter.setVolume === "function") await adapter.setVolume(isMuted ? 0 : prevVol);
						else if (adapter.mediaElement && (adapter.mediaElement.tagName === "AUDIO" || adapter.mediaElement.tagName === "VIDEO")) {
							adapter.mediaElement.muted = isMuted;
							if (!isMuted && adapter.mediaElement.volume === 0) adapter.mediaElement.volume = prevVol;
						}
					}
					return true;
				case "speed":
				case "rate":
				case "playbackrate":
					if (!isPureGet && typeof adapter.setPlaybackRate === "function") await adapter.setPlaybackRate(Number(value) || 1);
					return true;
				case "quality":
					if (!isPureGet && typeof adapter.setQuality === "function") await adapter.setQuality(value);
					return true;
				case "subtitle":
					if (!isPureGet && typeof adapter.setSubtitle === "function") await adapter.setSubtitle(value);
					return true;
				case "shuffle":
					if (!isPureGet && typeof adapter.setShuffle === "function") await adapter.setShuffle(value);
					return true;
				case "repeat":
					if (!isPureGet && typeof adapter.setRepeat === "function") await adapter.setRepeat(value);
					return true;
				case "next":
					if (!isPureGet && typeof adapter.next === "function") await adapter.next();
					return true;
				case "previous":
					if (!isPureGet && typeof adapter.previous === "function") await adapter.previous();
					return true;
				case "pip":
				case "enterpip":
				case "exitpip":
					if (!isPureGet) {
						if (typeof adapter.pip === "function") await adapter.pip(value);
						else if (typeof adapter.requestPip === "function") await adapter.requestPip(value);
					}
					return true;
				case "load":
					if (!isPureGet) {
						if (typeof adapter.load === "function") await adapter.load(value);
						else console_warn("[SRemote] load() is not implemented on this custom adapter.");
					}
					return true;
				default: return false;
			}
		} catch (err) {
			console_warn(`[sremote] Error executing adapter action '${action}':`, err);
			return true;
		}
	}
	var I18N = {
		vi: {
			dialogTitle: "SRemote: Cho phép điều khiển video?",
			dialogText: "Trang này muốn điều khiển media trong iframe thông qua SRemote.",
			rememberChoice: "Nhớ lựa chọn cho trang này",
			denyBtn: "Từ chối",
			allowBtn: "Đồng ý",
			keyDialogTitle: "🔑 SRemote: Passkey xác thực",
			keyDialogDesc: "Passkey đã được tạo cho {domain}:",
			keyDialogHint: "Passkey đã được tự động sao chép vào Clipboard. Dùng cho API hello({ key }).",
			copyKeyBtn: "Sao chép Key",
			copiedBtn: "Đã chép",
			closeBtn: "Đóng",
			badgeTooltipPrefix: "Trang ",
			badgeTooltipSuffix: "\nđang điều khiển video này qua SRemote",
			badgeDontShow: "Đừng hiện lại",
			badgeDontShowTitle: "Ẩn chỉ báo này cho trang hiện tại",
			badgeCloseTitle: "Ẩn",
			menuReset: "🔄 SRemote: Đặt lại quyền cho {domain}",
			menuUnhideBadge: "👁️ SRemote: Hiện lại tất cả Badge đã ẩn",
			menuClearAll: "🧹 SRemote: Xóa toàn bộ dữ liệu & quyền",
			menuGenerateKey: "🔑 SRemote: Tạo & Copy Passkey ({domain})",
			menuDeleteKey: "🗑️ SRemote: Xóa Passkey ({domain})",
			menuToggleLock: "🔒 SRemote: Khóa chủ động ({domain})",
			targetTop: "trang này (Top)",
			targetIframe: "iframe này",
			alertResetDone: "[SRemote] Đã reset quyền và chỉ báo cho: {origin}\n(Tải lại trang để áp dụng)",
			alertUnhideDone: "[SRemote] Đã khôi phục hiển thị tất cả các badge SRemote.",
			confirmClearAll: "[SRemote] Bạn có chắc muốn xóa toàn bộ quyền và cài đặt của SRemote?",
			alertClearDone: "[SRemote] Đã dọn dẹp sạch toàn bộ dữ liệu của SRemote.",
			alertKeyDeleted: "[SRemote] Đã xóa Passkey của {domain}.\n(Tải lại trang để áp dụng)",
			alertLockEnabled: "[SRemote] Đã kích hoạt Khóa SRemote cho {domain}.\nBất kỳ lệnh hello nào cũng bắt buộc phải có đúng Passkey!",
			alertLockDisabled: "[SRemote] Đã mở khóa SRemote cho {domain}."
		},
		en: {
			dialogTitle: "SRemote: Allow media control?",
			dialogText: "This page wants to control media inside the frame via SRemote.",
			rememberChoice: "Remember for this site",
			denyBtn: "Deny",
			allowBtn: "Allow",
			keyDialogTitle: "🔑 SRemote: Authentication Passkey",
			keyDialogDesc: "Generated Passkey for {domain}:",
			keyDialogHint: "Passkey copied to clipboard. Use it in hello({ key }).",
			copyKeyBtn: "Copy Key",
			copiedBtn: "Copied",
			closeBtn: "Close",
			badgeTooltipPrefix: "Page ",
			badgeTooltipSuffix: "\nis controlling this video via SRemote",
			badgeDontShow: "Don't show again",
			badgeDontShowTitle: "Hide this indicator for the current site",
			badgeCloseTitle: "Hide",
			menuReset: "🔄 SRemote: Reset permissions for {target}",
			menuUnhideBadge: "👁️ SRemote: Unhide all badges",
			menuClearAll: "🧹 SRemote: Clear all data & permissions",
			menuGenerateKey: "🔑 SRemote: Generate & Copy Passkey ({domain})",
			menuDeleteKey: "🗑️ SRemote: Delete Passkey ({domain})",
			menuToggleLock: "🔒 SRemote: Active Lock ({domain})",
			targetTop: "this site (Top)",
			targetIframe: "this iframe",
			alertResetDone: "[SRemote] Reset permissions and badges for: {origin}\n(Reload page to apply)",
			alertUnhideDone: "[SRemote] Restored display for all SRemote badges.",
			confirmClearAll: "[SRemote] Are you sure you want to clear all SRemote permissions and settings?",
			alertClearDone: "[SRemote] Cleaned up all SRemote data.",
			alertKeyDeleted: "[SRemote] Deleted Passkey for {domain}.\n(Reload page to apply)",
			alertLockEnabled: "[SRemote] Enabled SRemote Lock for {domain}.\nAny hello command now strictly requires valid Passkey!",
			alertLockDisabled: "[SRemote] Disabled SRemote Lock for {domain}."
		}
	};
	function t(key, params = {}) {
		let text = I18N[(navigator.language || navigator.userLanguage || "vi").toLowerCase().startsWith("vi") ? "vi" : "en"]?.[key] || I18N.en?.[key] || key;
		for (const [k, v] of Object.entries(params)) text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
		return text;
	}
	var theme_default = ":host {\r\n  all: initial;\r\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;\r\n  color-scheme: light dark;\r\n}\r\n\r\n.sv-btn,\r\n.sv-action-btn {\r\n  font-family: inherit;\r\n  cursor: pointer;\r\n  line-height: 1.2;\r\n  border: 1px solid #aeb7c2;\r\n  border-radius: 4px;\r\n  background: linear-gradient(to bottom, #fff 0%, #e7ebef 100%);\r\n  color: #263238;\r\n  box-shadow:\r\n    inset 0 1px 0 rgba(255, 255, 255, 0.85),\r\n    0 1px 2px rgba(0, 0, 0, 0.12);\r\n  transition:\r\n    background 0.12s ease,\r\n    border-color 0.12s ease,\r\n    box-shadow 0.12s ease,\r\n    transform 0.08s ease;\r\n  user-select: none;\r\n  display: inline-flex;\r\n  align-items: center;\r\n  justify-content: center;\r\n  gap: 6px;\r\n  text-decoration: none;\r\n}\r\n\r\n.sv-btn:hover,\r\n.sv-action-btn:hover {\r\n  background: linear-gradient(to bottom, #fff 0%, #dce2e8 100%);\r\n  color: #111820;\r\n  border-color: #8e9aa6;\r\n}\r\n\r\n.sv-btn:active,\r\n.sv-action-btn:active {\r\n  background: #d7dde3;\r\n  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.18);\r\n  transform: translateY(1px);\r\n}\r\n\r\n.sv-btn {\r\n  padding: 7px 16px;\r\n  font-size: 13px;\r\n  font-weight: 600;\r\n}\r\n\r\n.sv-action-btn {\r\n  font-size: 11px;\r\n  padding: 4px 8px;\r\n}\r\n\r\n.sv-btn-deny {\r\n  color: #374151;\r\n}\r\n\r\n.sv-btn-allow,\r\n.sv-btn-primary {\r\n  background: linear-gradient(to bottom, #4da3d9 0%, #2479b3 100%);\r\n  color: #fff;\r\n  border-color: #1e6597;\r\n  text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.25);\r\n}\r\n\r\n.sv-btn-allow:hover,\r\n.sv-btn-primary:hover {\r\n  background: linear-gradient(to bottom, #5eb0e3 0%, #2b84be 100%);\r\n  border-color: #195d8d;\r\n  color: #fff;\r\n}\r\n\r\n.sv-btn-allow:active,\r\n.sv-btn-primary:active {\r\n  background: #2479b3;\r\n  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.25);\r\n}\r\n\r\n.sv-link {\r\n  color: #1769aa;\r\n  text-decoration: underline;\r\n  word-break: break-all;\r\n}\r\n\r\n.sv-link:hover {\r\n  color: #0b4f82;\r\n}\r\n\r\n@media (prefers-color-scheme: dark) {\r\n  .sv-btn,\r\n  .sv-action-btn {\r\n    border-color: #59636e;\r\n    background: linear-gradient(to bottom, #3b4249 0%, #2d3339 100%);\r\n    color: #e4e8eb;\r\n    box-shadow:\r\n      inset 0 1px 0 rgba(255, 255, 255, 0.08),\r\n      0 1px 2px rgba(0, 0, 0, 0.35);\r\n  }\r\n\r\n  .sv-btn:hover,\r\n  .sv-action-btn:hover {\r\n    background: linear-gradient(to bottom, #464e56 0%, #353c43 100%);\r\n    color: #fff;\r\n    border-color: #707b86;\r\n  }\r\n\r\n  .sv-btn:active,\r\n  .sv-action-btn:active {\r\n    background: #292f35;\r\n  }\r\n\r\n  .sv-btn-deny {\r\n    color: #d5dbe0;\r\n  }\r\n\r\n  .sv-btn-allow,\r\n  .sv-btn-primary {\r\n    background: linear-gradient(to bottom, #3d96cb 0%, #246e9c 100%);\r\n    border-color: #1d5b83;\r\n    color: #fff;\r\n  }\r\n\r\n  .sv-btn-allow:hover,\r\n  .sv-btn-primary:hover {\r\n    background: linear-gradient(to bottom, #4ba4d8 0%, #2b7bab 100%);\r\n    color: #fff;\r\n  }\r\n\r\n  .sv-link {\r\n    color: #5eb5e6;\r\n  }\r\n\r\n  .sv-link:hover {\r\n    color: #82c9ed;\r\n  }\r\n}\r\n";
	var modal_default = "dialog {\r\n  position: fixed;\r\n  inset: 0;\r\n  margin: auto;\r\n  border: none;\r\n  background: transparent;\r\n  color: #263238;\r\n  font-size: 13.5px;\r\n  box-sizing: border-box;\r\n  z-index: 2147483647;\r\n  display: flex;\r\n  align-items: center;\r\n  justify-content: center;\r\n}\r\n\r\ndialog:not([open]) {\r\n  display: none;\r\n}\r\n\r\ndialog::backdrop {\r\n  background: rgba(0, 0, 0, 0.52);\r\n  backdrop-filter: blur(1px);\r\n}\r\n\r\n.sv-box {\r\n  width: min(420px, calc(100vw - 32px));\r\n  padding: 18px 20px;\r\n  box-sizing: border-box;\r\n  background: #f7f8fa;\r\n  border: 1px solid #aeb7c2;\r\n  border-radius: 6px;\r\n  box-shadow:\r\n    0 8px 25px rgba(0, 0, 0, 0.35),\r\n    inset 0 1px 0 rgba(255, 255, 255, 0.9);\r\n  pointer-events: auto;\r\n}\r\n\r\n.sv-title {\r\n  font-weight: 700;\r\n  font-size: 15px;\r\n  margin-bottom: 8px;\r\n  color: #1769aa;\r\n}\r\n\r\n.sv-text {\r\n  margin-bottom: 14px;\r\n  color: #4b5563;\r\n  font-size: 13px;\r\n  line-height: 1.5;\r\n}\r\n\r\n.sv-remember {\r\n  display: inline-flex;\r\n  align-items: center;\r\n  gap: 8px;\r\n  margin-bottom: 18px;\r\n  font-size: 12.5px;\r\n  cursor: pointer;\r\n  user-select: none;\r\n  color: #5b6570;\r\n  pointer-events: auto;\r\n}\r\n\r\n.sv-remember:hover {\r\n  color: #263238;\r\n}\r\n\r\n.sv-remember input {\r\n  cursor: pointer;\r\n  margin: 0;\r\n  accent-color: #2479b3;\r\n  pointer-events: auto;\r\n  appearance: checkbox;\r\n  -webkit-appearance: checkbox;\r\n  width: 15px;\r\n  height: 15px;\r\n  opacity: 1;\r\n  position: static;\r\n  z-index: auto;\r\n  vertical-align: middle;\r\n}\r\n\r\n.sv-remember span {\r\n  pointer-events: auto;\r\n  user-select: none;\r\n}\r\n\r\n.sv-buttons {\r\n  display: flex;\r\n  gap: 8px;\r\n  justify-content: flex-end;\r\n}\r\n\r\n@media (prefers-color-scheme: dark) {\r\n  dialog {\r\n    color: #e4e8eb;\r\n  }\r\n\r\n  .sv-box {\r\n    background: #292f35;\r\n    color: #e5e9ec;\r\n    border-color: #59636e;\r\n    box-shadow:\r\n      0 8px 28px rgba(0, 0, 0, 0.7),\r\n      inset 0 1px 0 rgba(255, 255, 255, 0.05);\r\n  }\r\n\r\n  .sv-title {\r\n    color: #5eb5e6;\r\n  }\r\n\r\n  .sv-text {\r\n    color: #b9c1c8;\r\n  }\r\n\r\n  .sv-remember {\r\n    color: #aeb7bf;\r\n  }\r\n\r\n  .sv-remember:hover {\r\n    color: #e5e9ec;\r\n  }\r\n\r\n  .sv-remember input {\r\n    accent-color: #5eb5e6;\r\n  }\r\n}\r\n";
	var styles_default = "/* Userscript-specific Badge & Floating UI styles */\r\n.sv-badge-wrapper {\r\n  position: fixed;\r\n  left: 10px;\r\n  bottom: 10px;\r\n  z-index: 2147483646;\r\n  display: inline-flex;\r\n  align-items: center;\r\n  gap: 6px;\r\n  background: #f4f6f8;\r\n  color: #263238;\r\n  font-size: 11px;\r\n  font-weight: 500;\r\n  padding: 4px 8px;\r\n  border: 1px solid #aeb7c2;\r\n  border-radius: 3px;\r\n  box-shadow:\r\n    0 1px 3px rgba(0, 0, 0, 0.18),\r\n    inset 0 1px 0 rgba(255, 255, 255, 0.8);\r\n  user-select: none;\r\n  opacity: 0.9;\r\n  transition:\r\n    opacity 0.12s ease,\r\n    border-color 0.12s ease,\r\n    box-shadow 0.12s ease;\r\n}\r\n\r\n.sv-badge-wrapper:hover {\r\n  opacity: 1;\r\n  border-color: #7f8b97;\r\n  box-shadow:\r\n    0 2px 6px rgba(0, 0, 0, 0.22),\r\n    inset 0 1px 0 rgba(255, 255, 255, 0.9);\r\n}\r\n\r\n.sv-dot-btn {\r\n  width: 8px;\r\n  height: 8px;\r\n  background: #28a745;\r\n  border-radius: 50%;\r\n  display: inline-flex;\r\n  align-items: center;\r\n  justify-content: center;\r\n  cursor: pointer;\r\n  font-size: 9px;\r\n  line-height: 1;\r\n  font-weight: 700;\r\n  color: transparent;\r\n  border: none;\r\n  padding: 0;\r\n  transition:\r\n    width 0.12s ease,\r\n    height 0.12s ease,\r\n    background 0.12s ease,\r\n    color 0.12s ease;\r\n}\r\n\r\n.sv-badge-wrapper:hover .sv-dot-btn {\r\n  width: 14px;\r\n  height: 14px;\r\n  background: #9b2c2c;\r\n  color: #f7c5c5;\r\n}\r\n\r\n.sv-badge-wrapper:hover .sv-dot-btn:hover {\r\n  background: #c0392b;\r\n  color: #fff;\r\n}\r\n\r\n.sv-label {\r\n  cursor: pointer;\r\n  color: #263238;\r\n  font-weight: 600;\r\n}\r\n\r\n.sv-actions {\r\n  display: none;\r\n  align-items: center;\r\n  gap: 4px;\r\n  margin-left: 2px;\r\n  padding-left: 6px;\r\n  border-left: 1px solid #c5cbd1;\r\n}\r\n\r\n.sv-badge-wrapper:hover .sv-actions {\r\n  display: inline-flex;\r\n}\r\n\r\n.sv-tooltip {\r\n  display: none;\r\n  position: absolute;\r\n  left: 0;\r\n  bottom: 100%;\r\n  padding-bottom: 5px;\r\n  pointer-events: auto;\r\n  min-width: 280px;\r\n  max-width: min(450px, calc(100vw - 32px));\r\n  box-sizing: border-box;\r\n}\r\n\r\n.sv-tooltip-inner {\r\n  background: #fff;\r\n  color: #374151;\r\n  font-size: 11px;\r\n  line-height: 1.5;\r\n  padding: 9px 11px;\r\n  border: 1px solid #aeb7c2;\r\n  border-radius: 3px;\r\n  box-shadow:\r\n    0 3px 10px rgba(0, 0, 0, 0.22),\r\n    inset 0 1px 0 rgba(255, 255, 255, 0.8);\r\n  white-space: pre-line;\r\n  word-break: break-word;\r\n}\r\n\r\n.sv-badge-wrapper:hover .sv-tooltip,\r\n.sv-tooltip:hover {\r\n  display: block;\r\n}\r\n\r\n@media (prefers-color-scheme: dark) {\r\n  .sv-badge-wrapper {\r\n    background: #292f35;\r\n    color: #e5e9ec;\r\n    border-color: #59636e;\r\n    box-shadow:\r\n      0 2px 6px rgba(0, 0, 0, 0.45),\r\n      inset 0 1px 0 rgba(255, 255, 255, 0.05);\r\n  }\r\n\r\n  .sv-badge-wrapper:hover {\r\n    border-color: #707b86;\r\n    box-shadow:\r\n      0 3px 9px rgba(0, 0, 0, 0.55),\r\n      inset 0 1px 0 rgba(255, 255, 255, 0.06);\r\n  }\r\n\r\n  .sv-label {\r\n    color: #e5e9ec;\r\n  }\r\n\r\n  .sv-actions {\r\n    border-left-color: #4b555f;\r\n  }\r\n\r\n  .sv-tooltip-inner {\r\n    background: #292f35;\r\n    color: #d5dbe0;\r\n    border-color: #59636e;\r\n    box-shadow:\r\n      0 4px 12px rgba(0, 0, 0, 0.55),\r\n      inset 0 1px 0 rgba(255, 255, 255, 0.04);\r\n  }\r\n}\r\n";
	var COMBINED_CSS = `${theme_default}\n${modal_default}\n${styles_default}`;
	function createModal({ titleText = "SRemote", bodyElement = null, bodyText = "", buttons = [], onClose = null, isTop = false, hostId = null }) {
		const host = document.createElement("div");
		host.id = hostId || (isTop ? "sremote-top-modal-host" : "sremote-modal-host");
		const shadow = host.attachShadow({ mode: "closed" });
		const style = document.createElement("style");
		style.textContent = COMBINED_CSS;
		const dialog = document.createElement("dialog");
		const box = document.createElement("div");
		box.className = "sv-box";
		const title = document.createElement("div");
		title.className = "sv-title";
		title.textContent = titleText;
		box.append(title);
		if (bodyText) {
			const text = document.createElement("div");
			text.className = "sv-text";
			text.textContent = bodyText;
			box.append(text);
		}
		if (bodyElement) box.append(bodyElement);
		const buttonsContainer = document.createElement("div");
		buttonsContainer.className = "sv-buttons";
		function close(result) {
			try {
				dialog.close();
			} catch {}
			host.remove();
			onClose?.(result);
		}
		if (buttons.length > 0) {
			buttons.forEach((btnConfig) => {
				const btn = createButton({
					className: `sv-btn ${btnConfig.className || ""}`.trim(),
					text: btnConfig.text,
					onClick: (e) => {
						if (btnConfig.onClick) btnConfig.onClick(e, { close });
						else close(btnConfig.value);
					}
				});
				buttonsContainer.append(btn);
			});
			box.append(buttonsContainer);
		}
		dialog.append(box);
		shadow.append(style, dialog);
		dialog.addEventListener("cancel", (e) => {
			e.preventDefault();
		});
		const mountHost = () => {
			const targetMount = document.body || document.documentElement;
			if (targetMount && !host.isConnected) targetMount.appendChild(host);
		};
		mountHost();
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountHost, { once: true });
		try {
			dialog.showModal();
		} catch {
			dialog.setAttribute("open", "");
		}
		return {
			host,
			dialog,
			box,
			close
		};
	}
	var activeKeyDialogHost = null;
	function copyText(text) {
		try {
			if (typeof GM_setClipboard === "function") {
				GM_setClipboard(text, "text");
				return Promise.resolve();
			}
		} catch {}
		if (navigator?.clipboard?.writeText) return navigator.clipboard.writeText(text).catch(() => {});
		return Promise.resolve();
	}
	function showPasskeyDialog({ domain, key }) {
		if (activeKeyDialogHost) {
			try {
				activeKeyDialogHost.remove();
			} catch {}
			activeKeyDialogHost = null;
		}
		const container = document.createElement("div");
		container.style.display = "flex";
		container.style.flexDirection = "column";
		container.style.gap = "10px";
		container.style.marginBottom = "14px";
		const desc = document.createElement("div");
		desc.className = "sv-text";
		desc.style.marginBottom = "0";
		desc.textContent = t("keyDialogDesc", { domain });
		const inputRow = document.createElement("div");
		inputRow.style.display = "flex";
		inputRow.style.gap = "8px";
		inputRow.style.alignItems = "stretch";
		const keyInput = document.createElement("input");
		keyInput.type = "text";
		keyInput.readOnly = true;
		keyInput.value = key;
		keyInput.style.flex = "1";
		keyInput.style.padding = "7px 10px";
		keyInput.style.border = "1px dashed #aeb7c2";
		keyInput.style.borderRadius = "4px";
		keyInput.style.background = "rgba(0, 0, 0, 0.05)";
		keyInput.style.color = "inherit";
		keyInput.style.fontFamily = "monospace, monospace";
		keyInput.style.fontSize = "13px";
		keyInput.style.fontWeight = "700";
		keyInput.style.letterSpacing = "0.5px";
		keyInput.style.outline = "none";
		keyInput.style.boxSizing = "border-box";
		keyInput.addEventListener("click", () => {
			keyInput.select();
		});
		const inlineCopyBtn = document.createElement("button");
		inlineCopyBtn.type = "button";
		inlineCopyBtn.className = "sv-btn sv-btn-allow";
		inlineCopyBtn.style.padding = "6px 12px";
		inlineCopyBtn.style.whiteSpace = "nowrap";
		inlineCopyBtn.style.fontSize = "12px";
		inlineCopyBtn.textContent = t("copyKeyBtn");
		const handleCopy = (btnElement) => {
			copyText(key);
			keyInput.select();
			if (btnElement) {
				const orig = btnElement.textContent;
				btnElement.textContent = `✓ ${t("copiedBtn")}`;
				setTimeout(() => {
					if (btnElement) btnElement.textContent = orig;
				}, 1500);
			}
		};
		inlineCopyBtn.addEventListener("click", () => {
			handleCopy(inlineCopyBtn);
		});
		inputRow.append(keyInput, inlineCopyBtn);
		const hint = document.createElement("div");
		hint.style.fontSize = "11.5px";
		hint.style.color = "#64748b";
		hint.textContent = t("keyDialogHint");
		container.append(desc, inputRow, hint);
		const modal = createModal({
			titleText: t("keyDialogTitle"),
			bodyElement: container,
			isTop: true,
			hostId: "sremote-key-dialog-host",
			buttons: [{
				className: "sv-btn-deny",
				text: t("closeBtn"),
				onClick: (_, { close }) => {
					close();
				}
			}],
			onClose: () => {
				activeKeyDialogHost = null;
			}
		});
		activeKeyDialogHost = modal.host;
		copyText(key);
		return modal;
	}
	function registerMenuCommands() {
		try {
			if (!GM$1.register) return;
			const origin = location.origin;
			const hostDomain = location.hostname || "this_domain";
			const domainKeyStorage = `sremote:passkey:${hostDomain}`;
			const domainLockStorage = `sremote:locked:${hostDomain}`;
			GM$1.register(t("menuGenerateKey", { domain: hostDomain }), () => {
				const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
				const randomBlock = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * 36)]).join("");
				const currentKey = `SR-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
				Storage.set(domainKeyStorage, currentKey);
				showPasskeyDialog({
					domain: hostDomain,
					key: currentKey
				});
			});
			GM$1.register(t("menuDeleteKey", { domain: hostDomain }), () => {
				Storage.remove(domainKeyStorage);
				alert(t("alertKeyDeleted", { domain: hostDomain }));
			});
			GM$1.register(t("menuToggleLock", { domain: hostDomain }), () => {
				if (Storage.get(domainLockStorage) === "1") {
					Storage.remove(domainLockStorage);
					alert(t("alertLockDisabled", { domain: hostDomain }));
				} else {
					Storage.set(domainLockStorage, "1");
					alert(t("alertLockEnabled", { domain: hostDomain }));
				}
			});
			GM$1.register(t("menuReset", { target: t("targetTop") }), () => {
				const { allowKey, denyKey, hideBadgeKey } = getOriginStorageKeys(origin);
				[
					allowKey,
					denyKey,
					hideBadgeKey
				].forEach((k) => k && Storage.remove(k));
				alert(t("alertResetDone", { origin }));
			});
			GM$1.register(t("menuUnhideBadge"), () => {
				Storage.list().forEach((k) => {
					if (k && (k.startsWith("sremote:hide_badge:") || k === "sremote:hide_badge")) Storage.remove(k);
				});
				alert(t("alertUnhideDone"));
			});
			GM$1.register(t("menuClearAll"), () => {
				if (!confirm(t("confirmClearAll"))) return;
				Storage.clearAllsremoteData();
				alert(t("alertClearDone"));
			});
		} catch (e) {
			console_warn("[sremote] Failed to register menu commands:", e);
		}
	}
	var pendingCommandQueue = [];
	var pendingRpcRequests = new Map();
	function flushPendingCommands(forInstanceId, port, isMultiModeActive) {
		if (!port || pendingCommandQueue.length === 0) return;
		const now = Date.now();
		const MAX_AGE = 1e4;
		const remaining = [];
		const dedupedMap = new Map();
		for (const cmd of pendingCommandQueue) {
			if (now - cmd.timestamp > MAX_AGE) {
				cmd.resolve?.({
					success: false,
					error: "TIMEOUT",
					message: "Command timed out waiting for iframe handshake",
					instanceId: cmd.targetInstanceId,
					action: cmd.action
				});
				continue;
			}
			if (!cmd.targetInstanceId || cmd.targetInstanceId === forInstanceId || !isMultiModeActive()) {
				const act = String(cmd.action || "").toLowerCase();
				if (act === "play" || act === "pause" || act === "toggle" || act === "stop") {
					const old = dedupedMap.get("playback");
					if (old) old.resolve?.({
						success: true,
						superseded: true,
						instanceId: forInstanceId
					});
					dedupedMap.set("playback", cmd);
				} else dedupedMap.set(act, cmd);
			} else remaining.push(cmd);
		}
		const sortedActions = Array.from(dedupedMap.values()).sort((a, b) => {
			return [
				"play",
				"pause",
				"toggle",
				"stop"
			].includes(String(a.action || "").toLowerCase()) - [
				"play",
				"pause",
				"toggle",
				"stop"
			].includes(String(b.action || "").toLowerCase());
		});
		for (const cmd of sortedActions) try {
			port.postMessage({
				type: `${NS}${cmd.action}`,
				source: "parent",
				value: cmd.value
			});
			cmd.resolve?.({
				success: true,
				instanceId: forInstanceId,
				action: cmd.action
			});
			console_log(`%c[SRemote:queue] Flushed deduplicated command -> ${cmd.action}`, "color: #10b981; font-weight: bold;", {
				value: cmd.value,
				instanceId: forInstanceId
			});
		} catch (e) {
			console_warn("[sremote:queue] Error flushing command:", e);
			cmd.resolve?.({
				success: false,
				error: "PORT_ERROR",
				message: String(e),
				instanceId: forInstanceId
			});
		}
		pendingCommandQueue.length = 0;
		for (const r of remaining) pendingCommandQueue.push(r);
	}
	function setupLivenessReaper(instances, removeInstance, iframeToAssignedIdMap) {
		const reaperInterval = setInterval(() => {
			const now = Date.now();
			const PING_THRESHOLD = 2e3;
			const DEAD_TIMEOUT = 4500;
			for (const [id, item] of instances.entries()) {
				if (item.iframeEl && !item.iframeEl.isConnected) {
					console_log(`%c[SRemote:lifecycle] Iframe DOM detached for instance '${id}'. Reaping immediately.`, "color: #ef4444;");
					removeInstance(id, "iframe_dom_detached");
					continue;
				}
				const elapsed = now - (item.lastSeen || 0);
				if (elapsed > DEAD_TIMEOUT) {
					console_warn(`[sremote] Instance '${id}' timed out (${elapsed}ms without signal). Reaping...`);
					removeInstance(id, "timeout");
				} else if (elapsed > PING_THRESHOLD) try {
					item.port?.postMessage({
						type: `${NS}ping`,
						source: "parent"
					});
				} catch {
					removeInstance(id, "port_error");
				}
			}
			if (pendingCommandQueue.length > 0) {
				const remainingCmds = [];
				for (const cmd of pendingCommandQueue) if (now - cmd.timestamp > 1e4) cmd.resolve?.({
					success: false,
					error: "TIMEOUT",
					message: "Command timed out waiting for iframe handshake",
					instanceId: cmd.targetInstanceId,
					action: cmd.action
				});
				else remainingCmds.push(cmd);
				pendingCommandQueue.length = 0;
				for (const r of remainingCmds) pendingCommandQueue.push(r);
			}
		}, 1500);
		const parentIframeObserver = new MutationObserver((mutations) => {
			for (const m of mutations) if (m.removedNodes.length > 0) for (let i = 0; i < m.removedNodes.length; i++) {
				const node = m.removedNodes[i];
				if (node.nodeType === 1) {
					if (node.tagName === "IFRAME") {
						const assignedId = iframeToAssignedIdMap.get(node) || node.getAttribute?.("data-sremote-id");
						if (assignedId && instances.has(assignedId)) {
							console_log(`%c[SRemote:lifecycle] Iframe node removed from DOM: ${assignedId}`, "color: #ef4444;");
							removeInstance(assignedId, "dom_removed");
						}
					} else if (node.querySelectorAll) {
						const subIframes = node.querySelectorAll("iframe");
						for (let j = 0; j < subIframes.length; j++) {
							const subIfr = subIframes[j];
							const assignedId = iframeToAssignedIdMap.get(subIfr) || subIfr.getAttribute?.("data-sremote-id");
							if (assignedId && instances.has(assignedId)) removeInstance(assignedId, "dom_removed");
						}
					}
				}
			}
		});
		const mountTarget = document.documentElement || document;
		if (mountTarget) parentIframeObserver.observe(mountTarget, {
			childList: true,
			subtree: true
		});
		return { destroy: () => {
			clearInterval(reaperInterval);
			parentIframeObserver.disconnect();
		} };
	}
	var SRemoteDebugUtils = {
		createWavBlob(samples, sampleRate = 44100, numChannels = 1) {
			const buffer = new ArrayBuffer(44 + samples.length * 2);
			const view = new DataView(buffer);
			const writeString = (offset, string) => {
				for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
			};
			writeString(0, "RIFF");
			view.setUint32(4, 36 + samples.length * 2, true);
			writeString(8, "WAVE");
			writeString(12, "fmt ");
			view.setUint32(16, 16, true);
			view.setUint16(20, 1, true);
			view.setUint16(22, numChannels, true);
			view.setUint32(24, sampleRate, true);
			view.setUint32(28, sampleRate * numChannels * 2, true);
			view.setUint16(32, numChannels * 2, true);
			view.setUint16(34, 16, true);
			writeString(36, "data");
			view.setUint32(40, samples.length * 2, true);
			let offset = 44;
			for (let i = 0; i < samples.length; i++, offset += 2) {
				const s = Math.max(-1, Math.min(1, samples[i]));
				view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
			}
			return new Blob([view], { type: "audio/wav" });
		},
		createToneBlob(freq = 440, durationSeconds = 3, sampleRate = 44100) {
			const totalSamples = Math.floor(sampleRate * durationSeconds);
			const samples = new Float32Array(totalSamples);
			const angularFreq = 2 * Math.PI * freq;
			for (let i = 0; i < totalSamples; i++) {
				const t = i / sampleRate;
				let envelope = 1;
				if (t < .05) envelope = t / .05;
				else if (t > durationSeconds - .05) envelope = (durationSeconds - t) / .05;
				samples[i] = Math.sin(angularFreq * t) * .7 * envelope;
			}
			return this.createWavBlob(samples, sampleRate, 1);
		},
		createSilentBlob(durationSeconds = 5, sampleRate = 44100) {
			const totalSamples = Math.floor(sampleRate * durationSeconds);
			const samples = new Float32Array(totalSamples);
			return this.createWavBlob(samples, sampleRate, 1);
		},
		createNoiseBlob(durationSeconds = 3, sampleRate = 44100) {
			const totalSamples = Math.floor(sampleRate * durationSeconds);
			const samples = new Float32Array(totalSamples);
			for (let i = 0; i < totalSamples; i++) samples[i] = (Math.random() * 2 - 1) * .3;
			return this.createWavBlob(samples, sampleRate, 1);
		},
		SAMPLE_VIDEO_URL: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
	};
	function createParentDebugApi({ instances, currentActiveInstanceIdGetter, assignedIframeIdMap, iframeToAssignedIdMap, dispatchCommand, exportedApi }) {
		return Object.freeze({
			scan: async () => {
				const iframes = Array.from(document.querySelectorAll("iframe"));
				const report = [];
				for (let i = 0; i < iframes.length; i++) {
					const ifr = iframes[i];
					const assignedId = ifr.getAttribute("data-sremote-id") || iframeToAssignedIdMap.get(ifr) || `unregistered_#${i + 1}`;
					const inst = instances.get(assignedId);
					let state = inst?.state || null;
					let isConnected = !!inst?.port;
					let mediaType = inst?.mediaType || null;
					report.push({
						index: i,
						instanceId: assignedId,
						src: ifr.src || "(about:blank or dynamic)",
						connected: isConnected,
						mediaType: mediaType || "unknown",
						hasActiveMedia: !!state,
						paused: state?.paused ?? "unknown",
						currentTime: state?.currentTime ? Number(state.currentTime).toFixed(2) : 0,
						duration: state?.duration ? Number(state.duration).toFixed(2) : 0
					});
				}
				console.log("%c[sremote.debug] Frame & Media Scan Result:", "color: #38bdf8; font-weight: bold;");
				console.table(report);
				return report;
			},
			getMediaElement: (instanceId = null) => {
				const targetId = instanceId || currentActiveInstanceIdGetter() || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
				if (!targetId) {
					console.warn("[sremote.debug] No target instance ID found.");
					return null;
				}
				const iframeEl = instances.get(targetId)?.iframeEl || assignedIframeIdMap.get(targetId);
				if (!iframeEl) {
					console.warn(`[sremote.debug] Iframe element not found in Parent DOM for instance '${targetId}'.`);
					return null;
				}
				try {
					if (iframeEl.contentDocument) {
						const innerMedia = iframeEl.contentDocument.querySelector("video, audio");
						if (innerMedia) return innerMedia;
					}
				} catch {}
				return iframeEl;
			},
			inspect: (instanceId = null) => {
				const el = exportedApi.debug.getMediaElement(instanceId);
				if (el) {
					console.log("%c[sremote.debug.inspect] Target Element:", "color: #10b981; font-weight: bold;", el);
					if (typeof inspect === "function") inspect(el);
				}
				return el;
			},
			getState: async (instanceId = null) => {
				const targetId = instanceId || currentActiveInstanceIdGetter() || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
				if (!targetId) {
					console.warn("[sremote.debug] No target instance found.");
					return null;
				}
				try {
					const res = await exportedApi.call("debug_getState", {}, targetId);
					return res?.data || res;
				} catch (err) {
					const inst = instances.get(targetId);
					return {
						instanceId: targetId,
						state: inst?.state || null,
						mediaType: inst?.mediaType || null,
						capabilities: inst?.capabilities || null,
						error: String(err)
					};
				}
			},
			capabilities: (instanceId = null) => exportedApi.capabilities(instanceId, "__DEBUG_BYPASS__"),
			getCapabilities: (instanceId = null) => exportedApi.capabilities(instanceId, "__DEBUG_BYPASS__"),
			dump: async (instanceId = null) => {
				const targetId = instanceId || currentActiveInstanceIdGetter() || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
				const data = await exportedApi.debug.getState(targetId);
				console.log(`%c[sremote.debug] Detailed Dump for '${targetId}':`, "color: #10b981; font-weight: bold;");
				if (data?.mediaElements) {
					console.log("Media Elements:");
					console.table(data.mediaElements);
				}
				if (data?.mediaSession) console.log("MediaSession:", data.mediaSession);
				if (data?.state) console.log("Active Media State:", data.state);
				return data;
			},
			play: (instanceId = null) => dispatchCommand("play", void 0, instanceId, "__DEBUG_BYPASS__"),
			pause: (instanceId = null) => dispatchCommand("pause", void 0, instanceId, "__DEBUG_BYPASS__"),
			toggle: (instanceId = null) => dispatchCommand("toggle", void 0, instanceId, "__DEBUG_BYPASS__"),
			seek: (offset, instanceId = null) => dispatchCommand("seek", offset, instanceId, "__DEBUG_BYPASS__"),
			seekTo: (time, instanceId = null) => dispatchCommand("currentTime", time, instanceId, "__DEBUG_BYPASS__"),
			setVolume: (vol, instanceId = null) => dispatchCommand("volume", vol, instanceId, "__DEBUG_BYPASS__"),
			setMute: (muted, instanceId = null) => dispatchCommand("muted", muted, instanceId, "__DEBUG_BYPASS__"),
			setRate: (rate, instanceId = null) => dispatchCommand("playbackRate", rate, instanceId, "__DEBUG_BYPASS__"),
			toggleLoop: (instanceId = null) => exportedApi.call("debug_toggleLoop", {}, instanceId),
			setSource: async (sourceUrlOrBlob, instanceId = null) => {
				let url = sourceUrlOrBlob;
				if (sourceUrlOrBlob instanceof Blob || sourceUrlOrBlob instanceof File) url = URL.createObjectURL(sourceUrlOrBlob);
				return exportedApi.call("debug_setSource", { src: url }, instanceId);
			},
			injectTestTone: async (freq = 440, duration = 3, instanceId = null) => {
				const blob = SRemoteDebugUtils.createToneBlob(freq, duration);
				const url = URL.createObjectURL(blob);
				console.log(`%c[sremote.debug] Generated Tone ${freq}Hz (${duration}s) -> ${url}`, "color: #a855f7; font-weight: bold;");
				return exportedApi.call("debug_setSource", {
					src: url,
					isBlob: true,
					title: `Test Tone (${freq}Hz)`
				}, instanceId);
			},
			injectSilentTrack: async (duration = 5, instanceId = null) => {
				const blob = SRemoteDebugUtils.createSilentBlob(duration);
				const url = URL.createObjectURL(blob);
				console.log(`%c[sremote.debug] Generated Silent Track (${duration}s) -> ${url}`, "color: #a855f7; font-weight: bold;");
				return exportedApi.call("debug_setSource", {
					src: url,
					isBlob: true,
					title: `Silent Track (${duration}s)`
				}, instanceId);
			},
			injectWhiteNoise: async (duration = 3, instanceId = null) => {
				const blob = SRemoteDebugUtils.createNoiseBlob(duration);
				const url = URL.createObjectURL(blob);
				console.log(`%c[sremote.debug] Generated White Noise (${duration}s) -> ${url}`, "color: #a855f7; font-weight: bold;");
				return exportedApi.call("debug_setSource", {
					src: url,
					isBlob: true,
					title: `White Noise (${duration}s)`
				}, instanceId);
			},
			injectSampleVideo: async (instanceId = null) => exportedApi.call("debug_setSource", {
				src: SRemoteDebugUtils.SAMPLE_VIDEO_URL,
				title: "Mozilla Flower Sample (MP4)"
			}, instanceId),
			restoreOriginal: async (instanceId = null) => exportedApi.call("debug_restoreOriginal", {}, instanceId),
			simulateStall: async (instanceId = null) => exportedApi.call("debug_simulateStall", {}, instanceId)
		});
	}
	function createExportedApi({ instanceManager, dispatchCommand, validateDomainAccess, queryMediaInstancesViaGM }) {
		const { instances, parentAdaptersMap, assignedIframeIdMap, iframeToAssignedIdMap, globalEventListeners, isMultiModeActive, getLatestActiveInstanceId, pauseOthersExcept, handleUseAdapter, handleRemoveAdapter } = instanceManager;
		const assignIframeId = (iframeOrSelector, customId) => {
			if (!customId || typeof customId !== "string") return false;
			let el = null;
			if (typeof iframeOrSelector === "string") el = document.querySelector(iframeOrSelector);
			else if (iframeOrSelector && iframeOrSelector.nodeType === 1 && iframeOrSelector.tagName === "IFRAME") el = iframeOrSelector;
			if (!el) return false;
			const cleanId = customId.trim();
			el.setAttribute("data-sremote-id", cleanId);
			assignedIframeIdMap.set(cleanId, el);
			iframeToAssignedIdMap.set(el, cleanId);
			console_log(`%c[SRemote:assignId] Pre-assigned instance ID '${cleanId}' to iframe element`, "color: #10b981; font-weight: bold;", el);
			return true;
		};
		const getIframeElement = (instanceId, key) => {
			if (!validateDomainAccess(key)) {
				console_error("[SRemote:auth] Blocked getIframe()! Valid Passkey is required.");
				return null;
			}
			if (!instanceId) return null;
			const inst = instances.get(instanceId);
			if (inst?.iframeEl && inst.iframeEl.isConnected) return inst.iframeEl;
			return assignedIframeIdMap.get(instanceId) || null;
		};
		const getStatus = (instanceId, key) => {
			if (!validateDomainAccess(key)) {
				console_error("[SRemote:auth] Blocked status()! Valid Passkey is required.");
				return null;
			}
			const activeId = instanceManager.currentActiveInstanceId;
			const targetId = instanceId || activeId || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
			if (!targetId) return null;
			if (instances.has(targetId)) return instances.get(targetId).state || null;
			if (parentAdaptersMap.has(targetId)) return extractMediaState(parentAdaptersMap.get(targetId));
			return null;
		};
		const resolveAdapterCapabilities = (adapter) => {
			if (!adapter) return null;
			return evaluateCapabilities(adapter);
		};
		const getCapabilities = (instanceId, key) => {
			if (!validateDomainAccess(key)) {
				console_error("[SRemote:auth] Blocked capabilities()! Valid Passkey is required.");
				return null;
			}
			const activeId = instanceManager.currentActiveInstanceId;
			const targetId = instanceId || activeId || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
			if (targetId && parentAdaptersMap.has(targetId)) return resolveAdapterCapabilities(parentAdaptersMap.get(targetId));
			if (!targetId && parentAdaptersMap.size === 1) return resolveAdapterCapabilities(Array.from(parentAdaptersMap.values())[0]);
			if (targetId && instances.has(targetId)) {
				const inst = instances.get(targetId);
				return inst.capabilities || {
					play: true,
					pause: true,
					toggle: true,
					stop: true,
					seek: true,
					volume: true,
					muted: true,
					speed: true,
					playbackRate: true,
					pip: inst.mediaType === "video",
					quality: false,
					subtitles: false,
					shuffle: false,
					repeat: true,
					next: false,
					previous: false,
					load: true,
					hasAdapter: false,
					hasNative: Boolean(inst.mediaType === "video" || inst.mediaType === "audio"),
					hasMediaSession: false
				};
			}
			return null;
		};
		const listInstances = (key) => {
			if (!validateDomainAccess(key)) {
				console_error("[SRemote:auth] Blocked list()! Valid Passkey is required.");
				return [];
			}
			const result = Array.from(instances.entries()).map(([id, info]) => ({
				instanceId: id,
				location: info.location,
				origin: info.origin,
				note: info.note || "",
				mediaType: info.mediaType,
				capabilities: info.capabilities || null,
				state: info.state,
				status: info.status || "ready"
			}));
			for (const [id, adapter] of parentAdaptersMap.entries()) result.push({
				instanceId: id,
				location: location.href,
				origin: location.origin,
				note: "Parent Custom Adapter",
				mediaType: "adapter",
				capabilities: resolveAdapterCapabilities(adapter),
				status: "ready",
				state: extractMediaState(adapter)
			});
			return result;
		};
		const setMultiMode = (mode, key) => {
			if (!validateDomainAccess(key)) {
				console_error("[SRemote:auth] Blocked setMultiMode()! Valid Passkey is required.");
				return;
			}
			if (typeof mode === "boolean" || mode === null) instanceManager.setMultiModeConfig(mode);
		};
		const isMultiMode = (key) => {
			if (!validateDomainAccess(key)) {
				console_error("[SRemote:auth] Blocked isMultiMode()! Valid Passkey is required.");
				return false;
			}
			return isMultiModeActive();
		};
		const setExclusive = (mode, key) => {
			if (!validateDomainAccess(key)) {
				console_error("[SRemote:auth] Blocked setExclusive()! Valid Passkey is required.");
				return;
			}
			instanceManager.setExclusiveMode(mode);
			if (mode && mode !== "auto" && instances.has(mode)) pauseOthersExcept(mode);
		};
		const annotateInstances = (notesDict, key) => {
			if (!validateDomainAccess(key)) {
				console_error("[SRemote:auth] Blocked note()! Valid Passkey is required.");
				return;
			}
			if (typeof notesDict === "object" && notesDict) for (const [id, note] of Object.entries(notesDict)) {
				const inst = instances.get(id);
				if (inst) inst.note = String(note);
			}
		};
		const queryInstances = (key) => {
			if (!validateDomainAccess(key)) {
				console_error("[SRemote:auth] Blocked query()! Valid Passkey is required.");
				return [];
			}
			return queryMediaInstancesViaGM();
		};
		const registerAdapter = (adapter, instanceId, key) => {
			if (!validateDomainAccess(key)) {
				console_error("[SRemote:auth] Blocked adapters.register()! Valid Passkey is required.");
				return null;
			}
			return handleUseAdapter(adapter, instanceId);
		};
		const unregisterAdapter = (instanceId, key) => {
			if (!validateDomainAccess(key)) {
				console_error("[SRemote:auth] Blocked adapters.unregister()! Valid Passkey is required.");
				return false;
			}
			return handleRemoveAdapter(instanceId);
		};
		const getCustomAdapter = (instanceId, key) => {
			if (!validateDomainAccess(key)) {
				console_error("[SRemote:auth] Blocked adapters.get()! Valid Passkey is required.");
				return null;
			}
			if (instanceId) return parentAdaptersMap.get(instanceId) || null;
			if (parentAdaptersMap.size === 1) return Array.from(parentAdaptersMap.values())[0] || null;
			return parentAdaptersMap.get(instanceManager.currentActiveInstanceId) || null;
		};
		const rpcCall = (action, params, instanceId, key) => {
			if (!validateDomainAccess(key)) return Promise.resolve({
				success: false,
				error: "AUTH_FAILED",
				message: `Access denied. Valid Passkey is required for call('${action}')`,
				action,
				instanceId: instanceId || null
			});
			const targetId = instanceId || getLatestActiveInstanceId();
			const target = targetId ? instances.get(targetId) : null;
			if (!target || !target.port) return Promise.resolve({
				success: false,
				error: "INSTANCE_NOT_FOUND",
				message: `No active port for instance '${targetId || "unknown"}'`,
				action,
				instanceId: targetId || null
			});
			return new Promise((resolve) => {
				const rpcId = generateInstanceId("rpc");
				const timer = setTimeout(() => {
					pendingRpcRequests.delete(rpcId);
					resolve({
						success: false,
						error: "TIMEOUT",
						message: `RPC call '${action}' timed out after 5000ms`,
						action,
						instanceId: targetId
					});
				}, 5e3);
				pendingRpcRequests.set(rpcId, {
					resolve,
					timer
				});
				try {
					target.port.postMessage({
						type: `${NS}rpc_request`,
						source: "parent",
						rpcId,
						action,
						params
					});
				} catch (err) {
					clearTimeout(timer);
					pendingRpcRequests.delete(rpcId);
					resolve({
						success: false,
						error: "PORT_ERROR",
						message: String(err),
						action,
						instanceId: targetId
					});
				}
			});
		};
		const postWindowMessage = (message, targetOrigin = "*", instanceId = null, from = "parent", key = null) => {
			if (!validateDomainAccess(key)) {
				console_error("[SRemote:auth] Blocked postWindowMessage()! Valid Passkey is required.");
				return false;
			}
			const targetId = instanceId || getLatestActiveInstanceId();
			const origin = typeof targetOrigin === "string" ? targetOrigin : "*";
			if (String(from || "parent").toLowerCase() === "parent") {
				const iframeEl = getIframeElement(targetId, key);
				if (iframeEl?.contentWindow && typeof iframeEl.contentWindow.postMessage === "function") try {
					iframeEl.contentWindow.postMessage(message, origin);
					return true;
				} catch (err) {
					console_warn("[sremote] Error posting message from parent to iframe window:", err);
					return false;
				}
			}
			const target = targetId ? instances.get(targetId) : null;
			if (!target || !target.port) {
				console_warn(`[sremote] Cannot post message: No active connection for instance '${targetId || "unknown"}'`);
				return false;
			}
			try {
				target.port.postMessage({
					type: `${NS}bridge_post`,
					source: "parent",
					payload: message,
					targetOrigin: origin
				});
				return true;
			} catch (err) {
				console_warn("[sremote] Error in postWindowMessage via MessagePort bridge:", err);
				return false;
			}
		};
		const setIframeCSS = (css, instanceId, key) => rpcCall("setIframeCSS", { css: String(css || "") }, instanceId, key);
		const getIframeCSS = (instanceId, key) => rpcCall("getIframeCSS", {}, instanceId, key);
		const removeIframeCSS = (instanceId, key) => rpcCall("removeIframeCSS", {}, instanceId, key);
		const exportedApi = {
			play: (instanceId, key) => dispatchCommand("play", void 0, instanceId, key),
			pause: (instanceId, key) => dispatchCommand("pause", void 0, instanceId, key),
			toggle: (instanceId, key) => dispatchCommand("toggle", void 0, instanceId, key),
			stop: (instanceId, key) => dispatchCommand("stop", void 0, instanceId, key),
			seek: (offset, instanceId, key) => dispatchCommand("seek", offset, instanceId, key),
			seekTo: (time, instanceId, key) => dispatchCommand("currentTime", time, instanceId, key),
			volume: (vol, instanceId, key) => dispatchCommand("volume", vol, instanceId, key),
			mute: (muted, instanceId, key) => dispatchCommand("muted", muted, instanceId, key),
			rate: (rate, instanceId, key) => dispatchCommand("playbackRate", rate, instanceId, key),
			playbackRate: (rate, instanceId, key) => dispatchCommand("playbackRate", rate, instanceId, key),
			quality: (level, instanceId, key) => dispatchCommand("quality", level, instanceId, key),
			getQualities: (instanceId, key) => {
				const adapter = getCustomAdapter(instanceId, key);
				return adapter && typeof adapter.getQualities === "function" ? adapter.getQualities() : [];
			},
			subtitle: (track, instanceId, key) => dispatchCommand("subtitle", track, instanceId, key),
			getSubtitles: (instanceId, key) => {
				const adapter = getCustomAdapter(instanceId, key);
				return adapter && typeof adapter.getSubtitles === "function" ? adapter.getSubtitles() : [];
			},
			shuffle: (enable, instanceId, key) => dispatchCommand("shuffle", enable, instanceId, key),
			repeat: (mode, instanceId, key) => dispatchCommand("repeat", mode, instanceId, key),
			next: (instanceId, key) => dispatchCommand("next", void 0, instanceId, key),
			previous: (instanceId, key) => dispatchCommand("previous", void 0, instanceId, key),
			pip: (enable, instanceId, key) => {
				const _instanceId = typeof enable === "string" ? enable : instanceId;
				const _enabled = typeof enable === "boolean" ? enable : void 0;
				return dispatchCommand(_enabled === true ? "enterpip" : _enabled === false ? "exitpip" : "pip", void 0, _instanceId, key);
			},
			load: (source, instanceId, key) => dispatchCommand("load", source, instanceId, key),
			status: getStatus,
			capabilities: getCapabilities,
			instances: Object.freeze({
				list: listInstances,
				get: (instanceId, key) => getStatus(instanceId, key),
				capabilities: (instanceId, key) => getCapabilities(instanceId, key),
				getCapabilities: (instanceId, key) => getCapabilities(instanceId, key),
				getIframe: getIframeElement,
				assign: assignIframeId,
				setMultiMode,
				isMultiMode,
				setExclusive,
				query: queryInstances,
				note: annotateInstances
			}),
			adapters: Object.freeze({
				register: registerAdapter,
				unregister: unregisterAdapter,
				get: getCustomAdapter
			}),
			rpc: Object.freeze({
				call: rpcCall,
				postMessage: postWindowMessage,
				onMessage: (handler, key) => exportedApi.on("iframe:message", handler, key)
			}),
			css: Object.freeze({
				set: setIframeCSS,
				get: getIframeCSS,
				remove: removeIframeCSS
			}),
			bindMetadata: (meta, instanceId, key) => dispatchCommand("bindMetadata", meta, instanceId, key),
			on: (event, handler, key) => {
				if (!validateDomainAccess(key)) {
					console_error("[SRemote:auth] Blocked on()! Valid Passkey is required.");
					return () => {};
				}
				const ev = String(event || "").toLowerCase();
				if (!globalEventListeners.has(ev)) globalEventListeners.set(ev, new Set());
				globalEventListeners.get(ev).add(handler);
				const lastAcceptedData = instanceManager.lastAcceptedData;
				if ((ev === "accept" || ev === "*") && lastAcceptedData && (instances.has(lastAcceptedData.instanceId) || parentAdaptersMap.has(lastAcceptedData.instanceId))) try {
					const payload = ev === "*" ? {
						action: "accept",
						...lastAcceptedData
					} : lastAcceptedData;
					setTimeout(() => {
						try {
							handler(payload);
						} catch {}
					}, 0);
				} catch {}
				return () => exportedApi.off(ev, handler);
			},
			off: (event, handler) => {
				const ev = String(event || "").toLowerCase();
				globalEventListeners.get(ev)?.delete(handler);
			},
			lock: () => {
				instanceManager.setSessionLocked(true);
				console_log(`%c[SRemote:lock] SRemote is now session-locked for this page`, "background: #0f172a; color: #38bdf8; font-weight: bold;");
				return true;
			},
			hello: (options = {}, target = null) => {
				let targetIframeWindow = target;
				let providedKey = null;
				let customCss = null;
				let treatAlmostEndAsEnd = null;
				if (options && typeof options === "object") {
					if (typeof options.multiMode === "boolean" || options.multiMode === null) instanceManager.setMultiModeConfig(options.multiMode);
					if (typeof options.treatAlmostEndAsEnd === "boolean") treatAlmostEndAsEnd = options.treatAlmostEndAsEnd;
					if (!targetIframeWindow && options.target) targetIframeWindow = options.target;
					if (options.key) providedKey = String(options.key).trim();
					if (options.css && typeof options.css === "string") customCss = options.css;
				}
				if (!validateDomainAccess(providedKey)) {
					console_error(`%c[SRemote:auth] Blocked hello() on locked domain '${location.hostname || "this_domain"}'! Valid Passkey is required in hello({ key: '...' }).`, "color: #ef4444; font-weight: bold;");
					return false;
				}
				console_log(`%c[SRemote:auth] Access authorized for domain '${location.hostname}'`, "color: #10b981; font-weight: bold;");
				const handshakeId = generateInstanceId("hs");
				const handshakeToken = generateInstanceId("tok");
				setHandshakeSecret(handshakeId, handshakeToken);
				const nextSeq = (Number(Storage.get("sremote:hello_seq", 0)) || 0) + 1;
				Storage.set("sremote:hello_seq", nextSeq);
				Storage.set("sremote:latest_handshake", {
					seq: nextSeq,
					handshakeId,
					handshakeToken,
					parentOrigin: location.origin,
					css: customCss,
					...treatAlmostEndAsEnd !== null ? { treatAlmostEndAsEnd } : {},
					timestamp: Date.now()
				});
				const createHelloPayload = (assignedInstanceId) => ({
					type: `${NS}hello`,
					source: "parent",
					handshakeId,
					handshakeToken,
					seq: nextSeq,
					...customCss ? { css: customCss } : {},
					...treatAlmostEndAsEnd !== null ? { treatAlmostEndAsEnd } : {},
					...assignedInstanceId ? { assignedInstanceId } : {}
				});
				console_log(`%c[SRemote:hello] Parent sending hello (seq: ${nextSeq}) ->`, "color: #38bdf8; font-weight: bold;", {
					hasTarget: !!targetIframeWindow,
					handshakeId,
					seq: nextSeq,
					hasCss: Boolean(customCss)
				});
				if (targetIframeWindow && typeof targetIframeWindow.postMessage === "function") {
					try {
						let assignedId = null;
						try {
							const iframes = document.querySelectorAll("iframe");
							for (let i = 0; i < iframes.length; i++) if (iframes[i].contentWindow === targetIframeWindow) {
								assignedId = iframes[i].getAttribute("data-sremote-id") || iframeToAssignedIdMap.get(iframes[i]) || null;
								break;
							}
						} catch {}
						targetIframeWindow.postMessage(createHelloPayload(assignedId), "*");
					} catch (err) {
						console_warn("[sremote] Error posting hello to target iframe:", err);
					}
					return;
				}
				try {
					const iframes = document.querySelectorAll("iframe");
					for (let i = 0; i < iframes.length; i++) try {
						const ifr = iframes[i];
						const assignedId = ifr.getAttribute("data-sremote-id") || iframeToAssignedIdMap.get(ifr) || null;
						ifr.contentWindow?.postMessage(createHelloPayload(assignedId), "*");
					} catch {}
				} catch {}
				try {
					for (let i = 0; i < window.frames.length; i++) try {
						window.frames[i].postMessage(createHelloPayload(null), "*");
					} catch {}
				} catch {}
			}
		};
		exportedApi.debug = createParentDebugApi({
			instances,
			currentActiveInstanceIdGetter: () => instanceManager.currentActiveInstanceId,
			assignedIframeIdMap,
			iframeToAssignedIdMap,
			dispatchCommand,
			exportedApi
		});
		exportedApi.isDummy = false;
		exportedApi.isSremoteNative = true;
		try {
			exportedApi[Symbol.for("__sremote_native__")] = true;
		} catch {}
		Object.freeze(exportedApi);
		try {
			Object.defineProperty(pageWindow, "sremote", {
				value: exportedApi,
				writable: false,
				configurable: false,
				enumerable: true
			});
		} catch {
			pageWindow.sremote = exportedApi;
		}
		console_log(`%c[sremote] window.sremote is ready with decluttered namespaces`, "background: #065f46; color: #34d399; font-weight: bold;");
		return exportedApi;
	}
	function createInstanceManager() {
		const instances = new Map();
		const parentAdaptersMap = new Map();
		const assignedIframeIdMap = new Map();
		const iframeToAssignedIdMap = new WeakMap();
		const globalEventListeners = new Map();
		let exclusiveMode = null;
		let multiModeConfig = null;
		let currentActiveInstanceId = null;
		let isSessionLocked = false;
		let isSessionDenied = false;
		let lastAcceptedData = null;
		function isMultiModeActive() {
			if (typeof multiModeConfig === "boolean") return multiModeConfig;
			try {
				if (document.querySelectorAll("iframe").length <= 1 && instances.size <= 1) return false;
			} catch {}
			return instances.size > 1;
		}
		function getLatestActiveInstanceId() {
			if (currentActiveInstanceId && (instances.has(currentActiveInstanceId) || parentAdaptersMap.has(currentActiveInstanceId))) return currentActiveInstanceId;
			if (parentAdaptersMap.size > 0) {
				currentActiveInstanceId = Array.from(parentAdaptersMap.keys())[parentAdaptersMap.size - 1];
				return currentActiveInstanceId;
			}
			let latestId = null;
			let latestTime = -1;
			for (const [id, item] of instances.entries()) {
				const seen = item.lastSeen || 0;
				if (seen > latestTime) {
					latestTime = seen;
					latestId = id;
				}
			}
			currentActiveInstanceId = latestId || Array.from(instances.keys())[instances.size - 1] || null;
			return currentActiveInstanceId;
		}
		function broadcastToPorts(payload, excludeInstanceId = null) {
			for (const [id, item] of instances.entries()) {
				if (id === excludeInstanceId) continue;
				try {
					item.port?.postMessage(payload);
				} catch {}
			}
		}
		function notifyMediaCountChange() {
			const activeInstances = Array.from(instances.entries()).map(([id, item]) => ({
				instanceId: id,
				location: item.location,
				note: item.note,
				mediaType: item.mediaType
			}));
			const count = activeInstances.length;
			if (count > 1) {
				const payload = {
					type: `${NS}multipleMediaDetected`,
					source: "parent",
					count,
					instances: activeInstances
				};
				console_debug(`%c[SRemote:signal] Emit -> multipleMediaDetected (source: parent)`, "color: #06b6d4;", payload);
				window.postMessage(payload, "*");
			} else if (count === 1) {
				const payload = {
					type: `${NS}singleMediaDetected`,
					source: "parent",
					count: 1,
					instance: activeInstances[0]
				};
				console_debug(`%c[SRemote:signal] Emit -> singleMediaDetected (source: parent)`, "color: #06b6d4;", payload);
				window.postMessage(payload, "*");
			}
		}
		function emitGlobalEvent(event, payload = {}) {
			const ev = String(event || "").toLowerCase();
			if (ev === "accept" && payload?.instanceId) lastAcceptedData = payload;
			else if (ev === "disconnect" && payload?.instanceId && lastAcceptedData?.instanceId === payload.instanceId) lastAcceptedData = null;
			const specificListeners = globalEventListeners.get(ev);
			if (specificListeners) for (const fn of specificListeners) try {
				fn(payload);
			} catch (e) {
				console.warn("[sremote] Error in event listener:", e);
			}
			const wildcardListeners = globalEventListeners.get("*");
			if (wildcardListeners) {
				const starPayload = typeof payload === "object" && payload !== null ? {
					action: ev,
					...payload
				} : {
					action: ev,
					value: payload
				};
				for (const fn of wildcardListeners) try {
					fn(starPayload);
				} catch (e) {
					console.warn("[sremote] Error in wildcard listener:", e);
				}
			}
		}
		function pauseOthersExcept(activeInstanceId) {
			for (const [id, item] of instances.entries()) if (id !== activeInstanceId) try {
				item.port?.postMessage({ type: `${NS}pause` });
			} catch {}
		}
		function removeInstance(instanceId, reason = "disconnected") {
			const item = instances.get(instanceId);
			if (!item) return;
			console_log(`%c[SRemote:lifecycle] Instance removed: ${instanceId} (reason: ${reason})`, "color: #ef4444; font-weight: bold;");
			try {
				item.port?.close();
			} catch {}
			instances.delete(instanceId);
			if (currentActiveInstanceId === instanceId) currentActiveInstanceId = null;
			notifyMediaCountChange();
			emitGlobalEvent("disconnect", {
				instanceId,
				reason
			});
		}
		function handleUseAdapter(adapterVal, instanceId = null) {
			if (!adapterVal || typeof adapterVal !== "object") return null;
			const targetId = instanceId || generateInstanceId("adapter");
			if (!isMultiModeActive() && parentAdaptersMap.size > 0) {
				for (const oldId of Array.from(parentAdaptersMap.keys())) if (oldId !== targetId) {
					console_log(`%c[SRemote:adapter] Replacing stale adapter in Single Mode: ${oldId} -> ${targetId}`, "color: #f59e0b;");
					parentAdaptersMap.delete(oldId);
				}
			}
			const adapter = wrapCustomAdapter(adapterVal, {
				instanceId: targetId,
				source: "adapter",
				onEmit: (ev, fullPayload) => {
					if (ev === "play" || ev === "playing") {
						if (exclusiveMode === "auto") pauseOthersExcept(targetId);
					}
					emitGlobalEvent(ev, fullPayload);
				}
			});
			parentAdaptersMap.set(targetId, adapter);
			currentActiveInstanceId = targetId;
			console_log(`%c[SRemote:adapter] Registered custom adapter for instance '${targetId}'`, "color: #06b6d4; font-weight: bold;");
			emitGlobalEvent("accept", {
				source: "adapter",
				instanceId: targetId,
				mediaType: "adapter",
				location: location.href,
				origin: location.origin
			});
			return targetId;
		}
		function handleRemoveAdapter(instanceId = null) {
			if (instanceId) {
				const deleted = parentAdaptersMap.delete(instanceId);
				if (deleted && currentActiveInstanceId === instanceId) currentActiveInstanceId = null;
				return deleted;
			}
			parentAdaptersMap.clear();
			currentActiveInstanceId = null;
			return true;
		}
		return {
			instances,
			parentAdaptersMap,
			assignedIframeIdMap,
			iframeToAssignedIdMap,
			globalEventListeners,
			get exclusiveMode() {
				return exclusiveMode;
			},
			setExclusiveMode: (mode) => {
				exclusiveMode = mode;
			},
			get multiModeConfig() {
				return multiModeConfig;
			},
			setMultiModeConfig: (mode) => {
				multiModeConfig = mode;
			},
			get currentActiveInstanceId() {
				return currentActiveInstanceId;
			},
			setCurrentActiveInstanceId: (id) => {
				currentActiveInstanceId = id;
			},
			get isSessionLocked() {
				return isSessionLocked;
			},
			setSessionLocked: (locked) => {
				isSessionLocked = locked;
			},
			get isSessionDenied() {
				return isSessionDenied;
			},
			setSessionDenied: (denied) => {
				isSessionDenied = denied;
			},
			get lastAcceptedData() {
				return lastAcceptedData;
			},
			isMultiModeActive,
			getLatestActiveInstanceId,
			broadcastToPorts,
			notifyMediaCountChange,
			emitGlobalEvent,
			pauseOthersExcept,
			removeInstance,
			handleUseAdapter,
			handleRemoveAdapter
		};
	}
	var activePermissionHost = null;
	function createPermissionDialog({ origin, onDecision, isTop = false }) {
		if (activePermissionHost) return;
		const { allowKey, denyKey } = getOriginStorageKeys(origin);
		if (Storage.get(denyKey) === "1") {
			onDecision?.(false);
			return;
		}
		if (Storage.get(allowKey) === "1") {
			onDecision?.(true);
			return;
		}
		const persistable = isPersistableOrigin(origin);
		const container = document.createElement("div");
		const rememberLabel = document.createElement("label");
		rememberLabel.className = "sv-remember";
		if (!persistable) rememberLabel.style.display = "none";
		const chk = document.createElement("input");
		chk.type = "checkbox";
		const rememberSpan = document.createElement("span");
		rememberSpan.textContent = t("rememberChoice");
		rememberLabel.append(chk, rememberSpan);
		rememberLabel.addEventListener("click", (e) => {
			e.stopPropagation();
			if (e.target !== chk) {
				e.preventDefault();
				chk.checked = !chk.checked;
				chk.dispatchEvent(new Event("change", { bubbles: true }));
			}
		});
		chk.addEventListener("click", (e) => {
			e.stopPropagation();
		});
		container.append(rememberLabel);
		function handleDecision(result) {
			const remember = persistable && chk.checked;
			activePermissionHost = null;
			if (remember && allowKey && denyKey) {
				if (result) {
					Storage.set(allowKey, "1");
					Storage.remove(denyKey);
				} else {
					Storage.set(denyKey, "1");
					Storage.remove(allowKey);
				}
			}
			if (isTop) Storage.set("sremote:permission_decision", {
				origin,
				allowed: result,
				timestamp: Date.now()
			});
			onDecision?.(result);
		}
		const modal = createModal({
			titleText: t("dialogTitle"),
			bodyText: t("dialogText"),
			bodyElement: container,
			isTop,
			hostId: isTop ? "sremote-top-permission-host" : "sremote-permission-host",
			buttons: [{
				className: "sv-btn-deny",
				text: t("denyBtn"),
				onClick: (_, { close }) => {
					close(false);
					handleDecision(false);
				}
			}, {
				className: "sv-btn-allow",
				text: t("allowBtn"),
				onClick: (_, { close }) => {
					close(true);
					handleDecision(true);
				}
			}],
			onClose: () => {
				activePermissionHost = null;
			}
		});
		activePermissionHost = modal.host;
		return { close: () => {
			modal.close();
			activePermissionHost = null;
		} };
	}
	function findIframeElementBySource(sourceWindow, root = document) {
		if (!sourceWindow || !root) return null;
		try {
			const iframes = root.querySelectorAll("iframe");
			for (let i = 0; i < iframes.length; i++) {
				if (iframes[i].contentWindow === sourceWindow) return iframes[i];
				try {
					const childDoc = iframes[i].contentDocument || iframes[i].contentWindow?.document;
					if (childDoc) {
						const nested = findIframeElementBySource(sourceWindow, childDoc);
						if (nested) return nested;
					}
				} catch {}
			}
		} catch {}
		return null;
	}
	function setupParentHandshake(instanceManager) {
		const { instances, assignedIframeIdMap, iframeToAssignedIdMap, isMultiModeActive, removeInstance, notifyMediaCountChange, emitGlobalEvent, pauseOthersExcept } = instanceManager;
		async function cloneBlobFromParent(blobUrl, instanceId) {
			try {
				const blob = await (await fetch(blobUrl)).blob();
				const item = instances.get(instanceId);
				if (item?.port) item.port.postMessage({
					type: `${NS}resendBlobObject`,
					originalUrl: blobUrl,
					blob
				});
			} catch (err) {
				console_warn(`[sremote] Failed to clone blob '${blobUrl}' for instance '${instanceId}':`, err);
			}
		}
		function setupPortForInstance(instanceId, port, initialLocation, initialOrigin, iframeEl = null) {
			if (!isMultiModeActive() && instances.size > 0) {
				for (const oldId of Array.from(instances.keys())) if (oldId !== instanceId) {
					console_log(`%c[SRemote:lifecycle] Replacing stale instance in Single Mode: ${oldId} -> ${instanceId}`, "color: #f59e0b;");
					removeInstance(oldId, "replaced_by_new_instance");
				}
			}
			instanceManager.setCurrentActiveInstanceId(instanceId);
			const item = {
				port,
				location: initialLocation,
				origin: initialOrigin,
				note: "",
				state: null,
				mediaType: null,
				capabilities: null,
				lastSeen: Date.now(),
				status: "ready",
				iframeEl: iframeEl || assignedIframeIdMap.get(instanceId) || null
			};
			instances.set(instanceId, item);
			flushPendingCommands(instanceId, port, isMultiModeActive);
			port.onmessage = (e) => {
				const data = e.data;
				if (!data || typeof data !== "object") return;
				const type = String(data.type || "");
				if (!type.startsWith("sremote:")) return;
				item.lastSeen = Date.now();
				instanceManager.setCurrentActiveInstanceId(instanceId);
				const action = type.slice(NS.length);
				const lowerAction = action.toLowerCase();
				if (lowerAction !== "ping" && lowerAction !== "pong") console_debug(`%c[SRemote:signal] Parent received from iframe (port) -> ${action}`, "color: #10b981;", {
					instanceId,
					data
				});
				if (lowerAction === "rpc_response" && data.rpcId) {
					const req = pendingRpcRequests.get(data.rpcId);
					if (req) {
						clearTimeout(req.timer);
						pendingRpcRequests.delete(data.rpcId);
						if (data.result && data.result.success === false && data.result.error) req.resolve?.({
							success: false,
							error: data.result.error,
							message: data.result.message || "RPC execution failed",
							instanceId
						});
						else req.resolve(typeof data.result === "object" && data.result !== null ? {
							instanceId,
							...data.result
						} : {
							success: true,
							instanceId,
							data: data.result
						});
					}
					return;
				}
				if (lowerAction === "pong") {
					if (item.pendingConsumeHandshakeId) {
						console_log(`%c[SRemote:handshake] Mutual Ping-Pong confirmed on port for '${instanceId}'. Consuming token '${item.pendingConsumeHandshakeId}'.`, "color: #10b981;");
						consumeHandshakeSecret(item.pendingConsumeHandshakeId);
						item.pendingConsumeHandshakeId = null;
					}
					if (data.state) item.state = data.state;
					if (data.mediaType) item.mediaType = data.mediaType;
					if (data.capabilities) item.capabilities = data.capabilities;
					return;
				}
				if (lowerAction === "disconnect" || lowerAction === "mediadisconnected" || lowerAction === "unload") {
					removeInstance(instanceId, lowerAction);
					return;
				}
				if (lowerAction === "accept") {
					if (item.authenticated) return;
					let isValid = false;
					if (data.handshakeId && data.handshakeToken) isValid = checkHandshakeSecret(data.handshakeId, data.handshakeToken);
					else isValid = true;
					if (!isValid) {
						console_warn(`[sremote] SPOOF DETECTED on port for instance ${instanceId}! Closing port immediately.`);
						removeInstance(instanceId, "spoof_detected");
						return;
					}
					item.authenticated = true;
					item.status = "ready";
					instanceManager.setCurrentActiveInstanceId(instanceId);
					if (data.state) item.state = data.state;
					if (data.mediaType) item.mediaType = data.mediaType;
					if (data.capabilities) item.capabilities = data.capabilities;
					notifyMediaCountChange();
					emitGlobalEvent("accept", data);
					return;
				}
				if (data.state) item.state = data.state;
				if (data.mediaType) item.mediaType = data.mediaType;
				if (data.capabilities) item.capabilities = data.capabilities;
				if (lowerAction === "play" || lowerAction === "playing") {
					const exclusiveMode = instanceManager.exclusiveMode;
					if (exclusiveMode === "auto") pauseOthersExcept(instanceId);
					else if (exclusiveMode && exclusiveMode !== instanceId) {
						port.postMessage({
							type: `${NS}pause`,
							source: "parent"
						});
						return;
					}
				}
				if (lowerAction === "bridge_message") {
					const bridgePayload = {
						source: "iframe",
						instanceId,
						data: data.data,
						origin: data.origin,
						location: item.location
					};
					emitGlobalEvent("iframe:message", bridgePayload);
					emitGlobalEvent("message", bridgePayload);
					return;
				}
				if (lowerAction === "requestblobclone" && data.blobUrl) {
					cloneBlobFromParent(data.blobUrl, instanceId);
					return;
				}
				if (lowerAction === "nomedia") {
					console_warn(`[sremote] Iframe '${instanceId}' reported noMedia for action '${data.action || "unknown"}':`, data.message || data.reason);
					emitGlobalEvent("nomedia", {
						instanceId,
						...data
					});
					emitGlobalEvent("noMedia", {
						instanceId,
						...data
					});
					return;
				}
				emitGlobalEvent(action, typeof data === "object" && data !== null ? {
					instanceId,
					...data
				} : {
					instanceId,
					value: data
				});
			};
			notifyMediaCountChange();
		}
		const onWindowMessage = (event) => {
			if (event.source === window) return;
			const data = event.data;
			if (!data || typeof data !== "object") return;
			const type = String(data.type || "");
			if (!type.startsWith("sremote:")) return;
			const action = type.slice(NS.length);
			const lowerAction = action.toLowerCase();
			const callerOrigin = event.origin || "unknown_origin";
			if (lowerAction === "accept") {
				const iframeEl = findIframeElementBySource(event.source);
				const instanceId = iframeEl && (iframeEl.getAttribute("data-sremote-id") || iframeToAssignedIdMap.get(iframeEl)) || data.instanceId || generateInstanceId();
				const iframeLoc = data.location || "";
				const iframeOrigin = event.origin && event.origin !== "null" ? event.origin : data.origin || "*";
				console_log(`%c[SRemote:signal] Parent received cross-frame signal -> ${action}`, "color: #6366f1; font-weight: bold;", {
					origin: callerOrigin,
					instanceId,
					data: {
						...data,
						instanceId
					}
				});
				if (iframeEl && instanceId) {
					assignedIframeIdMap.set(instanceId, iframeEl);
					iframeToAssignedIdMap.set(iframeEl, instanceId);
				}
				let isValidSecret = false;
				let pendingConsumeHandshakeId = null;
				if (data.handshakeId && data.handshakeToken) {
					isValidSecret = checkHandshakeSecret(data.handshakeId, data.handshakeToken);
					if (isValidSecret) pendingConsumeHandshakeId = data.handshakeId;
				}
				if (!isValidSecret && event.ports && event.ports.length > 0) {
					const { allowKey: parentAllowKey } = getOriginStorageKeys(location.origin);
					const { allowKey: iframeAllowKey } = getOriginStorageKeys(iframeOrigin);
					if (parentAllowKey && Storage.get(parentAllowKey) === "1" || iframeAllowKey && Storage.get(iframeAllowKey) === "1" || iframeOrigin === location.origin || iframeOrigin === "*" || iframeOrigin === "null" || callerOrigin === "null" || callerOrigin.startsWith("http") || callerOrigin.startsWith("file:")) isValidSecret = true;
				}
				if (!isValidSecret) {
					console_warn(`[sremote] Dropped unverified accept for instance: ${instanceId}`);
					return;
				}
				if (event.ports && event.ports.length > 0) {
					const port = event.ports[0];
					setupPortForInstance(instanceId, port, iframeLoc, iframeOrigin, iframeEl);
					const inst = instances.get(instanceId);
					if (inst) {
						inst.authenticated = true;
						if (pendingConsumeHandshakeId) inst.pendingConsumeHandshakeId = pendingConsumeHandshakeId;
						instanceManager.setCurrentActiveInstanceId(instanceId);
						if (data.state) inst.state = data.state;
						if (data.mediaType) inst.mediaType = data.mediaType;
						if (data.capabilities) inst.capabilities = data.capabilities;
						inst.lastSeen = Date.now();
					}
					notifyMediaCountChange();
					try {
						port.postMessage({
							type: `${NS}ping`,
							source: "parent",
							handshakeVerify: true
						});
					} catch {}
					emitGlobalEvent("accept", {
						...data,
						instanceId
					});
				} else if (event.source) {
					console_log(`%c[SRemote:port] Accept received without port for '${instanceId}'. Proactively renegotiating MessagePort...`, "color: #f59e0b; font-weight: bold;");
					const channel = new MessageChannel();
					setupPortForInstance(instanceId, channel.port1, iframeLoc, iframeOrigin, iframeEl);
					const inst = instances.get(instanceId);
					if (inst) {
						inst.authenticated = true;
						if (pendingConsumeHandshakeId) inst.pendingConsumeHandshakeId = pendingConsumeHandshakeId;
						instanceManager.setCurrentActiveInstanceId(instanceId);
						if (data.state) inst.state = data.state;
						if (data.mediaType) inst.mediaType = data.mediaType;
						if (data.capabilities) inst.capabilities = data.capabilities;
						inst.lastSeen = Date.now();
					}
					notifyMediaCountChange();
					try {
						event.source.postMessage({
							type: `${NS}handshake_port`,
							source: "parent",
							instanceId
						}, iframeOrigin && iframeOrigin !== "null" ? iframeOrigin : "*", [channel.port2]);
					} catch (err) {
						console_warn("[sremote] Failed to transfer proactive MessagePort to iframe:", err);
					}
					emitGlobalEvent("accept", {
						...data,
						instanceId
					});
				}
				return;
			}
			if (lowerAction === "request_permission" || lowerAction === "requestpermission") {
				const targetOrigin = data.origin || callerOrigin || location.origin;
				if (instanceManager.isSessionDenied) {
					if (event.source) try {
						event.source.postMessage({
							type: `${NS}permission_response`,
							source: "parent",
							allowed: false,
							parentOrigin: location.origin
						}, "*");
					} catch {}
					return;
				}
				createPermissionDialog({
					origin: targetOrigin,
					isTop: true,
					onDecision: (allowed) => {
						if (!allowed) instanceManager.setSessionDenied(true);
						if (event.source) try {
							event.source.postMessage({
								type: `${NS}permission_response`,
								source: "parent",
								allowed: !!allowed,
								parentOrigin: location.origin
							}, "*");
						} catch {}
					}
				});
				return;
			}
		};
		window.addEventListener("message", onWindowMessage);
		return {
			setupPortForInstance,
			destroy: () => {
				window.removeEventListener("message", onWindowMessage);
			}
		};
	}
	function initParentController() {
		const currentOrigin = location.origin;
		const { allowKey, denyKey, hideBadgeKey } = getOriginStorageKeys(currentOrigin);
		if (denyKey && Storage.get(denyKey) === "1") {
			console_log(`%c[SRemote] THIS PAGE IS BLOCKED PERMANENTLY!%c\nOrigin '${currentOrigin}' is in the permanent deny list. SRemote execution is aborted.\nUse the Tampermonkey menu to reset permissions if needed.`, "background: #ef4444; color: #ffffff; font-size: 24px; font-weight: 900; padding: 6px 12px; border-radius: 4px;", "color: #f87171; font-size: 13px; font-weight: bold;");
			try {
				if (GM$1.register) {
					GM$1.register(t("menuReset", { target: location.origin }), () => {
						[
							allowKey,
							denyKey,
							hideBadgeKey
						].forEach((k) => k && Storage.remove(k));
						alert(t("alertResetDone", { origin: currentOrigin }));
					});
					GM$1.register(t("menuClearAll"), () => {
						if (!confirm(t("confirmClearAll"))) return;
						Storage.clearAllsremoteData();
						alert(t("alertClearDone"));
					});
				}
			} catch {}
			return;
		}
		console_log(`%c[sremote v${VERSION}] Parent Controller Initialized`, "background: #0f172a; color: #38bdf8; font-weight: bold; padding: 2px 6px;");
		Storage.set("sremote:hello_seq", 0);
		Storage.set("sremote:parent_origin", location.origin);
		const instanceManager = createInstanceManager();
		const { instances, parentAdaptersMap, assignedIframeIdMap, iframeToAssignedIdMap, isMultiModeActive, getLatestActiveInstanceId, broadcastToPorts, removeInstance } = instanceManager;
		function validateDomainAccess(providedKey = null) {
			if (providedKey === "__DEBUG_BYPASS__") return true;
			const hostDomain = location.hostname || "this_domain";
			const domainLockStorage = `sremote:locked:${hostDomain}`;
			const isDomainPersistentlyLocked = Storage.get(domainLockStorage) === "1";
			if (!(instanceManager.isSessionLocked || isDomainPersistentlyLocked)) return true;
			const domainKeyStorage = `sremote:passkey:${hostDomain}`;
			const expectedKey = Storage.get(domainKeyStorage);
			const cleanKey = providedKey ? String(providedKey).trim() : null;
			return Boolean(expectedKey && cleanKey && cleanKey === expectedKey);
		}
		registerMenuCommands();
		function emitWhereIsInstanceIdError(cmd) {
			const msg = `[sremote] Multiple medias detected but no instanceId was specified for command '${cmd}'. Pass an instanceId or 'all'.`;
			console_error(msg);
			const payload = {
				type: `${NS}whereIsInstanceID`,
				source: "parent",
				command: cmd,
				message: msg
			};
			console_log(`%c[SRemote:signal] Emit -> whereIsInstanceID (source: parent)`, "color: #ef4444;", payload);
			window.postMessage(payload, "*");
		}
		function executeParentAdapterAction(action, value, targetInstanceId = null) {
			let targetId = targetInstanceId;
			if (!targetId) {
				if (parentAdaptersMap.size === 1) targetId = Array.from(parentAdaptersMap.keys())[0];
				else if (parentAdaptersMap.has(instanceManager.currentActiveInstanceId)) targetId = instanceManager.currentActiveInstanceId;
			}
			if (!targetId || !parentAdaptersMap.has(targetId)) return false;
			return executeAdapterAction(parentAdaptersMap.get(targetId), action, value);
		}
		function dispatchCommand(action, value, targetInstanceId = null, key = null) {
			if (!validateDomainAccess(key)) {
				console_error(`%c${`[SRemote:auth] Blocked command '${action}'! Valid Passkey is required.`}`, "color: #ef4444; font-weight: bold;");
				return Promise.resolve({
					success: false,
					error: "AUTH_FAILED",
					message: `Access denied. Valid Passkey is required for command '${action}'`,
					action,
					instanceId: targetInstanceId
				});
			}
			let targetId = targetInstanceId || getLatestActiveInstanceId();
			let target = targetId ? instances.get(targetId) : null;
			if (!target && !targetInstanceId && !isMultiModeActive() && instances.size === 1) {
				targetId = Array.from(instances.keys())[0];
				target = instances.get(targetId);
			}
			console_log(`%c[SRemote:command] Parent dispatching -> ${action}`, "color: #3b82f6; font-weight: bold;", {
				action,
				value,
				targetInstanceId: targetId || targetInstanceId || "auto"
			});
			if (parentAdaptersMap.size > 0) {
				if (executeParentAdapterAction(action, value, targetId || targetInstanceId)) return Promise.resolve({
					success: true,
					instanceId: targetId || targetInstanceId,
					source: "adapter",
					action
				});
			}
			if (isMultiModeActive() && instances.size > 1 && !targetInstanceId) {
				emitWhereIsInstanceIdError(action);
				return Promise.resolve({
					success: false,
					error: "WHERE_IS_INSTANCE_ID",
					message: `Multiple medias detected; instanceId is required for command '${action}'`,
					action
				});
			}
			if (targetInstanceId === "all") {
				broadcastToPorts({
					type: `${NS}${action}`,
					source: "parent",
					value
				});
				return Promise.resolve({
					success: true,
					instanceId: "all",
					action
				});
			}
			const isAssignedPending = targetId && (assignedIframeIdMap.has(targetId) || target && target.status === "connecting");
			if (target?.port && target.status !== "connecting") try {
				target.port.postMessage({
					type: `${NS}${action}`,
					source: "parent",
					value
				});
				return Promise.resolve({
					success: true,
					instanceId: targetId,
					action
				});
			} catch (err) {
				console_warn(`[sremote] Error posting command '${action}' to port for '${targetId}':`, err);
				return Promise.resolve({
					success: false,
					error: "PORT_DISCONNECTED",
					message: String(err),
					instanceId: targetId
				});
			}
			if (targetInstanceId && !target && !isAssignedPending) {
				console_warn(`[sremote] Target instance '${targetInstanceId}' does not exist.`);
				return Promise.resolve({
					success: false,
					error: "INSTANCE_NOT_FOUND",
					message: `Instance '${targetInstanceId}' not found`,
					instanceId: targetInstanceId
				});
			}
			console_log(`%c[SRemote:queue] Instance '${targetId || "pending"}' is connecting or pending port. Queueing '${action}'...`, "color: #f59e0b;");
			return new Promise((resolve) => {
				pendingCommandQueue.push({
					action,
					value,
					targetInstanceId: targetId,
					timestamp: Date.now(),
					resolve
				});
			});
		}
		function queryMediaInstancesViaGM() {
			const queryToken = `query_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
			Storage.set(`sremote:query_req`, queryToken);
			const keys = Storage.list();
			const found = [];
			for (const k of keys) if (k && k.startsWith("sremote:report:")) {
				const raw = Storage.get(k);
				try {
					const data = typeof raw === "string" ? JSON.parse(raw) : raw;
					if (data && data.hasMedia) found.push(data);
				} catch {}
				Storage.remove(k);
			}
			return found;
		}
		setupParentHandshake(instanceManager);
		setupLivenessReaper(instances, removeInstance, iframeToAssignedIdMap);
		createExportedApi({
			instanceManager,
			dispatchCommand,
			validateDomainAccess,
			queryMediaInstancesViaGM
		});
	}
	var BADGE_CSS = `${theme_default}\n${styles_default}`;
	var indicatorHost = null;
	function showConnectedIndicator(origin, primaryAuthorizedOrigin) {
		const targetOrigin = origin || primaryAuthorizedOrigin || "unknown_parent";
		const { hideBadgeKey } = getOriginStorageKeys(targetOrigin);
		if (Storage.get(hideBadgeKey) === "1") return;
		if (indicatorHost && indicatorHost.isConnected) return;
		indicatorHost = document.createElement("div");
		indicatorHost.id = "sremote-indicator-host";
		const shadow = indicatorHost.attachShadow({ mode: "closed" });
		const style = document.createElement("style");
		style.textContent = BADGE_CSS;
		const wrapper = document.createElement("div");
		wrapper.className = "sv-badge-wrapper";
		const dotBtn = createButton({
			className: "sv-dot-btn",
			text: "✕",
			title: t("badgeCloseTitle"),
			onClick: () => {
				indicatorHost?.remove();
				indicatorHost = null;
			}
		});
		const label = document.createElement("span");
		label.className = "sv-label";
		label.textContent = "sremote";
		const actions = document.createElement("div");
		actions.className = "sv-actions";
		const btnDontShow = createButton({
			className: "sv-action-btn",
			text: t("badgeDontShow"),
			title: t("badgeDontShowTitle"),
			onClick: () => {
				Storage.set(hideBadgeKey, "1");
				indicatorHost?.remove();
				indicatorHost = null;
			}
		});
		actions.append(btnDontShow);
		const tooltip = document.createElement("div");
		tooltip.className = "sv-tooltip";
		const tooltipInner = document.createElement("div");
		tooltipInner.className = "sv-tooltip-inner";
		tooltipInner.textContent = `${t("badgeTooltipPrefix")}${targetOrigin}${t("badgeTooltipSuffix")}sremote`;
		tooltip.append(tooltipInner);
		wrapper.append(dotBtn, label, actions, tooltip);
		shadow.append(style, wrapper);
		const mount = () => {
			const target = document.body || document.documentElement;
			if (target && !indicatorHost.isConnected) target.appendChild(indicatorHost);
		};
		mount();
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
	}
	function hideConnectedIndicator() {
		if (indicatorHost) {
			indicatorHost.remove();
			indicatorHost = null;
		}
	}
	var IframeStyleEngine = (function initIframeStyleEngine() {
		let dynamicCssText = "";
		let dynamicStyleEl = null;
		function applyDynamicCSS(css) {
			dynamicCssText = typeof css === "string" ? css : "";
			if (!dynamicCssText.trim()) {
				if (dynamicStyleEl) {
					dynamicStyleEl.remove();
					dynamicStyleEl = null;
				}
				return;
			}
			try {
				if (!dynamicStyleEl || !dynamicStyleEl.isConnected) {
					dynamicStyleEl = document.createElement("style");
					dynamicStyleEl.id = "sremote-dynamic-css";
					dynamicStyleEl.textContent = dynamicCssText;
					const target = document.head || document.documentElement;
					if (target) target.appendChild(dynamicStyleEl);
				} else dynamicStyleEl.textContent = dynamicCssText;
			} catch (e) {
				console_warn("[sremote:css] Error applying dynamic CSS:", e);
			}
		}
		function maintainStyles() {
			if (dynamicCssText && (!dynamicStyleEl || !dynamicStyleEl.isConnected)) applyDynamicCSS(dynamicCssText);
		}
		return {
			init(initialCss = "") {
				if (initialCss) applyDynamicCSS(initialCss);
			},
			setDynamicCSS(css) {
				applyDynamicCSS(css);
			},
			getDynamicCSS() {
				return dynamicCssText;
			},
			removeDynamicCSS() {
				applyDynamicCSS("");
			},
			maintainStyles
		};
	})();
	var MockMediaMetadata = class {
		constructor(init = {}) {
			this.title = init.title || "";
			this.artist = init.artist || "";
			this.album = init.album || "";
			this.artwork = Array.isArray(init.artwork) ? Object.freeze([...init.artwork]) : Object.freeze([]);
		}
	};
	if (typeof MediaMetadata === "undefined") try {
		window.MediaMetadata = MockMediaMetadata;
	} catch {}
	var MockMediaSession = class {
		constructor() {
			this.metadata = null;
			this.playbackState = "none";
			this._handlers = new Map();
			this._resolver = null;
		}
		setResolver(resolver) {
			this._resolver = resolver;
		}
		setActionHandler(action, handler) {
			if (typeof handler === "function") this._handlers.set(action, handler);
			else this._handlers.delete(action);
		}
		setPositionState(state) {
			this.positionState = state;
		}
		hasHandler(action) {
			if (this._handlers.has(action)) return true;
			const media = this._resolver?.getActiveMedia?.();
			if (media && (media.tagName === "VIDEO" || media.tagName === "AUDIO")) return [
				"play",
				"pause",
				"stop",
				"seekto",
				"seekforward",
				"seekbackward",
				"previoustrack",
				"nexttrack"
			].includes(action);
			return false;
		}
		async invoke(action, details = {}) {
			const handler = this._handlers.get(action);
			if (typeof handler === "function") try {
				await handler({
					action,
					...details
				});
				return true;
			} catch (e) {
				console_warn(`[sremote] MockMediaSession handler for ${action} error:`, e);
			}
			const media = this._resolver?.getActiveMedia?.();
			if (media && (media.tagName === "VIDEO" || media.tagName === "AUDIO")) try {
				switch (action) {
					case "play":
						if (typeof media.play === "function") await media.play();
						return true;
					case "pause":
						if (typeof media.pause === "function") media.pause();
						return true;
					case "stop":
						if (typeof media.pause === "function") media.pause();
						media.currentTime = 0;
						return true;
					case "seekto":
						if (typeof details.seekTime === "number") {
							media.currentTime = details.seekTime;
							return true;
						}
						break;
					case "seekforward": {
						const offset = details.seekOffset || 10;
						media.currentTime = (media.currentTime || 0) + offset;
						return true;
					}
					case "seekbackward": {
						const offset = details.seekOffset || 10;
						media.currentTime = Math.max(0, (media.currentTime || 0) - offset);
						return true;
					}
				}
			} catch (err) {
				console_warn(`[sremote] MockMediaSession fallback ${action} error:`, err);
			}
			return false;
		}
	};
	var mockMediaSessionInstance = new MockMediaSession();
	var activeMediaSession = navigator?.mediaSession || mockMediaSessionInstance;
	function hookMediaSession() {
		try {
			const ms = pageWindow.navigator?.mediaSession || navigator?.mediaSession;
			if (!ms) return;
			const proto = Object.getPrototypeOf(ms);
			const originalSet = proto?.setActionHandler || ms.setActionHandler;
			if (!originalSet) return;
			const wrappedSet = function(action, handler) {
				mockMediaSessionInstance.setActionHandler(action, handler);
				return originalSet.call(this, action, handler);
			};
			if (proto) proto.setActionHandler = wrappedSet;
			try {
				ms.setActionHandler = wrappedSet;
			} catch {}
		} catch (e) {
			console_warn("[sremote] MediaSession hook warning:", e);
		}
	}
	var knownShadowRoots = new Set();
	function getKnownShadowRoots() {
		return Array.from(knownShadowRoots);
	}
	function setupMediaHooks({ trackMediaElement, onElementAdded }) {
		try {
			const hookAttachShadowOn = (targetProto) => {
				if (!targetProto || targetProto.__sremote_attach_shadow_hooked__) return;
				try {
					const nativeAttachShadow = targetProto.attachShadow;
					if (typeof nativeAttachShadow === "function") {
						targetProto.attachShadow = function(init) {
							const shadowRoot = nativeAttachShadow.call(this, init);
							if (shadowRoot) {
								knownShadowRoots.add(shadowRoot);
								try {
									new MutationObserver((mutations) => {
										for (let i = 0; i < mutations.length; i++) {
											const m = mutations[i];
											if (m.addedNodes) for (let j = 0; j < m.addedNodes.length; j++) {
												const node = m.addedNodes[j];
												if (node.nodeType === 1) {
													if (node.tagName === "AUDIO" || node.tagName === "VIDEO" || node instanceof HTMLMediaElement) trackMediaElement(node);
													if (typeof onElementAdded === "function") onElementAdded(node);
												}
											}
										}
									}).observe(shadowRoot, {
										childList: true,
										subtree: true
									});
								} catch {}
							}
							return shadowRoot;
						};
						targetProto.__sremote_attach_shadow_hooked__ = true;
					}
				} catch {}
			};
			const elemProto = window.Element?.prototype || typeof globalThis !== "undefined" && globalThis.Element?.prototype;
			if (elemProto) hookAttachShadowOn(elemProto);
			if (pageWindow?.Element?.prototype && pageWindow.Element.prototype !== elemProto) hookAttachShadowOn(pageWindow.Element.prototype);
			const hookAudioConstructorOn = (targetWin) => {
				if (!targetWin) return;
				try {
					const NativeAudio = targetWin.Audio;
					if (typeof NativeAudio === "function" && !NativeAudio.__sremote_hooked__) {
						const HookedAudio = function(...args) {
							const instance = new NativeAudio(...args);
							trackMediaElement(instance);
							return instance;
						};
						HookedAudio.prototype = NativeAudio.prototype;
						HookedAudio.__sremote_hooked__ = true;
						targetWin.Audio = HookedAudio;
					}
				} catch {}
			};
			hookAudioConstructorOn(window);
			if (pageWindow && pageWindow !== window) hookAudioConstructorOn(pageWindow);
			const hookCreateElementOn = (targetDocProto) => {
				if (!targetDocProto || targetDocProto.__sremote_hooked__) return;
				try {
					const nativeCreateElement = targetDocProto.createElement;
					if (typeof nativeCreateElement === "function") {
						targetDocProto.createElement = function(tagName, options) {
							const el = nativeCreateElement.call(this, tagName, options);
							if (typeof tagName === "string") {
								const lower = tagName.toLowerCase();
								if (lower === "audio" || lower === "video") trackMediaElement(el);
							}
							return el;
						};
						targetDocProto.__sremote_hooked__ = true;
					}
				} catch {}
			};
			hookCreateElementOn(Document.prototype);
			if (pageWindow?.Document?.prototype && pageWindow.Document.prototype !== Document.prototype) hookCreateElementOn(pageWindow.Document.prototype);
			const hookMediaPlayOn = (targetMediaProto) => {
				if (!targetMediaProto || targetMediaProto.__sremote_play_hooked__) return;
				try {
					const nativePlay = targetMediaProto.play;
					if (typeof nativePlay === "function") {
						targetMediaProto.play = function(...args) {
							trackMediaElement(this);
							return nativePlay.apply(this, args);
						};
						targetMediaProto.__sremote_play_hooked__ = true;
					}
				} catch {}
			};
			hookMediaPlayOn(HTMLMediaElement.prototype);
			if (pageWindow?.HTMLMediaElement?.prototype && pageWindow.HTMLMediaElement.prototype !== HTMLMediaElement.prototype) hookMediaPlayOn(pageWindow.HTMLMediaElement.prototype);
			const onAnyMediaActivity = (ev) => {
				const el = ev.target;
				if (el && (el.tagName === "AUDIO" || el.tagName === "VIDEO" || el instanceof HTMLMediaElement)) trackMediaElement(el);
			};
			window.addEventListener("play", onAnyMediaActivity, true);
			window.addEventListener("loadeddata", onAnyMediaActivity, true);
			if (pageWindow && pageWindow !== window) try {
				pageWindow.addEventListener("play", onAnyMediaActivity, true);
				pageWindow.addEventListener("loadeddata", onAnyMediaActivity, true);
			} catch {}
		} catch (e) {
			console_warn("[sremote] Media constructors hook warning:", e);
		}
	}
	function queryMediaDeep(root = document, visitedRoots = new Set()) {
		const list = [];
		try {
			if (!root || visitedRoots.has(root)) return list;
			visitedRoots.add(root);
			if (root.querySelectorAll) {
				const found = root.querySelectorAll("video, audio");
				for (let i = 0; i < found.length; i++) list.push(found[i]);
			}
			const allElements = root.querySelectorAll ? root.querySelectorAll("*") : [];
			for (let i = 0; i < allElements.length; i++) {
				const el = allElements[i];
				if (el.shadowRoot) list.push(...queryMediaDeep(el.shadowRoot, visitedRoots));
				if (el.tagName === "IFRAME" || el.tagName === "FRAME") try {
					const childDoc = el.contentDocument || el.contentWindow?.document;
					if (childDoc) list.push(...queryMediaDeep(childDoc, visitedRoots));
				} catch {}
			}
		} catch {}
		return list;
	}
	function findAllMedia() {
		const visitedRoots = new Set();
		const mediaList = queryMediaDeep(document, visitedRoots);
		try {
			const shadowRoots = getKnownShadowRoots();
			for (let i = 0; i < shadowRoots.length; i++) {
				const sr = shadowRoots[i];
				if (sr && !visitedRoots.has(sr)) {
					const subMedia = queryMediaDeep(sr, visitedRoots);
					for (let j = 0; j < subMedia.length; j++) if (!mediaList.includes(subMedia[j])) mediaList.push(subMedia[j]);
				}
			}
		} catch {}
		return mediaList;
	}
	function createMediaResolver(createdMediaPool, bindVideoEvents) {
		let activeMedia = null;
		let mediaType = null;
		function resolveActiveMedia() {
			if (activeMedia && (mediaType === "adapter" || activeMedia.isConnected || createdMediaPool.has(activeMedia))) return true;
			if (mediaType === "adapter" && activeMedia) return true;
			const all = findAllMedia();
			if (all.length > 0) {
				const valid = all.find((el) => !el.paused && !el.ended && el.currentTime > 0) || all.find((el) => !el.paused) || all.find((el) => el.duration && el.duration > 0 || el.currentSrc || el.src) || all[0];
				activeMedia = valid;
				mediaType = valid.tagName ? valid.tagName.toLowerCase() : "video";
				bindVideoEvents(valid);
				return true;
			}
			const ms = pageWindow.navigator?.mediaSession || navigator?.mediaSession;
			const hasHandlers = mockMediaSessionInstance._handlers.size > 0;
			const hasMetadata = Boolean(ms?.metadata && (ms.metadata.title || ms.metadata.artist));
			const isPlayingState = ms?.playbackState === "playing" || ms?.playbackState === "paused";
			if (hasHandlers || hasMetadata || isPlayingState) {
				activeMedia = activeMediaSession;
				mediaType = "mediasession";
				return true;
			}
			activeMedia = null;
			mediaType = null;
			return false;
		}
		return {
			getActiveMedia: () => activeMedia,
			getMediaType: () => mediaType,
			setActiveMedia: (m) => {
				activeMedia = m;
			},
			setMediaType: (t) => {
				mediaType = t;
			},
			resolveActiveMedia
		};
	}
	function getVideoState(targetMedia, activeMedia, resolveActiveMedia) {
		const media = targetMedia || activeMedia || (resolveActiveMedia() ? activeMedia : null);
		if (!media) return null;
		const curVol = safeGetProp(media, descriptors.volume, "volume") ?? (media.volume !== void 0 ? media.volume : 1);
		const curMuted = safeGetProp(media, descriptors.muted, "muted") ?? (media.muted !== void 0 ? media.muted : false);
		const curTime = safeGetProp(media, descriptors.currentTime, "currentTime") ?? (media.currentTime !== void 0 ? media.currentTime : 0);
		const rawDur = safeGetProp(media, descriptors.duration, "duration") ?? media.duration;
		const curRate = safeGetProp(media, descriptors.playbackRate, "playbackRate") ?? (media.playbackRate !== void 0 ? media.playbackRate : 1);
		const isPaused = safeGetProp(media, descriptors.paused, "paused") ?? (media.paused !== void 0 ? media.paused : true);
		const isEnded = safeGetProp(media, descriptors.ended, "ended") ?? (media.ended !== void 0 ? media.ended : false);
		const curReadyState = safeGetProp(media, descriptors.readyState, "readyState") ?? (media.readyState !== void 0 ? media.readyState : 0);
		const curSrc = safeGetProp(media, descriptors.currentSrc, "currentSrc") || media.currentSrc || safeGetProp(media, descriptors.src, "src") || media.src || "";
		const dur = Number.isFinite(rawDur) ? rawDur : null;
		let bufferedEnd = 0;
		try {
			const buf = safeGetProp(media, descriptors.buffered, "buffered") || media.buffered;
			if (buf && buf.length > 0) bufferedEnd = buf.end(buf.length - 1);
		} catch {}
		const isLoop = safeGetProp(media, descriptors.loop, "loop") ?? (media.loop !== void 0 ? media.loop : false);
		return {
			paused: isPaused,
			ended: Boolean(isEnded || dur && dur > 0 && curTime >= dur - .1),
			currentTime: curTime,
			duration: dur,
			buffered: bufferedEnd,
			volume: curVol,
			muted: curMuted,
			playbackRate: curRate,
			readyState: curReadyState,
			src: curSrc,
			loop: Boolean(isLoop),
			repeat: isLoop ? "one" : "off",
			fullscreen: !!(document.fullscreenElement && (document.fullscreenElement === media || document.fullscreenElement.contains(media))),
			pictureInPicture: document.pictureInPictureElement === media
		};
	}
	function getIframeCapabilities(targetMedia, activeMedia, resolveActiveMedia) {
		const media = targetMedia || activeMedia || (resolveActiveMedia?.() ? activeMedia : null);
		const hasNative = Boolean(media && (media.tagName === "VIDEO" || media.tagName === "AUDIO"));
		const isVideo = Boolean(media && media.tagName === "VIDEO");
		const msHandlers = mockMediaSessionInstance._handlers;
		const hasMsAction = (action) => Boolean(msHandlers.has(action));
		const hasMediaSession = Boolean(typeof navigator !== "undefined" && navigator.mediaSession || msHandlers.size > 0);
		const canPlay = hasNative || hasMsAction("play");
		const canPause = hasNative || hasMsAction("pause");
		return {
			play: canPlay,
			pause: canPause,
			toggle: hasNative && canPlay && canPause || hasMsAction("play") || hasMsAction("pause"),
			stop: hasNative || hasMsAction("stop"),
			seek: hasNative || hasMsAction("seekto") || hasMsAction("seekforward") || hasMsAction("seekbackward"),
			volume: hasNative,
			muted: hasNative,
			speed: hasNative,
			playbackRate: hasNative,
			pip: isVideo && typeof document !== "undefined" && Boolean(document.pictureInPictureEnabled || media.requestPictureInPicture),
			quality: false,
			subtitles: Boolean(hasNative && media.textTracks && media.textTracks.length > 0),
			shuffle: hasMsAction("shuffle"),
			repeat: hasNative,
			next: hasMsAction("nexttrack"),
			previous: hasMsAction("previoustrack"),
			load: hasNative,
			hasAdapter: false,
			hasNative,
			hasMediaSession
		};
	}
	async function safePlayMedia(el) {
		if (!el) return;
		try {
			const isEnded = Boolean(safeGetProp(el, descriptors.ended, "ended") || el.ended);
			const curTime = safeGetProp(el, descriptors.currentTime, "currentTime") ?? 0;
			const dur = safeGetProp(el, descriptors.duration, "duration") ?? 0;
			const curSrc = safeGetProp(el, descriptors.currentSrc, "currentSrc") || el.currentSrc || safeGetProp(el, descriptors.src, "src") || el.src || "";
			const readyState = safeGetProp(el, descriptors.readyState, "readyState") ?? el.readyState ?? 0;
			if (!curSrc && readyState === 0 && !dur) {
				if (!(el.querySelector && el.querySelector("source[src]"))) {
					console_warn(`%c[sremote] MISSING_MEDIA_SOURCE:%c The iframe service has not loaded any media source into <${el.tagName.toLowerCase()}> (readyState = 0)! play() is ineffective until media source is injected.`, "background: #f59e0b; color: #000; font-weight: bold; padding: 2px 4px; border-radius: 3px;", "color: #f59e0b;");
					return {
						success: false,
						error: "MISSING_MEDIA_SOURCE",
						message: "The iframe service has not loaded any media source into the media element (readyState = 0); play() is ineffective."
					};
				}
			}
			if (isEnded || dur > 0 && Math.abs(dur - curTime) <= .1) safeSetProp(el, descriptors.currentTime, "currentTime", 0);
			let res;
			if (typeof el.play === "function") try {
				res = el.play();
			} catch {}
			if (!res && descriptors.play) try {
				res = descriptors.play.call(el);
			} catch {}
			if (res && typeof res.then === "function") await res;
			return res;
		} catch (err) {
			console_warn("[sremote] safePlayMedia error:", err);
		}
	}
	function safePauseMedia(el) {
		if (descriptors.pause) try {
			descriptors.pause.call(el);
		} catch {}
		else try {
			el.pause();
		} catch {}
	}
	function handleBindMetadata({ metadata, instanceId, emitToParent, sendMediaSessionState }) {
		if (!metadata || typeof metadata !== "object") return;
		const safeArtworks = [];
		if (Array.isArray(metadata.artwork)) for (const art of metadata.artwork) {
			if (!art?.src) continue;
			if (typeof art.src === "string" && art.src.startsWith("blob:")) {
				console_warn(`[sremote] WTF you passed me ${instanceId} a Blob URL, but I told you to send Blob Object to bypass SOP. I just requested parent page to clone the object for me`);
				emitToParent("requestBlobClone", { blobUrl: art.src });
			} else safeArtworks.push(art);
		}
		try {
			const metaObj = {
				title: metadata.title,
				artist: metadata.artist,
				album: metadata.album,
				artwork: safeArtworks
			};
			if (typeof MediaMetadata !== "undefined") navigator.mediaSession.metadata = new MediaMetadata(metaObj);
			mockMediaSessionInstance.metadata = metaObj;
		} catch (e) {
			console_warn("[sremote] Error setting MediaMetadata:", e);
		}
		sendMediaSessionState();
	}
	function createMediaController({ activeMediaGetter, mediaTypeGetter, resolveActiveMedia, notifyState, sendMediaSessionState, configuredVolumeSetter, configuredMutedSetter, programmaticActionTimestampSetter, emitToParent, instanceId }) {
		return async function executeControl(action, value, isPureGet = false) {
			if (!isPureGet) programmaticActionTimestampSetter(Date.now());
			const norm = action.toLowerCase();
			resolveActiveMedia();
			const activeMedia = activeMediaGetter();
			const mediaType = mediaTypeGetter();
			if (mediaType === "adapter" && activeMedia && typeof activeMedia === "object") {
				if (!await executeAdapterAction(activeMedia, norm, value, isPureGet)) return false;
				let resVal;
				if (typeof activeMedia.getState === "function") try {
					resVal = await activeMedia.getState();
				} catch {}
				if (isPureGet) notifyState(action, resVal);
				return true;
			}
			if ((mediaType === "video" || mediaType === "audio") && activeMedia) {
				let resVal;
				const getPaused = () => Boolean(safeGetProp(activeMedia, descriptors.paused, "paused") ?? activeMedia.paused);
				switch (norm) {
					case "play":
						if (!isPureGet) await safePlayMedia(activeMedia);
						resVal = !getPaused();
						break;
					case "pause":
						if (!isPureGet) safePauseMedia(activeMedia);
						resVal = !getPaused();
						break;
					case "toggle":
						if (!isPureGet) {
							if (getPaused()) await safePlayMedia(activeMedia);
							else safePauseMedia(activeMedia);
						}
						resVal = !getPaused();
						break;
					case "stop":
						if (!isPureGet) {
							safePauseMedia(activeMedia);
							safeSetProp(activeMedia, descriptors.currentTime, "currentTime", 0);
							notifyState("stop", 0);
						}
						resVal = safeGetProp(activeMedia, descriptors.currentTime, "currentTime");
						break;
					case "currenttime":
						if (!isPureGet && value !== void 0 && value !== null) safeSetProp(activeMedia, descriptors.currentTime, "currentTime", Math.max(0, Number(value)));
						resVal = safeGetProp(activeMedia, descriptors.currentTime, "currentTime");
						break;
					case "seek":
						if (!isPureGet && value !== void 0 && value !== null) {
							const cur = safeGetProp(activeMedia, descriptors.currentTime, "currentTime") || 0;
							safeSetProp(activeMedia, descriptors.currentTime, "currentTime", Math.max(0, cur + Number(value)));
						}
						resVal = safeGetProp(activeMedia, descriptors.currentTime, "currentTime");
						break;
					case "volume":
						if (!isPureGet && value !== void 0 && value !== null) {
							let num = Number(value);
							if (num > 1 && num <= 100) num /= 100;
							num = Math.min(1, Math.max(0, num));
							configuredVolumeSetter(num);
							configuredMutedSetter(false);
							safeSetProp(activeMedia, descriptors.volume, "volume", num);
							safeSetProp(activeMedia, descriptors.muted, "muted", false);
							for (const el of findAllMedia()) if (el !== activeMedia) {
								safeSetProp(el, descriptors.volume, "volume", num);
								safeSetProp(el, descriptors.muted, "muted", false);
							}
						}
						resVal = safeGetProp(activeMedia, descriptors.volume, "volume");
						break;
					case "muted":
						if (!isPureGet) {
							const curM = safeGetProp(activeMedia, descriptors.muted, "muted");
							const nextM = value !== void 0 && value !== null ? Boolean(value) : !curM;
							configuredMutedSetter(nextM);
							safeSetProp(activeMedia, descriptors.muted, "muted", nextM);
							for (const el of findAllMedia()) if (el !== activeMedia) safeSetProp(el, descriptors.muted, "muted", nextM);
						}
						resVal = safeGetProp(activeMedia, descriptors.muted, "muted");
						break;
					case "playbackrate":
						if (!isPureGet && value !== void 0) safeSetProp(activeMedia, descriptors.playbackRate, "playbackRate", Number(value) || 1);
						resVal = safeGetProp(activeMedia, descriptors.playbackRate, "playbackRate");
						break;
					case "enterpip":
						if (!isPureGet && activeMedia.requestPictureInPicture) try {
							await activeMedia.requestPictureInPicture();
						} catch {}
						break;
					case "exitpip":
						if (!isPureGet && document.exitPictureInPicture) try {
							await document.exitPictureInPicture();
						} catch {}
						break;
					case "pip": if (!isPureGet) {
						if (document.pictureInPictureElement) try {
							await document.exitPictureInPicture();
						} catch {}
						else if (activeMedia.requestPictureInPicture) try {
							await activeMedia.requestPictureInPicture();
						} catch {}
					}
					case "bindmetadata":
						handleBindMetadata({
							metadata: value,
							instanceId,
							emitToParent,
							sendMediaSessionState
						});
						break;
					case "nexttrack":
					case "previoustrack":
						if (!isPureGet) await mockMediaSessionInstance.invoke(norm);
						break;
					case "repeat":
					case "loop":
						if (!isPureGet) {
							let nextLoop;
							if (value === void 0 || value === null) nextLoop = !Boolean(safeGetProp(activeMedia, descriptors.loop, "loop") ?? activeMedia.loop);
							else if (typeof value === "string") nextLoop = value === "one" || value === "all";
							else nextLoop = Boolean(value);
							safeSetProp(activeMedia, descriptors.loop, "loop", nextLoop);
							for (const el of findAllMedia()) if (el !== activeMedia) safeSetProp(el, descriptors.loop, "loop", nextLoop);
						}
						resVal = Boolean(safeGetProp(activeMedia, descriptors.loop, "loop") ?? activeMedia.loop) ? "one" : "off";
						break;
					case "shuffle":
						if (!isPureGet && mockMediaSessionInstance._handlers.has("shuffle")) await mockMediaSessionInstance.invoke("shuffle", { enable: Boolean(value) });
						break;
					case "getsubtitles":
						if (activeMedia.textTracks) {
							const tracks = [];
							for (let i = 0; i < activeMedia.textTracks.length; i++) {
								const t = activeMedia.textTracks[i];
								tracks.push({
									id: t.id || String(i),
									label: t.label || t.language || `Track ${i + 1}`,
									language: t.language,
									mode: t.mode
								});
							}
							resVal = tracks;
						} else resVal = [];
						break;
					case "subtitle":
						if (activeMedia.textTracks) {
							const targetLang = value === null || value === "off" || value === false ? null : String(value).toLowerCase();
							for (let i = 0; i < activeMedia.textTracks.length; i++) {
								const t = activeMedia.textTracks[i];
								if (!targetLang) t.mode = "disabled";
								else if (t.id === targetLang || t.language && t.language.toLowerCase() === targetLang || t.label && t.label.toLowerCase() === targetLang) t.mode = "showing";
								else t.mode = "disabled";
							}
						}
						break;
					case "load":
						if (!isPureGet) {
							if (typeof value === "string" && value) {
								safeSetProp(activeMedia, descriptors.src, "src", value);
								if (typeof activeMedia.load === "function") activeMedia.load();
							} else console_warn("[SRemote] load() is primarily designed for custom adapters and is not implemented by default. Implement it via sremote.useAdapter().");
						}
						break;
					default: return false;
				}
				if (isPureGet) notifyState(action, resVal);
				return true;
			}
			const hasMockHandler = mockMediaSessionInstance._handlers.size > 0;
			const canHandleNorm = mockMediaSessionInstance._handlers.has(norm) || norm === "toggle" && (mockMediaSessionInstance._handlers.has("play") || mockMediaSessionInstance._handlers.has("pause"));
			if (hasMockHandler && canHandleNorm) {
				if (!isPureGet) {
					if (norm === "toggle") {
						const isPaused = navigator.mediaSession?.playbackState === "paused" || mockMediaSessionInstance.playbackState === "paused";
						await mockMediaSessionInstance.invoke(isPaused ? "play" : "pause");
					} else await mockMediaSessionInstance.invoke(norm, { seekOffset: Number(value) || void 0 });
				}
				sendMediaSessionState(action);
				return true;
			}
			return false;
		};
	}
	function createIframeDebugApi({ activeMediaGetter, resolveActiveMedia, findAllMedia, getVideoState, getIframeCapabilities, mockMediaSessionInstance, IframeStyleEngine, originalMediaSrcBeforeDebugGetter, originalMediaSrcBeforeDebugSetter }) {
		return {
			get activeMedia() {
				resolveActiveMedia();
				return activeMediaGetter();
			},
			get capabilities() {
				resolveActiveMedia();
				return typeof getIframeCapabilities === "function" ? getIframeCapabilities(null, activeMediaGetter(), resolveActiveMedia) : null;
			},
			getCapabilities() {
				resolveActiveMedia();
				return typeof getIframeCapabilities === "function" ? getIframeCapabilities(null, activeMediaGetter(), resolveActiveMedia) : null;
			},
			inspect() {
				resolveActiveMedia();
				const target = activeMediaGetter() || findAllMedia()[0];
				if (target) {
					console.log("%c[sremote_debug.inspect] Active Media Element:", "color: #10b981; font-weight: bold;", target);
					if (typeof inspect === "function") inspect(target);
				} else console.warn("[sremote_debug] No active media element found to inspect.");
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
					handlers: Array.from(mockMediaSessionInstance._handlers.keys())
				};
			},
			dump(index = 0) {
				const target = findAllMedia()[index] || activeMediaGetter();
				console.log(`%c[sremote_debug] Frame Media Dump (Element #${index}):`, "color: #10b981; font-weight: bold;");
				if (target) console.table({
					tagName: target.tagName,
					src: target.currentSrc || target.src,
					currentTime: target.currentTime,
					duration: target.duration,
					paused: target.paused,
					muted: target.muted,
					volume: target.volume,
					playbackRate: target.playbackRate,
					readyState: target.readyState,
					networkState: target.networkState
				});
				else console.log("No media element found in DOM or pool.");
				console.log("MediaSession Details:", this.getMediaSession());
			},
			setSource(url, index = 0) {
				const target = findAllMedia()[index] || activeMediaGetter();
				if (!target) return console.warn("[sremote_debug] No media element to set source");
				if (!originalMediaSrcBeforeDebugGetter()) originalMediaSrcBeforeDebugSetter(target.currentSrc || target.src);
				target.src = url;
				target.load();
				target.play().catch((e) => console.warn("[sremote_debug] Autoplay prevented:", e));
			},
			setBlob(blobOrFile, index = 0) {
				const url = typeof blobOrFile === "string" ? blobOrFile : URL.createObjectURL(blobOrFile);
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
				const target = findAllMedia()[index] || activeMediaGetter();
				const originalSrc = originalMediaSrcBeforeDebugGetter();
				if (target && originalSrc) {
					target.src = originalSrc;
					target.load();
					target.play().catch(() => {});
					originalMediaSrcBeforeDebugSetter(null);
					console.log("[sremote_debug] Restored original source:", target.src);
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
			}
		};
	}
	function createRpcRegistry({ resolver, instanceId, emitToParent, sendMediaSessionState, notifyState, getOriginalMediaSrc, setOriginalMediaSrc }) {
		const customRpcActions = new Map();
		customRpcActions.set("getCapabilities", async () => {
			resolver.resolveActiveMedia();
			return {
				capabilities: getIframeCapabilities(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
				hasMedia: Boolean(resolver.getActiveMedia()),
				mediaType: resolver.getMediaType(),
				customActions: Array.from(customRpcActions.keys()),
				mediaSessionSupported: Boolean(navigator.mediaSession),
				hasCustomCSS: Boolean(IframeStyleEngine.getDynamicCSS())
			};
		});
		customRpcActions.set("getMediaInfo", async () => {
			resolver.resolveActiveMedia();
			return {
				state: getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
				title: document.title,
				url: location.href,
				mediaType: resolver.getMediaType()
			};
		});
		customRpcActions.set("setIframeCSS", async (params) => {
			const css = params?.css || "";
			IframeStyleEngine.setDynamicCSS(css);
			return {
				success: true,
				css: IframeStyleEngine.getDynamicCSS()
			};
		});
		customRpcActions.set("getIframeCSS", async () => ({
			success: true,
			css: IframeStyleEngine.getDynamicCSS()
		}));
		customRpcActions.set("removeIframeCSS", async () => {
			IframeStyleEngine.removeDynamicCSS();
			return { success: true };
		});
		customRpcActions.set("debug_getState", async () => {
			resolver.resolveActiveMedia();
			const mediaElements = findAllMedia().map((el, idx) => ({
				index: idx,
				tagName: el.tagName,
				src: el.currentSrc || el.src || "",
				paused: el.paused,
				muted: el.muted,
				volume: el.volume,
				currentTime: el.currentTime,
				duration: el.duration,
				readyState: el.readyState,
				networkState: el.networkState,
				isActive: el === resolver.getActiveMedia()
			}));
			const ms = navigator.mediaSession || mockMediaSessionInstance;
			const mediaSession = {
				supported: Boolean(navigator.mediaSession),
				playbackState: ms?.playbackState,
				metadata: ms?.metadata ? {
					title: ms.metadata.title,
					artist: ms.metadata.artist,
					album: ms.metadata.album,
					artwork: ms.metadata.artwork || []
				} : null,
				registeredHandlers: Array.from(mockMediaSessionInstance._handlers.keys())
			};
			return {
				instanceId,
				location: location.href,
				origin: location.origin,
				mediaType: resolver.getMediaType(),
				state: getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
				mediaElements,
				mediaSession
			};
		});
		customRpcActions.set("debug_setSource", async (params) => {
			resolver.resolveActiveMedia();
			if (!resolver.getActiveMedia() && findAllMedia().length === 0) {
				const audio = new Audio();
				document.body?.appendChild(audio);
				resolver.setActiveMedia(audio);
				resolver.setMediaType("audio");
			}
			const media = resolver.getActiveMedia() || findAllMedia()[0];
			if (!media) return {
				success: false,
				error: "NO_MEDIA_FOUND",
				message: "No media element found to set source"
			};
			if (!getOriginalMediaSrc()) setOriginalMediaSrc(media.currentSrc || media.src);
			const newSrc = params?.src;
			if (!newSrc) return {
				success: false,
				error: "NO_SRC_PROVIDED",
				message: "Parameter \"src\" is required"
			};
			media.src = newSrc;
			media.load();
			try {
				await media.play();
			} catch (err) {
				console_warn("[sremote_debug] Autoplay error on new source:", err);
			}
			if (params?.title && mockMediaSessionInstance) handleBindMetadata({
				metadata: {
					title: params.title,
					artist: "sremote.debug",
					album: "Debug Track"
				},
				instanceId,
				emitToParent,
				sendMediaSessionState,
				activeMediaGetter: resolver.getActiveMedia,
				mediaTypeGetter: resolver.getMediaType,
				resolveActiveMedia: resolver.resolveActiveMedia
			});
			notifyState();
			return {
				success: true,
				newSrc,
				activeMediaTag: media.tagName
			};
		});
		customRpcActions.set("debug_toggleLoop", async () => {
			resolver.resolveActiveMedia();
			const media = resolver.getActiveMedia() || findAllMedia()[0];
			if (!media) return {
				success: false,
				error: "NO_MEDIA_FOUND",
				message: "No media element found to toggle loop"
			};
			media.loop = !media.loop;
			return {
				success: true,
				loop: media.loop
			};
		});
		customRpcActions.set("debug_simulateStall", async () => {
			resolver.resolveActiveMedia();
			const media = resolver.getActiveMedia() || findAllMedia()[0];
			if (!media) return {
				success: false,
				error: "NO_MEDIA_FOUND",
				message: "No media element found to simulate stall"
			};
			media.dispatchEvent(new Event("waiting"));
			media.dispatchEvent(new Event("stalled"));
			return {
				success: true,
				simulated: ["waiting", "stalled"]
			};
		});
		customRpcActions.set("debug_restoreOriginal", async () => {
			resolver.resolveActiveMedia();
			const media = resolver.getActiveMedia() || findAllMedia()[0];
			if (!media) return {
				success: false,
				error: "NO_MEDIA_FOUND",
				message: "No media element found to restore source"
			};
			const orig = getOriginalMediaSrc();
			if (orig) {
				media.src = orig;
				media.load();
				try {
					await media.play();
				} catch {}
				setOriginalMediaSrc(null);
				notifyState();
				return {
					success: true,
					restored: media.src
				};
			}
			return {
				success: false,
				error: "NO_SAVED_SOURCE",
				message: "No original source was previously saved to restore"
			};
		});
		return {
			customRpcActions,
			async executeRpc(action, params) {
				const fn = customRpcActions.get(action);
				if (typeof fn === "function") return fn(params);
				throw new Error(`Custom action '${action}' not found`);
			}
		};
	}
	function createIframeHandshake({ instanceIdGetter, setInstanceId, resolver, bindPort, notifyState, closeMediaPort, treatAlmostEndAsEndSetter, currentHandshakeSetter, currentHandshakeGetter }) {
		let primaryAuthorizedOrigin = null;
		let permissionPopup = null;
		const authorizedOrigins = new Set();
		const sessionDeniedOrigins = new Set();
		function grantAccess(origin) {
			if (!resolver.resolveActiveMedia()) return;
			primaryAuthorizedOrigin = origin;
			if (origin) authorizedOrigins.add(origin);
			closeMediaPort();
			const channel = new MessageChannel();
			bindPort(channel.port1);
			const transferredPort = channel.port2;
			const hsInfo = typeof currentHandshakeGetter === "function" ? currentHandshakeGetter() : {};
			const payload = {
				type: `${NS}accept`,
				event: "accept",
				source: "iframe",
				instanceId: instanceIdGetter(),
				location: location.href,
				origin: location.origin,
				version: VERSION,
				mediaType: resolver.getMediaType(),
				capabilities: getIframeCapabilities(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
				state: getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
				...hsInfo.handshakeId ? { handshakeId: hsInfo.handshakeId } : {},
				...hsInfo.handshakeToken ? { handshakeToken: hsInfo.handshakeToken } : {}
			};
			console_log(`%c[SRemote:handshake] Iframe sending 'accept' to parent ->`, "color: #10b981; font-weight: bold;", {
				origin,
				instanceId: instanceIdGetter(),
				hasPort: Boolean(transferredPort),
				payload
			});
			try {
				if (transferredPort) window.top.postMessage(payload, origin || "*", [transferredPort]);
				else window.top.postMessage(payload, origin || "*");
			} catch (err) {
				console_warn("[sremote] Error posting accept to top window with targetOrigin:", err);
				if (transferredPort) window.top.postMessage(payload, "*", [transferredPort]);
				else window.top.postMessage(payload, "*");
			}
			notifyState();
			showConnectedIndicator(origin, primaryAuthorizedOrigin);
		}
		function showPermissionPopup(source, origin) {
			if (permissionPopup) return;
			if (sessionDeniedOrigins.has(origin)) return;
			const { allowKey, denyKey } = getOriginStorageKeys(origin);
			if (Storage.get(denyKey) === "1") return;
			if (Storage.get(allowKey) === "1") {
				grantAccess(origin);
				return;
			}
			if (window.top && window.top !== window) try {
				window.top.postMessage({
					type: `${NS}request_permission`,
					source: "iframe",
					origin: location.origin
				}, origin || "*");
				permissionPopup = {
					isDelegating: true,
					close: () => {
						permissionPopup = null;
					}
				};
				return;
			} catch {}
			permissionPopup = createPermissionDialog({
				origin,
				isTop: false,
				onDecision: (allowed) => {
					permissionPopup = null;
					if (allowed) grantAccess(origin);
					else sessionDeniedOrigins.add(origin);
				}
			});
		}
		function handleHelloMessage(event, data) {
			const callerOrigin = event.origin || "unknown_parent";
			if (event.source === window) return;
			if (data.css && typeof data.css === "string") IframeStyleEngine.setDynamicCSS(data.css);
			if (typeof data.treatAlmostEndAsEnd === "boolean") treatAlmostEndAsEndSetter(data.treatAlmostEndAsEnd);
			if (data.assignedInstanceId && typeof data.assignedInstanceId === "string") {
				setInstanceId(data.assignedInstanceId);
				console_log(`%c[SRemote:assignId] Iframe accepted assigned instanceId -> ${data.assignedInstanceId}`, "color: #10b981;");
			}
			if (event.ports && event.ports.length > 0) bindPort(event.ports[0]);
			if (data.handshakeId && data.handshakeToken) currentHandshakeSetter(data.handshakeId, data.handshakeToken);
			if (sessionDeniedOrigins.has(callerOrigin)) return;
			const { allowKey, denyKey } = getOriginStorageKeys(callerOrigin);
			if (allowKey && Storage.get(denyKey) === "1") return;
			if (authorizedOrigins.has(callerOrigin)) {
				grantAccess(callerOrigin);
				return;
			}
			if (allowKey && Storage.get(allowKey) === "1") {
				grantAccess(callerOrigin);
				return;
			}
			if (permissionPopup) return;
			showPermissionPopup(event.source, callerOrigin);
		}
		async function checkPendingHelloFromGM() {
			try {
				const helloSeq = Number(Storage.get("sremote:hello_seq", 0)) || 0;
				if (helloSeq <= 0) return;
				const latestHandshake = Storage.get("sremote:latest_handshake");
				if (!latestHandshake) return;
				if (typeof latestHandshake.treatAlmostEndAsEnd === "boolean") treatAlmostEndAsEndSetter(latestHandshake.treatAlmostEndAsEnd);
				const parentOrigin = latestHandshake.parentOrigin || "unknown_parent";
				if (latestHandshake.handshakeId && latestHandshake.handshakeToken) currentHandshakeSetter(latestHandshake.handshakeId, latestHandshake.handshakeToken);
				console_log(`%c[SRemote:boot] Iframe detected active hello_seq (${helloSeq}) from Parent (${parentOrigin})`, "color: #06b6d4; font-weight: bold;");
				if (sessionDeniedOrigins.has(parentOrigin)) return;
				const { allowKey, denyKey } = getOriginStorageKeys(parentOrigin);
				if (allowKey && Storage.get(denyKey) === "1") return;
				if (authorizedOrigins.has(parentOrigin)) {
					grantAccess(parentOrigin);
					return;
				}
				if (allowKey && Storage.get(allowKey) === "1") {
					grantAccess(parentOrigin);
					return;
				}
				if (permissionPopup) return;
				showPermissionPopup(window.parent, parentOrigin);
			} catch (err) {
				console_warn("[sremote] Error in checkPendingHelloFromGM:", err);
			}
		}
		function handlePermissionResponse(data, callerOrigin) {
			if (permissionPopup) {
				permissionPopup.close?.();
				permissionPopup = null;
			}
			if (data.allowed) grantAccess(data.parentOrigin || callerOrigin);
			else {
				const deniedTarget = data.parentOrigin || callerOrigin;
				if (deniedTarget) sessionDeniedOrigins.add(deniedTarget);
			}
		}
		function handleHandshakePort(event, data, callerOrigin) {
			if (data.instanceId) setInstanceId(data.instanceId);
			closeMediaPort();
			bindPort(event.ports[0]);
			primaryAuthorizedOrigin = callerOrigin;
			authorizedOrigins.add(callerOrigin);
			notifyState();
			showConnectedIndicator(callerOrigin, primaryAuthorizedOrigin);
		}
		return {
			get primaryAuthorizedOrigin() {
				return primaryAuthorizedOrigin;
			},
			grantAccess,
			handleHelloMessage,
			checkPendingHelloFromGM,
			handlePermissionResponse,
			handleHandshakePort
		};
	}
	function initIframeAgent() {
		let topOrigin = null;
		try {
			if (window.top && window.top !== window.self) topOrigin = window.top.location.origin;
		} catch {}
		if (!topOrigin && location.ancestorOrigins && location.ancestorOrigins.length > 0) topOrigin = location.ancestorOrigins[location.ancestorOrigins.length - 1];
		if (!topOrigin && document.referrer) try {
			topOrigin = new URL(document.referrer).origin;
		} catch {}
		const selfDenyKey = getOriginStorageKeys(location.origin).denyKey;
		const topDenyKey = topOrigin ? getOriginStorageKeys(topOrigin).denyKey : null;
		if (selfDenyKey && Storage.get(selfDenyKey) === "1" || topDenyKey && Storage.get(topDenyKey) === "1") return;
		console_log(`%c[sremote v${VERSION}] Injected into frame:`, "background: #0284c7; color: #fff; font-weight: bold; padding: 2px 6px;", location.href);
		let selfAssignedId = null;
		try {
			if (window.name && typeof window.name === "string") {
				const nameMatch = window.name.match(/(?:sremote_id|data-sremote-id)=([^&;\s]+)/i);
				if (nameMatch) selfAssignedId = decodeURIComponent(nameMatch[1]);
			}
			if (!selfAssignedId && location.hash) {
				const hashMatch = location.hash.match(/[#&]sremote_id=([^&]+)/i);
				if (hashMatch) selfAssignedId = decodeURIComponent(hashMatch[1]);
			}
			if (!selfAssignedId && location.search) {
				const searchMatch = location.search.match(/[?&]sremote_id=([^&]+)/i);
				if (searchMatch) selfAssignedId = decodeURIComponent(searchMatch[1]);
			}
		} catch {}
		let instanceId = selfAssignedId || generateInstanceId();
		let mediaPort = null;
		let configuredVolume = null;
		let configuredMuted = null;
		const mediaWaiters = [];
		const boundMediaElements = new WeakSet();
		const createdMediaPool = new WeakSet();
		let currentHandshakeId = null;
		let currentHandshakeToken = null;
		let treatAlmostEndAsEnd = false;
		let programmaticActionTimestamp = 0;
		let originalMediaSrcBeforeDebug = null;
		let initialBootstrapCss = "";
		try {
			const latestHandshake = Storage.get("sremote:latest_handshake");
			if (latestHandshake && latestHandshake.css && typeof latestHandshake.css === "string") initialBootstrapCss = latestHandshake.css;
		} catch {}
		IframeStyleEngine.init(initialBootstrapCss);
		function bindVideoEvents(video) {
			if (!video || boundMediaElements.has(video)) return;
			boundMediaElements.add(video);
			let hasEmittedAlmostEnd = false;
			for (const evtName of MEDIA_EVENTS) video.addEventListener(evtName, () => {
				resolver.setActiveMedia(video);
				resolver.setMediaType(video.tagName ? video.tagName.toLowerCase() : "video");
				if (evtName === "timeupdate") {
					const dur = Number.isFinite(video.duration) ? video.duration : null;
					const curTime = safeGetProp(video, descriptors.currentTime, "currentTime") ?? video.currentTime ?? 0;
					if (dur && dur > 3 && curTime >= dur - .8 && curTime <= dur) {
						if (!hasEmittedAlmostEnd) {
							hasEmittedAlmostEnd = true;
							emitToParent(treatAlmostEndAsEnd ? "ended" : "almostend", { state: getVideoState(video, resolver.getActiveMedia(), resolver.resolveActiveMedia) });
						}
					} else if (dur && curTime < dur - 1.5) hasEmittedAlmostEnd = false;
				}
				if (evtName === "ended") {
					hasEmittedAlmostEnd = false;
					const dur = Number.isFinite(video.duration) ? video.duration : null;
					const curTime = safeGetProp(video, descriptors.currentTime, "currentTime") ?? video.currentTime ?? 0;
					if (dur && dur > 0 && Math.abs(dur - curTime) > 1.5) return;
				}
				const isProgrammatic = Date.now() - programmaticActionTimestamp < 500;
				emitToParent(evtName, {
					isProgrammatic,
					state: getVideoState(video, resolver.getActiveMedia(), resolver.resolveActiveMedia)
				});
			});
		}
		const resolver = createMediaResolver(createdMediaPool, bindVideoEvents);
		mockMediaSessionInstance.setResolver(resolver);
		function trackMediaElement(el) {
			if (!el) return;
			createdMediaPool.add(el);
			if (configuredVolume !== null) safeSetProp(el, descriptors.volume, "volume", configuredVolume);
			if (configuredMuted !== null) safeSetProp(el, descriptors.muted, "muted", configuredMuted);
			bindVideoEvents(el);
			if (!resolver.getActiveMedia()) {
				resolver.resolveActiveMedia();
				if (resolver.getActiveMedia()) onMediaAvailable();
			}
		}
		hookMediaSession();
		setupMediaHooks({
			trackMediaElement,
			onElementAdded: () => {
				checkActiveMediaLiveness();
			}
		});
		function checkActiveMediaLiveness() {
			IframeStyleEngine.maintainStyles();
			const had = Boolean(resolver.getActiveMedia());
			const oldType = resolver.getMediaType();
			const activeMedia = resolver.getActiveMedia();
			if (!(activeMedia && (activeMedia.isConnected || createdMediaPool.has(activeMedia))) || !resolver.resolveActiveMedia()) {
				if (had) {
					console_log(`%c[SRemote:media] Active media detached / dropped in iframe`, "color: #f59e0b;");
					if (!resolver.resolveActiveMedia()) {
						resolver.setActiveMedia(null);
						resolver.setMediaType(null);
						emitToParent("mediaDisconnected", {
							instanceId,
							hasMedia: false
						});
						return;
					}
				}
			}
			if (resolver.resolveActiveMedia() && (!had || oldType !== resolver.getMediaType())) onMediaAvailable();
		}
		let observer = null;
		try {
			observer = new MutationObserver(checkActiveMediaLiveness);
			const rootEl = document.documentElement || document;
			if (rootEl) observer.observe(rootEl, {
				childList: true,
				subtree: true
			});
		} catch {}
		function sendMediaSessionState(action, specificValue) {
			const ms = navigator.mediaSession || mockMediaSessionInstance;
			const payload = {
				playbackState: ms?.playbackState,
				metadata: ms?.metadata ? {
					title: ms.metadata.title,
					artist: ms.metadata.artist,
					album: ms.metadata.album,
					artwork: ms.metadata.artwork || []
				} : null,
				supportedActions: Array.from(mockMediaSessionInstance._handlers.keys())
			};
			if (action) payload.action = action;
			if (specificValue !== void 0) payload.value = specificValue;
			emitToParent(action || "mediaSessionState", payload);
		}
		function emitToParent(eventOrAction, payload = {}) {
			const lowerEvt = String(eventOrAction || "").toLowerCase();
			if (!handshake.primaryAuthorizedOrigin && lowerEvt !== "accept" && lowerEvt !== "requestblobclone") return;
			const msg = {
				type: `${NS}${eventOrAction}`,
				event: eventOrAction,
				source: "iframe",
				instanceId,
				location: location.href,
				origin: location.origin,
				...payload
			};
			console_debug(`%c[SRemote:signal] Iframe emit -> ${eventOrAction} (source: iframe)`, "color: #10b981;", msg);
			if (mediaPort) try {
				mediaPort.postMessage(msg);
			} catch {}
		}
		function notifyState(action, specificValue) {
			const isProgrammatic = Date.now() - programmaticActionTimestamp < 500;
			switch (resolver.getMediaType()) {
				case "adapter":
				case "video":
				case "audio":
					emitToParent(action || "state", {
						...action ? { action } : {},
						...specificValue !== void 0 ? { value: specificValue } : {},
						isProgrammatic,
						state: getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia)
					});
					break;
				default: sendMediaSessionState(action, specificValue);
			}
		}
		const executeControl = createMediaController({
			activeMediaGetter: resolver.getActiveMedia,
			mediaTypeGetter: resolver.getMediaType,
			resolveActiveMedia: resolver.resolveActiveMedia,
			notifyState,
			sendMediaSessionState,
			configuredVolumeGetter: () => configuredVolume,
			configuredVolumeSetter: (v) => {
				configuredVolume = v;
			},
			configuredMutedSetter: (m) => {
				configuredMuted = m;
			},
			programmaticActionTimestampSetter: (ts) => {
				programmaticActionTimestamp = ts;
			},
			emitToParent,
			instanceId
		});
		const rpcRegistry = createRpcRegistry({
			resolver,
			instanceId,
			emitToParent,
			sendMediaSessionState,
			notifyState,
			getOriginalMediaSrc: () => originalMediaSrcBeforeDebug,
			setOriginalMediaSrc: (src) => {
				originalMediaSrcBeforeDebug = src;
			}
		});
		function closeMediaPort() {
			if (mediaPort) {
				try {
					mediaPort.close();
				} catch {}
				mediaPort = null;
			}
		}
		function bindPort(port) {
			mediaPort = port;
			port.onmessage = async (e) => {
				const data = e.data;
				if (!data || typeof data !== "object") return;
				const type = String(data.type || "");
				if (!type.startsWith("sremote:")) return;
				const action = type.slice(NS.length);
				const lowerAction = action.toLowerCase();
				if (lowerAction !== "ping" && lowerAction !== "pong") console_log(`%c[SRemote:command] Iframe received command (port) -> ${action}`, "color: #8b5cf6; font-weight: bold;", data);
				if (lowerAction === "resendblobobject" && data.blob) {
					try {
						const localBlobUrl = URL.createObjectURL(data.blob);
						if (mockMediaSessionInstance.metadata) {
							const arts = mockMediaSessionInstance.metadata.artwork || [];
							arts.push({ src: localBlobUrl });
							mockMediaSessionInstance.metadata.artwork = arts;
							if (navigator.mediaSession && typeof MediaMetadata !== "undefined") navigator.mediaSession.metadata = new MediaMetadata(mockMediaSessionInstance.metadata);
						}
					} catch (err) {
						console_warn("[sremote] Error creating local object URL for blob:", err);
					}
					return;
				}
				if (lowerAction === "bridge_post") {
					const payload = data.payload;
					const targetOrigin = data.targetOrigin || "*";
					try {
						window.postMessage(payload, targetOrigin);
					} catch (err) {
						console_warn("[sremote] Error executing bridge postMessage in iframe:", err);
					}
					return;
				}
				if (lowerAction === "rpc_request" && data.rpcId && data.action) {
					try {
						const res = await rpcRegistry.executeRpc(data.action, data.params);
						port.postMessage({
							type: `${NS}rpc_response`,
							source: "iframe",
							rpcId: data.rpcId,
							result: {
								success: true,
								instanceId,
								data: res
							}
						});
					} catch (err) {
						const isNotFound = String(err).includes("not found");
						port.postMessage({
							type: `${NS}rpc_response`,
							source: "iframe",
							rpcId: data.rpcId,
							result: {
								success: false,
								instanceId,
								error: isNotFound ? "ACTION_NOT_FOUND" : "EXECUTION_ERROR",
								message: String(err)
							}
						});
					}
					return;
				}
				if (lowerAction === "ping") {
					resolver.resolveActiveMedia();
					const state = getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia);
					const capabilities = getIframeCapabilities(null, resolver.getActiveMedia(), resolver.resolveActiveMedia);
					try {
						port.postMessage({
							type: `${NS}pong`,
							source: "iframe",
							instanceId,
							mediaType: resolver.getMediaType(),
							hasMedia: Boolean(resolver.getActiveMedia()),
							capabilities,
							state
						});
					} catch {}
					return;
				}
				if (lowerAction === "singlemediadetected" || lowerAction === "multiplemediadetected" || lowerAction === "whereisinstanceid" || lowerAction === "accept" || lowerAction === "disconnect") return;
				if (!await executeControl(action, data.value)) {
					console_warn(`[sremote] Command '${action}' failed: No media element or MediaSession handler found in frame.`);
					emitToParent("noMedia", {
						action,
						reason: "NO_MEDIA_FOUND",
						message: `No media element or MediaSession handler found for command '${action}'`
					});
				}
			};
		}
		const handshake = createIframeHandshake({
			instanceIdGetter: () => instanceId,
			setInstanceId: (id) => {
				instanceId = id;
			},
			resolver,
			bindPort,
			notifyState,
			closeMediaPort,
			treatAlmostEndAsEndSetter: (val) => {
				treatAlmostEndAsEnd = val;
			},
			currentHandshakeSetter: (id, token) => {
				currentHandshakeId = id;
				currentHandshakeToken = token;
			},
			currentHandshakeGetter: () => ({
				handshakeId: currentHandshakeId,
				handshakeToken: currentHandshakeToken
			})
		});
		function onMediaAvailable() {
			const activeMedia = resolver.getActiveMedia();
			const mediaType = resolver.getMediaType();
			if ((mediaType === "video" || mediaType === "audio") && activeMedia) bindVideoEvents(activeMedia);
			notifyState();
			if (!handshake.primaryAuthorizedOrigin) handshake.checkPendingHelloFromGM();
			else showConnectedIndicator(handshake.primaryAuthorizedOrigin, handshake.primaryAuthorizedOrigin);
			const waiters = mediaWaiters.splice(0, mediaWaiters.length);
			for (const w of waiters) w(true);
		}
		function listenToGMQueries() {
			let lastQueryToken = null;
			setInterval(() => {
				try {
					const queryReq = Storage.get("sremote:query_req");
					if (queryReq && queryReq !== lastQueryToken) {
						lastQueryToken = queryReq;
						resolver.resolveActiveMedia();
						const reportKey = `sremote:report:${instanceId}`;
						Storage.set(reportKey, {
							instanceId,
							location: location.href,
							origin: location.origin,
							title: document.title,
							hasMedia: Boolean(resolver.getActiveMedia()),
							mediaType: resolver.getMediaType(),
							lastActive: Date.now()
						});
					}
				} catch {}
			}, 800);
		}
		listenToGMQueries();
		window.addEventListener("message", async (event) => {
			const data = event.data;
			if (!(data && typeof data === "object" && typeof data.type === "string" && data.type.startsWith("sremote:"))) {
				if (mediaPort && event.source !== window.top) try {
					mediaPort.postMessage({
						type: `${NS}bridge_message`,
						source: "iframe",
						data,
						origin: event.origin
					});
				} catch {}
				return;
			}
			if (event.source === window || data.source === "iframe") return;
			const action = data.type.slice(NS.length);
			const lowerAction = action.toLowerCase();
			const callerOrigin = event.origin || "unknown_parent";
			console_log(`%c[SRemote:command] Iframe received command/message (window) -> ${action}`, "color: #ec4899; font-weight: bold;", {
				origin: callerOrigin,
				data
			});
			if (lowerAction === "handshake_port" && event.ports && event.ports.length > 0) {
				handshake.handleHandshakePort(event, data, callerOrigin);
				return;
			}
			if (lowerAction === "permission_response") {
				handshake.handlePermissionResponse(data, callerOrigin);
				return;
			}
			if (lowerAction === "hello") {
				handshake.handleHelloMessage(event, data);
				return;
			}
		});
		function boot() {
			if (resolver.resolveActiveMedia()) onMediaAvailable();
			if (!observer) try {
				observer = new MutationObserver(checkActiveMediaLiveness);
				const mountTarget = document.documentElement || document.body || document;
				if (mountTarget) observer.observe(mountTarget, {
					childList: true,
					subtree: true
				});
			} catch {}
			const poolCheckInterval = setInterval(checkActiveMediaLiveness, 1e3);
			let huntAttempts = 0;
			const huntTimer = setInterval(() => {
				huntAttempts++;
				IframeStyleEngine.maintainStyles();
				if (resolver.resolveActiveMedia()) {
					onMediaAvailable();
					if (resolver.getActiveMedia()) clearInterval(huntTimer);
				} else if (huntAttempts > 20) clearInterval(huntTimer);
			}, 250);
			let teardownDone = false;
			const handleTeardown = (ev) => {
				if (teardownDone) return;
				teardownDone = true;
				clearInterval(huntTimer);
				clearInterval(poolCheckInterval);
				try {
					if (observer) observer.disconnect();
				} catch {}
				try {
					hideConnectedIndicator();
					emitToParent("disconnect", {
						instanceId,
						reason: ev?.type || "page_unload"
					});
					closeMediaPort();
				} catch {}
			};
			try {
				window.addEventListener("pagehide", handleTeardown, { capture: true });
			} catch {}
			handshake.checkPendingHelloFromGM();
		}
		handshake.checkPendingHelloFromGM();
		{
			const iframeDebugApi = createIframeDebugApi({
				activeMediaGetter: resolver.getActiveMedia,
				resolveActiveMedia: resolver.resolveActiveMedia,
				findAllMedia,
				getVideoState: () => getVideoState(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
				getIframeCapabilities: () => getIframeCapabilities(null, resolver.getActiveMedia(), resolver.resolveActiveMedia),
				mockMediaSessionInstance,
				IframeStyleEngine,
				originalMediaSrcBeforeDebugGetter: () => originalMediaSrcBeforeDebug,
				originalMediaSrcBeforeDebugSetter: (src) => {
					originalMediaSrcBeforeDebug = src;
				}
			});
			try {
				Object.defineProperty(pageWindow, "sremote_debug", {
					value: iframeDebugApi,
					writable: false,
					configurable: true,
					enumerable: true
				});
			} catch {
				pageWindow.sremote_debug = iframeDebugApi;
			}
			console_log(`%c[sremote] window.sremote_debug is ready inside iframe`, "background: #065f46; color: #34d399; font-weight: bold;");
		}
		if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
		else boot();
	}
	(function SRemoteMain() {
		"use strict";
		if (window.top === window.self) initParentController();
		else initIframeAgent();
	})();
})();

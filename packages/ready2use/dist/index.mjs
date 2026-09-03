//#region src/core/dom-utils.js
function e(e) {
	return typeof document > "u" || !e ? null : typeof e == "string" ? document.querySelector(e) : e && e.nodeType === 1 ? e : null;
}
function t(e, t = "100%", n = "100%") {
	let r = document.createElement("div");
	r.id = `sremote-temp-node-${e}`, r.style.width = typeof t == "number" ? `${t}px` : t, r.style.height = typeof n == "number" ? `${n}px` : n;
	let i = document.createElement("div");
	return i.style.display = "none", i.appendChild(r), document.body && document.body.appendChild(i), {
		hiddenWrapper: i,
		tempNode: r,
		cleanup: () => {
			try {
				i.parentNode && i.parentNode.removeChild(i);
			} catch {}
		}
	};
}
function n(e, t = "100%", n = "100%", r = null) {
	e && (r && e.setAttribute("data-sremote-id", r), t !== void 0 && (e.style.width = typeof t == "number" ? `${t}px` : t), n !== void 0 && (e.style.height = typeof n == "number" ? `${n}px` : n));
}
function r(e, t = 5e3) {
	return !e || typeof window > "u" ? Promise.resolve() : new Promise((n) => {
		let r = !1, i = null, a = () => {
			r || (r = !0, i && clearTimeout(i), e.removeEventListener("load", a), e.removeEventListener("error", a), n());
		};
		try {
			if (e.contentDocument && e.contentDocument.readyState === "complete") {
				n();
				return;
			}
		} catch {}
		e.addEventListener("load", a, { once: !0 }), e.addEventListener("error", a, { once: !0 }), t > 0 && (i = setTimeout(a, t));
	});
}
//#endregion
//#region src/core/base-provider.js
var i = 0, a = null;
async function o(e = {}) {
	if (e.sremote && typeof e.sremote == "object" && e.sremote.adapters) return e.sremote;
	if (typeof globalThis < "u" && globalThis[Symbol.for("__sremote_client__")]) return globalThis[Symbol.for("__sremote_client__")];
	if (typeof window < "u" && window.sremote && !window.sremote.isDummy && window.sremote.adapters) return window.sremote;
	if (typeof globalThis < "u" && globalThis.sremote && !globalThis.sremote.isDummy && globalThis.sremote.adapters) return globalThis.sremote;
	if (a) return a;
	try {
		let e = await import("@sremote/wrapper");
		return a = e?.sremote || e?.default?.sremote || e?.default || null, a;
	} catch {
		return null;
	}
}
var s = class {
	constructor(e) {
		this.name = e || "generic-provider";
	}
	async loadSdk() {
		return Promise.resolve();
	}
	generateInstanceId(e) {
		return e && typeof e == "string" ? e.trim() : `${this.name}-player-${++i}-${Math.random().toString(36).slice(2, 7)}`;
	}
	async initPlayer(e, t) {
		throw Error(`[${this.constructor.name}] initPlayer() must be implemented by subclass`);
	}
	createAdapter(e, t) {
		throw Error(`[${this.constructor.name}] createAdapter() must be implemented by subclass`);
	}
	getCapabilities(e = null) {
		if (e && e.capabilities && typeof e.capabilities == "object") return { ...e.capabilities };
		let t = (t) => !!(e && typeof e[t] == "function");
		return {
			play: t("play"),
			pause: t("pause"),
			toggle: t("toggle") || t("play") && t("pause"),
			stop: t("stop") || t("pause"),
			seek: t("seek") || t("seekTo") || t("setCurrentTime"),
			volume: t("setVolume"),
			muted: t("setMuted"),
			speed: t("setPlaybackRate"),
			playbackRate: t("setPlaybackRate"),
			pip: t("requestPip") || t("pip"),
			quality: t("setQuality"),
			subtitles: t("setSubtitle") || t("getSubtitles"),
			shuffle: t("setShuffle"),
			repeat: t("setRepeat"),
			next: t("next"),
			previous: t("previous"),
			load: t("load"),
			hasAdapter: !0,
			hasNative: !1,
			hasMediaSession: !1
		};
	}
	_normalizeOptions(e) {
		return typeof e == "string" ? { videoId: e } : { ...e };
	}
	_setupAdapter(e) {
		let t = e || {};
		return typeof t.toggle != "function" && typeof t.play == "function" && typeof t.pause == "function" && (t.toggle = function() {
			(typeof t.paused == "function" ? t.paused() : typeof t.paused != "boolean" || t.paused) ? t.play() : t.pause();
		}), t.capabilities ||= this.getCapabilities(t), t;
	}
	_buildDestroyHandler({ adapter: e, customDestroy: t, player: n, targetElement: r, remote: i, instanceId: a }) {
		return () => {
			try {
				i?.adapters && a && i.adapters.unregister(a);
			} catch {}
			try {
				typeof e?.destroy == "function" && e.destroy();
			} catch {}
			try {
				typeof t == "function" ? t() : n && typeof n.destroy == "function" && n.destroy();
			} catch {}
			try {
				r && r.parentNode && r.parentNode.removeChild(r);
			} catch {}
		};
	}
	async _instantiate(e, t = null) {
		let n = this.generateInstanceId(e.instanceId);
		await this.loadSdk();
		let r = t ? {
			...e,
			container: t
		} : e, { player: i, element: a, iframe: o, destroy: s } = await this.initPlayer(r, n), c = o || a;
		t && c && c.parentNode !== t && t.appendChild(c);
		let l = this.createAdapter(i, {
			options: e,
			instanceId: n,
			element: c,
			iframe: o || (c?.tagName === "IFRAME" ? c : null)
		}), u = this._setupAdapter(l), d = u.capabilities;
		return {
			player: i,
			element: c,
			iframe: o || (c?.tagName === "IFRAME" ? c : null),
			adapter: u,
			instanceId: n,
			capabilities: d,
			customDestroy: s
		};
	}
	async create(e = {}) {
		let t = this._normalizeOptions(e), n = await this._instantiate(t), r = this._buildDestroyHandler({
			adapter: n.adapter,
			customDestroy: n.customDestroy,
			player: n.player,
			targetElement: n.element
		});
		return {
			element: n.element,
			iframe: n.iframe,
			adapter: n.adapter,
			player: n.player,
			instanceId: n.instanceId,
			capabilities: n.capabilities,
			destroy: r
		};
	}
	async mount(t, n = {}) {
		let r = e(t);
		if (!r) throw Error(`[SRemote:${this.name}] Target container '${t}' not found in DOM`);
		let i = this._normalizeOptions(n), a = await this._instantiate(i, r), s = await o(i);
		s?.adapters && s.adapters.register(a.adapter, a.instanceId);
		let c = this._buildDestroyHandler({
			adapter: a.adapter,
			customDestroy: a.customDestroy,
			player: a.player,
			targetElement: a.element,
			remote: s,
			instanceId: a.instanceId
		});
		return {
			element: a.element,
			iframe: a.iframe,
			adapter: a.adapter,
			player: a.player,
			instanceId: a.instanceId,
			capabilities: a.capabilities,
			destroy: c
		};
	}
}, c = /* @__PURE__ */ new Map();
function l(e) {
	if (typeof window > "u") return Promise.reject(/* @__PURE__ */ Error("Window is not available"));
	if (c.has(e)) return c.get(e);
	let t = new Promise((t, n) => {
		let r = document.querySelector(`script[src="${e}"]`);
		if (r) {
			if (r.getAttribute("data-loaded") === "true") {
				t();
				return;
			}
			r.addEventListener("load", () => t(), { once: !0 }), r.addEventListener("error", (e) => n(e), { once: !0 });
			return;
		}
		let i = document.createElement("script");
		i.src = e, i.async = !0, i.onload = () => {
			i.setAttribute("data-loaded", "true"), t();
		}, i.onerror = (t) => {
			c.delete(e), n(t);
		}, document.head.appendChild(i);
	});
	return c.set(e, t), t;
}
var u = null;
function d() {
	return typeof window > "u" ? Promise.reject(/* @__PURE__ */ Error("Window is not available")) : window.YT && window.YT.Player ? Promise.resolve(window.YT) : u || (u = new Promise((e, t) => {
		let n = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			if (typeof n == "function") try {
				n();
			} catch {}
			e(window.YT);
		}, l("https://www.youtube.com/iframe_api").catch((e) => {
			u = null, t(e);
		});
	}), u);
}
var f = null;
function p() {
	return typeof window > "u" ? Promise.reject(/* @__PURE__ */ Error("Window is not available")) : window.Vimeo && window.Vimeo.Player ? Promise.resolve(window.Vimeo) : f || (f = l("https://player.vimeo.com/api/player.js").then(() => window.Vimeo).catch((e) => {
		throw f = null, e;
	}), f);
}
var m = null;
function h() {
	return typeof window > "u" ? Promise.reject(/* @__PURE__ */ Error("Window is not available")) : window.SC && window.SC.Widget ? Promise.resolve(window.SC) : m || (m = l("https://w.soundcloud.com/player/api.js").then(() => window.SC).catch((e) => {
		throw m = null, e;
	}), m);
}
var g = null;
function ee() {
	return typeof window > "u" ? Promise.reject(/* @__PURE__ */ Error("Window is not available")) : window.dailymotion && window.dailymotion.createPlayer ? Promise.resolve(window.dailymotion) : g || (g = l("https://geo.dailymotion.com/libs/player.js").then(() => window.dailymotion).catch((e) => {
		throw g = null, e;
	}), g);
}
var _ = null;
function te() {
	return typeof window > "u" ? Promise.reject(/* @__PURE__ */ Error("Window is not available")) : window.Twitch && window.Twitch.Player ? Promise.resolve(window.Twitch) : _ || (_ = l("https://player.twitch.tv/js/embed/v1.js").then(() => window.Twitch).catch((e) => {
		throw _ = null, e;
	}), _);
}
var v = null;
function ne() {
	return typeof window > "u" ? Promise.reject(/* @__PURE__ */ Error("Window is not available")) : window.Mixcloud && window.Mixcloud.PlayerWidget ? Promise.resolve(window.Mixcloud) : v || (v = l("https://widget.mixcloud.com/media/js/widgetApi.js").then(() => window.Mixcloud).catch((e) => {
		throw v = null, e;
	}), v);
}
var y = null;
function re() {
	return typeof window > "u" ? Promise.reject(/* @__PURE__ */ Error("Window is not available")) : window.SpotifyIframeApi ? Promise.resolve(window.SpotifyIframeApi) : y || (y = new Promise((e, t) => {
		let n = window.onSpotifyIframeApiReady;
		window.onSpotifyIframeApiReady = (t) => {
			if (window.SpotifyIframeApi = t, typeof n == "function") try {
				n(t);
			} catch {}
			e(t);
		}, l("https://open.spotify.com/embed/iframe-api/v1").catch((e) => {
			y = null, t(e);
		});
	}), y);
}
var b = null;
function ie(e = "") {
	return typeof window > "u" ? Promise.reject(/* @__PURE__ */ Error("Window is not available")) : window.FB ? Promise.resolve(window.FB) : b || (b = new Promise((t, n) => {
		let r = window.fbAsyncInit;
		window.fbAsyncInit = () => {
			if (window.FB) {
				let t = {
					xfbml: !0,
					version: "v18.0"
				};
				e && (t.appId = e), window.FB.init(t);
			}
			if (typeof r == "function") try {
				r();
			} catch {}
			t(window.FB);
		}, l("https://connect.facebook.net/en_US/sdk.js").catch((e) => {
			b = null, n(e);
		});
	}), b);
}
var x = null;
function ae() {
	return typeof window > "u" ? Promise.reject(/* @__PURE__ */ Error("Window is not available")) : window.twttr && window.twttr.widgets ? Promise.resolve(window.twttr) : x || (x = l("https://platform.twitter.com/widgets.js").then(() => window.twttr && typeof window.twttr.ready == "function" ? new Promise((e) => {
		window.twttr.ready(() => e(window.twttr));
	}) : window.twttr).catch((e) => {
		throw x = null, e;
	}), x);
}
var S = null;
function oe() {
	return typeof window > "u" ? Promise.reject(/* @__PURE__ */ Error("Window is not available")) : window.PeerTubePlayer ? Promise.resolve(window.PeerTubePlayer) : S || (S = l("https://unpkg.com/@peertube/embed-api/build/player.min.js").then(() => window.PeerTubePlayer).catch((e) => {
		throw S = null, e;
	}), S);
}
//#endregion
//#region src/providers/youtube.js
function se(e, t) {
	return t ? e === t.PlayerState.PLAYING || e === t.PlayerState.BUFFERING : e === 1 || e === 3;
}
function ce(e, t) {
	if (!e) return;
	let n = !t || t === "off";
	try {
		if (n) typeof e.setOption == "function" && (e.setOption("captions", "track", {}), e.setOption("cc", "track", {}), e.setOption("captions", "reload", !0)), typeof e.unloadModule == "function" && e.unloadModule("captions");
		else if (typeof e.loadModule == "function" && e.loadModule("captions"), typeof e.setOption == "function") {
			let n = { languageCode: String(t) };
			e.setOption("captions", "track", n), e.setOption("cc", "track", n), e.setOption("captions", "reload", !0);
		}
	} catch {}
}
var C = new class extends s {
	constructor() {
		super("youtube");
	}
	async loadSdk() {
		return d();
	}
	async initPlayer(e, r) {
		let i = await this.loadSdk(), a = e.width || "100%", o = e.height || "100%", s = e.videoId, c = null, l = () => {};
		if (e.container) c = document.createElement("div"), c.id = `sremote-youtube-${r}`, n(c, a, o, r), e.container.appendChild(c);
		else {
			let e = t(r, a, o);
			c = e.tempNode, l = e.cleanup;
		}
		return new Promise((t, u) => {
			let d = null;
			d = new i.Player(c.id, {
				width: a,
				height: o,
				videoId: s,
				playerVars: {
					enablejsapi: 1,
					origin: typeof window < "u" ? window.location.origin : void 0,
					...e.playerVars
				},
				events: {
					onReady: () => {
						let e = d.getIFrame ? d.getIFrame() : document.getElementById(c.id);
						e && n(e, a, o, r), t({
							player: d,
							element: e || c,
							iframe: e || (c?.tagName === "IFRAME" ? c : null),
							destroy: () => {
								try {
									d && typeof d.destroy == "function" && d.destroy();
								} catch {}
								l();
							}
						});
					},
					onError: (e) => {
						l(), u(e);
					}
				}
			});
		});
	}
	createAdapter(e) {
		let t = typeof window < "u" ? window.YT : null, n = {
			paused: !0,
			currentTime: 0,
			duration: 0,
			volume: 1,
			muted: !1,
			playbackRate: 1
		}, r = null, i = () => !e || typeof e.getPlayerState != "function" ? !1 : se(e.getPlayerState(), t), a = () => {
			try {
				e && typeof e.getPlayerState == "function" && (n.paused = !i(), n.currentTime = e.getCurrentTime ? e.getCurrentTime() : 0, n.duration = e.getDuration ? e.getDuration() : 0, n.volume = e.getVolume ? e.getVolume() / 100 : 1, n.muted = e.isMuted ? e.isMuted() : !1, n.playbackRate = e.getPlaybackRate ? e.getPlaybackRate() : 1);
			} catch {}
			return n;
		}, o = () => {
			r ||= setInterval(() => {
				let e = a();
				c.emit?.("timeupdate", { state: e });
			}, 250);
		}, s = () => {
			r &&= (clearInterval(r), null);
		}, c = {
			play() {
				e && typeof e.playVideo == "function" && e.playVideo();
			},
			pause() {
				e && typeof e.pauseVideo == "function" && e.pauseVideo();
			},
			toggle() {
				e && (i() ? e.pauseVideo?.() : e.playVideo?.());
			},
			stop() {
				e && typeof e.stopVideo == "function" && e.stopVideo();
			},
			seek(t) {
				if (e && typeof e.getCurrentTime == "function" && typeof e.seekTo == "function") {
					let n = e.getCurrentTime() || 0;
					e.seekTo(Math.max(0, n + Number(t)), !0);
				}
			},
			seekTo(t) {
				e && typeof e.seekTo == "function" && e.seekTo(Number(t), !0);
			},
			getCurrentTime() {
				return e && typeof e.getCurrentTime == "function" ? e.getCurrentTime() : 0;
			},
			getDuration() {
				return e && typeof e.getDuration == "function" ? e.getDuration() : 0;
			},
			getVolume() {
				return e && typeof e.getVolume == "function" ? e.getVolume() / 100 : 1;
			},
			setVolume(t) {
				if (e && typeof e.setVolume == "function") {
					let n = Number(t);
					n <= 1 && n > 0 && (n *= 100), e.setVolume(Math.min(100, Math.max(0, n)));
				}
			},
			getMuted() {
				return e && typeof e.isMuted == "function" ? e.isMuted() : !1;
			},
			setMuted(t) {
				e && (t ? e.mute?.() : e.unMute?.());
			},
			getPlaybackRate() {
				return e && typeof e.getPlaybackRate == "function" ? e.getPlaybackRate() : 1;
			},
			setPlaybackRate(t) {
				e && typeof e.setPlaybackRate == "function" && e.setPlaybackRate(Number(t));
			},
			paused() {
				return !i();
			},
			next() {
				e && typeof e.nextVideo == "function" && e.nextVideo();
			},
			previous() {
				e && typeof e.previousVideo == "function" && e.previousVideo();
			},
			setRepeat(t) {
				if (e && typeof e.setLoop == "function") {
					let n = t === "one" || t === "all" || t === !0;
					e.setLoop(n);
				}
			},
			setShuffle(t) {
				e && typeof e.setShuffle == "function" && e.setShuffle(!!t);
			},
			setSubtitle(t) {
				ce(e, t);
			},
			getSubtitles() {
				if (e && typeof e.getOption == "function") try {
					let t = e.getOption("captions", "tracklist");
					if (Array.isArray(t) && t.length > 0) return t;
					let n = e.getOption("captions", "track");
					return n && Object.keys(n).length > 0 ? [n] : [];
				} catch {
					return [];
				}
				return [];
			},
			load(t) {
				e && typeof e.loadVideoById == "function" && t && e.loadVideoById(t);
			},
			getState() {
				return a();
			},
			destroy() {
				s();
			}
		};
		return e && typeof e.addEventListener == "function" && e.addEventListener("onStateChange", (e) => {
			let t = a(), n = e.data;
			n === 1 ? (o(), c.emit?.("play", { state: t })) : n === 2 ? (s(), c.emit?.("pause", { state: t })) : n === 0 && (s(), c.emit?.("ended", { state: {
				...t,
				paused: !0,
				ended: !0
			} }));
		}), c;
	}
}(), w = {
	create: (e) => C.create(e),
	mount: (e, t) => C.mount(e, t),
	provider: C
}, T = new class extends s {
	constructor() {
		super("vimeo");
	}
	async loadSdk() {
		return p();
	}
	async initPlayer(e, t) {
		let r = await this.loadSdk(), i = e.width || "100%", a = e.height || "100%", o = e.videoId || e.id || e.url || "76979871", s = "76979871";
		if (typeof o == "number") s = String(o);
		else if (typeof o == "string") {
			let e = o.match(/video\/(\d+)/) || o.match(/vimeo\.com\/(\d+)/) || o.match(/^(\d+)$/);
			s = e ? e[1] : o.replace(/^https?:\/\/[^/]+\//, "").replace(/[/?#].*$/, "") || "76979871";
		}
		let c = +!!e.autoplay, l = e.muted ?? e.mute ? 1 : 0, u = e.loop ?? e.repeat ? 1 : 0, d = document.createElement("iframe");
		d.id = `sremote-vimeo-${t}`, d.src = `https://player.vimeo.com/video/${s}?autoplay=${c}&muted=${l}&loop=${u}&api=1`, d.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media", d.allowFullscreen = !0, d.style.border = "none", n(d, i, a, t);
		let f = new r.Player(d);
		return await Promise.race([f.ready().catch(() => {}), new Promise((t) => setTimeout(t, e.timeout || 3e3))]), {
			player: f,
			element: d,
			iframe: d,
			destroy: () => {
				try {
					f && typeof f.destroy == "function" && f.destroy();
				} catch {}
			}
		};
	}
	createAdapter(e) {
		let t = !0, n = 0, r = 0, i = 1, a = !1, o = 1;
		e && typeof e.getDuration == "function" && e.getDuration().then((e) => {
			n = e || 0;
		}).catch(() => {});
		let s = {
			play() {
				e?.play?.().catch(() => {});
			},
			pause() {
				e?.pause?.().catch(() => {});
			},
			toggle() {
				e && (typeof e.getPaused == "function" ? e.getPaused().then((t) => t ? e.play().catch(() => {}) : e.pause().catch(() => {})).catch(() => t ? e.play().catch(() => {}) : e.pause().catch(() => {})) : t ? e.play().catch(() => {}) : e.pause().catch(() => {}));
			},
			stop() {
				e && typeof e.pause == "function" && typeof e.setCurrentTime == "function" && e.pause().then(() => e.setCurrentTime(0)).catch(() => {});
			},
			seek(t) {
				e && typeof e.getCurrentTime == "function" && typeof e.setCurrentTime == "function" && e.getCurrentTime().then((n) => e.setCurrentTime(Math.max(0, n + Number(t))).catch(() => {})).catch(() => {});
			},
			seekTo(t) {
				e?.setCurrentTime?.(Number(t)).catch(() => {});
			},
			getCurrentTime() {
				return r;
			},
			getDuration() {
				return n;
			},
			getVolume() {
				return i;
			},
			setVolume(t) {
				i = Number(t), e?.setVolume?.(Math.min(1, Math.max(0, i))).catch(() => {});
			},
			getMuted() {
				return a;
			},
			setMuted(t) {
				a = !!t, e?.setMuted?.(a).catch(() => {});
			},
			getPlaybackRate() {
				return o;
			},
			setPlaybackRate(t) {
				o = Number(t), e?.setPlaybackRate?.(o).catch(() => {});
			},
			paused() {
				return t;
			},
			setRepeat(t) {
				let n = t === "one" || t === "all" || t === !0;
				e?.setLoop?.(n).catch(() => {});
			},
			setQuality(t) {
				e?.setQuality?.(String(t)).catch(() => {});
			},
			async getQualities() {
				if (e && typeof e.getQualities == "function") try {
					let t = await e.getQualities();
					return Array.isArray(t) ? t.map((e) => e.id || e.label || String(e)) : [];
				} catch {
					return [];
				}
				return [];
			},
			setSubtitle(t) {
				e && (!t || t === "off" ? e.disableTextTrack?.().catch(() => {}) : e.enableTextTrack?.(String(t)).catch(() => {}));
			},
			async getSubtitles() {
				if (e && typeof e.getTextTracks == "function") try {
					let t = await e.getTextTracks();
					return Array.isArray(t) ? t : [];
				} catch {
					return [];
				}
				return [];
			},
			load(t) {
				e?.loadVideo?.(t).catch(() => {});
			},
			getState() {
				return {
					paused: t,
					currentTime: r,
					duration: n,
					volume: i,
					muted: a,
					playbackRate: o
				};
			}
		};
		return e && typeof e.on == "function" && (e.on("play", () => {
			t = !1, s.emit?.("play", { state: {
				paused: !1,
				currentTime: r,
				duration: n
			} });
		}), e.on("pause", () => {
			t = !0, s.emit?.("pause", { state: {
				paused: !0,
				currentTime: r,
				duration: n
			} });
		}), e.on("timeupdate", (e) => {
			r = e.seconds || 0, n = e.duration || n, s.emit?.("timeupdate", { state: {
				paused: t,
				currentTime: r,
				duration: n
			} });
		}), e.on("seeked", (e) => {
			r = e.seconds || 0, s.emit?.("seeked", { state: {
				paused: t,
				currentTime: r,
				duration: n
			} }), s.emit?.("timeupdate", { state: {
				paused: t,
				currentTime: r,
				duration: n
			} });
		}), e.on("ended", () => {
			t = !0, s.emit?.("ended", { state: {
				paused: !0,
				ended: !0,
				currentTime: n,
				duration: n
			} });
		}), e.on("volumechange", (e) => {
			typeof e.volume == "number" && (i = e.volume), typeof e.muted == "boolean" && (a = e.muted), s.emit?.("volumechange", { state: {
				volume: i,
				muted: a
			} });
		})), s;
	}
}(), E = {
	create: (e) => T.create(e),
	mount: (e, t) => T.mount(e, t),
	provider: T
}, D = new class extends s {
	constructor() {
		super("soundcloud");
	}
	async loadSdk() {
		return h();
	}
	async initPlayer(e, t) {
		let r = await this.loadSdk(), i = e.width || "100%", a = e.height || (e.visual ? "300" : "166"), o = e.trackUrl || e.url || "https://api.soundcloud.com/tracks/293", s = e.autoplay ?? e.auto_play ?? !1, c = e.visual ?? !1, l = document.createElement("iframe");
		l.id = `sremote-sc-${t}`, l.allow = "autoplay", l.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(o)}&color=${encodeURIComponent(e.color || "#ff5500")}&auto_play=${s}&visual=${c}&hide_cover=${!!e.hideCover}&show_teaser=${!!e.showTeaser}`, n(l, i, a, t);
		let u = r.Widget(l);
		return await new Promise((e) => {
			u.bind(r.Widget.Events.READY, () => e()), setTimeout(e, 2e3);
		}), {
			player: u,
			element: l,
			iframe: l,
			destroy: () => {
				try {
					u && typeof u.unbind == "function" && r?.Widget?.Events && [
						r.Widget.Events.READY,
						r.Widget.Events.PLAY,
						r.Widget.Events.PAUSE,
						r.Widget.Events.PLAY_PROGRESS,
						r.Widget.Events.SEEK,
						r.Widget.Events.FINISH
					].forEach((e) => u.unbind(e));
				} catch {}
			}
		};
	}
	createAdapter(e) {
		let t = typeof window < "u" ? window.SC : null, n = !1, r = 0, i = 0, a = 1, o = !1;
		e && typeof e.getDuration == "function" && e.getDuration((e) => {
			r = (e || 0) / 1e3;
		});
		let s = {
			play() {
				e && typeof e.play == "function" && (e.play(), n = !0);
			},
			pause() {
				e && typeof e.pause == "function" && (e.pause(), n = !1);
			},
			toggle() {
				e && typeof e.toggle == "function" && (e.toggle(), n = !n);
			},
			stop() {
				e && typeof e.pause == "function" && typeof e.seekTo == "function" && (e.pause(), e.seekTo(0), n = !1);
			},
			seek(t) {
				e && typeof e.getPosition == "function" && typeof e.seekTo == "function" && e.getPosition((n) => {
					let r = Math.max(0, (n || 0) + Number(t) * 1e3);
					e.seekTo(r);
				});
			},
			seekTo(t) {
				e && typeof e.seekTo == "function" && e.seekTo(Number(t) * 1e3);
			},
			getCurrentTime() {
				return i;
			},
			getDuration() {
				return r;
			},
			getVolume() {
				return a;
			},
			setVolume(t) {
				a = Number(t), e && typeof e.setVolume == "function" && e.setVolume(Math.min(100, Math.max(0, a * 100)));
			},
			getMuted() {
				return o;
			},
			setMuted(t) {
				o = !!t, e && typeof e.setVolume == "function" && e.setVolume(o ? 0 : a * 100);
			},
			paused() {
				return !n;
			},
			next() {
				e && typeof e.next == "function" && e.next();
			},
			previous() {
				e && typeof e.prev == "function" && e.prev();
			},
			load(t, n = {}) {
				e && typeof e.load == "function" && e.load(t, n);
			},
			getState() {
				return {
					paused: !n,
					currentTime: i,
					duration: r,
					volume: a,
					muted: o
				};
			}
		};
		return t && e && typeof e.bind == "function" && (e.bind(t.Widget.Events.PLAY, () => {
			n = !0, s.emit?.("play", { state: {
				paused: !1,
				currentTime: i,
				duration: r
			} });
		}), e.bind(t.Widget.Events.PAUSE, () => {
			n = !1, s.emit?.("pause", { state: {
				paused: !0,
				currentTime: i,
				duration: r
			} });
		}), e.bind(t.Widget.Events.PLAY_PROGRESS, (e) => {
			i = (e?.currentPosition || 0) / 1e3, e?.duration && (r = e.duration / 1e3), s.emit?.("timeupdate", { state: {
				paused: !n,
				currentTime: i,
				duration: r
			} });
		}), e.bind(t.Widget.Events.SEEK, (e) => {
			i = (e?.currentPosition || 0) / 1e3, s.emit?.("seeked", { state: {
				paused: !n,
				currentTime: i,
				duration: r
			} }), s.emit?.("timeupdate", { state: {
				paused: !n,
				currentTime: i,
				duration: r
			} });
		}), e.bind(t.Widget.Events.FINISH, () => {
			n = !1, s.emit?.("ended", { state: {
				paused: !0,
				ended: !0,
				currentTime: r,
				duration: r
			} });
		})), s;
	}
}(), O = {
	create: (e) => D.create(e),
	mount: (e, t) => D.mount(e, t),
	provider: D
}, k = new class extends s {
	constructor() {
		super("dailymotion");
	}
	async loadSdk() {
		return ee();
	}
	async initPlayer(e, r) {
		let i = await this.loadSdk(), a = e.width || "100%", o = e.height || "100%", s = e.video || e.videoId || "x7tgad0", c = null, l = () => {};
		if (e.container) c = document.createElement("div"), c.id = `sremote-dailymotion-${r}`, n(c, a, o, r), e.container.appendChild(c);
		else {
			let e = t(r, a, o);
			c = e.tempNode, l = e.cleanup;
		}
		let u = {
			video: s,
			params: {
				autoplay: e.autoplay ?? !1,
				mute: e.mute ?? e.muted ?? !1,
				...e.params
			},
			...e.playerOptions
		}, d = c.id || `sremote-dailymotion-${r}`;
		c.id = d;
		let f = await i.createPlayer(d, u), p = (c && typeof c.querySelector == "function" ? c.querySelector("iframe") : null) || document.querySelector(`#${d} iframe`), m = (e.container, p || c);
		return p && n(p, a, o, r), c && n(c, a, o, r), {
			player: f,
			element: c || m,
			iframe: p || (c?.tagName === "IFRAME" ? c : null),
			destroy: () => {
				try {
					f && typeof f.destroy == "function" && f.destroy();
				} catch {}
				l();
			}
		};
	}
	createAdapter(e) {
		let t = typeof window < "u" ? window.dailymotion : null, n = !0, r = 0, i = 0, a = 1, o = !1, s = {
			play() {
				e?.play?.();
			},
			pause() {
				e?.pause?.();
			},
			toggle() {
				e && (n ? s.play() : s.pause());
			},
			stop() {
				e && typeof e.pause == "function" && typeof e.seek == "function" && (e.pause(), e.seek(0));
			},
			seek(t) {
				e?.seek?.(Math.max(0, i + Number(t)));
			},
			seekTo(t) {
				e?.seek?.(Number(t));
			},
			getCurrentTime() {
				return i;
			},
			getDuration() {
				return r;
			},
			getVolume() {
				return a;
			},
			setVolume(t) {
				a = Number(t), e?.setVolume?.(Math.min(1, Math.max(0, a)));
			},
			getMuted() {
				return o;
			},
			setMuted(t) {
				o = !!t, e?.setMuted?.(o);
			},
			paused() {
				return n;
			},
			setQuality(t) {
				e?.setQuality?.(String(t));
			},
			async getQualities() {
				if (e && typeof e.getQualities == "function") try {
					let t = await e.getQualities();
					return Array.isArray(t) ? t : [];
				} catch {
					return [];
				}
				return [];
			},
			setSubtitle(t) {
				e?.setSubtitle?.(t ? String(t) : "off");
			},
			async getSubtitles() {
				if (e && typeof e.getSubtitles == "function") try {
					let t = await e.getSubtitles();
					return Array.isArray(t) ? t : [];
				} catch {
					return [];
				}
				return [];
			},
			load(t) {
				e?.load?.(t);
			},
			getState() {
				return {
					paused: n,
					currentTime: i,
					duration: r,
					volume: a,
					muted: o
				};
			}
		};
		if (e && typeof e.on == "function") {
			let c = t?.events || {};
			c.PLAYER_PLAY && e.on(c.PLAYER_PLAY, () => {
				n = !1, s.emit?.("play", { state: {
					paused: !1,
					currentTime: i,
					duration: r
				} });
			}), c.PLAYER_PAUSE && e.on(c.PLAYER_PAUSE, () => {
				n = !0, s.emit?.("pause", { state: {
					paused: !0,
					currentTime: i,
					duration: r
				} });
			}), c.PLAYER_TIMEUPDATE && e.on(c.PLAYER_TIMEUPDATE, (e) => {
				i = e?.videoTime ?? e?.time ?? i, r = e?.videoDuration ?? e?.duration ?? r, s.emit?.("timeupdate", { state: {
					paused: n,
					currentTime: i,
					duration: r
				} });
			}), c.PLAYER_SEEKED && e.on(c.PLAYER_SEEKED, (e) => {
				i = e?.videoTime ?? e?.time ?? i, s.emit?.("seeked", { state: {
					paused: n,
					currentTime: i,
					duration: r
				} }), s.emit?.("timeupdate", { state: {
					paused: n,
					currentTime: i,
					duration: r
				} });
			}), c.PLAYER_END && e.on(c.PLAYER_END, () => {
				n = !0, s.emit?.("ended", { state: {
					paused: !0,
					ended: !0,
					currentTime: r,
					duration: r
				} });
			}), c.PLAYER_VOLUMECHANGE && e.on(c.PLAYER_VOLUMECHANGE, (e) => {
				e?.volume !== void 0 && (a = e.volume), e?.muted !== void 0 && (o = e.muted), s.emit?.("volumechange", { state: {
					volume: a,
					muted: o
				} });
			});
		}
		return s;
	}
}(), le = {
	create: (e) => k.create(e),
	mount: (e, t) => k.mount(e, t),
	provider: k
}, A = new class extends s {
	constructor() {
		super("twitch");
	}
	async loadSdk() {
		return te();
	}
	async initPlayer(e, r) {
		let i = await this.loadSdk(), a = e.width || "100%", o = e.height || "100%", { hiddenWrapper: s, tempNode: c, cleanup: l } = t(r, a, o), u = typeof window < "u" && window.location.hostname || "localhost", d = Array.isArray(e.parent) ? e.parent : [e.parent || u], f = {
			width: "100%",
			height: "100%",
			channel: e.channel || (!e.video && !e.collection ? "the8bitdrummer" : void 0),
			video: e.video,
			collection: e.collection,
			parent: d,
			autoplay: e.autoplay ?? !1,
			muted: e.muted ?? !1,
			...e.playerOptions
		}, p = new i.Player(c.id, f);
		await new Promise((e) => {
			p.addEventListener(i.Player.READY, () => e(), { once: !0 }), setTimeout(e, 2500);
		});
		let m = c.querySelector("iframe") || c;
		return m && m.parentNode === s && s.removeChild(m), l(), m && n(m, a, o, r), {
			player: p,
			element: m,
			iframe: m?.tagName === "IFRAME" ? m : null,
			destroy: () => {
				try {
					p && typeof p.destroy == "function" && p.destroy();
				} catch {}
				l();
			}
		};
	}
	createAdapter(e) {
		let t = typeof window < "u" ? window.Twitch : null, n = {
			play() {
				e?.play?.();
			},
			pause() {
				e?.pause?.();
			},
			toggle() {
				e && typeof e.isPaused == "function" && (e.isPaused() ? e.play?.() : e.pause?.());
			},
			stop() {
				e && typeof e.pause == "function" && typeof e.seek == "function" && (e.pause(), e.seek(0));
			},
			seek(t) {
				e && typeof e.getCurrentTime == "function" && typeof e.seek == "function" && e.seek(Math.max(0, (e.getCurrentTime() || 0) + Number(t)));
			},
			seekTo(t) {
				e?.seek?.(Number(t));
			},
			getCurrentTime() {
				return e?.getCurrentTime ? e.getCurrentTime() : 0;
			},
			getDuration() {
				return e?.getDuration ? e.getDuration() : 0;
			},
			getVolume() {
				return e?.getVolume ? e.getVolume() : 1;
			},
			setVolume(t) {
				e?.setVolume?.(Math.min(1, Math.max(0, Number(t))));
			},
			getMuted() {
				return e?.getMuted ? e.getMuted() : !1;
			},
			setMuted(t) {
				e?.setMuted?.(!!t);
			},
			paused() {
				return !e?.isPaused || e.isPaused();
			},
			load(t) {
				e && (typeof t == "string" ? e.setChannel?.(t) : t?.video ? e.setVideo?.(t.video) : t?.channel && e.setChannel?.(t.channel));
			},
			getState() {
				return {
					paused: !e?.isPaused || e.isPaused(),
					currentTime: e?.getCurrentTime ? e.getCurrentTime() : 0,
					duration: e?.getDuration ? e.getDuration() : 0,
					volume: e?.getVolume ? e.getVolume() : 1,
					muted: e?.getMuted ? e.getMuted() : !1
				};
			}
		};
		return t && e && typeof e.addEventListener == "function" && (e.addEventListener(t.Player.PLAY, () => {
			n.emit?.("play", { state: {
				paused: !1,
				currentTime: e.getCurrentTime ? e.getCurrentTime() : 0,
				duration: e.getDuration ? e.getDuration() : 0
			} });
		}), e.addEventListener(t.Player.PAUSE, () => {
			n.emit?.("pause", { state: {
				paused: !0,
				currentTime: e.getCurrentTime ? e.getCurrentTime() : 0,
				duration: e.getDuration ? e.getDuration() : 0
			} });
		}), e.addEventListener(t.Player.ENDED, () => {
			n.emit?.("ended", { state: {
				paused: !0,
				ended: !0,
				currentTime: e.getDuration ? e.getDuration() : 0,
				duration: e.getDuration ? e.getDuration() : 0
			} });
		})), n;
	}
}(), ue = {
	create: (e) => A.create(e),
	mount: (e, t) => A.mount(e, t),
	provider: A
}, j = new class extends s {
	constructor() {
		super("mixcloud");
	}
	async loadSdk() {
		return ne();
	}
	async initPlayer(e, t) {
		let r = await this.loadSdk(), i = e.width || "100%", a = e.height || (e.mini ? "60" : "120"), o = e.feed || e.url || "/spartacus/party-time/", s = e.autoplay ?? e.auto_play ?? !1, c = e.mini ?? !0, l = e.hideCover ?? !0, u = e.light ?? !0, d = document.createElement("iframe");
		d.id = `sremote-mixcloud-${t}`, d.allow = "autoplay", d.src = `https://player-widget.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(o)}&hide_cover=${+!!l}&mini=${+!!c}&light=${+!!u}&autoplay=${+!!s}`, n(d, i, a, t);
		let f = r.PlayerWidget(d);
		return f.ready && await Promise.race([f.ready, new Promise((e) => setTimeout(e, 2500))]), {
			player: f,
			element: d,
			iframe: d,
			destroy: () => {}
		};
	}
	createAdapter(e) {
		let t = !1, n = 0, r = 0;
		e && typeof e.getDuration == "function" && e.getDuration().then((e) => {
			n = e || 0;
		}).catch(() => {});
		let i = {
			play() {
				e && typeof e.play == "function" && (e.play(), t = !0);
			},
			pause() {
				e && typeof e.pause == "function" && (e.pause(), t = !1);
			},
			toggle() {
				e && typeof e.togglePlay == "function" ? (e.togglePlay(), t = !t) : t ? i.pause() : i.play();
			},
			stop() {
				e && typeof e.pause == "function" && typeof e.seek == "function" && (e.pause(), e.seek(0), t = !1);
			},
			seek(t) {
				e && typeof e.seek == "function" && e.seek(Math.max(0, r + Number(t)));
			},
			seekTo(t) {
				e && typeof e.seek == "function" && e.seek(Number(t));
			},
			getCurrentTime() {
				return r;
			},
			getDuration() {
				return n;
			},
			paused() {
				return !t;
			},
			load(t) {
				e && typeof e.load == "function" && e.load(t, !0);
			},
			getState() {
				return {
					paused: !t,
					currentTime: r,
					duration: n
				};
			}
		};
		return e?.events && (e.events.play?.on?.(() => {
			t = !0, i.emit?.("play", { state: {
				paused: !1,
				currentTime: r,
				duration: n
			} });
		}), e.events.pause?.on?.(() => {
			t = !1, i.emit?.("pause", { state: {
				paused: !0,
				currentTime: r,
				duration: n
			} });
		}), e.events.progress?.on?.((e, a) => {
			r = e || 0, a && (n = a), i.emit?.("timeupdate", { state: {
				paused: !t,
				currentTime: r,
				duration: n
			} });
		}), e.events.ended?.on?.(() => {
			t = !1, i.emit?.("ended", { state: {
				paused: !0,
				ended: !0,
				currentTime: n,
				duration: n
			} });
		})), i;
	}
}(), de = {
	create: (e) => j.create(e),
	mount: (e, t) => j.mount(e, t),
	provider: j
}, M = new class extends s {
	constructor() {
		super("spotify");
	}
	async loadSdk() {
		return re();
	}
	async initPlayer(e, r) {
		let i = await this.loadSdk(), a = e.width || "100%", o = e.height || (e.compact ? "152" : "352"), s = e.uri || e.url || "spotify:track:4cOdK2wGLETKBW3PvgPWqT", { hiddenWrapper: c, tempNode: l, cleanup: u } = t(r, a, o);
		return new Promise((t, d) => {
			try {
				i.createController(l, {
					uri: s,
					width: a,
					height: o,
					...e.controllerOptions
				}, (e) => {
					let i = l.querySelector("iframe") || l;
					i && i.parentNode === c && c.removeChild(i), u(), i && n(i, a, o, r), t({
						player: e,
						element: i,
						iframe: i?.tagName === "IFRAME" ? i : null,
						destroy: () => {
							try {
								e && typeof e.destroy == "function" && e.destroy();
							} catch {}
							u();
						}
					});
				});
			} catch (e) {
				u(), d(e);
			}
		});
	}
	createAdapter(e) {
		let t = !0, n = 0, r = 0, i = {
			play() {
				typeof e?.resume == "function" ? e.resume() : e?.play?.();
			},
			pause() {
				e?.pause?.();
			},
			toggle() {
				typeof e?.togglePlay == "function" ? e.togglePlay() : t ? i.play() : i.pause();
			},
			stop() {
				e && typeof e.pause == "function" && typeof e.seek == "function" && (e.pause(), e.seek(0));
			},
			seek(t) {
				e?.seek?.(Math.max(0, n + Number(t)));
			},
			seekTo(t) {
				e?.seek?.(Number(t));
			},
			getCurrentTime() {
				return n;
			},
			getDuration() {
				return r;
			},
			paused() {
				return t;
			},
			load(t) {
				e?.loadUri?.(t);
			},
			getState() {
				return {
					paused: t,
					currentTime: n,
					duration: r
				};
			}
		};
		return e && typeof e.addListener == "function" && (e.addListener("playback_started", (e) => {
			t = !1, n = (e?.data?.position || 0) / 1e3, r = (e?.data?.duration || 0) / 1e3, i.emit?.("play", { state: {
				paused: !1,
				currentTime: n,
				duration: r
			} }), i.emit?.("timeupdate", { state: {
				paused: !1,
				currentTime: n,
				duration: r
			} });
		}), e.addListener("playback_update", (e) => {
			t = !!e?.data?.isPaused, n = (e?.data?.position || 0) / 1e3, r = (e?.data?.duration || 0) / 1e3, i.emit?.("timeupdate", { state: {
				paused: t,
				currentTime: n,
				duration: r
			} }), t && i.emit?.("pause", { state: {
				paused: !0,
				currentTime: n,
				duration: r
			} });
		})), i;
	}
}(), N = {
	create: (e) => M.create(e),
	mount: (e, t) => M.mount(e, t),
	provider: M
}, P = new class extends s {
	constructor() {
		super("tiktok");
	}
	async initPlayer(e, t) {
		let i = e.width || "100%", a = e.height || "600px", o = e.videoId || e.id || "6718335390845095173", s = document.createElement("iframe");
		return s.id = `sremote-tiktok-${t}`, s.allow = "autoplay; fullscreen; encrypted-media", s.allowFullscreen = !0, s.src = `https://www.tiktok.com/player/v1/${o}?music_info=${e.musicInfo === !1 ? 0 : 1}&description=${e.description === !1 ? 0 : 1}&autoplay=${+!!e.autoplay}`, n(s, i, a, t), await new Promise((t) => {
			let n = !1, i = null, a = () => {
				n || (n = !0, i && clearTimeout(i), typeof window < "u" && window.removeEventListener("message", o), t());
			}, o = (e) => {
				e.origin === "https://www.tiktok.com" && e.data?.["x-tiktok-player"] && a();
			};
			typeof window < "u" && window.addEventListener("message", o), r(s, e.timeout || 3500).then(a), i = setTimeout(a, e.timeout || 4e3);
		}), {
			player: { iframe: s },
			element: s,
			iframe: s,
			destroy: () => {}
		};
	}
	createAdapter(e, t) {
		let n = t?.iframe || e?.iframe, r = !1, i = !1, a = 0, o = 0;
		function s(e, t) {
			if (n?.contentWindow) {
				let r = {
					"x-tiktok-player": !0,
					type: e
				};
				t !== void 0 && (r.value = t), n.contentWindow.postMessage(r, "https://www.tiktok.com");
			}
		}
		let c = {
			play() {
				s("play");
			},
			pause() {
				s("pause");
			},
			toggle() {
				s(r ? "pause" : "play");
			},
			stop() {
				s("pause"), s("seekTo", 0);
			},
			seek(e) {
				let t = Math.max(0, a + Number(e));
				a = t, s("seekTo", t);
			},
			seekTo(e) {
				a = Number(e), s("seekTo", a);
			},
			getVolume() {
				return +!i;
			},
			setVolume(e) {
				Number(e) <= 0 ? c.setMuted(!0) : i && c.setMuted(!1);
			},
			getMuted() {
				return i;
			},
			setMuted(e) {
				i = e === void 0 ? !i : !!e, s(i ? "mute" : "unMute");
			},
			getCurrentTime() {
				return a;
			},
			getDuration() {
				return o;
			},
			paused() {
				return !r;
			},
			getState() {
				return {
					paused: !r,
					currentTime: a,
					duration: o,
					muted: i
				};
			},
			destroy() {
				typeof window < "u" && window.removeEventListener("message", l);
			}
		}, l = (e) => {
			if (e.origin !== "https://www.tiktok.com" || !e.data || !e.data["x-tiktok-player"]) return;
			let { type: t, value: n } = e.data;
			t === "onStateChange" ? n === 1 ? (r = !0, c.emit?.("play", { state: {
				paused: !1,
				currentTime: a,
				duration: o
			} })) : n === 2 ? (r = !1, c.emit?.("pause", { state: {
				paused: !0,
				currentTime: a,
				duration: o
			} })) : n === 0 && (r = !1, c.emit?.("ended", { state: {
				paused: !0,
				ended: !0,
				currentTime: o,
				duration: o
			} })) : t === "onCurrentTime" ? n && (typeof n.currentTime == "number" && (a = n.currentTime), typeof n.duration == "number" && (o = n.duration), c.emit?.("timeupdate", { state: {
				paused: !r,
				currentTime: a,
				duration: o
			} })) : t === "onMute" && (i = !!n, c.emit?.("volumechange", { state: { muted: i } }));
		};
		return typeof window < "u" && window.addEventListener("message", l), c;
	}
}(), F = {
	create: (e) => P.create(e),
	mount: (e, t) => P.mount(e, t),
	provider: P
}, I = new class extends s {
	constructor() {
		super("niconico");
	}
	async initPlayer(e, t) {
		let i = e.width || "100%", a = e.height || "100%", o = e.watchId || e.videoId || e.id || "so46693656", s = `niconico-player-${t}`, c = document.createElement("iframe");
		return c.id = s, c.allow = "autoplay; encrypted-media; fullscreen", c.allowFullscreen = !0, c.src = `https://embed.nicovideo.jp/watch/${o}?jsapi=1&playerId=${s}&autoplay=${+!!e.autoplay}`, n(c, i, a, t), await new Promise((t) => {
			let n = !1, i = null, a = () => {
				n || (n = !0, i && clearTimeout(i), typeof window < "u" && window.removeEventListener("message", o), t());
			}, o = (e) => {
				e.origin === "https://embed.nicovideo.jp" && e.data?.playerId === s && (e.data?.eventName === "loadComplete" || e.data?.eventName === "playerMetadataChange") && a();
			};
			typeof window < "u" && window.addEventListener("message", o), r(c, e.timeout || 3500).then(a), i = setTimeout(a, e.timeout || 4e3);
		}), {
			player: {
				iframe: c,
				playerId: s
			},
			element: c,
			iframe: c,
			destroy: () => {}
		};
	}
	createAdapter(e, t) {
		let n = t?.iframe || e?.iframe, r = e?.playerId || n?.id, i = 0, a = 0, o = !1, s = 1;
		function c(e, t = {}) {
			n?.contentWindow && n.contentWindow.postMessage({
				sourceConnectorType: 1,
				playerId: r,
				eventName: e,
				data: t
			}, "https://embed.nicovideo.jp");
		}
		let l = {
			play() {
				c("play");
			},
			pause() {
				c("pause");
			},
			toggle() {
				c(o ? "pause" : "play");
			},
			stop() {
				c("pause"), c("seek", { time: 0 });
			},
			seek(e) {
				c("seek", { time: Math.max(0, a + Number(e)) * 1e3 });
			},
			seekTo(e) {
				c("seek", { time: Number(e) * 1e3 });
			},
			getVolume() {
				return s;
			},
			setVolume(e) {
				s = Number(e), c("volumeChange", { volume: s });
			},
			setMuted(e) {
				c("mute", { mute: !!e });
			},
			getCurrentTime() {
				return a;
			},
			getDuration() {
				return i;
			},
			paused() {
				return !o;
			},
			getState() {
				return {
					paused: !o,
					currentTime: a,
					duration: i,
					volume: s
				};
			},
			destroy() {
				typeof window < "u" && window.removeEventListener("message", u);
			}
		}, u = (e) => {
			if (e.origin !== "https://embed.nicovideo.jp" || e.data?.playerId !== r) return;
			let { eventName: t, data: n } = e.data;
			t === "loadComplete" ? n?.videoInfo?.lengthInSeconds && (i = n.videoInfo.lengthInSeconds / 1e3) : t === "playerMetadataChange" ? (n?.duration !== void 0 && (i = n.duration / 1e3), n?.currentTime !== void 0 && (a = n.currentTime / 1e3, l.emit?.("timeupdate", { state: {
				paused: !o,
				currentTime: a,
				duration: i
			} }))) : t === "playerStatusChange" && (n?.playerStatus === 2 ? (o = !0, l.emit?.("play", { state: {
				paused: !1,
				currentTime: a,
				duration: i
			} })) : n?.playerStatus === 3 ? (o = !1, l.emit?.("pause", { state: {
				paused: !0,
				currentTime: a,
				duration: i
			} })) : n?.playerStatus === 4 && (o = !1, l.emit?.("ended", { state: {
				paused: !0,
				ended: !0,
				currentTime: i,
				duration: i
			} })));
		};
		return typeof window < "u" && window.addEventListener("message", u), l;
	}
}(), L = {
	create: (e) => I.create(e),
	mount: (e, t) => I.mount(e, t),
	provider: I
};
//#endregion
//#region src/providers/bilibili.js
function R(e = {}) {
	let t = new window.URLSearchParams(), n = typeof e == "string" ? { videoId: e } : e || {}, r = n.bvid || n.aid || n.avid || n.videoId || n.id;
	r && typeof r == "object" && (r = r.bvid || r.aid || r.avid || r.videoId || r.id || null);
	let i = n.url || n.videoUrl || (typeof r == "string" && r.includes("bilibili.com") ? r : null), a = null, o = null;
	if (i) {
		let e = String(i).match(/BV[a-zA-Z0-9]+/i), t = String(i).match(/av(\d+)/i);
		e ? a = e[0] : t && (o = t[1]);
	}
	if (!a && !o && r) {
		let e = String(r).trim();
		e !== "[object Object]" && (/^BV/i.test(e) ? a = e : o = e.replace(/^av/i, ""));
	}
	a ? t.set("bvid", a) : o ? t.set("aid", String(o).replace(/^av/i, "")) : t.set("bvid", "BV1xx411c7mD"), e.cid && t.set("cid", e.cid), e.page && t.set("page", e.page), (e.t || e.startTime) && t.set("t", e.t || e.startTime);
	let s = e.autoplay ?? !0;
	return t.set("autoplay", s ? "1" : "0"), e.danmaku !== void 0 && t.set("danmaku", e.danmaku ? "1" : "0"), (e.highQuality !== void 0 || e.high_quality !== void 0) && t.set("high_quality", e.highQuality ?? e.high_quality ? "1" : "0"), `https://player.bilibili.com/player.html?${t.toString()}`;
}
var z = new class extends s {
	constructor() {
		super("bilibili");
	}
	async initPlayer(e, t) {
		let i = e.width || "100%", a = e.height || "100%", o = document.createElement("iframe");
		return o.id = `sremote-bilibili-${t}`, o.allow = "autoplay; encrypted-media; fullscreen", o.allowFullscreen = !0, o.style.border = "none", o.src = R(e), n(o, i, a, t), await r(o, e.timeout || 4e3), {
			player: {
				iframe: o,
				options: e
			},
			element: o,
			iframe: o,
			destroy: () => {}
		};
	}
	createAdapter(e, t) {
		let n = t?.iframe || e?.iframe;
		return { load(e, t = 1) {
			n && (typeof e == "object" && e ? n.src = R({
				...e,
				autoplay: !0
			}) : n.src = R({
				videoId: String(e),
				page: t,
				autoplay: !0
			}));
		} };
	}
}(), B = {
	create: (e) => z.create(e),
	mount: (e, t) => z.mount(e, t),
	provider: z
}, V = new class extends s {
	constructor() {
		super("facebook");
	}
	async loadSdk(e = "") {
		return ie(e);
	}
	async initPlayer(e, r) {
		let i = e.width || "500px", a = e.height || "auto", o = e.videoUrl || e.url || "https://www.facebook.com/facebook/videos/10153231379946729/", s = `sremote-facebook-video-${r}`, { hiddenWrapper: c, tempNode: l, cleanup: u } = t(r, i, a), d = document.createElement("div");
		d.id = s, d.className = "fb-video", d.setAttribute("data-href", o), d.setAttribute("data-width", typeof i == "number" ? `${i}` : i), d.setAttribute("data-show-text", e.showText ? "true" : "false"), d.setAttribute("data-autoplay", e.autoplay ? "true" : "false"), d.setAttribute("data-allowfullscreen", "true"), e.controls !== void 0 && d.setAttribute("data-controls", e.controls ? "true" : "false"), e.muted && d.setAttribute("data-muted", "true"), l.appendChild(d);
		let f = await this.loadSdk(e.appId || "");
		return new Promise((t) => {
			let d = !1, p = null, m = null, h = (e = null) => {
				if (d) return;
				d = !0, m && clearTimeout(m);
				let s = l.querySelector("iframe"), f = l;
				f && f.parentNode === c && c.removeChild(f), u(), n(f, i, a, r), t({
					player: e || p || {
						container: f,
						videoUrl: o
					},
					element: f,
					iframe: s || (f?.tagName === "IFRAME" ? f : null),
					destroy: () => {
						u();
					}
				});
			};
			if (f && typeof f.Event?.subscribe == "function") {
				let e = (t) => {
					if (t && t.type === "video" && t.id === s) {
						p = t.instance;
						try {
							f.Event?.unsubscribe?.("xfbml.ready", e);
						} catch {}
						h(p);
					}
				};
				f.Event.subscribe("xfbml.ready", e);
			}
			if (f && typeof f.XFBML?.parse == "function") try {
				f.XFBML.parse(l);
			} catch {
				h(null);
			}
			else h(null);
			m = setTimeout(() => {
				h(p);
			}, e.timeout || 4e3);
		});
	}
	createAdapter(e) {
		let t = !1, n = 0, r = 0, i = 1, a = !1, o = null, s = () => {
			try {
				e && (typeof e.isPlaying == "function" && (t = !!e.isPlaying()), typeof e.getCurrentPosition == "function" && (r = Number(e.getCurrentPosition()) || 0), typeof e.getDuration == "function" && (n = Number(e.getDuration()) || 0), typeof e.getVolume == "function" && (i = Number(e.getVolume()) || 1), typeof e.isMuted == "function" && (a = !!e.isMuted()));
			} catch {}
			return {
				paused: !t,
				currentTime: r,
				duration: n,
				volume: i,
				muted: a
			};
		}, c = () => {
			o ||= setInterval(() => {
				let e = s();
				u.emit?.("timeupdate", { state: e });
			}, 250);
		}, l = () => {
			o &&= (clearInterval(o), null);
		}, u = {
			play() {
				e?.play?.();
			},
			pause() {
				e?.pause?.();
			},
			toggle() {
				e && typeof e.isPlaying == "function" ? e.isPlaying() ? e.pause?.() : e.play?.() : t ? u.pause() : u.play();
			},
			stop() {
				e && typeof e.pause == "function" && typeof e.seek == "function" && (e.pause(), e.seek(0));
			},
			seek(t) {
				if (e && typeof e.seek == "function") {
					let n = typeof e.getCurrentPosition == "function" ? e.getCurrentPosition() : r, i = Math.max(0, (n || 0) + Number(t));
					e.seek(i);
				}
			},
			seekTo(t) {
				e?.seek?.(Number(t));
			},
			getCurrentTime() {
				return typeof e?.getCurrentPosition == "function" ? e.getCurrentPosition() : r;
			},
			getDuration() {
				return typeof e?.getDuration == "function" ? e.getDuration() : n;
			},
			getVolume() {
				return typeof e?.getVolume == "function" ? e.getVolume() : i;
			},
			setVolume(t) {
				i = Number(t), e?.setVolume?.(Math.min(1, Math.max(0, i)));
			},
			getMuted() {
				return typeof e?.isMuted == "function" ? e.isMuted() : a;
			},
			setMuted(t) {
				a = !!t, e && (a ? e.mute?.() : e.unmute?.());
			},
			paused() {
				return e && typeof e.isPlaying == "function" ? !e.isPlaying() : !t;
			},
			getState() {
				return s();
			},
			destroy() {
				l();
			}
		};
		if (e && typeof e.subscribe == "function") try {
			e.subscribe("startedPlaying", () => {
				t = !0, c();
				let e = s();
				u.emit?.("play", { state: e });
			}), e.subscribe("paused", () => {
				t = !1, l();
				let e = s();
				u.emit?.("pause", { state: e });
			}), e.subscribe("finishedPlaying", () => {
				t = !1, l();
				let e = {
					...s(),
					paused: !0,
					ended: !0
				};
				u.emit?.("ended", { state: e });
			}), e.subscribe("bufferingStarted", () => {
				u.emit?.("buffering", { state: s() });
			}), e.subscribe("bufferingEnded", () => {
				u.emit?.("buffered", { state: s() });
			}), e.subscribe("error", (e) => {
				u.emit?.("error", { error: e });
			});
		} catch {}
		return u;
	}
}(), H = {
	create: (e) => V.create(e),
	mount: (e, t) => V.mount(e, t),
	provider: V
};
//#endregion
//#region src/providers/twitter.js
function U(e) {
	if (!e) return "20";
	let t = String(e).trim(), n = t.match(/status(?:es)?\/(\d+)/i) || t.match(/^(\d+)$/);
	return n ? n[1] : t;
}
var W = new class extends s {
	constructor() {
		super("twitter");
	}
	async loadSdk() {
		return ae();
	}
	async initPlayer(e, r) {
		let i = await this.loadSdk(), a = e.width || "100%", o = e.height || "auto", s = U(e.tweetId || e.id || e.url || e.videoId || "20"), { hiddenWrapper: c, tempNode: l, cleanup: u } = t(r, a, o), d = document.createElement("div");
		d.id = `sremote-twitter-${r}`, l.appendChild(d);
		let f = {
			theme: e.theme || "dark",
			align: e.align || "center",
			conversation: e.conversation || "none",
			cards: e.cards || "visible",
			...e.tweetOptions
		};
		return new Promise((t) => {
			let p = !1, m = null, h = (e = null) => {
				if (p) return;
				p = !0, m && clearTimeout(m);
				let i = l.querySelector("iframe"), d = e || i || l;
				d && d.parentNode === c && c.removeChild(d), u(), n(d, a, o, r), t({
					player: {
						tweetId: s,
						element: d,
						iframe: i
					},
					element: d,
					iframe: i || (d?.tagName === "IFRAME" ? d : null),
					destroy: () => {
						u();
					}
				});
			};
			i?.widgets?.createTweet ? i.widgets.createTweet(s, d, f).then((e) => {
				h(e);
			}).catch(() => h(null)) : h(null), m = setTimeout(() => {
				h(null);
			}, e.timeout || 4e3);
		});
	}
	createAdapter(e, t) {
		let n = t?.element || e?.element, r = t?.iframe || e?.iframe;
		return {
			load(e) {
				if (typeof window < "u" && window.twttr?.widgets && n) {
					let t = U(e);
					n.innerHTML = "", window.twttr.widgets.createTweet(t, n);
				}
			},
			getState() {
				return {
					element: n,
					iframe: r,
					tweetId: e?.tweetId
				};
			}
		};
	}
}(), G = {
	create: (e) => W.create(e),
	mount: (e, t) => W.mount(e, t),
	provider: W
};
//#endregion
//#region src/providers/peertube.js
function fe(e) {
	if (!e) return "https://peertube.tv/videos/embed/78e0e6aa-d575-4752-9ef8-e047c870233d?api=1";
	let t = e;
	t.includes("/videos/watch/") && (t = t.replace("/videos/watch/", "/videos/embed/")), t.includes("/videos/embed/") || (t = `https://peertube.tv/videos/embed/${e}`);
	let n = new URL(t, typeof window < "u" ? window.location.origin : "https://peertube.tv");
	return n.searchParams.set("api", "1"), n.toString();
}
var K = new class extends s {
	constructor() {
		super("peertube");
	}
	async loadSdk() {
		return oe();
	}
	async initPlayer(e, r) {
		let i = await this.loadSdk(), a = e.width || "100%", o = e.height || "100%", s = e.videoUrl || e.url || e.videoId || "https://peertube.tv/videos/watch/78e0e6aa-d575-4752-9ef8-e047c870233d", { hiddenWrapper: c, tempNode: l, cleanup: u } = t(r, a, o), d = document.createElement("iframe");
		d.id = `sremote-peertube-${r}`, d.allow = "autoplay; fullscreen; encrypted-media", d.allowFullscreen = !0, d.src = fe(s), l.appendChild(d);
		let f = null;
		return i && (f = new i(d), await Promise.race([f.ready, new Promise((t) => setTimeout(t, e.timeout || 3500))])), d.parentNode === c && c.removeChild(d), u(), n(d, a, o, r), {
			player: f,
			element: d,
			iframe: d,
			destroy: () => {
				try {
					u();
				} catch {}
			}
		};
	}
	createAdapter(e) {
		let t = !1, n = 0, r = 0, i = 1, a = 1;
		e && (e.getDuration?.().then((e) => {
			n = e || 0;
		}).catch(() => {}), e.getVolume?.().then((e) => {
			i = e || 1;
		}).catch(() => {}), e.getPlaybackRate?.().then((e) => {
			a = e || 1;
		}).catch(() => {}));
		let o = {
			play() {
				e?.play?.().catch(() => {});
			},
			pause() {
				e?.pause?.().catch(() => {});
			},
			toggle() {
				t ? o.pause() : o.play();
			},
			stop() {
				e && (e.pause?.().catch(() => {}), e.seek?.(0).catch(() => {}));
			},
			seek(t) {
				e && e.getCurrentPosition?.().then((n) => {
					e.seek?.(Math.max(0, (n || 0) + Number(t))).catch(() => {});
				}).catch(() => {});
			},
			seekTo(t) {
				e?.seek?.(Number(t)).catch(() => {});
			},
			getCurrentTime() {
				return r;
			},
			getDuration() {
				return n;
			},
			getVolume() {
				return i;
			},
			setVolume(t) {
				i = Number(t), e?.setVolume?.(Math.min(1, Math.max(0, i))).catch(() => {});
			},
			getMuted() {
				return i === 0;
			},
			setMuted(t) {
				t ? e?.setVolume?.(0).catch(() => {}) : e?.setVolume?.(i || 1).catch(() => {});
			},
			getPlaybackRate() {
				return a;
			},
			setPlaybackRate(t) {
				a = Number(t), e?.setPlaybackRate?.(a).catch(() => {});
			},
			paused() {
				return !t;
			},
			getState() {
				return {
					paused: !t,
					currentTime: r,
					duration: n,
					volume: i,
					playbackRate: a
				};
			}
		};
		return e && typeof e.addEventListener == "function" && (e.addEventListener("playbackStatusChange", (e) => {
			e === "playing" ? (t = !0, o.emit?.("play", { state: {
				paused: !1,
				currentTime: r,
				duration: n
			} })) : e === "paused" ? (t = !1, o.emit?.("pause", { state: {
				paused: !0,
				currentTime: r,
				duration: n
			} })) : e === "ended" && (t = !1, o.emit?.("ended", { state: {
				paused: !0,
				ended: !0,
				currentTime: n,
				duration: n
			} }));
		}), e.addEventListener("playbackStatusUpdate", (e) => {
			typeof e?.position == "number" && (r = e.position), typeof e?.duration == "number" && (n = e.duration), typeof e?.volume == "number" && (i = e.volume), typeof e?.playbackRate == "number" && (a = e.playbackRate), o.emit?.("timeupdate", { state: {
				paused: !t,
				currentTime: r,
				duration: n
			} });
		})), o;
	}
}(), pe = {
	create: (e) => K.create(e),
	mount: (e, t) => K.mount(e, t),
	provider: K
};
//#endregion
//#region src/providers/rumble.js
function me(e) {
	if (!e) return "https://rumble.com/embed/v397yeg/";
	let t = String(e).trim();
	if (t.startsWith("http")) {
		if (t.includes("/embed/")) return t;
		let e = t.match(/rumble\.com\/([a-zA-Z0-9_-]+)/);
		return e ? `https://rumble.com/embed/${e[1]}/` : t;
	}
	return `https://rumble.com/embed/${t}/`;
}
var q = new class extends s {
	constructor() {
		super("rumble");
	}
	async initPlayer(e, t) {
		let i = e.width || "100%", a = e.height || "400px", o = e.video || e.videoId || e.url || "v397yeg", s = document.createElement("iframe");
		return s.id = `sremote-rumble-${t}`, s.allow = "autoplay; fullscreen", s.allowFullscreen = !0, s.src = me(o), n(s, i, a, t), await r(s, e.timeout || 4e3), {
			player: { iframe: s },
			element: s,
			iframe: s,
			destroy: () => {}
		};
	}
	createAdapter(e, t) {
		let n = t?.iframe || e?.iframe;
		return { load(e) {
			n && (n.src = me(e));
		} };
	}
}(), he = {
	create: (e) => q.create(e),
	mount: (e, t) => q.mount(e, t),
	provider: q
};
//#endregion
//#region src/providers/kick.js
function ge(e) {
	if (!e) return "https://player.kick.com/xqc";
	let t = String(e).trim();
	if (t.startsWith("http")) {
		if (t.includes("player.kick.com/")) return t;
		let e = t.match(/kick\.com\/([a-zA-Z0-9_-]+)/);
		return e ? `https://player.kick.com/${e[1]}` : t;
	}
	return `https://player.kick.com/${t.replace(/^@/, "")}`;
}
var J = new class extends s {
	constructor() {
		super("kick");
	}
	async initPlayer(e, t) {
		let i = e.width || "100%", a = e.height || "100%", o = e.channel || e.user || e.username || e.url || "xqc", s = document.createElement("iframe");
		return s.id = `sremote-kick-${t}`, s.allow = "autoplay; fullscreen; encrypted-media", s.allowFullscreen = !0, s.src = ge(o), n(s, i, a, t), await r(s, e.timeout || 4e3), {
			player: { iframe: s },
			element: s,
			iframe: s,
			destroy: () => {}
		};
	}
	createAdapter(e, t) {
		let n = t?.iframe || e?.iframe;
		return { load(e) {
			n && (n.src = ge(e));
		} };
	}
}(), Y = {
	create: (e) => J.create(e),
	mount: (e, t) => J.mount(e, t),
	provider: J
};
//#endregion
//#region src/providers/streamable.js
function _e(e) {
	if (!e) return "https://streamable.com/e/moo";
	let t = String(e).trim();
	if (t.startsWith("http")) {
		if (t.includes("/e/")) return t;
		let e = t.match(/streamable\.com\/([a-zA-Z0-9]+)/);
		return e ? `https://streamable.com/e/${e[1]}` : t;
	}
	return `https://streamable.com/e/${t}`;
}
var X = new class extends s {
	constructor() {
		super("streamable");
	}
	async initPlayer(e, t) {
		let i = e.width || "100%", a = e.height || "100%", o = e.shortcode || e.code || e.url || e.videoId || "moo", s = document.createElement("iframe");
		return s.id = `sremote-streamable-${t}`, s.allow = "autoplay; fullscreen; encrypted-media", s.allowFullscreen = !0, s.src = _e(o), n(s, i, a, t), await r(s, e.timeout || 4e3), {
			player: { iframe: s },
			element: s,
			iframe: s,
			destroy: () => {}
		};
	}
	createAdapter(e, t) {
		let n = t?.iframe || e?.iframe;
		return { load(e) {
			n && (n.src = _e(e));
		} };
	}
}(), ve = {
	create: (e) => X.create(e),
	mount: (e, t) => X.mount(e, t),
	provider: X
};
//#endregion
//#region src/providers/odysee.js
function ye(e) {
	if (!e) return "https://odysee.com/$/embed/@lbry:3f/lbry-in-a-nutshell:1";
	let t = String(e).trim();
	return t.startsWith("http") ? t.includes("/$/embed/") ? t : t.replace("odysee.com/", "odysee.com/$/embed/") : `https://odysee.com/$/embed/${t.replace(/^\//, "")}`;
}
var Z = new class extends s {
	constructor() {
		super("odysee");
	}
	async initPlayer(e, t) {
		let i = e.width || "100%", a = e.height || "100%", o = e.video || e.url || e.claim || "@lbry:3f/lbry-in-a-nutshell:1", s = document.createElement("iframe");
		return s.id = `sremote-odysee-${t}`, s.allow = "autoplay; fullscreen", s.allowFullscreen = !0, s.src = ye(o), n(s, i, a, t), await r(s, e.timeout || 4e3), {
			player: { iframe: s },
			element: s,
			iframe: s,
			destroy: () => {}
		};
	}
	createAdapter(e, t) {
		let n = t?.iframe || e?.iframe;
		return { load(e) {
			n && (n.src = ye(e));
		} };
	}
}(), be = {
	create: (e) => Z.create(e),
	mount: (e, t) => Z.mount(e, t),
	provider: Z
};
//#endregion
//#region src/providers/bandcamp.js
function xe(e = {}) {
	let t = typeof e == "string" ? { trackId: e } : e || {}, n = t.albumId || t.album, r = t.trackId || t.track, i = t.size || (t.artwork === "none" ? "small" : "large"), a = t.bgcol || "333333", o = t.linkcol || "0f91ff", s = t.artwork || "small";
	return n ? `https://bandcamp.com/EmbeddedPlayer/album=${n}/size=${i}/bgcol=${a}/linkcol=${o}/artwork=${s}/transparent=true/` : r ? `https://bandcamp.com/EmbeddedPlayer/track=${r}/size=${i}/bgcol=${a}/linkcol=${o}/artwork=${s}/transparent=true/` : `https://bandcamp.com/EmbeddedPlayer/album=2747195448/size=${i}/bgcol=${a}/linkcol=${o}/artwork=${s}/transparent=true/`;
}
var Q = new class extends s {
	constructor() {
		super("bandcamp");
	}
	async initPlayer(e, t) {
		let i = e.width || "100%", a = e.height || (e.size === "small" ? "42px" : "120px"), o = document.createElement("iframe");
		return o.id = `sremote-bandcamp-${t}`, o.allow = "autoplay", o.style.border = "0", o.src = xe(e), n(o, i, a, t), await r(o, e.timeout || 4e3), {
			player: { iframe: o },
			element: o,
			iframe: o,
			destroy: () => {}
		};
	}
	createAdapter(e, t) {
		let n = t?.iframe || e?.iframe;
		return { load(e) {
			n && (n.src = xe(e));
		} };
	}
}(), $ = {
	create: (e) => Q.create(e),
	mount: (e, t) => Q.mount(e, t),
	provider: Q
}, Se = {
	BaseProvider: s,
	youtube: w,
	vimeo: E,
	soundcloud: O,
	dailymotion: le,
	twitch: ue,
	mixcloud: de,
	spotify: N,
	tiktok: F,
	niconico: L,
	bilibili: B,
	facebook: H,
	twitter: G,
	peertube: pe,
	rumble: he,
	kick: Y,
	streamable: ve,
	odysee: be,
	bandcamp: $
};
//#endregion
export { s as BaseProvider, $ as bandcamp, B as bilibili, le as dailymotion, Se as default, H as facebook, Y as kick, de as mixcloud, L as niconico, be as odysee, pe as peertube, he as rumble, O as soundcloud, N as spotify, ve as streamable, F as tiktok, ue as twitch, G as twitter, E as vimeo, w as youtube };

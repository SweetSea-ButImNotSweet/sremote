//#region src/strategies/base.js
var e = class {
	constructor(e = {}) {
		this.options = {
			passkey: null,
			...e
		};
	}
	getPasskey(e) {
		return e || this.options.passkey || null;
	}
	async play(e, t) {
		throw Error("[BaseDriver] play() must be implemented by driver");
	}
	async pause(e, t) {
		throw Error("[BaseDriver] pause() must be implemented by driver");
	}
	async toggle(e, t) {
		throw Error("[BaseDriver] toggle() must be implemented by driver");
	}
	async stop(e, t) {
		throw Error("[BaseDriver] stop() must be implemented by driver");
	}
	async seek(e, t, n) {
		throw Error("[BaseDriver] seek() must be implemented by driver");
	}
	async seekTo(e, t, n) {
		throw Error("[BaseDriver] seekTo() must be implemented by driver");
	}
	async volume(e, t, n) {
		throw Error("[BaseDriver] volume() must be implemented by driver");
	}
	async mute(e, t, n) {
		throw Error("[BaseDriver] mute() must be implemented by driver");
	}
	async speed(e, t, n) {
		throw Error("[BaseDriver] speed() must be implemented by driver");
	}
	async playbackRate(e, t, n) {
		return this.speed(e, t, n);
	}
	async pip(e, t, n) {
		throw Error("[BaseDriver] pip() must be implemented by driver");
	}
	async load(e, t, n) {
		throw Error("[BaseDriver] load() must be implemented by driver");
	}
	useAdapter(e, t, n) {
		throw Error("[BaseDriver] useAdapter() must be implemented by driver");
	}
	removeAdapter(e, t) {
		throw Error("[BaseDriver] removeAdapter() must be implemented by driver");
	}
	getCustomAdapter(e, t) {
		throw Error("[BaseDriver] getCustomAdapter() must be implemented by driver");
	}
	on(e, t, n) {
		throw Error("[BaseDriver] on() must be implemented by driver");
	}
	off(e, t) {
		throw Error("[BaseDriver] off() must be implemented by driver");
	}
};
//#endregion
//#region src/guard.js
function t() {
	return new Proxy({
		isDummy: !0,
		isUserscriptAvailable: () => !1
	}, {
		get(e, t) {
			if (t in e) return e[t];
			if (typeof t != "symbol" && t !== "inspect" && t !== "toJSON") return () => {
				console.warn(`[SRemote:Wrapper] SRemote userscript is not installed. '${String(t)}()' cannot control cross-domain iframes.`);
			};
		},
		set() {
			return !0;
		}
	});
}
var n = null, r = null;
function i(e) {
	if (!e || typeof e != "object" || e.isDummy) return !1;
	try {
		if (e.isSremoteNative === !0 || e[Symbol.for("__sremote_native__")] === !0) return !0;
	} catch {}
	return typeof e.play == "function" && typeof e.useAdapter == "function" && typeof e.assignId == "function";
}
function a() {
	if (!(typeof window > "u") && !(window.sremote && i(window.sremote))) {
		n ||= t(), r ||= n;
		try {
			let e = Object.getOwnPropertyDescriptor(window, "sremote");
			if (e && !e.configurable && !e.set) return;
			Object.defineProperty(window, "sremote", {
				get() {
					return r;
				},
				set(e) {
					if (i(e)) {
						r = e;
						try {
							Object.defineProperty(window, "sremote", {
								value: e,
								writable: !1,
								configurable: !1,
								enumerable: !0
							});
						} catch {}
					} else console.warn("[SRemote:Wrapper] Blocked unauthorized attempt to overwrite window.sremote by external script.");
				},
				configurable: !0,
				enumerable: !0
			});
		} catch {
			try {
				(!window.sremote || window.sremote.isDummy) && (window.sremote = n);
			} catch {}
		}
	}
}
//#endregion
//#region src/strategies/userscript.js
var o = class extends e {
	isAvailable() {
		return typeof window > "u" ? !1 : i(window.SRemote || window.sremote);
	}
	getApi(e = !1) {
		if (typeof window > "u") {
			if (e) throw Error("[SRemote:Wrapper] SRemote Userscript not detected");
			return null;
		}
		let t = window.SRemote || window.sremote || null, n = i(t) ? t : null;
		if (e && !n) throw Error("[SRemote:Wrapper] SRemote Userscript not detected");
		return n;
	}
	_resolveMethod(e, t) {
		if (!e || !t) return null;
		let n = t.split("."), r = e, i = null;
		for (let e of n) {
			if (!r || typeof r != "object" && typeof r != "function") return null;
			i = r, r = r[e];
		}
		return typeof r == "function" ? {
			fn: r,
			context: i
		} : null;
	}
	_callRequired(e, ...t) {
		let n = this.getApi(!0), r = this._resolveMethod(n, e);
		if (!r) throw Error(`[SRemote:Wrapper] Method '${e}' not supported by userscript`);
		return r.fn.call(r.context, ...t);
	}
	_callOptional(e, t, ...n) {
		let r = this.getApi(), i = this._resolveMethod(r, e);
		return i ? i.fn.call(i.context, ...n) : t;
	}
	async play(e, t) {
		return this._callRequired("play", e, this.getPasskey(t));
	}
	async pause(e, t) {
		return this._callRequired("pause", e, this.getPasskey(t));
	}
	async toggle(e, t) {
		return this._callRequired("toggle", e, this.getPasskey(t));
	}
	async stop(e, t) {
		return this._callRequired("stop", e, this.getPasskey(t));
	}
	async seek(e, t, n) {
		return this._callRequired("seek", e, t, this.getPasskey(n));
	}
	async seekTo(e, t, n) {
		return this._callRequired("seekTo", e, t, this.getPasskey(n));
	}
	async volume(e, t, n) {
		return this._callRequired("volume", e, t, this.getPasskey(n));
	}
	async mute(e, t, n) {
		return this._callRequired("mute", e, t, this.getPasskey(n));
	}
	async speed(e, t, n) {
		return this._callRequired("rate", e, t, this.getPasskey(n));
	}
	async pip(e, t, n) {
		return this._callRequired("pip", e, t, this.getPasskey(n));
	}
	async load(e, t, n) {
		return this._callRequired("load", e, t, this.getPasskey(n));
	}
	async quality(e, t, n) {
		return this._callOptional("quality", void 0, e, t, this.getPasskey(n));
	}
	async getQualities(e, t) {
		return this._callOptional("getQualities", [], e, this.getPasskey(t));
	}
	async subtitle(e, t, n) {
		return this._callOptional("subtitle", void 0, e, t, this.getPasskey(n));
	}
	async getSubtitles(e, t) {
		return this._callOptional("getSubtitles", [], e, this.getPasskey(t));
	}
	async shuffle(e, t, n) {
		return this._callOptional("shuffle", void 0, e, t, this.getPasskey(n));
	}
	async repeat(e, t, n) {
		return this._callOptional("repeat", void 0, e, t, this.getPasskey(n));
	}
	async next(e, t) {
		return this._callOptional("next", void 0, e, this.getPasskey(t));
	}
	async previous(e, t) {
		return this._callOptional("previous", void 0, e, this.getPasskey(t));
	}
	assignId(e, t) {
		return this._callOptional("instances.assign", !1, e, t);
	}
	getIframe(e, t) {
		return this._callOptional("instances.getIframe", null, e, this.getPasskey(t));
	}
	useAdapter(e, t, n) {
		return this._callOptional("adapters.register", null, e, t, this.getPasskey(n));
	}
	removeAdapter(e, t) {
		return this._callOptional("adapters.unregister", !1, e, this.getPasskey(t));
	}
	getCustomAdapter(e, t) {
		return this._callOptional("adapters.get", null, e, this.getPasskey(t));
	}
	list(e) {
		return this._callOptional("instances.list", [], this.getPasskey(e));
	}
	status(e, t) {
		return this._callOptional("status", null, e, this.getPasskey(t));
	}
	capabilities(e, t) {
		return this._callOptional("capabilities", null, e, this.getPasskey(t));
	}
	bindMetadata(e, t, n) {
		return this._callOptional("bindMetadata", void 0, e, t, this.getPasskey(n));
	}
	setMultiMode(e, t) {
		return this._callOptional("instances.setMultiMode", void 0, e, this.getPasskey(t));
	}
	isMultiMode(e) {
		return this._callOptional("instances.isMultiMode", !1, this.getPasskey(e));
	}
	setExclusive(e, t) {
		return this._callOptional("instances.setExclusive", void 0, e, this.getPasskey(t));
	}
	query(e) {
		return this._callOptional("instances.query", [], this.getPasskey(e));
	}
	call(e, t, n, r) {
		return this._callRequired("rpc.call", e, t, n, this.getPasskey(r));
	}
	postWindowMessage(e, t = "*", n = null, r = "parent", i = null) {
		return this._callOptional("rpc.postMessage", !1, e, t, n, r, this.getPasskey(i));
	}
	on(e, t, n) {
		let r = this.getApi();
		if (r && typeof r.on == "function") return r.on(e, t, this.getPasskey(n));
		let i = e.startsWith("sremote:") ? e : `sremote:${e}`, a = (e) => t(e.detail);
		return window.addEventListener(i, a), () => window.removeEventListener(i, a);
	}
	off(e, t) {
		let n = this.getApi();
		if (n && typeof n.off == "function") return n.off(e, t);
		let r = e.startsWith("sremote:") ? e : `sremote:${e}`;
		window.removeEventListener(r, t);
	}
};
//#endregion
//#region ../shared/src/events.js
function s(e) {
	if (!e) return null;
	if (typeof e.getState == "function") try {
		return e.getState();
	} catch {}
	let t = e.volume === void 0 ? 1 : e.volume, n = e.muted !== void 0 && e.muted, r = e.currentTime === void 0 ? 0 : e.currentTime, i = e.duration, a = e.playbackRate === void 0 ? 1 : e.playbackRate, o = e.paused === void 0 ? !0 : typeof e.paused == "function" ? e.paused() : !!e.paused, s = e.ended !== void 0 && !!e.ended, c = e.readyState === void 0 ? 0 : e.readyState, l = e.currentSrc || e.src || "", u = Number.isFinite(i) ? i : null, d = 0;
	try {
		let t = e.buffered;
		t && t.length > 0 && (d = t.end(t.length - 1));
	} catch {}
	let f = e.loop !== void 0 && !!e.loop, p = typeof document < "u" && !(!document.fullscreenElement || document.fullscreenElement !== e && !document.fullscreenElement.contains(e)), m = typeof document < "u" && document.pictureInPictureElement === e;
	return {
		paused: o,
		ended: !!(s || u && u > 0 && r >= u - .1),
		currentTime: r,
		duration: u,
		buffered: d,
		volume: t,
		muted: n,
		playbackRate: a,
		readyState: c,
		src: l,
		loop: f,
		repeat: f ? "one" : "off",
		fullscreen: p,
		pictureInPicture: m
	};
}
function c(e, t = {}) {
	let n = String(e || "").toLowerCase(), { instanceId: r = "unknown", source: i = "adapter", mediaType: a = "adapter", state: o = null, isProgrammatic: s = !1, ...c } = typeof t == "object" && t ? t : { value: t };
	return {
		source: i,
		instanceId: r,
		mediaType: a,
		action: n,
		isProgrammatic: s,
		...o ? { state: o } : {},
		...c
	};
}
function l(e) {
	if (!e) return {
		play: !1,
		pause: !1,
		toggle: !1,
		stop: !1,
		seek: !1,
		volume: !1,
		muted: !1,
		speed: !1,
		playbackRate: !1,
		pip: !1,
		quality: !1,
		subtitles: !1,
		shuffle: !1,
		repeat: !1,
		next: !1,
		previous: !1,
		load: !1,
		hasAdapter: !1,
		hasNative: !1,
		hasMediaSession: !1
	};
	if (e.capabilities && typeof e.capabilities == "object") return { ...e.capabilities };
	let t = e.tagName === "VIDEO", n = e.tagName === "AUDIO", r = t || n, i = (t) => typeof e[t] == "function";
	return {
		play: r || i("play"),
		pause: r || i("pause"),
		toggle: r || i("toggle") || i("play") && i("pause"),
		stop: r || i("stop") || i("pause"),
		seek: r || i("seek") || i("seekTo") || i("setCurrentTime"),
		volume: r || i("setVolume"),
		muted: r || i("setMuted"),
		speed: r || i("setPlaybackRate"),
		playbackRate: r || i("setPlaybackRate"),
		pip: t && typeof document < "u" && !!(document.pictureInPictureEnabled || e.requestPictureInPicture) || i("requestPip") || i("pip"),
		quality: i("setQuality"),
		subtitles: !!(r && e.textTracks && e.textTracks.length > 0) || i("setSubtitle") || i("getSubtitles"),
		shuffle: i("setShuffle"),
		repeat: r || i("setRepeat"),
		next: i("next"),
		previous: i("previous"),
		load: r || i("load"),
		hasAdapter: !r,
		hasNative: r,
		hasMediaSession: !1
	};
}
var u = [
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
function d(e, t, n = {}) {
	if (!e || typeof e.addEventListener != "function" || typeof t != "function") return () => {};
	let { instanceId: r = "dom-media", source: i = "dom", treatAlmostEndAsEnd: a = !1, events: o = u } = n, l = !1, d = [];
	for (let n of o) {
		let o = (o) => {
			let u = s(e);
			if (n === "timeupdate") {
				let n = Number.isFinite(e.duration) ? e.duration : null, o = e.currentTime || 0;
				n && n > 3 && o >= n - .8 && o <= n ? l || (l = !0, t(a ? "ended" : "almostend", c(a ? "ended" : "almostend", {
					source: i,
					instanceId: r,
					mediaType: e.tagName ? e.tagName.toLowerCase() : "video",
					state: u
				}))) : n && o < n - 1.5 && (l = !1);
			}
			if (n === "ended") {
				l = !1;
				let t = Number.isFinite(e.duration) ? e.duration : null, n = e.currentTime || 0;
				if (t && t > 0 && Math.abs(t - n) > 1.5) return;
			}
			t(n, c(n, {
				source: i,
				instanceId: r,
				mediaType: e.tagName ? e.tagName.toLowerCase() : "video",
				state: u,
				originalEvent: o
			}));
		};
		e.addEventListener(n, o, !0), d.push({
			evtName: n,
			listener: o
		});
	}
	return () => {
		for (let { evtName: t, listener: n } of d) try {
			e.removeEventListener(t, n, !0);
		} catch {}
		d.length = 0;
	};
}
function f(e, t = {}) {
	if (!e || typeof e != "object") return null;
	let { instanceId: n, onEmit: r, source: i = "adapter" } = t, a = Object.create(e), o = typeof e.emit == "function" ? e.emit.bind(e) : null;
	return a.emit = (e, t = {}) => {
		if (o) try {
			o(e, t);
		} catch {}
		let l = String(e || "").toLowerCase(), u = s(a), d = c(l, {
			source: i,
			instanceId: n,
			mediaType: "adapter",
			...u ? { state: u } : {},
			...typeof t == "object" && t ? t : { value: t }
		});
		if (typeof r == "function") try {
			r(l, d);
		} catch {}
	}, typeof a.toggle != "function" && typeof a.play == "function" && typeof a.pause == "function" && (a.toggle = async function() {
		return (typeof a.paused == "function" ? a.paused() : typeof a.paused != "boolean" || a.paused) ? a.play() : a.pause();
	}), a.capabilities ||= l(a), a;
}
Object.freeze({
	rootMethods: {
		play: {
			action: "play",
			type: "command",
			args: ["targetOrId", "key"]
		},
		pause: {
			action: "pause",
			type: "command",
			args: ["targetOrId", "key"]
		},
		toggle: {
			action: "toggle",
			type: "command",
			args: ["targetOrId", "key"]
		},
		stop: {
			action: "stop",
			type: "command",
			args: ["targetOrId", "key"]
		},
		seek: {
			action: "seek",
			type: "command_value",
			args: [
				"offset",
				"targetOrId",
				"key"
			]
		},
		seekTo: {
			action: "currentTime",
			type: "command_value",
			args: [
				"time",
				"targetOrId",
				"key"
			]
		},
		volume: {
			action: "volume",
			type: "command_value",
			args: [
				"vol",
				"targetOrId",
				"key"
			]
		},
		mute: {
			action: "muted",
			type: "command_value",
			args: [
				"muted",
				"targetOrId",
				"key"
			]
		},
		speed: {
			action: "speed",
			type: "command_value",
			args: [
				"rate",
				"targetOrId",
				"key"
			]
		},
		quality: {
			action: "quality",
			type: "command_value",
			args: [
				"level",
				"targetOrId",
				"key"
			]
		},
		getQualities: {
			type: "handler",
			handler: "getQualities",
			args: ["targetOrId", "key"]
		},
		subtitle: {
			action: "subtitle",
			type: "command_value",
			args: [
				"track",
				"targetOrId",
				"key"
			]
		},
		getSubtitles: {
			type: "handler",
			handler: "getSubtitles",
			args: ["targetOrId", "key"]
		},
		shuffle: {
			action: "shuffle",
			type: "command_value",
			args: [
				"enable",
				"targetOrId",
				"key"
			]
		},
		repeat: {
			action: "repeat",
			type: "command_value",
			args: [
				"mode",
				"targetOrId",
				"key"
			]
		},
		next: {
			action: "next",
			type: "command",
			args: ["targetOrId", "key"]
		},
		previous: {
			action: "previous",
			type: "command",
			args: ["targetOrId", "key"]
		},
		pip: {
			type: "pip",
			args: [
				"enable",
				"targetOrId",
				"key"
			]
		},
		load: {
			action: "load",
			type: "command_value",
			args: [
				"source",
				"targetOrId",
				"key"
			]
		},
		status: {
			type: "handler",
			handler: "getStatus",
			args: ["targetOrId", "key"]
		},
		capabilities: {
			type: "handler",
			handler: "getCapabilities",
			args: ["targetOrId", "key"]
		}
	},
	namespaces: {
		instances: {
			list: {
				type: "handler",
				handler: "listInstances",
				args: ["key"]
			},
			get: {
				type: "handler",
				handler: "getStatus",
				args: ["instanceId", "key"]
			},
			capabilities: {
				type: "handler",
				handler: "getCapabilities",
				args: ["instanceId", "key"]
			},
			getCapabilities: {
				type: "handler",
				handler: "getCapabilities",
				args: ["instanceId", "key"]
			},
			getIframe: {
				type: "handler",
				handler: "getIframeElement",
				args: ["instanceId", "key"]
			},
			assign: {
				type: "handler",
				handler: "assignIframeId",
				args: ["iframeOrSelector", "customId"]
			},
			setMultiMode: {
				type: "handler",
				handler: "setMultiMode",
				args: ["mode", "key"]
			},
			isMultiMode: {
				type: "handler",
				handler: "isMultiMode",
				args: ["key"]
			},
			setExclusive: {
				type: "handler",
				handler: "setExclusive",
				args: ["mode", "key"]
			},
			query: {
				type: "handler",
				handler: "queryInstances",
				args: ["key"]
			},
			note: {
				type: "handler",
				handler: "annotateInstances",
				args: ["dict", "key"]
			}
		},
		adapters: {
			register: {
				type: "handler",
				handler: "registerAdapter",
				args: [
					"adapter",
					"instanceId",
					"key"
				]
			},
			unregister: {
				type: "handler",
				handler: "unregisterAdapter",
				args: ["instanceId", "key"]
			},
			get: {
				type: "handler",
				handler: "getCustomAdapter",
				args: ["instanceId", "key"]
			}
		},
		rpc: {
			call: {
				type: "handler",
				handler: "rpcCall",
				args: [
					"action",
					"params",
					"instanceId",
					"key"
				]
			},
			postMessage: {
				type: "handler",
				handler: "postWindowMessage",
				args: [
					"message",
					"targetOrigin",
					"instanceId",
					"from",
					"key"
				]
			},
			onMessage: {
				type: "handler",
				handler: "onRpcMessage",
				args: ["handler", "key"]
			}
		},
		css: {
			set: {
				type: "handler",
				handler: "setIframeCSS",
				args: [
					"css",
					"instanceId",
					"key"
				]
			},
			get: {
				type: "handler",
				handler: "getIframeCSS",
				args: ["instanceId", "key"]
			},
			remove: {
				type: "handler",
				handler: "removeIframeCSS",
				args: ["instanceId", "key"]
			}
		}
	}
});
//#endregion
//#region ../shared/src/instance-manager.js
function p(e = "sv") {
	return `${e}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}
function m(e = {}) {
	let { ns: t = "sremote:", logger: n = {}, onSignal: r = null, getIframeCount: i = null } = e, a = typeof n.log == "function" ? n.log : () => {}, o = typeof n.debug == "function" ? n.debug : () => {}, s = typeof n.warn == "function" ? n.warn : typeof console < "u" ? console.warn.bind(console) : () => {}, c = /* @__PURE__ */ new Map(), l = /* @__PURE__ */ new Map(), u = /* @__PURE__ */ new Map(), d = /* @__PURE__ */ new WeakMap(), m = /* @__PURE__ */ new Map(), h = null, g = null, _ = null, v = !1, y = !1, b = null;
	function x() {
		if (typeof g == "boolean") return g;
		try {
			if ((typeof i == "function" ? i() : typeof document < "u" ? document.querySelectorAll("iframe").length : 0) <= 1 && c.size <= 1) return !1;
		} catch {}
		return c.size > 1;
	}
	function S() {
		if (_ && (c.has(_) || l.has(_))) return _;
		if (l.size > 0) return _ = Array.from(l.keys())[l.size - 1], _;
		let e = null, t = -1;
		for (let [n, r] of c.entries()) {
			let i = r.lastSeen || 0;
			i > t && (t = i, e = n);
		}
		return _ = e || Array.from(c.keys())[c.size - 1] || null, _;
	}
	function C(e, t = null) {
		for (let [n, r] of c.entries()) if (n !== t) try {
			r.port?.postMessage(e);
		} catch {}
	}
	function w() {
		let e = Array.from(c.entries()).map(([e, t]) => ({
			instanceId: e,
			location: t.location,
			note: t.note,
			mediaType: t.mediaType
		})), n = e.length, i = null;
		if (n > 1 ? (i = {
			type: `${t}multipleMediaDetected`,
			source: "parent",
			count: n,
			instances: e
		}, o("%c[SRemote:signal] Emit -> multipleMediaDetected (source: parent)", "color: #06b6d4;", i)) : n === 1 && (i = {
			type: `${t}singleMediaDetected`,
			source: "parent",
			count: 1,
			instance: e[0]
		}, o("%c[SRemote:signal] Emit -> singleMediaDetected (source: parent)", "color: #06b6d4;", i)), i) {
			if (typeof r == "function") try {
				r(i);
			} catch (e) {
				s("[sremote] Error in onSignal callback:", e);
			}
			else typeof window < "u" && typeof window.postMessage == "function" && window.postMessage(i, "*");
		}
	}
	function T(e, t = {}) {
		let n = String(e || "").toLowerCase(), r = n.replace(/^sremote:/, ""), i = `sremote:${r}`;
		(r === "accept" || n === "accept") && t?.instanceId ? b = t : (r === "disconnect" || n === "disconnect") && t?.instanceId && b?.instanceId === t.instanceId && (b = null);
		let a = (e) => {
			if (e) for (let n of e) try {
				n(t);
			} catch (e) {
				s("[sremote] Error in event listener:", e);
			}
		};
		a(m.get(r)), i !== r && a(m.get(i));
		let o = m.get("*");
		if (o) {
			let e = typeof t == "object" && t ? {
				action: r,
				...t
			} : {
				action: r,
				value: t
			};
			for (let t of o) try {
				t(e);
			} catch (e) {
				s("[sremote] Error in wildcard listener:", e);
			}
		}
	}
	function E(e, t) {
		if (typeof t != "function") return () => {};
		let n = String(e || "").toLowerCase().replace(/^sremote:/, ""), r = `sremote:${n}`, i = (e) => {
			m.has(e) || m.set(e, /* @__PURE__ */ new Set()), m.get(e).add(t);
		};
		if (i(n), r !== n && i(r), (n === "accept" || n === "*") && b && (c.has(b.instanceId) || l.has(b.instanceId))) try {
			let e = n === "*" ? {
				action: "accept",
				...b
			} : b;
			setTimeout(() => {
				try {
					t(e);
				} catch {}
			}, 0);
		} catch {}
		return () => D(e, t);
	}
	function D(e, t) {
		let n = String(e || "").toLowerCase().replace(/^sremote:/, ""), r = `sremote:${n}`, i = (e) => {
			let n = m.get(e);
			n && (t ? n.delete(t) : m.delete(e));
		};
		i(n), i(r);
	}
	function O(e) {
		for (let [n, r] of c.entries()) if (n !== e) try {
			r.port?.postMessage({ type: `${t}pause` });
		} catch {}
		for (let [t, n] of l.entries()) if (t !== e) try {
			n.pause?.();
		} catch {}
	}
	function k(e, t = "disconnected") {
		let n = c.get(e);
		if (n) {
			a(`%c[SRemote:lifecycle] Instance removed: ${e} (reason: ${t})`, "color: #ef4444; font-weight: bold;");
			try {
				n.port?.close();
			} catch {}
			c.delete(e), _ === e && (_ = null), w(), T("disconnect", {
				instanceId: e,
				reason: t
			});
		}
	}
	function A(e, t = null) {
		if (!e || typeof e != "object") return null;
		let n = t || p("adapter");
		if (!x() && l.size > 0) for (let e of Array.from(l.keys())) e !== n && (a(`%c[SRemote:adapter] Replacing stale adapter in Single Mode: ${e} -> ${n}`, "color: #f59e0b;"), l.delete(e));
		let r = f(e, {
			instanceId: n,
			source: "adapter",
			onEmit: (e, t) => {
				(e === "play" || e === "playing") && (_ = n, (h === "auto" || h === !0) && O(n)), T(e, t);
			}
		});
		return l.set(n, r), _ = n, a(`%c[SRemote:adapter] Registered custom adapter for instance '${n}'`, "color: #06b6d4; font-weight: bold;"), T("accept", {
			source: "adapter",
			instanceId: n,
			mediaType: "adapter",
			location: typeof location < "u" ? location.href : "",
			origin: typeof location < "u" ? location.origin : ""
		}), n;
	}
	function j(e = null) {
		if (e) {
			let t = l.delete(e);
			return t && _ === e && (_ = null), t;
		}
		return l.clear(), _ = null, !0;
	}
	function M(e = null) {
		return e ? l.get(e) || null : l.size === 1 ? Array.from(l.values())[0] || null : l.get(_) || Array.from(l.values())[0] || null;
	}
	return {
		instances: c,
		parentAdaptersMap: l,
		assignedIframeIdMap: u,
		iframeToAssignedIdMap: d,
		globalEventListeners: m,
		get exclusiveMode() {
			return h;
		},
		setExclusiveMode: (e) => {
			h = e;
		},
		get multiModeConfig() {
			return g;
		},
		setMultiModeConfig: (e) => {
			g = e;
		},
		get currentActiveInstanceId() {
			return _;
		},
		setCurrentActiveInstanceId: (e) => {
			_ = e;
		},
		get isSessionLocked() {
			return v;
		},
		setSessionLocked: (e) => {
			v = e;
		},
		get isSessionDenied() {
			return y;
		},
		setSessionDenied: (e) => {
			y = e;
		},
		get lastAcceptedData() {
			return b;
		},
		isMultiModeActive: x,
		getLatestActiveInstanceId: S,
		broadcastToPorts: C,
		notifyMediaCountChange: w,
		emitGlobalEvent: T,
		on: E,
		off: D,
		pauseOthersExcept: O,
		removeInstance: k,
		handleUseAdapter: A,
		handleRemoveAdapter: j,
		getCustomAdapter: M
	};
}
//#endregion
//#region src/strategies/dom.js
var h = class extends e {
	constructor(e = {}) {
		super(e), this.instanceManager = m({
			ns: "sremote:",
			getIframeCount: () => typeof document < "u" ? document.querySelectorAll("iframe").length : 0
		}), this.trackedMediaElements = /* @__PURE__ */ new WeakSet(), this.treatAlmostEndAsEnd = !!e.treatAlmostEndAsEnd, typeof document < "u" && this.initDomAutoTracking();
	}
	get adaptersMap() {
		return this.instanceManager.parentAdaptersMap;
	}
	get multiMode() {
		return this.instanceManager.isMultiModeActive();
	}
	get exclusiveMode() {
		return this.instanceManager.exclusiveMode;
	}
	get lastActiveInstanceId() {
		return this.instanceManager.currentActiveInstanceId;
	}
	set lastActiveInstanceId(e) {
		this.instanceManager.setCurrentActiveInstanceId(e);
	}
	initDomAutoTracking() {
		try {
			let e = document.querySelectorAll("video, audio");
			for (let t of e) this.trackMediaElement(t);
			typeof MutationObserver < "u" && new MutationObserver((e) => {
				for (let t of e) for (let e of t.addedNodes) if (e.nodeType === 1) {
					if (e.tagName === "VIDEO" || e.tagName === "AUDIO") this.trackMediaElement(e);
					else if (e.querySelectorAll) {
						let t = e.querySelectorAll("video, audio");
						for (let e of t) this.trackMediaElement(e);
					}
				}
			}).observe(document.documentElement || document.body, {
				childList: !0,
				subtree: !0
			});
		} catch {}
	}
	trackMediaElement(e) {
		e && !this.trackedMediaElements.has(e) && (this.trackedMediaElements.add(e), d(e, (e, t) => {
			this.emit(e, t);
		}, {
			instanceId: e.id || e.getAttribute("data-sremote-id") || "dom-media",
			source: "dom",
			treatAlmostEndAsEnd: this.treatAlmostEndAsEnd
		}));
	}
	setMultiMode(e) {
		this.instanceManager.setMultiModeConfig(e);
	}
	isMultiMode() {
		return this.instanceManager.isMultiModeActive();
	}
	setExclusive(e) {
		this.instanceManager.setExclusiveMode(e);
	}
	list() {
		let e = [];
		for (let [t, n] of this.instanceManager.parentAdaptersMap.entries()) {
			let r = s(n);
			e.push({
				instanceId: t,
				mediaType: "adapter",
				capabilities: this.getCapabilities(t),
				status: "ready",
				state: r
			});
		}
		return e;
	}
	useAdapter(e, t = null) {
		return this.instanceManager.handleUseAdapter(e, t);
	}
	pauseOthersExcept(e) {
		this.instanceManager.pauseOthersExcept(e);
	}
	removeAdapter(e) {
		return this.instanceManager.handleRemoveAdapter(e);
	}
	getCustomAdapter(e) {
		return this.instanceManager.getCustomAdapter(e);
	}
	resolveTarget(e) {
		if (typeof e == "string" && this.instanceManager.parentAdaptersMap.has(e)) return {
			type: "adapter",
			instance: this.instanceManager.parentAdaptersMap.get(e),
			instanceId: e
		};
		if (!e && this.instanceManager.parentAdaptersMap.size > 0) {
			let e = this.instanceManager.parentAdaptersMap.entries().next().value;
			return {
				type: "adapter",
				instance: e[1],
				instanceId: e[0]
			};
		}
		let t = this.resolveMediaElement(e);
		if (t) return {
			type: "element",
			instance: t
		};
		if (this.instanceManager.parentAdaptersMap.size > 0) {
			let e = this.instanceManager.parentAdaptersMap.entries().next().value;
			return {
				type: "adapter",
				instance: e[1],
				instanceId: e[0]
			};
		}
		return null;
	}
	resolveMediaElement(e) {
		if (typeof document > "u") return null;
		if (!e) return document.querySelector("video, audio");
		if (typeof e == "string") {
			let t = document.querySelector(e);
			if (!t) return null;
			if (t.tagName === "VIDEO" || t.tagName === "AUDIO") return t;
			if (t.tagName === "IFRAME") try {
				return t.contentDocument?.querySelector("video, audio") || null;
			} catch {
				return null;
			}
			return t.querySelector("video, audio");
		}
		if (e.nodeType === 1) {
			if (e.tagName === "VIDEO" || e.tagName === "AUDIO") return e;
			if (e.tagName === "IFRAME") try {
				return e.contentDocument?.querySelector("video, audio") || null;
			} catch {
				return null;
			}
			return e.querySelector("video, audio");
		}
		return null;
	}
	async play(e) {
		let t = this.resolveTarget(e);
		if (!t) throw Error("[SRemote:DomDriver] Media target not found");
		return t.type === "adapter" ? t.instance.play?.() : t.instance.play();
	}
	async pause(e) {
		let t = this.resolveTarget(e);
		if (!t) throw Error("[SRemote:DomDriver] Media target not found");
		if (t.type === "adapter") return t.instance.pause?.();
		t.instance.pause();
	}
	async toggle(e) {
		let t = this.resolveTarget(e);
		if (!t) throw Error("[SRemote:DomDriver] Media target not found");
		if (t.type === "adapter") return typeof t.instance.toggle == "function" ? t.instance.toggle() : (typeof t.instance.paused == "function" ? t.instance.paused() : t.instance.paused) ? t.instance.play?.() : t.instance.pause?.();
		let n = t.instance;
		if (n.paused) return n.play();
		n.pause();
	}
	async stop(e) {
		let t = this.resolveTarget(e);
		if (!t) throw Error("[SRemote:DomDriver] Media target not found");
		if (t.type === "adapter") return t.instance.stop?.();
		let n = t.instance;
		n.pause(), n.currentTime = 0;
	}
	async seek(e, t) {
		let n = this.resolveTarget(t);
		if (!n) throw Error("[SRemote:DomDriver] Media target not found");
		if (n.type === "adapter") {
			if (typeof n.instance.seek == "function") return n.instance.seek(e);
			let t = n.instance.getCurrentTime?.() || 0;
			return n.instance.setCurrentTime?.(t + e);
		}
		let r = n.instance;
		r.currentTime = Math.max(0, Math.min(r.duration || 0, r.currentTime + e));
	}
	async seekTo(e, t) {
		let n = this.resolveTarget(t);
		if (!n) throw Error("[SRemote:DomDriver] Media target not found");
		if (n.type === "adapter") return typeof n.instance.seekTo == "function" ? n.instance.seekTo(e) : n.instance.setCurrentTime?.(e);
		let r = n.instance;
		r.currentTime = Math.max(0, Math.min(r.duration || 0, e));
	}
	async volume(e, t) {
		let n = this.resolveTarget(t);
		if (!n) throw Error("[SRemote:DomDriver] Media target not found");
		if (n.type === "adapter") return n.instance.setVolume?.(e);
		let r = n.instance;
		r.volume = Math.max(0, Math.min(1, e)), r.muted = !1;
	}
	async mute(e, t) {
		let n = this.resolveTarget(t);
		if (!n) throw Error("[SRemote:DomDriver] Media target not found");
		if (n.type === "adapter") return n.instance.setMuted?.(e);
		let r = n.instance;
		r.muted = typeof e == "boolean" ? e : !r.muted;
	}
	async speed(e, t) {
		let n = this.resolveTarget(t);
		if (!n) throw Error("[SRemote:DomDriver] Media target not found");
		if (n.type === "adapter") return n.instance.setPlaybackRate?.(e);
		n.instance.playbackRate = e;
	}
	async pip(e, t) {
		let n = this.resolveTarget(t);
		if (!n) throw Error("[SRemote:DomDriver] Media target not found");
		if (n.type === "adapter") return n.instance.requestPip?.(e);
		let r = n.instance;
		if (!r || r.tagName !== "VIDEO") throw Error("[SRemote:DomDriver] Video element not found");
		if (e === !0 || e === void 0 && document.pictureInPictureElement !== r) return r.requestPictureInPicture?.();
		if (document.pictureInPictureElement === r) return document.exitPictureInPicture?.();
	}
	async load(e, t) {
		let n = this.resolveTarget(t);
		if (!n) throw Error("[SRemote:DomDriver] Media target not found");
		if (n.type === "adapter") {
			if (typeof n.instance.load == "function") return n.instance.load(e);
			console.warn("[SRemote] load() is primarily designed for custom adapters and is not implemented by default. Implement it via sremote.useAdapter().");
			return;
		}
		let r = n.instance;
		typeof e == "string" && e ? (r.src = e, typeof r.load == "function" && r.load()) : console.warn("[SRemote] load() is primarily designed for custom adapters and is not implemented by default. Implement it via sremote.useAdapter().");
	}
	async quality(e, t) {
		let n = this.resolveTarget(t);
		if (n && n.type === "adapter") return n.instance.setQuality?.(e);
	}
	async getQualities(e) {
		let t = this.resolveTarget(e);
		return t && t.type === "adapter" && t.instance.getQualities?.() || [];
	}
	async subtitle(e, t) {
		let n = this.resolveTarget(t);
		if (!n) return;
		if (n.type === "adapter") return n.instance.setSubtitle?.(e);
		let r = n.instance;
		if (r?.textTracks) {
			let t = e === null || e === "off" || e === !1 ? null : String(e).toLowerCase();
			for (let e = 0; e < r.textTracks.length; e++) {
				let n = r.textTracks[e];
				n.mode = t && (n.id === t || n.language && n.language.toLowerCase() === t || n.label && n.label.toLowerCase() === t) ? "showing" : "disabled";
			}
		}
	}
	async getSubtitles(e) {
		let t = this.resolveTarget(e);
		if (!t) return [];
		if (t.type === "adapter") return t.instance.getSubtitles?.() || [];
		let n = t.instance;
		if (n?.textTracks) {
			let e = [];
			for (let t = 0; t < n.textTracks.length; t++) {
				let r = n.textTracks[t];
				e.push({
					id: r.id || String(t),
					label: r.label || r.language || `Track ${t + 1}`,
					language: r.language
				});
			}
			return e;
		}
		return [];
	}
	async shuffle(e, t) {
		let n = this.resolveTarget(t);
		if (n && n.type === "adapter") return n.instance.setShuffle?.(e);
	}
	async repeat(e, t) {
		let n = this.resolveTarget(t);
		if (!n) return;
		if (n.type === "adapter") return n.instance.setRepeat?.(e);
		let r = n.instance;
		r && (r.loop = typeof e == "string" ? e === "one" || e === "all" : typeof e == "boolean" ? e : !r.loop);
	}
	async next(e) {
		let t = this.resolveTarget(e);
		if (t && t.type === "adapter") return t.instance.next?.();
	}
	getCapabilities(e) {
		let t = this.resolveTarget(e);
		return t ? l(t.instance) : null;
	}
	emit(e, t) {
		this.instanceManager.emitGlobalEvent(e, t);
	}
	on(e, t) {
		if (typeof t != "function") return () => {};
		let n = this.instanceManager.on(e, t), r = String(e || "").toLowerCase().replace(/^sremote:/, ""), i = null;
		return typeof document < "u" && (i = (e) => {
			let n = e.target;
			if (!n || n.tagName !== "VIDEO" && n.tagName !== "AUDIO") return;
			let i = s(n);
			t(c(r, {
				instanceId: n.id || n.getAttribute("data-sremote-id") || "dom-media",
				source: "dom",
				mediaType: n.tagName ? n.tagName.toLowerCase() : "video",
				state: i,
				originalEvent: e
			}));
		}, document.addEventListener(r, i, !0)), () => {
			n(), i && typeof document < "u" && document.removeEventListener(r, i, !0);
		};
	}
	off(e, t) {
		this.instanceManager.off(e, t);
	}
}, g = ":host {\r\n  all: initial;\r\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;\r\n  color-scheme: light dark;\r\n}\r\n\r\n.sv-btn,\r\n.sv-action-btn {\r\n  font-family: inherit;\r\n  cursor: pointer;\r\n  line-height: 1.2;\r\n  border: 1px solid #aeb7c2;\r\n  border-radius: 4px;\r\n  background: linear-gradient(to bottom, #fff 0%, #e7ebef 100%);\r\n  color: #263238;\r\n  box-shadow:\r\n    inset 0 1px 0 rgba(255, 255, 255, 0.85),\r\n    0 1px 2px rgba(0, 0, 0, 0.12);\r\n  transition:\r\n    background 0.12s ease,\r\n    border-color 0.12s ease,\r\n    box-shadow 0.12s ease,\r\n    transform 0.08s ease;\r\n  user-select: none;\r\n  display: inline-flex;\r\n  align-items: center;\r\n  justify-content: center;\r\n  gap: 6px;\r\n  text-decoration: none;\r\n}\r\n\r\n.sv-btn:hover,\r\n.sv-action-btn:hover {\r\n  background: linear-gradient(to bottom, #fff 0%, #dce2e8 100%);\r\n  color: #111820;\r\n  border-color: #8e9aa6;\r\n}\r\n\r\n.sv-btn:active,\r\n.sv-action-btn:active {\r\n  background: #d7dde3;\r\n  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.18);\r\n  transform: translateY(1px);\r\n}\r\n\r\n.sv-btn {\r\n  padding: 7px 16px;\r\n  font-size: 13px;\r\n  font-weight: 600;\r\n}\r\n\r\n.sv-action-btn {\r\n  font-size: 11px;\r\n  padding: 4px 8px;\r\n}\r\n\r\n.sv-btn-deny {\r\n  color: #374151;\r\n}\r\n\r\n.sv-btn-allow,\r\n.sv-btn-primary {\r\n  background: linear-gradient(to bottom, #4da3d9 0%, #2479b3 100%);\r\n  color: #fff;\r\n  border-color: #1e6597;\r\n  text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.25);\r\n}\r\n\r\n.sv-btn-allow:hover,\r\n.sv-btn-primary:hover {\r\n  background: linear-gradient(to bottom, #5eb0e3 0%, #2b84be 100%);\r\n  border-color: #195d8d;\r\n  color: #fff;\r\n}\r\n\r\n.sv-btn-allow:active,\r\n.sv-btn-primary:active {\r\n  background: #2479b3;\r\n  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.25);\r\n}\r\n\r\n.sv-link {\r\n  color: #1769aa;\r\n  text-decoration: underline;\r\n  word-break: break-all;\r\n}\r\n\r\n.sv-link:hover {\r\n  color: #0b4f82;\r\n}\r\n\r\n@media (prefers-color-scheme: dark) {\r\n  .sv-btn,\r\n  .sv-action-btn {\r\n    border-color: #59636e;\r\n    background: linear-gradient(to bottom, #3b4249 0%, #2d3339 100%);\r\n    color: #e4e8eb;\r\n    box-shadow:\r\n      inset 0 1px 0 rgba(255, 255, 255, 0.08),\r\n      0 1px 2px rgba(0, 0, 0, 0.35);\r\n  }\r\n\r\n  .sv-btn:hover,\r\n  .sv-action-btn:hover {\r\n    background: linear-gradient(to bottom, #464e56 0%, #353c43 100%);\r\n    color: #fff;\r\n    border-color: #707b86;\r\n  }\r\n\r\n  .sv-btn:active,\r\n  .sv-action-btn:active {\r\n    background: #292f35;\r\n  }\r\n\r\n  .sv-btn-deny {\r\n    color: #d5dbe0;\r\n  }\r\n\r\n  .sv-btn-allow,\r\n  .sv-btn-primary {\r\n    background: linear-gradient(to bottom, #3d96cb 0%, #246e9c 100%);\r\n    border-color: #1d5b83;\r\n    color: #fff;\r\n  }\r\n\r\n  .sv-btn-allow:hover,\r\n  .sv-btn-primary:hover {\r\n    background: linear-gradient(to bottom, #4ba4d8 0%, #2b7bab 100%);\r\n    color: #fff;\r\n  }\r\n\r\n  .sv-link {\r\n    color: #5eb5e6;\r\n  }\r\n\r\n  .sv-link:hover {\r\n    color: #82c9ed;\r\n  }\r\n}\r\n\ndialog {\r\n  position: fixed;\r\n  inset: 0;\r\n  margin: auto;\r\n  border: none;\r\n  background: transparent;\r\n  color: #263238;\r\n  font-size: 13.5px;\r\n  box-sizing: border-box;\r\n  z-index: 2147483647;\r\n  display: flex;\r\n  align-items: center;\r\n  justify-content: center;\r\n}\r\n\r\ndialog:not([open]) {\r\n  display: none;\r\n}\r\n\r\ndialog::backdrop {\r\n  background: rgba(0, 0, 0, 0.52);\r\n  backdrop-filter: blur(1px);\r\n}\r\n\r\n.sv-box {\r\n  width: min(420px, calc(100vw - 32px));\r\n  padding: 18px 20px;\r\n  box-sizing: border-box;\r\n  background: #f7f8fa;\r\n  border: 1px solid #aeb7c2;\r\n  border-radius: 6px;\r\n  box-shadow:\r\n    0 8px 25px rgba(0, 0, 0, 0.35),\r\n    inset 0 1px 0 rgba(255, 255, 255, 0.9);\r\n  pointer-events: auto;\r\n}\r\n\r\n.sv-title {\r\n  font-weight: 700;\r\n  font-size: 15px;\r\n  margin-bottom: 8px;\r\n  color: #1769aa;\r\n}\r\n\r\n.sv-text {\r\n  margin-bottom: 14px;\r\n  color: #4b5563;\r\n  font-size: 13px;\r\n  line-height: 1.5;\r\n}\r\n\r\n.sv-remember {\r\n  display: inline-flex;\r\n  align-items: center;\r\n  gap: 8px;\r\n  margin-bottom: 18px;\r\n  font-size: 12.5px;\r\n  cursor: pointer;\r\n  user-select: none;\r\n  color: #5b6570;\r\n  pointer-events: auto;\r\n}\r\n\r\n.sv-remember:hover {\r\n  color: #263238;\r\n}\r\n\r\n.sv-remember input {\r\n  cursor: pointer;\r\n  margin: 0;\r\n  accent-color: #2479b3;\r\n  pointer-events: auto;\r\n  appearance: checkbox;\r\n  -webkit-appearance: checkbox;\r\n  width: 15px;\r\n  height: 15px;\r\n  opacity: 1;\r\n  position: static;\r\n  z-index: auto;\r\n  vertical-align: middle;\r\n}\r\n\r\n.sv-remember span {\r\n  pointer-events: auto;\r\n  user-select: none;\r\n}\r\n\r\n.sv-buttons {\r\n  display: flex;\r\n  gap: 8px;\r\n  justify-content: flex-end;\r\n}\r\n\r\n@media (prefers-color-scheme: dark) {\r\n  dialog {\r\n    color: #e4e8eb;\r\n  }\r\n\r\n  .sv-box {\r\n    background: #292f35;\r\n    color: #e5e9ec;\r\n    border-color: #59636e;\r\n    box-shadow:\r\n      0 8px 28px rgba(0, 0, 0, 0.7),\r\n      inset 0 1px 0 rgba(255, 255, 255, 0.05);\r\n  }\r\n\r\n  .sv-title {\r\n    color: #5eb5e6;\r\n  }\r\n\r\n  .sv-text {\r\n    color: #b9c1c8;\r\n  }\r\n\r\n  .sv-remember {\r\n    color: #aeb7bf;\r\n  }\r\n\r\n  .sv-remember:hover {\r\n    color: #e5e9ec;\r\n  }\r\n\r\n  .sv-remember input {\r\n    accent-color: #5eb5e6;\r\n  }\r\n}\r\n\n.sv-install-box {\r\n  width: min(520px, calc(100vw - 32px));\r\n  padding: 24px 26px;\r\n}\r\n\r\n.sv-install-header {\r\n  display: flex;\r\n  align-items: center;\r\n  justify-content: space-between;\r\n  margin-bottom: 16px;\r\n  padding-bottom: 12px;\r\n  border-bottom: 1px solid #dce2e8;\r\n}\r\n\r\n.sv-install-title {\r\n  font-size: 16px;\r\n  font-weight: 700;\r\n  color: #1769aa;\r\n  display: flex;\r\n  align-items: center;\r\n  gap: 8px;\r\n}\r\n\r\n.sv-install-desc {\r\n  margin-bottom: 14px;\r\n  line-height: 1.5;\r\n}\r\n\r\n.sv-install-learn-more {\r\n  display: inline;\r\n  margin-left: 6px;\r\n  color: #2563eb;\r\n  text-decoration: underline;\r\n  text-underline-offset: 2px;\r\n  font-size: 12.5px;\r\n  font-weight: 500;\r\n  white-space: nowrap;\r\n}\r\n\r\n.sv-install-learn-more:hover {\r\n  color: #1d4ed8;\r\n}\r\n\r\n.sv-install-close-btn {\r\n  background: transparent;\r\n  border: none;\r\n  font-size: 18px;\r\n  line-height: 1;\r\n  color: #8e9aa6;\r\n  cursor: pointer;\r\n  padding: 4px 6px;\r\n  border-radius: 4px;\r\n  transition: all 0.12s ease;\r\n}\r\n\r\n.sv-install-close-btn:hover {\r\n  background: rgba(0, 0, 0, 0.06);\r\n  color: #263238;\r\n}\r\n\r\n.sv-steps {\r\n  display: flex;\r\n  flex-direction: column;\r\n  gap: 16px;\r\n  margin-bottom: 20px;\r\n}\r\n\r\n.sv-step {\r\n  display: flex;\r\n  gap: 12px;\r\n  background: #ffffff;\r\n  padding: 12px 14px;\r\n  border: 1px solid #dce2e8;\r\n  border-radius: 6px;\r\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);\r\n}\r\n\r\n.sv-step-num {\r\n  width: 24px;\r\n  height: 24px;\r\n  background: #2479b3;\r\n  color: #fff;\r\n  border-radius: 50%;\r\n  display: flex;\r\n  align-items: center;\r\n  justify-content: center;\r\n  font-weight: 700;\r\n  font-size: 12px;\r\n  flex-shrink: 0;\r\n}\r\n\r\n.sv-step-content {\r\n  flex: 1;\r\n  font-size: 13px;\r\n  line-height: 1.45;\r\n  color: #374151;\r\n}\r\n\r\n.sv-step-title {\r\n  font-weight: 600;\r\n  margin-bottom: 4px;\r\n  color: #1e293b;\r\n}\r\n\r\n.sv-extensions-list {\r\n  display: flex;\r\n  flex-wrap: wrap;\r\n  gap: 6px;\r\n  margin-top: 8px;\r\n}\r\n\r\n.sv-ext-link {\r\n  font-size: 11.5px;\r\n  padding: 3px 8px;\r\n  border-radius: 4px;\r\n  background: #f1f5f9;\r\n  color: #2563eb;\r\n  border: 1px solid #cbd5e1;\r\n  text-decoration: none;\r\n  display: inline-flex;\r\n  align-items: center;\r\n  gap: 4px;\r\n  transition: all 0.12s ease;\r\n}\r\n\r\n.sv-ext-link:hover {\r\n  background: #e2e8f0;\r\n  border-color: #94a3b8;\r\n  color: #1d4ed8;\r\n}\r\n\r\n.sv-ext-recommended {\r\n  background: #eff6ff;\r\n  border-color: #93c5fd;\r\n  font-weight: 600;\r\n}\r\n\r\n.sv-install-action {\r\n  margin-top: 8px;\r\n  display: flex;\r\n  align-items: center;\r\n  gap: 10px;\r\n}\r\n\r\n.sv-status-banner {\r\n  display: flex;\r\n  align-items: center;\r\n  gap: 8px;\r\n  padding: 10px 14px;\r\n  border-radius: 6px;\r\n  font-size: 12.5px;\r\n  font-weight: 500;\r\n  margin-bottom: 16px;\r\n}\r\n\r\n.sv-status-banner.waiting {\r\n  background: #fef3c7;\r\n  color: #92400e;\r\n  border: 1px solid #fde68a;\r\n}\r\n\r\n.sv-status-banner.success {\r\n  background: #dcfce7;\r\n  color: #166534;\r\n  border: 1px solid #bbf7d0;\r\n}\r\n\r\n.sv-status-spinner {\r\n  width: 14px;\r\n  height: 14px;\r\n  border: 2px solid #b45309;\r\n  border-top-color: transparent;\r\n  border-radius: 50%;\r\n  animation: sv-spin 0.8s linear infinite;\r\n}\r\n\r\n@keyframes sv-spin {\r\n  to {\r\n    transform: rotate(360deg);\r\n  }\r\n}\r\n\r\n@media (prefers-color-scheme: dark) {\r\n  .sv-install-header {\r\n    border-bottom-color: #434c56;\r\n  }\r\n\r\n  .sv-install-title {\r\n    color: #5eb5e6;\r\n  }\r\n\r\n  .sv-install-learn-more {\r\n    color: #60a5fa;\r\n  }\r\n\r\n  .sv-install-learn-more:hover {\r\n    color: #93c5fd;\r\n  }\r\n\r\n  .sv-install-close-btn:hover {\r\n    background: rgba(255, 255, 255, 0.08);\r\n    color: #fff;\r\n  }\r\n\r\n  .sv-step {\r\n    background: #23282e;\r\n    border-color: #434c56;\r\n    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);\r\n  }\r\n\r\n  .sv-step-num {\r\n    background: #3d96cb;\r\n  }\r\n\r\n  .sv-step-content {\r\n    color: #d1d7dc;\r\n  }\r\n\r\n  .sv-step-title {\r\n    color: #f1f5f9;\r\n  }\r\n\r\n  .sv-ext-link {\r\n    background: #2c333a;\r\n    border-color: #4b555f;\r\n    color: #60a5fa;\r\n  }\r\n\r\n  .sv-ext-link:hover {\r\n    background: #37404a;\r\n    border-color: #64748b;\r\n    color: #93c5fd;\r\n  }\r\n\r\n  .sv-ext-recommended {\r\n    background: #1e3a5f;\r\n    border-color: #3b82f6;\r\n  }\r\n\r\n  .sv-status-banner.waiting {\r\n    background: #3a2e15;\r\n    color: #fde047;\r\n    border-color: #715816;\r\n  }\r\n\r\n  .sv-status-banner.success {\r\n    background: #143522;\r\n    color: #86efac;\r\n    border-color: #1e5e38;\r\n  }\r\n\r\n  .sv-status-spinner {\r\n    border-color: #fde047;\r\n    border-top-color: transparent;\r\n  }\r\n}\r\n";
function _() {
	if (typeof navigator > "u") return "chrome";
	let e = navigator.userAgent.toLowerCase();
	return e.includes("firefox") ? "firefox" : e.includes("edg/") ? "edge" : e.includes("opr/") || e.includes("opera/") ? "opera" : e.includes("safari") && !e.includes("chrome") ? "safari" : "chrome";
}
var v = {
	chrome: {
		tampermonkey: "https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkmingnoiobeogfiigjmhednnj",
		violentmonkey: "https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag"
	},
	firefox: {
		tampermonkey: "https://addons.mozilla.org/firefox/addon/tampermonkey/",
		violentmonkey: "https://addons.mozilla.org/firefox/addon/violentmonkey/"
	},
	edge: {
		tampermonkey: "https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepgglflondmnje",
		violentmonkey: "https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjfgddacbcigncyclcoaebeent"
	},
	opera: { tampermonkey: "https://addons.opera.com/extensions/details/tampermonkey-beta/" },
	safari: { tampermonkey: "https://apps.apple.com/app/tampermonkey/id1482490089" }
}, y = null;
function b(e = {}) {
	if (typeof document > "u") return {
		host: null,
		close: () => {}
	};
	y && y.close();
	let { userscriptUrl: t = "https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.user.js", learnMoreUrl: n = "https://github.com/SweetSea-ButImNotSweet/sremote/blob/main/packages/userscript/README.md", learnMoreText: r = "Tại sao cần cài script này?", title: i = "Yêu cầu SRemote Userscript", description: a = "Trang web cần SRemote Userscript để tương tác và điều khiển media trong iframe cross-origin.", autoDetect: o = !0, onClose: s = null, onSuccess: c = null } = e, l = _(), u = document.createElement("div");
	u.id = "sremote-install-modal-host";
	let d = u.attachShadow({ mode: "closed" }), f = document.createElement("style");
	f.textContent = g;
	let p = document.createElement("dialog"), m = document.createElement("div");
	m.className = "sv-box sv-install-box";
	let h = !1, b = null, x = !1, S = () => {
		if (!h) {
			h = !0, typeof window < "u" && window.removeEventListener("sremote:ready", L);
			try {
				p.close();
			} catch {}
			u.remove(), y?.host === u && (y = null), s?.({ success: x });
		}
	};
	y = {
		host: u,
		close: S
	};
	let C = document.createElement("div");
	C.className = "sv-install-header";
	let w = document.createElement("div");
	w.className = "sv-install-title", w.textContent = i;
	let T = document.createElement("button");
	if (T.className = "sv-install-close-btn", T.innerHTML = "&times;", T.title = "Đóng", T.addEventListener("click", (e) => {
		e.stopPropagation(), S();
	}), C.append(w, T), m.append(C), a || n) {
		let e = document.createElement("div");
		if (e.className = "sv-text sv-install-desc", a) {
			let t = document.createElement("span");
			t.textContent = a, e.append(t);
		}
		if (n) {
			let t = document.createElement("a");
			t.className = "sv-install-learn-more", t.href = n, t.target = "_blank", t.rel = "noopener noreferrer", t.textContent = ` ${r}`, e.append(t);
		}
		m.append(e);
	}
	b = document.createElement("div"), b.className = "sv-status-banner waiting", b.innerHTML = "\n    <div class=\"sv-status-spinner\"></div>\n    <span>Chờ nhận diện Userscript...</span>\n  ", m.append(b);
	let E = document.createElement("div");
	E.className = "sv-steps";
	let D = document.createElement("div");
	D.className = "sv-step";
	let O = v[l] || v.chrome, k = "";
	O.tampermonkey && (k += `<a class="sv-ext-link sv-ext-recommended" href="${O.tampermonkey}" target="_blank" rel="noopener noreferrer">Tampermonkey (${l})</a>`), O.violentmonkey && (k += `<a class="sv-ext-link" href="${O.violentmonkey}" target="_blank" rel="noopener noreferrer">Violentmonkey</a>`), D.innerHTML = `
    <div class="sv-step-num">1</div>
    <div class="sv-step-content">
      <div class="sv-step-title">Cài extension Userscript manager</div>
      <div>Chọn một extension phù hợp cho trình duyệt:</div>
      <div class="sv-extensions-list">
        ${k}
      </div>
    </div>
  `, E.append(D);
	let A = document.createElement("div");
	A.className = "sv-step", A.innerHTML = `
    <div class="sv-step-num">2</div>
    <div class="sv-step-content">
      <div class="sv-step-title">Cài đặt script</div>
      <div>Bấm nút bên dưới để mở trang cài đặt script:</div>
      <div class="sv-install-action">
        <a class="sv-btn sv-btn-primary" href="${t}" target="_blank" rel="noopener noreferrer">
          Cài đặt .user.js
        </a>
      </div>
    </div>
  `, E.append(A);
	let j = document.createElement("div");
	j.className = "sv-step", j.innerHTML = "\n    <div class=\"sv-step-num\">3</div>\n    <div class=\"sv-step-content\">\n      <div class=\"sv-step-title\">Xác nhận</div>\n      <div>Sau khi bấm Cài đặt trong extension, quay lại trang này hoặc tải lại trang.</div>\n    </div>\n  ", E.append(j), m.append(E);
	let M = document.createElement("div");
	M.className = "sv-buttons";
	let N = document.createElement("button");
	N.className = "sv-btn sv-btn-deny", N.textContent = "Tải lại trang", N.addEventListener("click", () => {
		typeof window < "u" && window.location.reload();
	});
	let P = document.createElement("button");
	P.className = "sv-btn sv-btn-primary", P.textContent = "Đóng", P.addEventListener("click", () => {
		S();
	}), M.append(N, P), m.append(M), p.append(m), d.append(f, p), p.addEventListener("cancel", (e) => {
		e.preventDefault(), S();
	});
	let F = () => {
		let e = document.body || document.documentElement;
		e && !u.isConnected && e.appendChild(u);
	};
	F(), document.readyState === "loading" && document.addEventListener("DOMContentLoaded", F, { once: !0 });
	try {
		p.showModal();
	} catch {
		p.setAttribute("open", "");
	}
	function I() {
		x = !0, b && (b.className = "sv-status-banner success", b.innerHTML = "\n        <span>✓</span>\n        <span>Userscript đã được kích hoạt.</span>\n      "), c?.();
	}
	function L() {
		I();
	}
	return o && typeof window < "u" && (window.sremote && !window.sremote.isDummy ? I() : window.addEventListener("sremote:ready", L, { once: !0 })), {
		host: u,
		close: S
	};
}
//#endregion
//#region src/client.js
a();
var x = class {
	constructor(e = {}) {
		a(), this.options = {
			fallbackToDom: !0,
			timeout: 2e3,
			passkey: null,
			...e
		}, this.userscriptDriver = new o(this.options), this.domDriver = new h(this.options), this.mode = "detecting", this._readyPromise = null, this.instances = {
			list: (e) => {
				if (this.userscriptDriver.isAvailable()) {
					let t = this.userscriptDriver.getApi();
					return t?.instances?.list ? t.instances.list(e || this.options.passkey) : t?.list?.(e || this.options.passkey) || [];
				}
				return this.domDriver.list();
			},
			get: (e, t) => this.status(e, t),
			capabilities: (e, t) => this.capabilities(e, t),
			getIframe: (e, t) => {
				if (this.userscriptDriver.isAvailable()) {
					let n = this.userscriptDriver.getApi();
					return n?.instances?.getIframe ? n.instances.getIframe(e, t || this.options.passkey) : n?.getIframe?.(e, t || this.options.passkey) || null;
				}
				return null;
			},
			assign: (e, t) => this.userscriptDriver.assignId(e, t),
			setMultiMode: (e, t) => {
				if (this.domDriver.setMultiMode(e), this.userscriptDriver.isAvailable()) {
					let n = this.userscriptDriver.getApi();
					n?.instances?.setMultiMode ? n.instances.setMultiMode(e, t || this.options.passkey) : n?.setMultiMode && n.setMultiMode(e, t || this.options.passkey);
				}
			},
			isMultiMode: (e) => {
				if (this.userscriptDriver.isAvailable()) {
					let t = this.userscriptDriver.getApi();
					return t?.instances?.isMultiMode ? t.instances.isMultiMode(e || this.options.passkey) : !!t?.isMultiMode?.(e || this.options.passkey);
				}
				return this.domDriver.isMultiMode();
			},
			setExclusive: (e, t) => {
				if (this.domDriver.setExclusive(e), this.userscriptDriver.isAvailable()) {
					let n = this.userscriptDriver.getApi();
					n?.instances?.setExclusive ? n.instances.setExclusive(e, t || this.options.passkey) : n?.setExclusive && n.setExclusive(e, t || this.options.passkey);
				}
			},
			query: (e) => {
				if (this.userscriptDriver.isAvailable()) {
					let t = this.userscriptDriver.getApi();
					return t?.instances?.query ? t.instances.query(e || this.options.passkey) : t?.query?.(e || this.options.passkey) || [];
				}
				return this.domDriver.list();
			},
			note: (e, t) => {
				if (this.userscriptDriver.isAvailable()) {
					let n = this.userscriptDriver.getApi();
					n?.instances?.note ? n.instances.note(e, t || this.options.passkey) : n?.note && n.note(e, t || this.options.passkey);
				}
			}
		}, this.adapters = {
			register: (e, t, n) => {
				let r = this.domDriver.useAdapter(e, t);
				if (this.userscriptDriver.isAvailable()) {
					let r = this.userscriptDriver.getApi();
					return r?.adapters?.register ? r.adapters.register(e, t, n || this.options.passkey) : this.userscriptDriver.useAdapter(e, t, n);
				}
				return r;
			},
			unregister: (e, t) => {
				if (this.userscriptDriver.isAvailable()) {
					let n = this.userscriptDriver.getApi();
					return n?.adapters?.unregister ? n.adapters.unregister(e, t || this.options.passkey) : this.userscriptDriver.removeAdapter(e, t);
				}
				return this.domDriver.removeAdapter(e);
			},
			get: (e, t) => {
				if (this.userscriptDriver.isAvailable()) {
					let n = this.userscriptDriver.getApi();
					return n?.adapters?.get ? n.adapters.get(e, t || this.options.passkey) : this.userscriptDriver.getCustomAdapter(e, t);
				}
				return this.domDriver.getCustomAdapter(e);
			}
		}, this.rpc = {
			call: (e, t, n, r) => this.userscriptDriver.call(e, t, n, r),
			postMessage: (e, t, n, r, i) => this.userscriptDriver.postWindowMessage(e, t, n, r, i),
			onMessage: (e, t) => this.on("iframe:message", e, t)
		}, this.css = {
			set: (e, t, n) => this.userscriptDriver.call("setIframeCSS", { css: e }, t, n),
			get: (e, t) => this.userscriptDriver.call("getIframeCSS", {}, e, t),
			remove: (e, t) => this.userscriptDriver.call("removeIframeCSS", {}, e, t)
		};
	}
	isUserscriptAvailable() {
		return this.userscriptDriver.isAvailable();
	}
	syncAdaptersToUserscript() {
		if (this.userscriptDriver.isAvailable()) {
			let e = this.userscriptDriver.getApi();
			for (let [t, n] of this.domDriver.adaptersMap.entries()) e?.adapters?.register ? e.adapters.register(n, t, this.options.passkey) : this.userscriptDriver.useAdapter(n, t, this.options.passkey);
		}
	}
	async ready() {
		return this._readyPromise ||= new Promise((e) => {
			if (this.userscriptDriver.isAvailable()) {
				this.mode = "userscript", this.syncAdaptersToUserscript(), e(this);
				return;
			}
			let t = !1, n = () => {
				t || (t = !0, this.mode = "userscript", this.syncAdaptersToUserscript(), window.removeEventListener("sremote:ready", n), clearTimeout(r), e(this));
			};
			typeof window < "u" && window.addEventListener("sremote:ready", n, { once: !0 });
			let r = setTimeout(() => {
				t || (t = !0, typeof window < "u" && window.removeEventListener("sremote:ready", n), this.userscriptDriver.isAvailable() ? (this.mode = "userscript", this.syncAdaptersToUserscript()) : this.mode = this.options.fallbackToDom ? "dom-direct" : "unsupported", e(this));
			}, this.options.timeout);
		}), this._readyPromise;
	}
	get activeDriver() {
		return this.mode === "userscript" || this.userscriptDriver.isAvailable() ? this.userscriptDriver : this.mode === "dom-direct" || this.options.fallbackToDom ? this.domDriver : null;
	}
	async _exec(e, ...t) {
		await this.ready();
		let n = this.activeDriver;
		if (!n) throw Error(`[SRemote:Wrapper] No active driver available to execute ${e}()`);
		return n[e](...t);
	}
	async play(e, t) {
		return this._exec("play", e, t);
	}
	async pause(e, t) {
		return this._exec("pause", e, t);
	}
	async toggle(e, t) {
		return this._exec("toggle", e, t);
	}
	async stop(e, t) {
		return this._exec("stop", e, t);
	}
	async seek(e, t, n) {
		return this._exec("seek", e, t, n);
	}
	async seekTo(e, t, n) {
		return this._exec("seekTo", e, t, n);
	}
	async volume(e, t, n) {
		return this._exec("volume", e, t, n);
	}
	async mute(e, t, n) {
		return this._exec("mute", e, t, n);
	}
	async speed(e, t, n) {
		return this._exec("speed", e, t, n);
	}
	async pip(e, t, n) {
		return this._exec("pip", e, t, n);
	}
	async load(e, t, n) {
		return this._exec("load", e, t, n);
	}
	async quality(e, t, n) {
		return this._exec("quality", e, t, n);
	}
	async getQualities(e, t) {
		return this._exec("getQualities", e, t);
	}
	async subtitle(e, t, n) {
		return this._exec("subtitle", e, t, n);
	}
	async getSubtitles(e, t) {
		return this._exec("getSubtitles", e, t);
	}
	async shuffle(e, t, n) {
		return this._exec("shuffle", e, t, n);
	}
	async repeat(e, t, n) {
		return this._exec("repeat", e, t, n);
	}
	async next(e, t) {
		return this._exec("next", e, t);
	}
	async previous(e, t) {
		return this._exec("previous", e, t);
	}
	status(e, t) {
		return this.userscriptDriver.isAvailable() ? this.userscriptDriver.status(e, t) : null;
	}
	capabilities(e, t) {
		return this.userscriptDriver.isAvailable() ? this.userscriptDriver.capabilities(e, t) : this.domDriver ? this.domDriver.getCapabilities(e) : null;
	}
	hello(e, t) {
		if (this.userscriptDriver.isAvailable()) {
			let n = this.userscriptDriver.getApi();
			if (n && typeof n.hello == "function") return n.hello(e, t || this.options.passkey);
		}
	}
	bindMetadata(e, t, n) {
		return this.userscriptDriver.bindMetadata(e, t, n);
	}
	emit(e, t) {
		if (this.userscriptDriver.isAvailable()) {
			let n = this.userscriptDriver.getApi();
			if (n && typeof n.emit == "function") return n.emit(e, t);
		}
		if (this.domDriver && typeof this.domDriver.emit == "function") return this.domDriver.emit(e, t);
	}
	on(e, t, n) {
		return this.userscriptDriver.isAvailable() ? this.userscriptDriver.on(e, t, n) : this.domDriver.on(e, t);
	}
	off(e, t) {
		return this.userscriptDriver.isAvailable() ? this.userscriptDriver.off(e, t) : this.domDriver.off(e, t);
	}
	showInstallModal(e) {
		return b(e);
	}
};
function S(e) {
	return new x(e);
}
var C = new x();
if (typeof globalThis < "u") try {
	globalThis[Symbol.for("__sremote_client__")] = C;
} catch {}
//#endregion
//#region src/universal-adapter.js
function w(e = {}) {
	let { name: t = "universal-adapter", mediaElement: n = null, play: r, pause: i, toggle: a, stop: o, seek: s, seekTo: c, setCurrentTime: l, setVolume: u, setMuted: d, setPlaybackRate: f, setQuality: p, getQualities: m, setSubtitle: h, getSubtitles: g, setShuffle: _, setRepeat: v, next: y, previous: b, load: x, requestPip: S, getState: C } = e, w = 1, T = {
		paused: !0,
		currentTime: 0,
		duration: null,
		volume: 1,
		muted: !1,
		playbackRate: 1,
		quality: "auto",
		subtitle: null,
		shuffle: !1,
		repeat: "off"
	}, E = !!(n && (n.tagName === "AUDIO" || n.tagName === "VIDEO" || n instanceof HTMLMediaElement)), D = (e) => typeof e == "function", O = {
		name: t,
		capabilities: {
			play: D(r) || E,
			pause: D(i) || E,
			toggle: D(a) || D(r) && D(i) || E,
			stop: D(o) || D(i) || E,
			seek: D(s) || D(c) || D(l) || E,
			volume: D(u) || E,
			muted: D(d) || E,
			speed: D(f) || E,
			playbackRate: D(f) || E,
			pip: D(S) || E && !!n.requestPictureInPicture,
			quality: D(p),
			subtitles: D(h) || D(g),
			shuffle: D(_),
			repeat: D(v),
			next: D(y),
			previous: D(b),
			load: D(x),
			hasAdapter: !0,
			hasNative: E,
			hasMediaSession: !1,
			...e.capabilities && typeof e.capabilities == "object" ? e.capabilities : {}
		},
		async play() {
			if (typeof r == "function") {
				let e = await r();
				return T.paused = !1, e;
			}
			if (E) {
				let e = await n.play();
				return T.paused = !1, e;
			}
		},
		async pause() {
			if (typeof i == "function") {
				let e = await i();
				return T.paused = !0, e;
			}
			E && (n.pause(), T.paused = !0);
		},
		async toggle() {
			return typeof a == "function" ? a() : (typeof e.paused == "function" ? e.paused() : typeof e.paused == "boolean" ? e.paused : E ? n.paused : T.paused) ? O.play() : O.pause();
		},
		async stop() {
			if (typeof o == "function") return o();
			await O.pause(), await O.seekTo?.(0);
		},
		async seek(e) {
			if (typeof s == "function") return s(e);
			let t = await O.getCurrentTime?.() ?? (E ? n.currentTime : T.currentTime) ?? 0;
			return O.seekTo?.(Math.max(0, t + e));
		},
		async seekTo(e) {
			if (typeof c == "function") {
				let t = await c(e);
				return T.currentTime = e, t;
			}
			if (typeof l == "function") {
				let t = await l(e);
				return T.currentTime = e, t;
			}
			E && (n.currentTime = Number(e), T.currentTime = Number(e));
		},
		async setCurrentTime(e) {
			return O.seekTo(e);
		},
		async setVolume(e) {
			let t = Math.max(0, Math.min(1, Number(e)));
			if (t > 0 && (w = t), T.volume = t, T.muted = !1, E && (n.volume = t, n.muted = !1), typeof u == "function") {
				let e = await u(t);
				if (typeof d == "function") try {
					await d(!1);
				} catch {}
				return e;
			}
		},
		async setMuted(e) {
			let t = !!e;
			if (t) {
				let e = E ? n.volume : T.volume || 1;
				e > 0 && (w = e);
			}
			if (T.muted = t, E && (n.muted = t, !t && n.volume === 0 && (n.volume = w || 1)), typeof d == "function") {
				let e = await d(t);
				if (!t && typeof u == "function" && T.volume === 0) try {
					await u(w || 1), T.volume = w || 1;
				} catch {}
				return e;
			}
			if (typeof u == "function") {
				let e = t ? 0 : w || 1;
				return T.volume = e, u(e);
			}
		},
		async setPlaybackRate(e) {
			if (typeof f == "function") {
				let t = await f(e);
				return T.playbackRate = e, t;
			}
			E && (n.playbackRate = Number(e), T.playbackRate = Number(e));
		},
		async setQuality(e) {
			if (typeof p == "function") {
				let t = await p(e);
				return T.quality = e, t;
			}
		},
		async getQualities() {
			return typeof m == "function" ? m() : [];
		},
		async setSubtitle(e) {
			if (typeof h == "function") {
				let t = await h(e);
				return T.subtitle = e, t;
			}
		},
		async getSubtitles() {
			return typeof g == "function" ? g() : [];
		},
		async setShuffle(e) {
			if (typeof _ == "function") {
				let t = await _(e);
				return T.shuffle = !!e, t;
			}
		},
		async setRepeat(e) {
			if (typeof v == "function") {
				let t = await v(e);
				return T.repeat = e, t;
			}
		},
		async next() {
			if (typeof y == "function") return y();
		},
		async previous() {
			if (typeof b == "function") return b();
		},
		async load(e) {
			if (typeof x == "function") return x(e);
		},
		async requestPip(e) {
			if (typeof S == "function") return S(e);
		},
		getState() {
			if (typeof C == "function") {
				let e = C();
				return typeof e == "object" && e ? {
					...T,
					...e
				} : T;
			}
			return { ...T };
		}
	};
	return O;
}
//#endregion
export { e as BaseDriver, h as DomDriver, x as SRemoteClient, o as UserscriptDriver, S as createSRemote, w as createUniversalAdapter, C as default, C as sremote, b as showInstallModal };

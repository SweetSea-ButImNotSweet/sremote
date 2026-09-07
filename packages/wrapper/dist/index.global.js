var SRemoteWrapper=(function(e){Object.defineProperties(e,{__esModule:{value:!0},[Symbol.toStringTag]:{value:`Module`}});var t=class{constructor(e={}){this.options={passkey:null,...e}}getPasskey(e){return e||this.options.passkey||null}async play(e,t){throw Error(`[BaseDriver] play() must be implemented by driver`)}async pause(e,t){throw Error(`[BaseDriver] pause() must be implemented by driver`)}async toggle(e,t){throw Error(`[BaseDriver] toggle() must be implemented by driver`)}async stop(e,t){throw Error(`[BaseDriver] stop() must be implemented by driver`)}async seek(e,t,n){throw Error(`[BaseDriver] seek() must be implemented by driver`)}async seekTo(e,t,n){throw Error(`[BaseDriver] seekTo() must be implemented by driver`)}async volume(e,t,n){throw Error(`[BaseDriver] volume() must be implemented by driver`)}async mute(e,t,n){throw Error(`[BaseDriver] mute() must be implemented by driver`)}async speed(e,t,n){throw Error(`[BaseDriver] speed() must be implemented by driver`)}async playbackRate(e,t,n){return this.speed(e,t,n)}async pip(e,t,n){throw Error(`[BaseDriver] pip() must be implemented by driver`)}async load(e,t,n){throw Error(`[BaseDriver] load() must be implemented by driver`)}useAdapter(e,t,n){throw Error(`[BaseDriver] useAdapter() must be implemented by driver`)}removeAdapter(e,t){throw Error(`[BaseDriver] removeAdapter() must be implemented by driver`)}getCustomAdapter(e,t){throw Error(`[BaseDriver] getCustomAdapter() must be implemented by driver`)}on(e,t,n){throw Error(`[BaseDriver] on() must be implemented by driver`)}off(e,t){throw Error(`[BaseDriver] off() must be implemented by driver`)}};function n(){return new Proxy({isDummy:!0,isUserscriptAvailable:()=>!1},{get(e,t){if(t in e)return e[t];if(typeof t!=`symbol`&&t!==`inspect`&&t!==`toJSON`)return()=>{console.warn(`[SRemote:Wrapper] SRemote userscript is not installed. '${String(t)}()' cannot control cross-domain iframes.`)}},set(){return!0}})}var r=null,i=null;function a(e){if(!e||typeof e!=`object`||e.isDummy)return!1;try{if(e.isSremoteNative===!0||e[Symbol.for(`__sremote_native__`)]===!0)return!0}catch{}return typeof e.play==`function`&&typeof e.useAdapter==`function`&&typeof e.assignId==`function`}function o(){if(!(typeof window>`u`)&&!(window.sremote&&a(window.sremote))){r||=n(),i||=r;try{let e=Object.getOwnPropertyDescriptor(window,`sremote`);if(e&&!e.configurable&&!e.set)return;Object.defineProperty(window,"sremote",{get(){return i},set(e){if(a(e)){i=e;try{Object.defineProperty(window,"sremote",{value:e,writable:!1,configurable:!1,enumerable:!0})}catch{}}else console.warn(`[SRemote:Wrapper] Blocked unauthorized attempt to overwrite window.sremote by external script.`)},configurable:!0,enumerable:!0})}catch{try{(!window.sremote||window.sremote.isDummy)&&(window.sremote=r)}catch{}}}}var s=class extends t{isAvailable(){return typeof window>`u`?!1:a(window.SRemote||window.sremote)}getApi(e=!1){if(typeof window>`u`){if(e)throw Error(`[SRemote:Wrapper] SRemote Userscript not detected`);return null}let t=window.SRemote||window.sremote||null,n=a(t)?t:null;if(e&&!n)throw Error(`[SRemote:Wrapper] SRemote Userscript not detected`);return n}_resolveMethod(e,t){if(!e||!t)return null;let n=t.split(`.`),r=e,i=null;for(let e of n){if(!r||typeof r!=`object`&&typeof r!=`function`)return null;i=r,r=r[e]}return typeof r==`function`?{fn:r,context:i}:null}_callRequired(e,...t){let n=this.getApi(!0),r=this._resolveMethod(n,e);if(!r)throw Error(`[SRemote:Wrapper] Method '${e}' not supported by userscript`);return r.fn.call(r.context,...t)}_callOptional(e,t,...n){let r=this.getApi(),i=this._resolveMethod(r,e);return i?i.fn.call(i.context,...n):t}async play(e,t){return this._callRequired(`play`,e,this.getPasskey(t))}async pause(e,t){return this._callRequired(`pause`,e,this.getPasskey(t))}async toggle(e,t){return this._callRequired(`toggle`,e,this.getPasskey(t))}async stop(e,t){return this._callRequired(`stop`,e,this.getPasskey(t))}async seek(e,t,n){return this._callRequired(`seek`,e,t,this.getPasskey(n))}async seekTo(e,t,n){return this._callRequired(`seekTo`,e,t,this.getPasskey(n))}async volume(e,t,n){return this._callRequired(`volume`,e,t,this.getPasskey(n))}async mute(e,t,n){return this._callRequired(`mute`,e,t,this.getPasskey(n))}async speed(e,t,n){return this._callRequired(`rate`,e,t,this.getPasskey(n))}async pip(e,t,n){return this._callRequired(`pip`,e,t,this.getPasskey(n))}async load(e,t,n){return this._callRequired(`load`,e,t,this.getPasskey(n))}async quality(e,t,n){return this._callOptional(`quality`,void 0,e,t,this.getPasskey(n))}async getQualities(e,t){return this._callOptional(`getQualities`,[],e,this.getPasskey(t))}async subtitle(e,t,n){return this._callOptional(`subtitle`,void 0,e,t,this.getPasskey(n))}async getSubtitles(e,t){return this._callOptional(`getSubtitles`,[],e,this.getPasskey(t))}async shuffle(e,t,n){return this._callOptional(`shuffle`,void 0,e,t,this.getPasskey(n))}async repeat(e,t,n){return this._callOptional(`repeat`,void 0,e,t,this.getPasskey(n))}async next(e,t){return this._callOptional(`next`,void 0,e,this.getPasskey(t))}async previous(e,t){return this._callOptional(`previous`,void 0,e,this.getPasskey(t))}assignId(e,t){return this._callOptional(`instances.assign`,!1,e,t)}getIframe(e,t){return this._callOptional(`instances.getIframe`,null,e,this.getPasskey(t))}useAdapter(e,t,n){return this._callOptional(`adapters.register`,null,e,t,this.getPasskey(n))}removeAdapter(e,t){return this._callOptional(`adapters.unregister`,!1,e,this.getPasskey(t))}getCustomAdapter(e,t){return this._callOptional(`adapters.get`,null,e,this.getPasskey(t))}list(e){return this._callOptional(`instances.list`,[],this.getPasskey(e))}status(e,t){return this._callOptional(`status`,null,e,this.getPasskey(t))}capabilities(e,t){return this._callOptional(`capabilities`,null,e,this.getPasskey(t))}bindMetadata(e,t,n){return this._callOptional(`bindMetadata`,void 0,e,t,this.getPasskey(n))}setMultiMode(e,t){return this._callOptional(`instances.setMultiMode`,void 0,e,this.getPasskey(t))}isMultiMode(e){return this._callOptional(`instances.isMultiMode`,!1,this.getPasskey(e))}setExclusive(e,t){return this._callOptional(`instances.setExclusive`,void 0,e,this.getPasskey(t))}query(e){return this._callOptional(`instances.query`,[],this.getPasskey(e))}call(e,t,n,r){return this._callRequired(`rpc.call`,e,t,n,this.getPasskey(r))}postWindowMessage(e,t=`*`,n=null,r=`parent`,i=null){return this._callOptional(`rpc.postMessage`,!1,e,t,n,r,this.getPasskey(i))}on(e,t,n){let r=this.getApi();if(r&&typeof r.on==`function`)return r.on(e,t,this.getPasskey(n));let i=e.startsWith(`sremote:`)?e:`sremote:${e}`,a=e=>t(e.detail);return window.addEventListener(i,a),()=>window.removeEventListener(i,a)}off(e,t){let n=this.getApi();if(n&&typeof n.off==`function`)return n.off(e,t);let r=e.startsWith(`sremote:`)?e:`sremote:${e}`;window.removeEventListener(r,t)}};function c(e){if(!e)return null;if(typeof e.getState==`function`)try{return e.getState()}catch{}let t=e.volume===void 0?1:e.volume,n=e.muted!==void 0&&e.muted,r=e.currentTime===void 0?0:e.currentTime,i=e.duration,a=e.playbackRate===void 0?1:e.playbackRate,o=e.paused===void 0?!0:typeof e.paused==`function`?e.paused():!!e.paused,s=e.ended!==void 0&&!!e.ended,c=e.readyState===void 0?0:e.readyState,l=e.currentSrc||e.src||``,u=Number.isFinite(i)?i:null,d=0;try{let t=e.buffered;t&&t.length>0&&(d=t.end(t.length-1))}catch{}let f=e.loop!==void 0&&!!e.loop,p=typeof document<`u`&&!(!document.fullscreenElement||document.fullscreenElement!==e&&!document.fullscreenElement.contains(e)),m=typeof document<`u`&&document.pictureInPictureElement===e;return{paused:o,ended:!!(s||u&&u>0&&r>=u-.1),currentTime:r,duration:u,buffered:d,volume:t,muted:n,playbackRate:a,readyState:c,src:l,loop:f,repeat:f?`one`:`off`,fullscreen:p,pictureInPicture:m}}function l(e,t={}){let n=String(e||``).toLowerCase(),{instanceId:r=`unknown`,source:i=`adapter`,mediaType:a=`adapter`,state:o=null,isProgrammatic:s=!1,...c}=typeof t==`object`&&t?t:{value:t};return{source:i,instanceId:r,mediaType:a,action:n,isProgrammatic:s,...o?{state:o}:{},...c}}function u(e){if(!e)return{play:!1,pause:!1,toggle:!1,stop:!1,seek:!1,volume:!1,muted:!1,speed:!1,playbackRate:!1,pip:!1,quality:!1,subtitles:!1,shuffle:!1,repeat:!1,next:!1,previous:!1,load:!1,hasAdapter:!1,hasNative:!1,hasMediaSession:!1};if(e.capabilities&&typeof e.capabilities==`object`)return{...e.capabilities};let t=e.tagName===`VIDEO`,n=e.tagName===`AUDIO`,r=t||n,i=t=>typeof e[t]==`function`;return{play:r||i(`play`),pause:r||i(`pause`),toggle:r||i(`toggle`)||i(`play`)&&i(`pause`),stop:r||i(`stop`)||i(`pause`),seek:r||i(`seek`)||i(`seekTo`)||i(`setCurrentTime`),volume:r||i(`setVolume`),muted:r||i(`setMuted`),speed:r||i(`setPlaybackRate`),playbackRate:r||i(`setPlaybackRate`),pip:t&&typeof document<`u`&&!!(document.pictureInPictureEnabled||e.requestPictureInPicture)||i(`requestPip`)||i(`pip`),quality:i(`setQuality`),subtitles:!!(r&&e.textTracks&&e.textTracks.length>0)||i(`setSubtitle`)||i(`getSubtitles`),shuffle:i(`setShuffle`),repeat:r||i(`setRepeat`),next:i(`next`),previous:i(`previous`),load:r||i(`load`),hasAdapter:!r,hasNative:r,hasMediaSession:!1}}var d=[`play`,`pause`,`playing`,`ended`,`timeupdate`,`durationchange`,`volumechange`,`ratechange`,`seeking`,`seeked`,`progress`,`canplay`,`canplaythrough`,`waiting`,`stalled`,`emptied`,`abort`,`error`,`loadeddata`,`loadedmetadata`,`loadstart`,`suspend`,`encrypted`,`enterpictureinpicture`,`exitpictureinpicture`];function f(e,t,n={}){if(!e||typeof e.addEventListener!=`function`||typeof t!=`function`)return()=>{};let{instanceId:r=`dom-media`,source:i=`dom`,treatAlmostEndAsEnd:a=!1,events:o=d}=n,s=!1,u=[];for(let n of o){let o=o=>{let u=c(e);if(n===`timeupdate`){let n=Number.isFinite(e.duration)?e.duration:null,o=e.currentTime||0;n&&n>3&&o>=n-.8&&o<=n?s||(s=!0,t(a?`ended`:`almostend`,l(a?`ended`:`almostend`,{source:i,instanceId:r,mediaType:e.tagName?e.tagName.toLowerCase():`video`,state:u}))):n&&o<n-1.5&&(s=!1)}if(n===`ended`){s=!1;let t=Number.isFinite(e.duration)?e.duration:null,n=e.currentTime||0;if(t&&t>0&&Math.abs(t-n)>1.5)return}t(n,l(n,{source:i,instanceId:r,mediaType:e.tagName?e.tagName.toLowerCase():`video`,state:u,originalEvent:o}))};e.addEventListener(n,o,!0),u.push({evtName:n,listener:o})}return()=>{for(let{evtName:t,listener:n}of u)try{e.removeEventListener(t,n,!0)}catch{}u.length=0}}function p(e,t={}){if(!e||typeof e!=`object`)return null;let{instanceId:n,onEmit:r,source:i=`adapter`}=t,a=Object.create(e),o=typeof e.emit==`function`?e.emit.bind(e):null;return a.emit=(e,t={})=>{if(o)try{o(e,t)}catch{}let s=String(e||``).toLowerCase(),u=c(a),d=l(s,{source:i,instanceId:n,mediaType:`adapter`,...u?{state:u}:{},...typeof t==`object`&&t?t:{value:t}});if(typeof r==`function`)try{r(s,d)}catch{}},typeof a.toggle!=`function`&&typeof a.play==`function`&&typeof a.pause==`function`&&(a.toggle=async function(){return(typeof a.paused==`function`?a.paused():typeof a.paused!=`boolean`||a.paused)?a.play():a.pause()}),a.capabilities||=u(a),a}Object.freeze({rootMethods:{play:{action:`play`,type:`command`,args:[`targetOrId`,`key`]},pause:{action:`pause`,type:`command`,args:[`targetOrId`,`key`]},toggle:{action:`toggle`,type:`command`,args:[`targetOrId`,`key`]},stop:{action:`stop`,type:`command`,args:[`targetOrId`,`key`]},seek:{action:`seek`,type:`command_value`,args:[`offset`,`targetOrId`,`key`]},seekTo:{action:`currentTime`,type:`command_value`,args:[`time`,`targetOrId`,`key`]},volume:{action:`volume`,type:`command_value`,args:[`vol`,`targetOrId`,`key`]},mute:{action:`muted`,type:`command_value`,args:[`muted`,`targetOrId`,`key`]},speed:{action:`speed`,type:`command_value`,args:[`rate`,`targetOrId`,`key`]},quality:{action:`quality`,type:`command_value`,args:[`level`,`targetOrId`,`key`]},getQualities:{type:`handler`,handler:`getQualities`,args:[`targetOrId`,`key`]},subtitle:{action:`subtitle`,type:`command_value`,args:[`track`,`targetOrId`,`key`]},getSubtitles:{type:`handler`,handler:`getSubtitles`,args:[`targetOrId`,`key`]},shuffle:{action:`shuffle`,type:`command_value`,args:[`enable`,`targetOrId`,`key`]},repeat:{action:`repeat`,type:`command_value`,args:[`mode`,`targetOrId`,`key`]},next:{action:`next`,type:`command`,args:[`targetOrId`,`key`]},previous:{action:`previous`,type:`command`,args:[`targetOrId`,`key`]},pip:{type:`pip`,args:[`enable`,`targetOrId`,`key`]},load:{action:`load`,type:`command_value`,args:[`source`,`targetOrId`,`key`]},status:{type:`handler`,handler:`getStatus`,args:[`targetOrId`,`key`]},capabilities:{type:`handler`,handler:`getCapabilities`,args:[`targetOrId`,`key`]}},namespaces:{instances:{list:{type:`handler`,handler:`listInstances`,args:[`key`]},get:{type:`handler`,handler:`getStatus`,args:[`instanceId`,`key`]},capabilities:{type:`handler`,handler:`getCapabilities`,args:[`instanceId`,`key`]},getCapabilities:{type:`handler`,handler:`getCapabilities`,args:[`instanceId`,`key`]},getIframe:{type:`handler`,handler:`getIframeElement`,args:[`instanceId`,`key`]},assign:{type:`handler`,handler:`assignIframeId`,args:[`iframeOrSelector`,`customId`]},setMultiMode:{type:`handler`,handler:`setMultiMode`,args:[`mode`,`key`]},isMultiMode:{type:`handler`,handler:`isMultiMode`,args:[`key`]},setExclusive:{type:`handler`,handler:`setExclusive`,args:[`mode`,`key`]},query:{type:`handler`,handler:`queryInstances`,args:[`key`]},note:{type:`handler`,handler:`annotateInstances`,args:[`dict`,`key`]}},adapters:{register:{type:`handler`,handler:`registerAdapter`,args:[`adapter`,`instanceId`,`key`]},unregister:{type:`handler`,handler:`unregisterAdapter`,args:[`instanceId`,`key`]},get:{type:`handler`,handler:`getCustomAdapter`,args:[`instanceId`,`key`]}},rpc:{call:{type:`handler`,handler:`rpcCall`,args:[`action`,`params`,`instanceId`,`key`]},postMessage:{type:`handler`,handler:`postWindowMessage`,args:[`message`,`targetOrigin`,`instanceId`,`from`,`key`]},onMessage:{type:`handler`,handler:`onRpcMessage`,args:[`handler`,`key`]}},css:{set:{type:`handler`,handler:`setIframeCSS`,args:[`css`,`instanceId`,`key`]},get:{type:`handler`,handler:`getIframeCSS`,args:[`instanceId`,`key`]},remove:{type:`handler`,handler:`removeIframeCSS`,args:[`instanceId`,`key`]}}}});function m(e=`sv`){return`${e}_${Math.random().toString(36).slice(2,9)}_${Date.now().toString(36)}`}function h(e={}){let{ns:t=`sremote:`,logger:n={},onSignal:r=null,getIframeCount:i=null}=e,a=typeof n.log==`function`?n.log:()=>{},o=typeof n.debug==`function`?n.debug:()=>{},s=typeof n.warn==`function`?n.warn:typeof console<`u`?console.warn.bind(console):()=>{},c=new Map,l=new Map,u=new Map,d=new WeakMap,f=new Map,h=null,g=null,_=null,v=!1,y=!1,b=null;function x(){if(typeof g==`boolean`)return g;try{if((typeof i==`function`?i():typeof document<`u`?document.querySelectorAll(`iframe`).length:0)<=1&&c.size<=1)return!1}catch{}return c.size>1}function S(){if(_&&(c.has(_)||l.has(_)))return _;if(l.size>0)return _=Array.from(l.keys())[l.size-1],_;let e=null,t=-1;for(let[n,r]of c.entries()){let i=r.lastSeen||0;i>t&&(t=i,e=n)}return _=e||Array.from(c.keys())[c.size-1]||null,_}function C(e,t=null){for(let[n,r]of c.entries())if(n!==t)try{r.port?.postMessage(e)}catch{}}function w(){let e=Array.from(c.entries()).map(([e,t])=>({instanceId:e,location:t.location,note:t.note,mediaType:t.mediaType})),n=e.length,i=null;if(n>1?(i={type:`${t}multipleMediaDetected`,source:`parent`,count:n,instances:e},o(`%c[SRemote:signal] Emit -> multipleMediaDetected (source: parent)`,`color: #06b6d4;`,i)):n===1&&(i={type:`${t}singleMediaDetected`,source:`parent`,count:1,instance:e[0]},o(`%c[SRemote:signal] Emit -> singleMediaDetected (source: parent)`,`color: #06b6d4;`,i)),i){if(typeof r==`function`)try{r(i)}catch(e){s(`[sremote] Error in onSignal callback:`,e)}else typeof window<`u`&&typeof window.postMessage==`function`&&window.postMessage(i,`*`)}}function T(e,t={}){let n=String(e||``).toLowerCase(),r=n.replace(/^sremote:/,``),i=`sremote:${r}`;(r===`accept`||n===`accept`)&&t?.instanceId?b=t:(r===`disconnect`||n===`disconnect`)&&t?.instanceId&&b?.instanceId===t.instanceId&&(b=null);let a=e=>{if(e)for(let n of e)try{n(t)}catch(e){s(`[sremote] Error in event listener:`,e)}};a(f.get(r)),i!==r&&a(f.get(i));let o=f.get(`*`);if(o){let e=typeof t==`object`&&t?{action:r,...t}:{action:r,value:t};for(let t of o)try{t(e)}catch(e){s(`[sremote] Error in wildcard listener:`,e)}}}function E(e,t){if(typeof t!=`function`)return()=>{};let n=String(e||``).toLowerCase().replace(/^sremote:/,``),r=`sremote:${n}`,i=e=>{f.has(e)||f.set(e,new Set),f.get(e).add(t)};if(i(n),r!==n&&i(r),(n===`accept`||n===`*`)&&b&&(c.has(b.instanceId)||l.has(b.instanceId)))try{let e=n===`*`?{action:`accept`,...b}:b;setTimeout(()=>{try{t(e)}catch{}},0)}catch{}return()=>D(e,t)}function D(e,t){let n=String(e||``).toLowerCase().replace(/^sremote:/,``),r=`sremote:${n}`,i=e=>{let n=f.get(e);n&&(t?n.delete(t):f.delete(e))};i(n),i(r)}function O(e){for(let[n,r]of c.entries())if(n!==e)try{r.port?.postMessage({type:`${t}pause`})}catch{}for(let[t,n]of l.entries())if(t!==e)try{n.pause?.()}catch{}}function k(e,t=`disconnected`){let n=c.get(e);if(n){a(`%c[SRemote:lifecycle] Instance removed: ${e} (reason: ${t})`,`color: #ef4444; font-weight: bold;`);try{n.port?.close()}catch{}c.delete(e),_===e&&(_=null),w(),T(`disconnect`,{instanceId:e,reason:t})}}function A(e,t=null){if(!e||typeof e!=`object`)return null;let n=t||m(`adapter`);if(!x()&&l.size>0)for(let e of Array.from(l.keys()))e!==n&&(a(`%c[SRemote:adapter] Replacing stale adapter in Single Mode: ${e} -> ${n}`,`color: #f59e0b;`),l.delete(e));let r=p(e,{instanceId:n,source:`adapter`,onEmit:(e,t)=>{(e===`play`||e===`playing`)&&(_=n,(h===`auto`||h===!0)&&O(n)),T(e,t)}});return l.set(n,r),_=n,a(`%c[SRemote:adapter] Registered custom adapter for instance '${n}'`,`color: #06b6d4; font-weight: bold;`),T(`accept`,{source:`adapter`,instanceId:n,mediaType:`adapter`,location:typeof location<`u`?location.href:``,origin:typeof location<`u`?location.origin:``}),n}function j(e=null){if(e){let t=l.delete(e);return t&&_===e&&(_=null),t}return l.clear(),_=null,!0}function M(e=null){return e?l.get(e)||null:l.size===1?Array.from(l.values())[0]||null:l.get(_)||Array.from(l.values())[0]||null}return{instances:c,parentAdaptersMap:l,assignedIframeIdMap:u,iframeToAssignedIdMap:d,globalEventListeners:f,get exclusiveMode(){return h},setExclusiveMode:e=>{h=e},get multiModeConfig(){return g},setMultiModeConfig:e=>{g=e},get currentActiveInstanceId(){return _},setCurrentActiveInstanceId:e=>{_=e},get isSessionLocked(){return v},setSessionLocked:e=>{v=e},get isSessionDenied(){return y},setSessionDenied:e=>{y=e},get lastAcceptedData(){return b},isMultiModeActive:x,getLatestActiveInstanceId:S,broadcastToPorts:C,notifyMediaCountChange:w,emitGlobalEvent:T,on:E,off:D,pauseOthersExcept:O,removeInstance:k,handleUseAdapter:A,handleRemoveAdapter:j,getCustomAdapter:M}}var g=class extends t{constructor(e={}){super(e),this.instanceManager=h({ns:`sremote:`,getIframeCount:()=>typeof document<`u`?document.querySelectorAll(`iframe`).length:0}),this.trackedMediaElements=new WeakSet,this.treatAlmostEndAsEnd=!!e.treatAlmostEndAsEnd,typeof document<`u`&&this.initDomAutoTracking()}get adaptersMap(){return this.instanceManager.parentAdaptersMap}get multiMode(){return this.instanceManager.isMultiModeActive()}get exclusiveMode(){return this.instanceManager.exclusiveMode}get lastActiveInstanceId(){return this.instanceManager.currentActiveInstanceId}set lastActiveInstanceId(e){this.instanceManager.setCurrentActiveInstanceId(e)}initDomAutoTracking(){try{let e=document.querySelectorAll(`video, audio`);for(let t of e)this.trackMediaElement(t);typeof MutationObserver<`u`&&new MutationObserver(e=>{for(let t of e)for(let e of t.addedNodes)if(e.nodeType===1){if(e.tagName===`VIDEO`||e.tagName===`AUDIO`)this.trackMediaElement(e);else if(e.querySelectorAll){let t=e.querySelectorAll(`video, audio`);for(let e of t)this.trackMediaElement(e)}}}).observe(document.documentElement||document.body,{childList:!0,subtree:!0})}catch{}}trackMediaElement(e){e&&!this.trackedMediaElements.has(e)&&(this.trackedMediaElements.add(e),f(e,(e,t)=>{this.emit(e,t)},{instanceId:e.id||e.getAttribute(`data-sremote-id`)||`dom-media`,source:`dom`,treatAlmostEndAsEnd:this.treatAlmostEndAsEnd}))}setMultiMode(e){this.instanceManager.setMultiModeConfig(e)}isMultiMode(){return this.instanceManager.isMultiModeActive()}setExclusive(e){this.instanceManager.setExclusiveMode(e)}list(){let e=[];for(let[t,n]of this.instanceManager.parentAdaptersMap.entries()){let r=c(n);e.push({instanceId:t,mediaType:`adapter`,capabilities:this.getCapabilities(t),status:`ready`,state:r})}return e}useAdapter(e,t=null){return this.instanceManager.handleUseAdapter(e,t)}pauseOthersExcept(e){this.instanceManager.pauseOthersExcept(e)}removeAdapter(e){return this.instanceManager.handleRemoveAdapter(e)}getCustomAdapter(e){return this.instanceManager.getCustomAdapter(e)}resolveTarget(e){if(typeof e==`string`&&this.instanceManager.parentAdaptersMap.has(e))return{type:`adapter`,instance:this.instanceManager.parentAdaptersMap.get(e),instanceId:e};if(!e&&this.instanceManager.parentAdaptersMap.size>0){let e=this.instanceManager.parentAdaptersMap.entries().next().value;return{type:`adapter`,instance:e[1],instanceId:e[0]}}let t=this.resolveMediaElement(e);if(t)return{type:`element`,instance:t};if(this.instanceManager.parentAdaptersMap.size>0){let e=this.instanceManager.parentAdaptersMap.entries().next().value;return{type:`adapter`,instance:e[1],instanceId:e[0]}}return null}resolveMediaElement(e){if(typeof document>`u`)return null;if(!e)return document.querySelector(`video, audio`);if(typeof e==`string`){let t=document.querySelector(e);if(!t)return null;if(t.tagName===`VIDEO`||t.tagName===`AUDIO`)return t;if(t.tagName===`IFRAME`)try{return t.contentDocument?.querySelector(`video, audio`)||null}catch{return null}return t.querySelector(`video, audio`)}if(e.nodeType===1){if(e.tagName===`VIDEO`||e.tagName===`AUDIO`)return e;if(e.tagName===`IFRAME`)try{return e.contentDocument?.querySelector(`video, audio`)||null}catch{return null}return e.querySelector(`video, audio`)}return null}async play(e){let t=this.resolveTarget(e);if(!t)throw Error(`[SRemote:DomDriver] Media target not found`);return t.type===`adapter`?t.instance.play?.():t.instance.play()}async pause(e){let t=this.resolveTarget(e);if(!t)throw Error(`[SRemote:DomDriver] Media target not found`);if(t.type===`adapter`)return t.instance.pause?.();t.instance.pause()}async toggle(e){let t=this.resolveTarget(e);if(!t)throw Error(`[SRemote:DomDriver] Media target not found`);if(t.type===`adapter`)return typeof t.instance.toggle==`function`?t.instance.toggle():(typeof t.instance.paused==`function`?t.instance.paused():t.instance.paused)?t.instance.play?.():t.instance.pause?.();let n=t.instance;if(n.paused)return n.play();n.pause()}async stop(e){let t=this.resolveTarget(e);if(!t)throw Error(`[SRemote:DomDriver] Media target not found`);if(t.type===`adapter`)return t.instance.stop?.();let n=t.instance;n.pause(),n.currentTime=0}async seek(e,t){let n=this.resolveTarget(t);if(!n)throw Error(`[SRemote:DomDriver] Media target not found`);if(n.type===`adapter`){if(typeof n.instance.seek==`function`)return n.instance.seek(e);let t=n.instance.getCurrentTime?.()||0;return n.instance.setCurrentTime?.(t+e)}let r=n.instance;r.currentTime=Math.max(0,Math.min(r.duration||0,r.currentTime+e))}async seekTo(e,t){let n=this.resolveTarget(t);if(!n)throw Error(`[SRemote:DomDriver] Media target not found`);if(n.type===`adapter`)return typeof n.instance.seekTo==`function`?n.instance.seekTo(e):n.instance.setCurrentTime?.(e);let r=n.instance;r.currentTime=Math.max(0,Math.min(r.duration||0,e))}async volume(e,t){let n=this.resolveTarget(t);if(!n)throw Error(`[SRemote:DomDriver] Media target not found`);if(n.type===`adapter`)return n.instance.setVolume?.(e);let r=n.instance;r.volume=Math.max(0,Math.min(1,e)),r.muted=!1}async mute(e,t){let n=this.resolveTarget(t);if(!n)throw Error(`[SRemote:DomDriver] Media target not found`);if(n.type===`adapter`)return n.instance.setMuted?.(e);let r=n.instance;r.muted=typeof e==`boolean`?e:!r.muted}async speed(e,t){let n=this.resolveTarget(t);if(!n)throw Error(`[SRemote:DomDriver] Media target not found`);if(n.type===`adapter`)return n.instance.setPlaybackRate?.(e);n.instance.playbackRate=e}async pip(e,t){let n=this.resolveTarget(t);if(!n)throw Error(`[SRemote:DomDriver] Media target not found`);if(n.type===`adapter`)return n.instance.requestPip?.(e);let r=n.instance;if(!r||r.tagName!==`VIDEO`)throw Error(`[SRemote:DomDriver] Video element not found`);if(e===!0||e===void 0&&document.pictureInPictureElement!==r)return r.requestPictureInPicture?.();if(document.pictureInPictureElement===r)return document.exitPictureInPicture?.()}async load(e,t){let n=this.resolveTarget(t);if(!n)throw Error(`[SRemote:DomDriver] Media target not found`);if(n.type===`adapter`){if(typeof n.instance.load==`function`)return n.instance.load(e);console.warn(`[SRemote] load() is primarily designed for custom adapters and is not implemented by default. Implement it via sremote.useAdapter().`);return}let r=n.instance;typeof e==`string`&&e?(r.src=e,typeof r.load==`function`&&r.load()):console.warn(`[SRemote] load() is primarily designed for custom adapters and is not implemented by default. Implement it via sremote.useAdapter().`)}async quality(e,t){let n=this.resolveTarget(t);if(n&&n.type===`adapter`)return n.instance.setQuality?.(e)}async getQualities(e){let t=this.resolveTarget(e);return t&&t.type===`adapter`&&t.instance.getQualities?.()||[]}async subtitle(e,t){let n=this.resolveTarget(t);if(!n)return;if(n.type===`adapter`)return n.instance.setSubtitle?.(e);let r=n.instance;if(r?.textTracks){let t=e===null||e===`off`||e===!1?null:String(e).toLowerCase();for(let e=0;e<r.textTracks.length;e++){let n=r.textTracks[e];n.mode=t&&(n.id===t||n.language&&n.language.toLowerCase()===t||n.label&&n.label.toLowerCase()===t)?`showing`:`disabled`}}}async getSubtitles(e){let t=this.resolveTarget(e);if(!t)return[];if(t.type===`adapter`)return t.instance.getSubtitles?.()||[];let n=t.instance;if(n?.textTracks){let e=[];for(let t=0;t<n.textTracks.length;t++){let r=n.textTracks[t];e.push({id:r.id||String(t),label:r.label||r.language||`Track ${t+1}`,language:r.language})}return e}return[]}async shuffle(e,t){let n=this.resolveTarget(t);if(n&&n.type===`adapter`)return n.instance.setShuffle?.(e)}async repeat(e,t){let n=this.resolveTarget(t);if(!n)return;if(n.type===`adapter`)return n.instance.setRepeat?.(e);let r=n.instance;r&&(r.loop=typeof e==`string`?e===`one`||e===`all`:typeof e==`boolean`?e:!r.loop)}async next(e){let t=this.resolveTarget(e);if(t&&t.type===`adapter`)return t.instance.next?.()}getCapabilities(e){let t=this.resolveTarget(e);return t?u(t.instance):null}emit(e,t){this.instanceManager.emitGlobalEvent(e,t)}on(e,t){if(typeof t!=`function`)return()=>{};let n=this.instanceManager.on(e,t),r=String(e||``).toLowerCase().replace(/^sremote:/,``),i=null;return typeof document<`u`&&(i=e=>{let n=e.target;if(!n||n.tagName!==`VIDEO`&&n.tagName!==`AUDIO`)return;let i=c(n);t(l(r,{instanceId:n.id||n.getAttribute(`data-sremote-id`)||`dom-media`,source:`dom`,mediaType:n.tagName?n.tagName.toLowerCase():`video`,state:i,originalEvent:e}))},document.addEventListener(r,i,!0)),()=>{n(),i&&typeof document<`u`&&document.removeEventListener(r,i,!0)}}off(e,t){this.instanceManager.off(e,t)}},_=`:host {\r
  all: initial;\r
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;\r
  color-scheme: light dark;\r
}\r
\r
.sv-btn,\r
.sv-action-btn {\r
  font-family: inherit;\r
  cursor: pointer;\r
  line-height: 1.2;\r
  border: 1px solid #aeb7c2;\r
  border-radius: 4px;\r
  background: linear-gradient(to bottom, #fff 0%, #e7ebef 100%);\r
  color: #263238;\r
  box-shadow:\r
    inset 0 1px 0 rgba(255, 255, 255, 0.85),\r
    0 1px 2px rgba(0, 0, 0, 0.12);\r
  transition:\r
    background 0.12s ease,\r
    border-color 0.12s ease,\r
    box-shadow 0.12s ease,\r
    transform 0.08s ease;\r
  user-select: none;\r
  display: inline-flex;\r
  align-items: center;\r
  justify-content: center;\r
  gap: 6px;\r
  text-decoration: none;\r
}\r
\r
.sv-btn:hover,\r
.sv-action-btn:hover {\r
  background: linear-gradient(to bottom, #fff 0%, #dce2e8 100%);\r
  color: #111820;\r
  border-color: #8e9aa6;\r
}\r
\r
.sv-btn:active,\r
.sv-action-btn:active {\r
  background: #d7dde3;\r
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.18);\r
  transform: translateY(1px);\r
}\r
\r
.sv-btn {\r
  padding: 7px 16px;\r
  font-size: 13px;\r
  font-weight: 600;\r
}\r
\r
.sv-action-btn {\r
  font-size: 11px;\r
  padding: 4px 8px;\r
}\r
\r
.sv-btn-deny {\r
  color: #374151;\r
}\r
\r
.sv-btn-allow,\r
.sv-btn-primary {\r
  background: linear-gradient(to bottom, #4da3d9 0%, #2479b3 100%);\r
  color: #fff;\r
  border-color: #1e6597;\r
  text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.25);\r
}\r
\r
.sv-btn-allow:hover,\r
.sv-btn-primary:hover {\r
  background: linear-gradient(to bottom, #5eb0e3 0%, #2b84be 100%);\r
  border-color: #195d8d;\r
  color: #fff;\r
}\r
\r
.sv-btn-allow:active,\r
.sv-btn-primary:active {\r
  background: #2479b3;\r
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.25);\r
}\r
\r
.sv-link {\r
  color: #1769aa;\r
  text-decoration: underline;\r
  word-break: break-all;\r
}\r
\r
.sv-link:hover {\r
  color: #0b4f82;\r
}\r
\r
@media (prefers-color-scheme: dark) {\r
  .sv-btn,\r
  .sv-action-btn {\r
    border-color: #59636e;\r
    background: linear-gradient(to bottom, #3b4249 0%, #2d3339 100%);\r
    color: #e4e8eb;\r
    box-shadow:\r
      inset 0 1px 0 rgba(255, 255, 255, 0.08),\r
      0 1px 2px rgba(0, 0, 0, 0.35);\r
  }\r
\r
  .sv-btn:hover,\r
  .sv-action-btn:hover {\r
    background: linear-gradient(to bottom, #464e56 0%, #353c43 100%);\r
    color: #fff;\r
    border-color: #707b86;\r
  }\r
\r
  .sv-btn:active,\r
  .sv-action-btn:active {\r
    background: #292f35;\r
  }\r
\r
  .sv-btn-deny {\r
    color: #d5dbe0;\r
  }\r
\r
  .sv-btn-allow,\r
  .sv-btn-primary {\r
    background: linear-gradient(to bottom, #3d96cb 0%, #246e9c 100%);\r
    border-color: #1d5b83;\r
    color: #fff;\r
  }\r
\r
  .sv-btn-allow:hover,\r
  .sv-btn-primary:hover {\r
    background: linear-gradient(to bottom, #4ba4d8 0%, #2b7bab 100%);\r
    color: #fff;\r
  }\r
\r
  .sv-link {\r
    color: #5eb5e6;\r
  }\r
\r
  .sv-link:hover {\r
    color: #82c9ed;\r
  }\r
}\r

dialog {\r
  position: fixed;\r
  inset: 0;\r
  margin: auto;\r
  border: none;\r
  background: transparent;\r
  color: #263238;\r
  font-size: 13.5px;\r
  box-sizing: border-box;\r
  z-index: 2147483647;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
}\r
\r
dialog:not([open]) {\r
  display: none;\r
}\r
\r
dialog::backdrop {\r
  background: rgba(0, 0, 0, 0.52);\r
  backdrop-filter: blur(1px);\r
}\r
\r
.sv-box {\r
  width: min(420px, calc(100vw - 32px));\r
  padding: 18px 20px;\r
  box-sizing: border-box;\r
  background: #f7f8fa;\r
  border: 1px solid #aeb7c2;\r
  border-radius: 6px;\r
  box-shadow:\r
    0 8px 25px rgba(0, 0, 0, 0.35),\r
    inset 0 1px 0 rgba(255, 255, 255, 0.9);\r
  pointer-events: auto;\r
}\r
\r
.sv-title {\r
  font-weight: 700;\r
  font-size: 15px;\r
  margin-bottom: 8px;\r
  color: #1769aa;\r
}\r
\r
.sv-text {\r
  margin-bottom: 14px;\r
  color: #4b5563;\r
  font-size: 13px;\r
  line-height: 1.5;\r
}\r
\r
.sv-remember {\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 8px;\r
  margin-bottom: 18px;\r
  font-size: 12.5px;\r
  cursor: pointer;\r
  user-select: none;\r
  color: #5b6570;\r
  pointer-events: auto;\r
}\r
\r
.sv-remember:hover {\r
  color: #263238;\r
}\r
\r
.sv-remember input {\r
  cursor: pointer;\r
  margin: 0;\r
  accent-color: #2479b3;\r
  pointer-events: auto;\r
  appearance: checkbox;\r
  -webkit-appearance: checkbox;\r
  width: 15px;\r
  height: 15px;\r
  opacity: 1;\r
  position: static;\r
  z-index: auto;\r
  vertical-align: middle;\r
}\r
\r
.sv-remember span {\r
  pointer-events: auto;\r
  user-select: none;\r
}\r
\r
.sv-buttons {\r
  display: flex;\r
  gap: 8px;\r
  justify-content: flex-end;\r
}\r
\r
@media (prefers-color-scheme: dark) {\r
  dialog {\r
    color: #e4e8eb;\r
  }\r
\r
  .sv-box {\r
    background: #292f35;\r
    color: #e5e9ec;\r
    border-color: #59636e;\r
    box-shadow:\r
      0 8px 28px rgba(0, 0, 0, 0.7),\r
      inset 0 1px 0 rgba(255, 255, 255, 0.05);\r
  }\r
\r
  .sv-title {\r
    color: #5eb5e6;\r
  }\r
\r
  .sv-text {\r
    color: #b9c1c8;\r
  }\r
\r
  .sv-remember {\r
    color: #aeb7bf;\r
  }\r
\r
  .sv-remember:hover {\r
    color: #e5e9ec;\r
  }\r
\r
  .sv-remember input {\r
    accent-color: #5eb5e6;\r
  }\r
}\r

.sv-install-box {\r
  width: min(520px, calc(100vw - 32px));\r
  padding: 24px 26px;\r
}\r
\r
.sv-install-header {\r
  display: flex;\r
  align-items: center;\r
  justify-content: space-between;\r
  margin-bottom: 16px;\r
  padding-bottom: 12px;\r
  border-bottom: 1px solid #dce2e8;\r
}\r
\r
.sv-install-title {\r
  font-size: 16px;\r
  font-weight: 700;\r
  color: #1769aa;\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
}\r
\r
.sv-install-desc {\r
  margin-bottom: 14px;\r
  line-height: 1.5;\r
}\r
\r
.sv-install-learn-more {\r
  display: inline;\r
  margin-left: 6px;\r
  color: #2563eb;\r
  text-decoration: underline;\r
  text-underline-offset: 2px;\r
  font-size: 12.5px;\r
  font-weight: 500;\r
  white-space: nowrap;\r
}\r
\r
.sv-install-learn-more:hover {\r
  color: #1d4ed8;\r
}\r
\r
.sv-install-close-btn {\r
  background: transparent;\r
  border: none;\r
  font-size: 18px;\r
  line-height: 1;\r
  color: #8e9aa6;\r
  cursor: pointer;\r
  padding: 4px 6px;\r
  border-radius: 4px;\r
  transition: all 0.12s ease;\r
}\r
\r
.sv-install-close-btn:hover {\r
  background: rgba(0, 0, 0, 0.06);\r
  color: #263238;\r
}\r
\r
.sv-steps {\r
  display: flex;\r
  flex-direction: column;\r
  gap: 16px;\r
  margin-bottom: 20px;\r
}\r
\r
.sv-step {\r
  display: flex;\r
  gap: 12px;\r
  background: #ffffff;\r
  padding: 12px 14px;\r
  border: 1px solid #dce2e8;\r
  border-radius: 6px;\r
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);\r
}\r
\r
.sv-step-num {\r
  width: 24px;\r
  height: 24px;\r
  background: #2479b3;\r
  color: #fff;\r
  border-radius: 50%;\r
  display: flex;\r
  align-items: center;\r
  justify-content: center;\r
  font-weight: 700;\r
  font-size: 12px;\r
  flex-shrink: 0;\r
}\r
\r
.sv-step-content {\r
  flex: 1;\r
  font-size: 13px;\r
  line-height: 1.45;\r
  color: #374151;\r
}\r
\r
.sv-step-title {\r
  font-weight: 600;\r
  margin-bottom: 4px;\r
  color: #1e293b;\r
}\r
\r
.sv-extensions-list {\r
  display: flex;\r
  flex-wrap: wrap;\r
  gap: 6px;\r
  margin-top: 8px;\r
}\r
\r
.sv-ext-link {\r
  font-size: 11.5px;\r
  padding: 3px 8px;\r
  border-radius: 4px;\r
  background: #f1f5f9;\r
  color: #2563eb;\r
  border: 1px solid #cbd5e1;\r
  text-decoration: none;\r
  display: inline-flex;\r
  align-items: center;\r
  gap: 4px;\r
  transition: all 0.12s ease;\r
}\r
\r
.sv-ext-link:hover {\r
  background: #e2e8f0;\r
  border-color: #94a3b8;\r
  color: #1d4ed8;\r
}\r
\r
.sv-ext-recommended {\r
  background: #eff6ff;\r
  border-color: #93c5fd;\r
  font-weight: 600;\r
}\r
\r
.sv-install-action {\r
  margin-top: 8px;\r
  display: flex;\r
  align-items: center;\r
  gap: 10px;\r
}\r
\r
.sv-status-banner {\r
  display: flex;\r
  align-items: center;\r
  gap: 8px;\r
  padding: 10px 14px;\r
  border-radius: 6px;\r
  font-size: 12.5px;\r
  font-weight: 500;\r
  margin-bottom: 16px;\r
}\r
\r
.sv-status-banner.waiting {\r
  background: #fef3c7;\r
  color: #92400e;\r
  border: 1px solid #fde68a;\r
}\r
\r
.sv-status-banner.success {\r
  background: #dcfce7;\r
  color: #166534;\r
  border: 1px solid #bbf7d0;\r
}\r
\r
.sv-status-spinner {\r
  width: 14px;\r
  height: 14px;\r
  border: 2px solid #b45309;\r
  border-top-color: transparent;\r
  border-radius: 50%;\r
  animation: sv-spin 0.8s linear infinite;\r
}\r
\r
@keyframes sv-spin {\r
  to {\r
    transform: rotate(360deg);\r
  }\r
}\r
\r
@media (prefers-color-scheme: dark) {\r
  .sv-install-header {\r
    border-bottom-color: #434c56;\r
  }\r
\r
  .sv-install-title {\r
    color: #5eb5e6;\r
  }\r
\r
  .sv-install-learn-more {\r
    color: #60a5fa;\r
  }\r
\r
  .sv-install-learn-more:hover {\r
    color: #93c5fd;\r
  }\r
\r
  .sv-install-close-btn:hover {\r
    background: rgba(255, 255, 255, 0.08);\r
    color: #fff;\r
  }\r
\r
  .sv-step {\r
    background: #23282e;\r
    border-color: #434c56;\r
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);\r
  }\r
\r
  .sv-step-num {\r
    background: #3d96cb;\r
  }\r
\r
  .sv-step-content {\r
    color: #d1d7dc;\r
  }\r
\r
  .sv-step-title {\r
    color: #f1f5f9;\r
  }\r
\r
  .sv-ext-link {\r
    background: #2c333a;\r
    border-color: #4b555f;\r
    color: #60a5fa;\r
  }\r
\r
  .sv-ext-link:hover {\r
    background: #37404a;\r
    border-color: #64748b;\r
    color: #93c5fd;\r
  }\r
\r
  .sv-ext-recommended {\r
    background: #1e3a5f;\r
    border-color: #3b82f6;\r
  }\r
\r
  .sv-status-banner.waiting {\r
    background: #3a2e15;\r
    color: #fde047;\r
    border-color: #715816;\r
  }\r
\r
  .sv-status-banner.success {\r
    background: #143522;\r
    color: #86efac;\r
    border-color: #1e5e38;\r
  }\r
\r
  .sv-status-spinner {\r
    border-color: #fde047;\r
    border-top-color: transparent;\r
  }\r
}\r
`;function v(){if(typeof navigator>`u`)return`chrome`;let e=navigator.userAgent.toLowerCase();return e.includes(`firefox`)?`firefox`:e.includes(`edg/`)?`edge`:e.includes(`opr/`)||e.includes(`opera/`)?`opera`:e.includes(`safari`)&&!e.includes(`chrome`)?`safari`:`chrome`}var y={chrome:{tampermonkey:`https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkmingnoiobeogfiigjmhednnj`,violentmonkey:`https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag`},firefox:{tampermonkey:`https://addons.mozilla.org/firefox/addon/tampermonkey/`,violentmonkey:`https://addons.mozilla.org/firefox/addon/violentmonkey/`},edge:{tampermonkey:`https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepgglflondmnje`,violentmonkey:`https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjfgddacbcigncyclcoaebeent`},opera:{tampermonkey:`https://addons.opera.com/extensions/details/tampermonkey-beta/`},safari:{tampermonkey:`https://apps.apple.com/app/tampermonkey/id1482490089`}},b=null;function x(e={}){if(typeof document>`u`)return{host:null,close:()=>{}};b&&b.close();let{userscriptUrl:t=`https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.user.js`,learnMoreUrl:n=`https://github.com/SweetSea-ButImNotSweet/sremote/blob/main/packages/userscript/README.md`,learnMoreText:r=`Tại sao cần cài script này?`,title:i=`Yêu cầu SRemote Userscript`,description:a=`Trang web cần SRemote Userscript để tương tác và điều khiển media trong iframe cross-origin.`,autoDetect:o=!0,onClose:s=null,onSuccess:c=null}=e,l=v(),u=document.createElement(`div`);u.id=`sremote-install-modal-host`;let d=u.attachShadow({mode:`closed`}),f=document.createElement(`style`);f.textContent=_;let p=document.createElement(`dialog`),m=document.createElement(`div`);m.className=`sv-box sv-install-box`;let h=!1,g=null,x=!1,S=()=>{if(!h){h=!0,typeof window<`u`&&window.removeEventListener(`sremote:ready`,L);try{p.close()}catch{}u.remove(),b?.host===u&&(b=null),s?.({success:x})}};b={host:u,close:S};let C=document.createElement(`div`);C.className=`sv-install-header`;let w=document.createElement(`div`);w.className=`sv-install-title`,w.textContent=i;let T=document.createElement(`button`);if(T.className=`sv-install-close-btn`,T.innerHTML=`&times;`,T.title=`Đóng`,T.addEventListener(`click`,e=>{e.stopPropagation(),S()}),C.append(w,T),m.append(C),a||n){let e=document.createElement(`div`);if(e.className=`sv-text sv-install-desc`,a){let t=document.createElement(`span`);t.textContent=a,e.append(t)}if(n){let t=document.createElement(`a`);t.className=`sv-install-learn-more`,t.href=n,t.target=`_blank`,t.rel=`noopener noreferrer`,t.textContent=` ${r}`,e.append(t)}m.append(e)}g=document.createElement(`div`),g.className=`sv-status-banner waiting`,g.innerHTML=`
    <div class="sv-status-spinner"></div>
    <span>Chờ nhận diện Userscript...</span>
  `,m.append(g);let E=document.createElement(`div`);E.className=`sv-steps`;let D=document.createElement(`div`);D.className=`sv-step`;let O=y[l]||y.chrome,k=``;O.tampermonkey&&(k+=`<a class="sv-ext-link sv-ext-recommended" href="${O.tampermonkey}" target="_blank" rel="noopener noreferrer">Tampermonkey (${l})</a>`),O.violentmonkey&&(k+=`<a class="sv-ext-link" href="${O.violentmonkey}" target="_blank" rel="noopener noreferrer">Violentmonkey</a>`),D.innerHTML=`
    <div class="sv-step-num">1</div>
    <div class="sv-step-content">
      <div class="sv-step-title">Cài extension Userscript manager</div>
      <div>Chọn một extension phù hợp cho trình duyệt:</div>
      <div class="sv-extensions-list">
        ${k}
      </div>
    </div>
  `,E.append(D);let A=document.createElement(`div`);A.className=`sv-step`,A.innerHTML=`
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
  `,E.append(A);let j=document.createElement(`div`);j.className=`sv-step`,j.innerHTML=`
    <div class="sv-step-num">3</div>
    <div class="sv-step-content">
      <div class="sv-step-title">Xác nhận</div>
      <div>Sau khi bấm Cài đặt trong extension, quay lại trang này hoặc tải lại trang.</div>
    </div>
  `,E.append(j),m.append(E);let M=document.createElement(`div`);M.className=`sv-buttons`;let N=document.createElement(`button`);N.className=`sv-btn sv-btn-deny`,N.textContent=`Tải lại trang`,N.addEventListener(`click`,()=>{typeof window<`u`&&window.location.reload()});let P=document.createElement(`button`);P.className=`sv-btn sv-btn-primary`,P.textContent=`Đóng`,P.addEventListener(`click`,()=>{S()}),M.append(N,P),m.append(M),p.append(m),d.append(f,p),p.addEventListener(`cancel`,e=>{e.preventDefault(),S()});let F=()=>{let e=document.body||document.documentElement;e&&!u.isConnected&&e.appendChild(u)};F(),document.readyState===`loading`&&document.addEventListener(`DOMContentLoaded`,F,{once:!0});try{p.showModal()}catch{p.setAttribute(`open`,``)}function I(){x=!0,g&&(g.className=`sv-status-banner success`,g.innerHTML=`
        <span>✓</span>
        <span>Userscript đã được kích hoạt.</span>
      `),c?.()}function L(){I()}return o&&typeof window<`u`&&(window.sremote&&!window.sremote.isDummy?I():window.addEventListener(`sremote:ready`,L,{once:!0})),{host:u,close:S}}o();var S=class{constructor(e={}){o(),this.options={fallbackToDom:!0,timeout:2e3,passkey:null,...e},this.userscriptDriver=new s(this.options),this.domDriver=new g(this.options),this.mode=`detecting`,this._readyPromise=null,this.instances={list:e=>{if(this.userscriptDriver.isAvailable()){let t=this.userscriptDriver.getApi();return t?.instances?.list?t.instances.list(e||this.options.passkey):t?.list?.(e||this.options.passkey)||[]}return this.domDriver.list()},get:(e,t)=>this.status(e,t),capabilities:(e,t)=>this.capabilities(e,t),getIframe:(e,t)=>{if(this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();return n?.instances?.getIframe?n.instances.getIframe(e,t||this.options.passkey):n?.getIframe?.(e,t||this.options.passkey)||null}return null},assign:(e,t)=>this.userscriptDriver.assignId(e,t),setMultiMode:(e,t)=>{if(this.domDriver.setMultiMode(e),this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();n?.instances?.setMultiMode?n.instances.setMultiMode(e,t||this.options.passkey):n?.setMultiMode&&n.setMultiMode(e,t||this.options.passkey)}},isMultiMode:e=>{if(this.userscriptDriver.isAvailable()){let t=this.userscriptDriver.getApi();return t?.instances?.isMultiMode?t.instances.isMultiMode(e||this.options.passkey):!!t?.isMultiMode?.(e||this.options.passkey)}return this.domDriver.isMultiMode()},setExclusive:(e,t)=>{if(this.domDriver.setExclusive(e),this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();n?.instances?.setExclusive?n.instances.setExclusive(e,t||this.options.passkey):n?.setExclusive&&n.setExclusive(e,t||this.options.passkey)}},query:e=>{if(this.userscriptDriver.isAvailable()){let t=this.userscriptDriver.getApi();return t?.instances?.query?t.instances.query(e||this.options.passkey):t?.query?.(e||this.options.passkey)||[]}return this.domDriver.list()},note:(e,t)=>{if(this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();n?.instances?.note?n.instances.note(e,t||this.options.passkey):n?.note&&n.note(e,t||this.options.passkey)}}},this.adapters={register:(e,t,n)=>{let r=this.domDriver.useAdapter(e,t);if(this.userscriptDriver.isAvailable()){let r=this.userscriptDriver.getApi();return r?.adapters?.register?r.adapters.register(e,t,n||this.options.passkey):this.userscriptDriver.useAdapter(e,t,n)}return r},unregister:(e,t)=>{if(this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();return n?.adapters?.unregister?n.adapters.unregister(e,t||this.options.passkey):this.userscriptDriver.removeAdapter(e,t)}return this.domDriver.removeAdapter(e)},get:(e,t)=>{if(this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();return n?.adapters?.get?n.adapters.get(e,t||this.options.passkey):this.userscriptDriver.getCustomAdapter(e,t)}return this.domDriver.getCustomAdapter(e)}},this.rpc={call:(e,t,n,r)=>this.userscriptDriver.call(e,t,n,r),postMessage:(e,t,n,r,i)=>this.userscriptDriver.postWindowMessage(e,t,n,r,i),onMessage:(e,t)=>this.on(`iframe:message`,e,t)},this.css={set:(e,t,n)=>this.userscriptDriver.call(`setIframeCSS`,{css:e},t,n),get:(e,t)=>this.userscriptDriver.call(`getIframeCSS`,{},e,t),remove:(e,t)=>this.userscriptDriver.call(`removeIframeCSS`,{},e,t)}}isUserscriptAvailable(){return this.userscriptDriver.isAvailable()}syncAdaptersToUserscript(){if(this.userscriptDriver.isAvailable()){let e=this.userscriptDriver.getApi();for(let[t,n]of this.domDriver.adaptersMap.entries())e?.adapters?.register?e.adapters.register(n,t,this.options.passkey):this.userscriptDriver.useAdapter(n,t,this.options.passkey)}}async ready(){return this._readyPromise||=new Promise(e=>{if(this.userscriptDriver.isAvailable()){this.mode=`userscript`,this.syncAdaptersToUserscript(),e(this);return}let t=!1,n=()=>{t||(t=!0,this.mode=`userscript`,this.syncAdaptersToUserscript(),window.removeEventListener(`sremote:ready`,n),clearTimeout(r),e(this))};typeof window<`u`&&window.addEventListener(`sremote:ready`,n,{once:!0});let r=setTimeout(()=>{t||(t=!0,typeof window<`u`&&window.removeEventListener(`sremote:ready`,n),this.userscriptDriver.isAvailable()?(this.mode=`userscript`,this.syncAdaptersToUserscript()):this.mode=this.options.fallbackToDom?`dom-direct`:`unsupported`,e(this))},this.options.timeout)}),this._readyPromise}get activeDriver(){return this.mode===`userscript`||this.userscriptDriver.isAvailable()?this.userscriptDriver:this.mode===`dom-direct`||this.options.fallbackToDom?this.domDriver:null}async _exec(e,...t){await this.ready();let n=this.activeDriver;if(!n)throw Error(`[SRemote:Wrapper] No active driver available to execute ${e}()`);return n[e](...t)}async play(e,t){return this._exec(`play`,e,t)}async pause(e,t){return this._exec(`pause`,e,t)}async toggle(e,t){return this._exec(`toggle`,e,t)}async stop(e,t){return this._exec(`stop`,e,t)}async seek(e,t,n){return this._exec(`seek`,e,t,n)}async seekTo(e,t,n){return this._exec(`seekTo`,e,t,n)}async volume(e,t,n){return this._exec(`volume`,e,t,n)}async mute(e,t,n){return this._exec(`mute`,e,t,n)}async speed(e,t,n){return this._exec(`speed`,e,t,n)}async pip(e,t,n){return this._exec(`pip`,e,t,n)}async load(e,t,n){return this._exec(`load`,e,t,n)}async quality(e,t,n){return this._exec(`quality`,e,t,n)}async getQualities(e,t){return this._exec(`getQualities`,e,t)}async subtitle(e,t,n){return this._exec(`subtitle`,e,t,n)}async getSubtitles(e,t){return this._exec(`getSubtitles`,e,t)}async shuffle(e,t,n){return this._exec(`shuffle`,e,t,n)}async repeat(e,t,n){return this._exec(`repeat`,e,t,n)}async next(e,t){return this._exec(`next`,e,t)}async previous(e,t){return this._exec(`previous`,e,t)}status(e,t){return this.userscriptDriver.isAvailable()?this.userscriptDriver.status(e,t):null}capabilities(e,t){return this.userscriptDriver.isAvailable()?this.userscriptDriver.capabilities(e,t):this.domDriver?this.domDriver.getCapabilities(e):null}hello(e,t){if(this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();if(n&&typeof n.hello==`function`)return n.hello(e,t||this.options.passkey)}}bindMetadata(e,t,n){return this.userscriptDriver.bindMetadata(e,t,n)}emit(e,t){if(this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();if(n&&typeof n.emit==`function`)return n.emit(e,t)}if(this.domDriver&&typeof this.domDriver.emit==`function`)return this.domDriver.emit(e,t)}on(e,t,n){return this.userscriptDriver.isAvailable()?this.userscriptDriver.on(e,t,n):this.domDriver.on(e,t)}off(e,t){return this.userscriptDriver.isAvailable()?this.userscriptDriver.off(e,t):this.domDriver.off(e,t)}showInstallModal(e){return x(e)}};function C(e){return new S(e)}var w=new S;if(typeof globalThis<`u`)try{globalThis[Symbol.for(`__sremote_client__`)]=w}catch{}function T(e={}){let{name:t=`universal-adapter`,mediaElement:n=null,play:r,pause:i,toggle:a,stop:o,seek:s,seekTo:c,setCurrentTime:l,setVolume:u,setMuted:d,setPlaybackRate:f,setQuality:p,getQualities:m,setSubtitle:h,getSubtitles:g,setShuffle:_,setRepeat:v,next:y,previous:b,load:x,requestPip:S,getState:C}=e,w=1,T={paused:!0,currentTime:0,duration:null,volume:1,muted:!1,playbackRate:1,quality:`auto`,subtitle:null,shuffle:!1,repeat:`off`},E=!!(n&&(n.tagName===`AUDIO`||n.tagName===`VIDEO`||n instanceof HTMLMediaElement)),D=e=>typeof e==`function`,O={name:t,capabilities:{play:D(r)||E,pause:D(i)||E,toggle:D(a)||D(r)&&D(i)||E,stop:D(o)||D(i)||E,seek:D(s)||D(c)||D(l)||E,volume:D(u)||E,muted:D(d)||E,speed:D(f)||E,playbackRate:D(f)||E,pip:D(S)||E&&!!n.requestPictureInPicture,quality:D(p),subtitles:D(h)||D(g),shuffle:D(_),repeat:D(v),next:D(y),previous:D(b),load:D(x),hasAdapter:!0,hasNative:E,hasMediaSession:!1,...e.capabilities&&typeof e.capabilities==`object`?e.capabilities:{}},async play(){if(typeof r==`function`){let e=await r();return T.paused=!1,e}if(E){let e=await n.play();return T.paused=!1,e}},async pause(){if(typeof i==`function`){let e=await i();return T.paused=!0,e}E&&(n.pause(),T.paused=!0)},async toggle(){return typeof a==`function`?a():(typeof e.paused==`function`?e.paused():typeof e.paused==`boolean`?e.paused:E?n.paused:T.paused)?O.play():O.pause()},async stop(){if(typeof o==`function`)return o();await O.pause(),await O.seekTo?.(0)},async seek(e){if(typeof s==`function`)return s(e);let t=await O.getCurrentTime?.()??(E?n.currentTime:T.currentTime)??0;return O.seekTo?.(Math.max(0,t+e))},async seekTo(e){if(typeof c==`function`){let t=await c(e);return T.currentTime=e,t}if(typeof l==`function`){let t=await l(e);return T.currentTime=e,t}E&&(n.currentTime=Number(e),T.currentTime=Number(e))},async setCurrentTime(e){return O.seekTo(e)},async setVolume(e){let t=Math.max(0,Math.min(1,Number(e)));if(t>0&&(w=t),T.volume=t,T.muted=!1,E&&(n.volume=t,n.muted=!1),typeof u==`function`){let e=await u(t);if(typeof d==`function`)try{await d(!1)}catch{}return e}},async setMuted(e){let t=!!e;if(t){let e=E?n.volume:T.volume||1;e>0&&(w=e)}if(T.muted=t,E&&(n.muted=t,!t&&n.volume===0&&(n.volume=w||1)),typeof d==`function`){let e=await d(t);if(!t&&typeof u==`function`&&T.volume===0)try{await u(w||1),T.volume=w||1}catch{}return e}if(typeof u==`function`){let e=t?0:w||1;return T.volume=e,u(e)}},async setPlaybackRate(e){if(typeof f==`function`){let t=await f(e);return T.playbackRate=e,t}E&&(n.playbackRate=Number(e),T.playbackRate=Number(e))},async setQuality(e){if(typeof p==`function`){let t=await p(e);return T.quality=e,t}},async getQualities(){return typeof m==`function`?m():[]},async setSubtitle(e){if(typeof h==`function`){let t=await h(e);return T.subtitle=e,t}},async getSubtitles(){return typeof g==`function`?g():[]},async setShuffle(e){if(typeof _==`function`){let t=await _(e);return T.shuffle=!!e,t}},async setRepeat(e){if(typeof v==`function`){let t=await v(e);return T.repeat=e,t}},async next(){if(typeof y==`function`)return y()},async previous(){if(typeof b==`function`)return b()},async load(e){if(typeof x==`function`)return x(e)},async requestPip(e){if(typeof S==`function`)return S(e)},getState(){if(typeof C==`function`){let e=C();return typeof e==`object`&&e?{...T,...e}:T}return{...T}}};return O}return e.BaseDriver=t,e.DomDriver=g,e.SRemoteClient=S,e.UserscriptDriver=s,e.createSRemote=C,e.createUniversalAdapter=T,e.default=w,e.sremote=w,e.showInstallModal=x,e})({});
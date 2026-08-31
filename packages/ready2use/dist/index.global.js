var SRemoteReady2Use=(function(e){Object.defineProperties(e,{__esModule:{value:!0},[Symbol.toStringTag]:{value:`Module`}});var t=Object.defineProperty,n=(e,t,n)=>()=>{if(n)throw n[0];try{return e&&(t=e(e=0)),t}catch(e){throw n=[e],e}},r=(e,n)=>{let r={};for(var i in e)t(r,i,{get:e[i],enumerable:!0});return n||t(r,Symbol.toStringTag,{value:`Module`}),r};function i(e){return typeof document>`u`||!e?null:typeof e==`string`?document.querySelector(e):e&&e.nodeType===1?e:null}function a(e,t=`100%`,n=`100%`){let r=document.createElement(`div`);r.id=`sremote-temp-node-${e}`,r.style.width=typeof t==`number`?`${t}px`:t,r.style.height=typeof n==`number`?`${n}px`:n;let i=document.createElement(`div`);return i.style.display=`none`,i.appendChild(r),document.body&&document.body.appendChild(i),{hiddenWrapper:i,tempNode:r,cleanup:()=>{try{i.parentNode&&i.parentNode.removeChild(i)}catch{}}}}function o(e,t=`100%`,n=`100%`,r=null){e&&(r&&e.setAttribute(`data-sremote-id`,r),t!==void 0&&(e.style.width=typeof t==`number`?`${t}px`:t),n!==void 0&&(e.style.height=typeof n==`number`?`${n}px`:n))}var s=r({BaseDriver:()=>h,DomDriver:()=>y,SRemoteClient:()=>C,UserscriptDriver:()=>v,createDummyProxy:()=>c,createSRemote:()=>w,createSRemoteClient:()=>p,createUniversalAdapter:()=>m,isNativeSRemoteInstance:()=>l,lockGlobalSRemoteIfAbsent:()=>u,promptUserscript:()=>f,showInstallModal:()=>f,sremote:()=>T});function c(){return new Proxy({isDummy:!0,isUserscriptAvailable:()=>!1},{get(e,t){if(t in e)return e[t];if(typeof t!=`symbol`&&t!==`inspect`&&t!==`toJSON`)return(...e)=>{console.warn(`[SRemote:Wrapper] SRemote userscript is not installed. '${String(t)}()' cannot control cross-domain iframes.`)}},set(){return!0}})}function l(e){if(!e||typeof e!=`object`||e.isDummy)return!1;try{if(e.isSremoteNative===!0||e[Symbol.for(`__sremote_native__`)]===!0)return!0}catch{}return typeof e.play==`function`&&typeof e.useAdapter==`function`&&typeof e.assignId==`function`}function u(){if(!(typeof window>`u`)&&!(window.sremote&&l(window.sremote))){g||=c(),_||=g;try{let e=Object.getOwnPropertyDescriptor(window,`sremote`);if(e&&!e.configurable&&!e.set)return;Object.defineProperty(window,"sremote",{get(){return _},set(e){if(l(e)){_=e;try{Object.defineProperty(window,"sremote",{value:e,writable:!1,configurable:!1,enumerable:!0})}catch{}}else console.warn(`[SRemote:Wrapper] Blocked unauthorized attempt to overwrite window.sremote by external script.`)},configurable:!0,enumerable:!0})}catch{try{(!window.sremote||window.sremote.isDummy)&&(window.sremote=g)}catch{}}}}function d(){if(typeof navigator>`u`)return`chrome`;let e=navigator.userAgent.toLowerCase();return e.includes(`firefox`)?`firefox`:e.includes(`edg/`)?`edge`:e.includes(`opr/`)||e.includes(`opera/`)?`opera`:e.includes(`safari`)&&!e.includes(`chrome`)?`safari`:`chrome`}function f(e={}){if(typeof document>`u`)return{host:null,close:()=>{}};S&&S.close();let{userscriptUrl:t=`https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.user.js`,title:n=`Yêu cầu SRemote Userscript`,description:r=`Trang web cần SRemote Userscript để tương tác và điều khiển media trong iframe cross-origin.`,autoDetect:i=!0,onClose:a=null,onSuccess:o=null}=e,s=d(),c=document.createElement(`div`);c.id=`sremote-install-modal-host`;let l=c.attachShadow({mode:`closed`}),u=document.createElement(`style`);u.textContent=b;let f=document.createElement(`dialog`),p=document.createElement(`div`);p.className=`sv-box sv-install-box`;let m=!1,h=null,g=!1,_=()=>{if(!m){m=!0,typeof window<`u`&&window.removeEventListener(`sremote:ready`,F);try{f.close()}catch{}c.remove(),S?.host===c&&(S=null),a?.({success:g})}};S={host:c,close:_};let v=document.createElement(`div`);v.className=`sv-install-header`;let y=document.createElement(`div`);y.className=`sv-install-title`,y.textContent=n;let C=document.createElement(`button`);if(C.className=`sv-install-close-btn`,C.innerHTML=`&times;`,C.title=`Đóng`,C.addEventListener(`click`,e=>{e.stopPropagation(),_()}),v.append(y,C),p.append(v),r){let e=document.createElement(`div`);e.className=`sv-text`,e.textContent=r,p.append(e)}h=document.createElement(`div`),h.className=`sv-status-banner waiting`,h.innerHTML=`
    <div class="sv-status-spinner"></div>
    <span>Chờ nhận diện Userscript...</span>
  `,p.append(h);let w=document.createElement(`div`);w.className=`sv-steps`;let T=document.createElement(`div`);T.className=`sv-step`;let E=x[s]||x.chrome,D=``;E.tampermonkey&&(D+=`<a class="sv-ext-link sv-ext-recommended" href="${E.tampermonkey}" target="_blank" rel="noopener noreferrer">Tampermonkey (${s})</a>`),E.violentmonkey&&(D+=`<a class="sv-ext-link" href="${E.violentmonkey}" target="_blank" rel="noopener noreferrer">Violentmonkey</a>`),T.innerHTML=`
    <div class="sv-step-num">1</div>
    <div class="sv-step-content">
      <div class="sv-step-title">Cài extension Userscript manager</div>
      <div>Chọn một extension phù hợp cho trình duyệt:</div>
      <div class="sv-extensions-list">
        ${D}
      </div>
    </div>
  `,w.append(T);let O=document.createElement(`div`);O.className=`sv-step`,O.innerHTML=`
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
  `,w.append(O);let k=document.createElement(`div`);k.className=`sv-step`,k.innerHTML=`
    <div class="sv-step-num">3</div>
    <div class="sv-step-content">
      <div class="sv-step-title">Xác nhận</div>
      <div>Sau khi bấm Cài đặt trong extension, quay lại trang này hoặc tải lại trang.</div>
    </div>
  `,w.append(k),p.append(w);let A=document.createElement(`div`);A.className=`sv-buttons`;let j=document.createElement(`button`);j.className=`sv-btn sv-btn-deny`,j.textContent=`Tải lại trang`,j.addEventListener(`click`,()=>{typeof window<`u`&&window.location.reload()});let M=document.createElement(`button`);M.className=`sv-btn sv-btn-primary`,M.textContent=`Đóng`,M.addEventListener(`click`,()=>{_()}),A.append(j,M),p.append(A),f.append(p),l.append(u,f),f.addEventListener(`cancel`,e=>{e.preventDefault(),_()});let N=()=>{let e=document.body||document.documentElement;e&&!c.isConnected&&e.appendChild(c)};N(),document.readyState===`loading`&&document.addEventListener(`DOMContentLoaded`,N,{once:!0});try{f.showModal()}catch{f.setAttribute(`open`,``)}function P(){g=!0,h&&(h.className=`sv-status-banner success`,h.innerHTML=`
        <span>✓</span>
        <span>Userscript đã được kích hoạt.</span>
      `),o?.()}function F(){P()}return i&&typeof window<`u`&&(window.sremote&&!window.sremote.isDummy?P():window.addEventListener(`sremote:ready`,F,{once:!0})),{host:c,close:_}}function p(e){return new C(e)}function m(e={}){let{name:t=`universal-adapter`,play:n,pause:r,toggle:i,stop:a,seek:o,seekTo:s,setCurrentTime:c,setVolume:l,setMuted:u,setPlaybackRate:d,setQuality:f,getQualities:p,setSubtitle:m,getSubtitles:h,setShuffle:g,setRepeat:_,next:v,previous:y,load:b,requestPip:x,getState:S}=e,C={paused:!0,currentTime:0,duration:null,volume:1,muted:!1,playbackRate:1,quality:`auto`,subtitle:null,shuffle:!1,repeat:`off`},w=e=>typeof e==`function`,T={name:t,capabilities:{play:w(n),pause:w(r),toggle:w(i)||w(n)&&w(r),stop:w(a)||w(r),seek:w(o)||w(s)||w(c),volume:w(l),muted:w(u),speed:w(d),playbackRate:w(d),pip:w(x),quality:w(f),subtitles:w(m)||w(h),shuffle:w(g),repeat:w(_),next:w(v),previous:w(y),load:w(b),hasAdapter:!0,hasNative:!1,hasMediaSession:!1,...e.capabilities&&typeof e.capabilities==`object`?e.capabilities:{}},async play(){if(typeof n==`function`){let e=await n();return C.paused=!1,e}},async pause(){if(typeof r==`function`){let e=await r();return C.paused=!0,e}},async toggle(){return typeof i==`function`?i():(T.paused?typeof T.paused==`function`?T.paused():T.paused:C.paused)?T.play():T.pause()},async stop(){if(typeof a==`function`)return a();await T.pause(),await T.seekTo?.(0)},async seek(e){if(typeof o==`function`)return o(e);let t=await T.getCurrentTime?.()??C.currentTime??0;return T.seekTo?.(Math.max(0,t+e))},async seekTo(e){if(typeof s==`function`){let t=await s(e);return C.currentTime=e,t}if(typeof c==`function`){let t=await c(e);return C.currentTime=e,t}},async setCurrentTime(e){return T.seekTo(e)},async setVolume(e){if(typeof l==`function`){let t=await l(e);return C.volume=e,t}},async setMuted(e){if(typeof u==`function`){let t=await u(e);return C.muted=!!e,t}},async setPlaybackRate(e){if(typeof d==`function`){let t=await d(e);return C.playbackRate=e,t}},async setQuality(e){if(typeof f==`function`){let t=await f(e);return C.quality=e,t}},async getQualities(){return typeof p==`function`?p():[]},async setSubtitle(e){if(typeof m==`function`){let t=await m(e);return C.subtitle=e,t}},async getSubtitles(){return typeof h==`function`?h():[]},async setShuffle(e){if(typeof g==`function`){let t=await g(e);return C.shuffle=!!e,t}},async setRepeat(e){if(typeof _==`function`){let t=await _(e);return C.repeat=e,t}},async next(){if(typeof v==`function`)return v()},async previous(){if(typeof y==`function`)return y()},async load(e){if(typeof b==`function`)return b(e)},async requestPip(e){if(typeof x==`function`)return x(e)},getState(){if(typeof S==`function`){let e=S();return typeof e==`object`&&e?{...C,...e}:C}return{...C}}};return T}var h,g,_,v,y,b,x,S,C,w,T,E=n((()=>{h=class{constructor(e={}){this.options={passkey:null,...e}}getPasskey(e){return e||this.options.passkey||null}async play(e,t){throw Error(`[BaseDriver] play() must be implemented by driver`)}async pause(e,t){throw Error(`[BaseDriver] pause() must be implemented by driver`)}async toggle(e,t){throw Error(`[BaseDriver] toggle() must be implemented by driver`)}async stop(e,t){throw Error(`[BaseDriver] stop() must be implemented by driver`)}async seek(e,t,n){throw Error(`[BaseDriver] seek() must be implemented by driver`)}async seekTo(e,t,n){throw Error(`[BaseDriver] seekTo() must be implemented by driver`)}async volume(e,t,n){throw Error(`[BaseDriver] volume() must be implemented by driver`)}async mute(e,t,n){throw Error(`[BaseDriver] mute() must be implemented by driver`)}async speed(e,t,n){throw Error(`[BaseDriver] speed() must be implemented by driver`)}async playbackRate(e,t,n){return this.speed(e,t,n)}async pip(e,t,n){throw Error(`[BaseDriver] pip() must be implemented by driver`)}async load(e,t,n){throw Error(`[BaseDriver] load() must be implemented by driver`)}useAdapter(e,t,n){throw Error(`[BaseDriver] useAdapter() must be implemented by driver`)}removeAdapter(e,t){throw Error(`[BaseDriver] removeAdapter() must be implemented by driver`)}getCustomAdapter(e,t){throw Error(`[BaseDriver] getCustomAdapter() must be implemented by driver`)}on(e,t,n){throw Error(`[BaseDriver] on() must be implemented by driver`)}off(e,t){throw Error(`[BaseDriver] off() must be implemented by driver`)}},g=null,_=null,v=class extends h{isAvailable(){return typeof window>`u`?!1:l(window.SRemote||window.sremote)}getApi(e=!1){if(typeof window>`u`){if(e)throw Error(`[SRemote:Wrapper] SRemote Userscript not detected`);return null}let t=window.SRemote||window.sremote||null,n=l(t)?t:null;if(e&&!n)throw Error(`[SRemote:Wrapper] SRemote Userscript not detected`);return n}_callRequired(e,...t){let n=this.getApi(!0),r=n[e];if(typeof r!=`function`)throw Error(`[SRemote:Wrapper] Method '${e}' not supported by userscript`);return r.call(n,...t)}_callOptional(e,t,...n){let r=this.getApi();return!r||typeof r[e]!=`function`?t:r[e](...n)}async play(e,t){return this._callRequired(`play`,e,this.getPasskey(t))}async pause(e,t){return this._callRequired(`pause`,e,this.getPasskey(t))}async toggle(e,t){return this._callRequired(`toggle`,e,this.getPasskey(t))}async stop(e,t){return this._callRequired(`stop`,e,this.getPasskey(t))}async seek(e,t,n){return this._callRequired(`seek`,e,t,this.getPasskey(n))}async seekTo(e,t,n){return this._callRequired(`seekTo`,e,t,this.getPasskey(n))}async volume(e,t,n){return this._callRequired(`volume`,e,t,this.getPasskey(n))}async mute(e,t,n){return this._callRequired(`mute`,e,t,this.getPasskey(n))}async speed(e,t,n){let r=this.getApi(!0),i=this.getPasskey(n);return typeof r.speed==`function`?r.speed(e,t,i):r.playbackRate(e,t,i)}async pip(e,t,n){return this._callRequired(`pip`,e,t,this.getPasskey(n))}async load(e,t,n){return this._callRequired(`load`,e,t,this.getPasskey(n))}async quality(e,t,n){return this._callOptional(`quality`,void 0,e,t,this.getPasskey(n))}async getQualities(e,t){return this._callOptional(`getQualities`,[],e,this.getPasskey(t))}async subtitle(e,t,n){return this._callOptional(`subtitle`,void 0,e,t,this.getPasskey(n))}async getSubtitles(e,t){return this._callOptional(`getSubtitles`,[],e,this.getPasskey(t))}async shuffle(e,t,n){return this._callOptional(`shuffle`,void 0,e,t,this.getPasskey(n))}async repeat(e,t,n){return this._callOptional(`repeat`,void 0,e,t,this.getPasskey(n))}async next(e,t){let n=this.getApi(),r=this.getPasskey(t);return n&&typeof n.next==`function`?n.next(e,r):this._callOptional(`nexttrack`,void 0,e,r)}async previous(e,t){let n=this.getApi(),r=this.getPasskey(t);return n&&typeof n.previous==`function`?n.previous(e,r):this._callOptional(`previoustrack`,void 0,e,r)}assignId(e,t){return this._callOptional(`assignId`,!1,e,t)}getIframe(e,t){return this._callOptional(`getIframe`,null,e,this.getPasskey(t))}useAdapter(e,t,n){return this._callOptional(`useAdapter`,null,e,t,this.getPasskey(n))}removeAdapter(e,t){return this._callOptional(`removeAdapter`,!1,e,this.getPasskey(t))}getCustomAdapter(e,t){return this._callOptional(`getCustomAdapter`,null,e,this.getPasskey(t))}list(e){return this._callOptional(`list`,[],this.getPasskey(e))}status(e,t){return this._callOptional(`status`,null,e,this.getPasskey(t))}capabilities(e,t){let n=this.getApi(),r=this.getPasskey(t);return n&&typeof n.capabilities==`function`?n.capabilities(e,r):n?.instances&&typeof n.instances.capabilities==`function`?n.instances.capabilities(e,r):n&&typeof n.getCapabilities==`function`?n.getCapabilities(e,r):null}bindMediaSession(e,t){return this._callOptional(`bindMediaSession`,void 0,e,this.getPasskey(t))}bindMetadata(e,t,n){return this._callOptional(`bindMetadata`,void 0,e,t,this.getPasskey(n))}setMultiMode(e,t){return this._callOptional(`setMultiMode`,void 0,e,this.getPasskey(t))}isMultiMode(e){return this._callOptional(`isMultiMode`,!1,this.getPasskey(e))}setExclusive(e,t){return this._callOptional(`setExclusive`,void 0,e,this.getPasskey(t))}query(e){return this._callOptional(`query`,[],this.getPasskey(e))}call(e,t,n,r){return this._callRequired(`call`,e,t,n,this.getPasskey(r))}postWindowMessage(e,t=`*`,n=null,r=`parent`,i=null){return this._callOptional(`postWindowMessage`,!1,e,t,n,r,this.getPasskey(i))}on(e,t,n){let r=this.getApi();if(r&&typeof r.on==`function`)return r.on(e,t,this.getPasskey(n));let i=e.startsWith(`sremote:`)?e:`sremote:${e}`,a=e=>t(e.detail);return window.addEventListener(i,a),()=>window.removeEventListener(i,a)}off(e,t){let n=this.getApi();if(n&&typeof n.off==`function`)return n.off(e,t);let r=e.startsWith(`sremote:`)?e:`sremote:${e}`;window.removeEventListener(r,t)}},y=class extends h{constructor(e={}){super(e),this.adaptersMap=new Map,this.eventListeners=new Map}useAdapter(e,t=null){if(!e||typeof e!=`object`)return null;let n=t||`adapter-${Math.random().toString(36).slice(2,9)}`;return this.adaptersMap.set(n,e),n}removeAdapter(e){return e?this.adaptersMap.delete(e):!1}getCustomAdapter(e){return e?this.adaptersMap.get(e)||null:this.adaptersMap.values().next().value||null}resolveTarget(e){if(typeof e==`string`&&this.adaptersMap.has(e))return{type:`adapter`,instance:this.adaptersMap.get(e)};if(!e&&this.adaptersMap.size>0)return{type:`adapter`,instance:this.adaptersMap.values().next().value};let t=this.resolveMediaElement(e);return t?{type:`element`,instance:t}:this.adaptersMap.size>0?{type:`adapter`,instance:this.adaptersMap.values().next().value}:null}resolveMediaElement(e){if(typeof document>`u`)return null;if(!e)return document.querySelector(`video, audio`);if(typeof e==`string`){let t=document.querySelector(e);if(!t)return null;if(t.tagName===`VIDEO`||t.tagName===`AUDIO`)return t;if(t.tagName===`IFRAME`)try{return t.contentDocument?.querySelector(`video, audio`)||null}catch{return null}return t.querySelector(`video, audio`)}if(e.nodeType===1){if(e.tagName===`VIDEO`||e.tagName===`AUDIO`)return e;if(e.tagName===`IFRAME`)try{return e.contentDocument?.querySelector(`video, audio`)||null}catch{return null}return e.querySelector(`video, audio`)}return null}async play(e){let t=this.resolveTarget(e);if(!t)throw Error(`[SRemote:DomDriver] Media target not found`);return t.type===`adapter`?t.instance.play?.():t.instance.play()}async pause(e){let t=this.resolveTarget(e);if(!t)throw Error(`[SRemote:DomDriver] Media target not found`);if(t.type===`adapter`)return t.instance.pause?.();t.instance.pause()}async toggle(e){let t=this.resolveTarget(e);if(!t)throw Error(`[SRemote:DomDriver] Media target not found`);if(t.type===`adapter`)return typeof t.instance.toggle==`function`?t.instance.toggle():(typeof t.instance.paused==`function`?t.instance.paused():t.instance.paused)?t.instance.play?.():t.instance.pause?.();let n=t.instance;if(n.paused)return n.play();n.pause()}async stop(e){let t=this.resolveTarget(e);if(!t)throw Error(`[SRemote:DomDriver] Media target not found`);if(t.type===`adapter`)return t.instance.stop?.();let n=t.instance;n.pause(),n.currentTime=0}async seek(e,t){let n=this.resolveTarget(t);if(!n)throw Error(`[SRemote:DomDriver] Media target not found`);if(n.type===`adapter`){if(typeof n.instance.seek==`function`)return n.instance.seek(e);let t=n.instance.getCurrentTime?.()||0;return n.instance.setCurrentTime?.(t+e)}let r=n.instance;r.currentTime=Math.max(0,Math.min(r.duration||0,r.currentTime+e))}async seekTo(e,t){let n=this.resolveTarget(t);if(!n)throw Error(`[SRemote:DomDriver] Media target not found`);if(n.type===`adapter`)return typeof n.instance.seekTo==`function`?n.instance.seekTo(e):n.instance.setCurrentTime?.(e);let r=n.instance;r.currentTime=Math.max(0,Math.min(r.duration||0,e))}async volume(e,t){let n=this.resolveTarget(t);if(!n)throw Error(`[SRemote:DomDriver] Media target not found`);if(n.type===`adapter`)return n.instance.setVolume?.(e);let r=n.instance;r.volume=Math.max(0,Math.min(1,e))}async mute(e,t){let n=this.resolveTarget(t);if(!n)throw Error(`[SRemote:DomDriver] Media target not found`);if(n.type===`adapter`)return n.instance.setMuted?.(e);let r=n.instance;r.muted=typeof e==`boolean`?e:!r.muted}async speed(e,t){let n=this.resolveTarget(t);if(!n)throw Error(`[SRemote:DomDriver] Media target not found`);if(n.type===`adapter`)return n.instance.setPlaybackRate?.(e);n.instance.playbackRate=e}async pip(e,t){let n=this.resolveTarget(t);if(!n)throw Error(`[SRemote:DomDriver] Media target not found`);if(n.type===`adapter`)return n.instance.requestPip?.(e);let r=n.instance;if(!r||r.tagName!==`VIDEO`)throw Error(`[SRemote:DomDriver] Video element not found`);if(e===!0||e===void 0&&document.pictureInPictureElement!==r)return r.requestPictureInPicture?.();if(document.pictureInPictureElement===r)return document.exitPictureInPicture?.()}async load(e,t){let n=this.resolveTarget(t);if(!n)throw Error(`[SRemote:DomDriver] Media target not found`);if(n.type===`adapter`){if(typeof n.instance.load==`function`)return n.instance.load(e);console.warn(`[SRemote] load() is primarily designed for custom adapters and is not implemented by default. Implement it via sremote.useAdapter().`);return}let r=n.instance;typeof e==`string`&&e?(r.src=e,typeof r.load==`function`&&r.load()):console.warn(`[SRemote] load() is primarily designed for custom adapters and is not implemented by default. Implement it via sremote.useAdapter().`)}async quality(e,t){let n=this.resolveTarget(t);if(n&&n.type===`adapter`)return n.instance.setQuality?.(e)}async getQualities(e){let t=this.resolveTarget(e);return t&&t.type===`adapter`&&t.instance.getQualities?.()||[]}async subtitle(e,t){let n=this.resolveTarget(t);if(!n)return;if(n.type===`adapter`)return n.instance.setSubtitle?.(e);let r=n.instance;if(r?.textTracks){let t=e===null||e===`off`||e===!1?null:String(e).toLowerCase();for(let e=0;e<r.textTracks.length;e++){let n=r.textTracks[e];n.mode=t&&(n.id===t||n.language&&n.language.toLowerCase()===t||n.label&&n.label.toLowerCase()===t)?`showing`:`disabled`}}}async getSubtitles(e){let t=this.resolveTarget(e);if(!t)return[];if(t.type===`adapter`)return t.instance.getSubtitles?.()||[];let n=t.instance;if(n?.textTracks){let e=[];for(let t=0;t<n.textTracks.length;t++){let r=n.textTracks[t];e.push({id:r.id||String(t),label:r.label||r.language||`Track ${t+1}`,language:r.language})}return e}return[]}async shuffle(e,t){let n=this.resolveTarget(t);if(n&&n.type===`adapter`)return n.instance.setShuffle?.(e)}async repeat(e,t){let n=this.resolveTarget(t);if(!n)return;if(n.type===`adapter`)return n.instance.setRepeat?.(e);let r=n.instance;r&&(r.loop=typeof e==`string`?e===`one`||e===`all`:typeof e==`boolean`?e:!r.loop)}async next(e){let t=this.resolveTarget(e);if(t&&t.type===`adapter`)return t.instance.next?.()}getCapabilities(e){let t=this.resolveTarget(e);if(!t)return null;if(t.type===`adapter`){let e=t.instance;if(e.capabilities&&typeof e.capabilities==`object`)return{...e.capabilities,hasAdapter:!0,hasNative:!1,hasMediaSession:!1};let n=t=>typeof e[t]==`function`;return{play:n(`play`),pause:n(`pause`),toggle:n(`toggle`)||n(`play`)&&n(`pause`),stop:n(`stop`)||n(`pause`),seek:n(`seek`)||n(`seekTo`)||n(`setCurrentTime`),volume:n(`setVolume`),muted:n(`setMuted`),speed:n(`setPlaybackRate`),playbackRate:n(`setPlaybackRate`),pip:n(`requestPip`)||n(`pip`),quality:n(`setQuality`),subtitles:n(`setSubtitle`)||n(`getSubtitles`),shuffle:n(`setShuffle`),repeat:n(`setRepeat`),next:n(`next`),previous:n(`previous`),load:n(`load`),hasAdapter:!0,hasNative:!1,hasMediaSession:!1}}let n=t.instance,r=!!(n&&n.tagName===`VIDEO`),i=!!(n&&n.tagName===`AUDIO`),a=r||i;return{play:a,pause:a,toggle:a,stop:a,seek:a,volume:a,muted:a,speed:a,playbackRate:a,pip:r&&typeof document<`u`&&!!(document.pictureInPictureEnabled||n.requestPictureInPicture),quality:!1,subtitles:!!(a&&n.textTracks&&n.textTracks.length>0),shuffle:!1,repeat:a,next:!1,previous:!1,load:a,hasAdapter:!1,hasNative:a,hasMediaSession:!1}}emit(e,t){let n=e.startsWith(`sremote:`)?e:`sremote:${e}`,r=e.replace(/^sremote:/,``),i=e=>{let n=this.eventListeners.get(e);if(n)for(let[e]of n)try{e(t)}catch{}};i(n),i(r),i(`*`)}on(e,t){if(typeof document>`u`||typeof t!=`function`)return()=>{};let n=e.replace(/^sremote:/,``),r=e=>{let n=e.target;n&&t({instanceId:`dom-media`,currentTime:n.currentTime,duration:n.duration,volume:n.volume,muted:n.muted,playbackRate:n.playbackRate,speed:n.playbackRate,state:n.paused?`paused`:`playing`})};return this.eventListeners.has(e)||this.eventListeners.set(e,new Map),this.eventListeners.get(e).set(t,{domEventName:n,listener:r}),document.addEventListener(n,r,!0),()=>this.off(e,t)}off(e,t){if(typeof document>`u`)return;let n=this.eventListeners.get(e);if(n){if(t){let e=n.get(t);e&&(document.removeEventListener(e.domEventName,e.listener,!0),n.delete(t))}else{for(let[,e]of n)document.removeEventListener(e.domEventName,e.listener,!0);this.eventListeners.delete(e)}}}},b=`:host {\r
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
`,x={chrome:{tampermonkey:`https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkmingnoiobeogfiigjmhednnj`,violentmonkey:`https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag`},firefox:{tampermonkey:`https://addons.mozilla.org/firefox/addon/tampermonkey/`,violentmonkey:`https://addons.mozilla.org/firefox/addon/violentmonkey/`},edge:{tampermonkey:`https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepgglflondmnje`,violentmonkey:`https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjfgddacbcigncyclcoaebeent`},opera:{tampermonkey:`https://addons.opera.com/extensions/details/tampermonkey-beta/`},safari:{tampermonkey:`https://apps.apple.com/app/tampermonkey/id1482490089`}},S=null,u(),C=class{constructor(e={}){u(),this.options={fallbackToDom:!0,timeout:2e3,passkey:null,...e},this.userscriptDriver=new v(this.options),this.domDriver=new y(this.options),this.mode=`detecting`,this._readyPromise=null,this.instances={list:e=>{if(this.userscriptDriver.isAvailable()){let t=this.userscriptDriver.getApi();return t?.instances?.list?t.instances.list(e||this.options.passkey):t?.list?.(e||this.options.passkey)||[]}return[]},get:(e,t)=>this.status(e,t),capabilities:(e,t)=>this.capabilities(e,t),getCapabilities:(e,t)=>this.capabilities(e,t),getIframe:(e,t)=>{if(this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();return n?.instances?.getIframe?n.instances.getIframe(e,t||this.options.passkey):n?.getIframe?.(e,t||this.options.passkey)||null}return null},assign:(e,t)=>this.userscriptDriver.assignId(e,t),setMultiMode:(e,t)=>{if(this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();n?.instances?.setMultiMode?n.instances.setMultiMode(e,t||this.options.passkey):n?.setMultiMode&&n.setMultiMode(e,t||this.options.passkey)}},isMultiMode:e=>{if(this.userscriptDriver.isAvailable()){let t=this.userscriptDriver.getApi();return t?.instances?.isMultiMode?t.instances.isMultiMode(e||this.options.passkey):!!t?.isMultiMode?.(e||this.options.passkey)}return!1},setExclusive:(e,t)=>{if(this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();n?.instances?.setExclusive?n.instances.setExclusive(e,t||this.options.passkey):n?.setExclusive&&n.setExclusive(e,t||this.options.passkey)}},query:e=>{if(this.userscriptDriver.isAvailable()){let t=this.userscriptDriver.getApi();return t?.instances?.query?t.instances.query(e||this.options.passkey):t?.query?.(e||this.options.passkey)||[]}return[]},note:(e,t)=>{if(this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();n?.instances?.note?n.instances.note(e,t||this.options.passkey):n?.note&&n.note(e,t||this.options.passkey)}}},this.adapters={register:(e,t,n)=>{if(this.userscriptDriver.isAvailable()){let r=this.userscriptDriver.getApi();return r?.adapters?.register?r.adapters.register(e,t,n||this.options.passkey):r?.adapters?.set?r.adapters.set(e,t,n||this.options.passkey):this.userscriptDriver.useAdapter(e,t,n)}return this.domDriver.useAdapter(e,t)},set:(e,t,n)=>this.adapters.register(e,t,n),unregister:(e,t)=>{if(this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();return n?.adapters?.unregister?n.adapters.unregister(e,t||this.options.passkey):this.userscriptDriver.removeAdapter(e,t)}return this.domDriver.removeAdapter(e)},get:(e,t)=>{if(this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();return n?.adapters?.get?n.adapters.get(e,t||this.options.passkey):this.userscriptDriver.getCustomAdapter(e,t)}return this.domDriver.getCustomAdapter(e)}},this.rpc={call:(e,t,n,r)=>this.userscriptDriver.call(e,t,n,r),postMessage:(e,t,n,r,i)=>this.userscriptDriver.postWindowMessage(e,t,n,r,i),onMessage:(e,t)=>this.on(`iframe:message`,e,t)},this.css={set:(e,t,n)=>this.userscriptDriver.call(`setIframeCSS`,{css:e},t,n),get:(e,t)=>this.userscriptDriver.call(`getIframeCSS`,{},e,t),remove:(e,t)=>this.userscriptDriver.call(`removeIframeCSS`,{},e,t)}}isUserscriptAvailable(){return this.userscriptDriver.isAvailable()}async ready(){return this._readyPromise||=new Promise(e=>{if(this.userscriptDriver.isAvailable()){this.mode=`userscript`,e(this);return}let t=!1,n=()=>{t||(t=!0,this.mode=`userscript`,window.removeEventListener(`sremote:ready`,n),clearTimeout(r),e(this))};typeof window<`u`&&window.addEventListener(`sremote:ready`,n,{once:!0});let r=setTimeout(()=>{t||(t=!0,typeof window<`u`&&window.removeEventListener(`sremote:ready`,n),this.mode=this.userscriptDriver.isAvailable()?`userscript`:this.options.fallbackToDom?`dom-direct`:`unsupported`,e(this))},this.options.timeout)}),this._readyPromise}get activeDriver(){return this.mode===`userscript`||this.userscriptDriver.isAvailable()?this.userscriptDriver:this.mode===`dom-direct`||this.options.fallbackToDom?this.domDriver:null}async _exec(e,...t){await this.ready();let n=this.activeDriver;if(!n)throw Error(`[SRemote:Wrapper] No active driver available to execute ${e}()`);return n[e](...t)}async play(e,t){return this._exec(`play`,e,t)}async pause(e,t){return this._exec(`pause`,e,t)}async toggle(e,t){return this._exec(`toggle`,e,t)}async stop(e,t){return this._exec(`stop`,e,t)}async seek(e,t,n){return this._exec(`seek`,e,t,n)}async seekTo(e,t,n){return this._exec(`seekTo`,e,t,n)}async volume(e,t,n){return this._exec(`volume`,e,t,n)}async mute(e,t,n){return this._exec(`mute`,e,t,n)}async rate(e,t,n){return this._exec(`speed`,e,t,n)}async speed(e,t,n){return this._exec(`speed`,e,t,n)}async playbackRate(e,t,n){return this._exec(`speed`,e,t,n)}async pip(e,t,n){return this._exec(`pip`,e,t,n)}async load(e,t,n){return this._exec(`load`,e,t,n)}async quality(e,t,n){return this._exec(`quality`,e,t,n)}async getQualities(e,t){return this._exec(`getQualities`,e,t)}async subtitle(e,t,n){return this._exec(`subtitle`,e,t,n)}async getSubtitles(e,t){return this._exec(`getSubtitles`,e,t)}async shuffle(e,t,n){return this._exec(`shuffle`,e,t,n)}async repeat(e,t,n){return this._exec(`repeat`,e,t,n)}async next(e,t){return this._exec(`next`,e,t)}async previous(e,t){return this._exec(`previous`,e,t)}status(e,t){return this.userscriptDriver.isAvailable()?this.userscriptDriver.status(e,t):null}capabilities(e,t){return this.userscriptDriver.isAvailable()?this.userscriptDriver.capabilities(e,t):this.domDriver?this.domDriver.getCapabilities(e):null}getCapabilities(e,t){return this.capabilities(e,t)}useAdapter(e,t,n){return this.adapters.register(e,t,n)}removeAdapter(e,t){return this.adapters.unregister(e,t)}getCustomAdapter(e,t){return this.adapters.get(e,t)}hello(e,t){if(this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();if(n&&typeof n.hello==`function`)return n.hello(e,t||this.options.passkey)}}bindMediaSession(e,t){return this.userscriptDriver.bindMediaSession(e,t)}bindMetadata(e,t,n){return this.userscriptDriver.bindMetadata(e,t,n)}emit(e,t){if(this.userscriptDriver.isAvailable()){let n=this.userscriptDriver.getApi();if(n&&typeof n.emit==`function`)return n.emit(e,t)}if(this.domDriver&&typeof this.domDriver.emit==`function`)return this.domDriver.emit(e,t)}on(e,t,n){return this.userscriptDriver.isAvailable()?this.userscriptDriver.on(e,t,n):this.domDriver.on(e,t)}off(e,t){return this.userscriptDriver.isAvailable()?this.userscriptDriver.off(e,t):this.domDriver.off(e,t)}showInstallModal(e){return f(e)}promptUserscript(e){return f(e)}},w=p,T=new C})),D=0,O=null;async function k(e={}){if(e.sremote&&typeof e.sremote==`object`&&e.sremote.adapters)return e.sremote;if(typeof window<`u`&&window.sremote&&window.sremote.adapters)return window.sremote;if(typeof globalThis<`u`&&globalThis.sremote&&globalThis.sremote.adapters)return globalThis.sremote;if(O)return O;try{let e=await Promise.resolve().then(()=>(E(),s));return O=e?.sremote||e?.default?.sremote||e?.default||null,O}catch{return null}}var A=class{constructor(e){this.name=e||`generic-provider`}async loadSdk(){return Promise.resolve()}generateInstanceId(e){return e&&typeof e==`string`?e.trim():`${this.name}-player-${++D}-${Math.random().toString(36).slice(2,7)}`}async initPlayer(e,t){throw Error(`[${this.constructor.name}] initPlayer() must be implemented by subclass`)}createAdapter(e,t){throw Error(`[${this.constructor.name}] createAdapter() must be implemented by subclass`)}getCapabilities(e=null){if(e&&e.capabilities&&typeof e.capabilities==`object`)return{...e.capabilities};let t=t=>!!(e&&typeof e[t]==`function`);return{play:t(`play`),pause:t(`pause`),toggle:t(`toggle`)||t(`play`)&&t(`pause`),stop:t(`stop`)||t(`pause`),seek:t(`seek`)||t(`seekTo`)||t(`setCurrentTime`),volume:t(`setVolume`),muted:t(`setMuted`),speed:t(`setPlaybackRate`),playbackRate:t(`setPlaybackRate`),pip:t(`requestPip`)||t(`pip`),quality:t(`setQuality`),subtitles:t(`setSubtitle`)||t(`getSubtitles`),shuffle:t(`setShuffle`),repeat:t(`setRepeat`),next:t(`next`),previous:t(`previous`),load:t(`load`),hasAdapter:!0,hasNative:!1,hasMediaSession:!1}}async create(e={}){let t=typeof e==`string`?{videoId:e}:{...e},n=this.generateInstanceId(t.instanceId);await this.loadSdk();let{player:r,element:i,iframe:a,destroy:o}=await this.initPlayer(t,n),s=a||i,c=this.createAdapter(r,{options:t,instanceId:n,element:s,iframe:a||(s?.tagName===`IFRAME`?s:null)})||{};typeof c.toggle!=`function`&&typeof c.play==`function`&&typeof c.pause==`function`&&(c.toggle=function(){(typeof c.paused==`function`?c.paused():typeof c.paused!=`boolean`||c.paused)?c.play():c.pause()});let l=this.getCapabilities(c);return c&&!c.capabilities&&(c.capabilities=l),{element:s,iframe:a||(s?.tagName===`IFRAME`?s:null),adapter:c,player:r,instanceId:n,capabilities:l,destroy:()=>{try{typeof c?.destroy==`function`&&c.destroy()}catch{}try{typeof o==`function`?o():r&&typeof r.destroy==`function`&&r.destroy()}catch{}try{s&&s.parentNode&&s.parentNode.removeChild(s)}catch{}}}}async mount(e,t={}){let n=i(e);if(!n)throw Error(`[SRemote:${this.name}] Target container '${e}' not found in DOM`);let r=await this.create(t);n.appendChild(r.element);let a=await k(typeof t==`string`?{}:t);return a?.adapters&&a.adapters.register(r.adapter,r.instanceId),{...r,destroy:()=>{try{a?.adapters&&a.adapters.unregister(r.instanceId)}catch{}r.destroy()}}}},j=new Map;function M(e){if(typeof window>`u`)return Promise.reject(Error(`Window is not available`));if(j.has(e))return j.get(e);let t=new Promise((t,n)=>{let r=document.querySelector(`script[src="${e}"]`);if(r){if(r.getAttribute(`data-loaded`)===`true`){t();return}r.addEventListener(`load`,()=>t(),{once:!0}),r.addEventListener(`error`,e=>n(e),{once:!0});return}let i=document.createElement(`script`);i.src=e,i.async=!0,i.onload=()=>{i.setAttribute(`data-loaded`,`true`),t()},i.onerror=t=>{j.delete(e),n(t)},document.head.appendChild(i)});return j.set(e,t),t}var N=null;function P(){return typeof window>`u`?Promise.reject(Error(`Window is not available`)):window.YT&&window.YT.Player?Promise.resolve(window.YT):N||(N=new Promise((e,t)=>{let n=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{if(typeof n==`function`)try{n()}catch{}e(window.YT)},M(`https://www.youtube.com/iframe_api`).catch(e=>{N=null,t(e)})}),N)}var F=null;function ee(){return typeof window>`u`?Promise.reject(Error(`Window is not available`)):window.Vimeo&&window.Vimeo.Player?Promise.resolve(window.Vimeo):F||(F=M(`https://player.vimeo.com/api/player.js`).then(()=>window.Vimeo).catch(e=>{throw F=null,e}),F)}var I=null;function te(){return typeof window>`u`?Promise.reject(Error(`Window is not available`)):window.SC&&window.SC.Widget?Promise.resolve(window.SC):I||(I=M(`https://w.soundcloud.com/player/api.js`).then(()=>window.SC).catch(e=>{throw I=null,e}),I)}var L=null;function ne(){return typeof window>`u`?Promise.reject(Error(`Window is not available`)):window.dailymotion&&window.dailymotion.createPlayer?Promise.resolve(window.dailymotion):L||(L=M(`https://player.dailymotion.com/api/player.js`).then(()=>window.dailymotion).catch(e=>{throw L=null,e}),L)}var R=null;function re(){return typeof window>`u`?Promise.reject(Error(`Window is not available`)):window.Twitch&&window.Twitch.Player?Promise.resolve(window.Twitch):R||(R=M(`https://player.twitch.tv/js/embed/v1.js`).then(()=>window.Twitch).catch(e=>{throw R=null,e}),R)}var z=null;function ie(){return typeof window>`u`?Promise.reject(Error(`Window is not available`)):window.Mixcloud&&window.Mixcloud.PlayerWidget?Promise.resolve(window.Mixcloud):z||(z=M(`https://widget.mixcloud.com/media/js/widgetApi.js`).then(()=>window.Mixcloud).catch(e=>{throw z=null,e}),z)}var B=null;function ae(){return typeof window>`u`?Promise.reject(Error(`Window is not available`)):window.SpotifyIframeApi?Promise.resolve(window.SpotifyIframeApi):B||(B=new Promise((e,t)=>{let n=window.onSpotifyIframeApiReady;window.onSpotifyIframeApiReady=t=>{if(window.SpotifyIframeApi=t,typeof n==`function`)try{n(t)}catch{}e(t)},M(`https://open.spotify.com/embed/iframe-api/v1`).catch(e=>{B=null,t(e)})}),B)}var V=null;function oe(e=null){return typeof window>`u`?Promise.reject(Error(`Window is not available`)):window.FB?Promise.resolve(window.FB):V||(V=new Promise((t,n)=>{let r=window.fbAsyncInit;window.fbAsyncInit=()=>{if(window.FB&&e&&window.FB.init({appId:e,xfbml:!0,version:`v18.0`}),typeof r==`function`)try{r()}catch{}t(window.FB)},M(`https://connect.facebook.net/en_US/sdk.js`).catch(e=>{V=null,n(e)})}),V)}var H=new class extends A{constructor(){super(`youtube`)}async loadSdk(){return P()}async initPlayer(e,t){let n=await this.loadSdk(),r=e.width||`100%`,i=e.height||`100%`,s=e.videoId,{hiddenWrapper:c,tempNode:l,cleanup:u}=a(t,r,i);return new Promise((a,d)=>{let f=null,p=null;f=new n.Player(l.id,{width:r,height:i,videoId:s,playerVars:{enablejsapi:1,origin:typeof window<`u`?window.location.origin:void 0,...e.playerVars},events:{onReady:()=>{p=f.getIFrame?f.getIFrame():document.getElementById(l.id),p&&p.parentNode===c&&c.removeChild(p),u(),p&&o(p,r,i,t),a({player:f,element:p,iframe:p,destroy:()=>{try{f&&typeof f.destroy==`function`&&f.destroy()}catch{}u()}})},onError:e=>{u(),d(e)}}})})}createAdapter(e){let t=typeof window<`u`?window.YT:null,n={paused:!0,currentTime:0,duration:0,volume:1,muted:!1,playbackRate:1},r=null,i=()=>{try{if(e&&typeof e.getPlayerState==`function`){let r=e.getPlayerState(),i=t?r===t.PlayerState.PLAYING||r===t.PlayerState.BUFFERING:r===1||r===3;n.paused=!i,n.currentTime=e.getCurrentTime?e.getCurrentTime():0,n.duration=e.getDuration?e.getDuration():0,n.volume=e.getVolume?e.getVolume()/100:1,n.muted=e.isMuted?e.isMuted():!1,n.playbackRate=e.getPlaybackRate?e.getPlaybackRate():1}}catch{}return n},a=()=>{r||=setInterval(()=>{let e=i();s.emit?.(`timeupdate`,{state:e})},250)},o=()=>{r&&=(clearInterval(r),null)},s={play(){e&&typeof e.playVideo==`function`&&e.playVideo()},pause(){e&&typeof e.pauseVideo==`function`&&e.pauseVideo()},toggle(){if(!e)return;let n=typeof e.getPlayerState==`function`?e.getPlayerState():-1;(t?n===t.PlayerState.PLAYING||n===t.PlayerState.BUFFERING:n===1||n===3)?e.pauseVideo():e.playVideo()},stop(){e&&typeof e.stopVideo==`function`&&e.stopVideo()},seek(t){if(e&&typeof e.getCurrentTime==`function`&&typeof e.seekTo==`function`){let n=e.getCurrentTime()||0;e.seekTo(Math.max(0,n+Number(t)),!0)}},seekTo(t){e&&typeof e.seekTo==`function`&&e.seekTo(Number(t),!0)},getCurrentTime(){return e&&typeof e.getCurrentTime==`function`?e.getCurrentTime():0},getDuration(){return e&&typeof e.getDuration==`function`?e.getDuration():0},getVolume(){return e&&typeof e.getVolume==`function`?e.getVolume()/100:1},setVolume(t){if(e&&typeof e.setVolume==`function`){let n=Number(t);n<=1&&n>0&&(n*=100),e.setVolume(Math.min(100,Math.max(0,n)))}},getMuted(){return e&&typeof e.isMuted==`function`?e.isMuted():!1},setMuted(t){e&&(t?typeof e.mute==`function`&&e.mute():typeof e.unMute==`function`&&e.unMute())},getPlaybackRate(){return e&&typeof e.getPlaybackRate==`function`?e.getPlaybackRate():1},setPlaybackRate(t){e&&typeof e.setPlaybackRate==`function`&&e.setPlaybackRate(Number(t))},paused(){if(!e||typeof e.getPlayerState!=`function`)return!0;let n=e.getPlayerState();return!(t?n===t.PlayerState.PLAYING||n===t.PlayerState.BUFFERING:n===1||n===3)},next(){e&&typeof e.nextVideo==`function`&&e.nextVideo()},previous(){e&&typeof e.previousVideo==`function`&&e.previousVideo()},setRepeat(t){if(e&&typeof e.setLoop==`function`){let n=t===`one`||t===`all`||t===!0;e.setLoop(n)}},setShuffle(t){e&&typeof e.setShuffle==`function`&&e.setShuffle(!!t)},setSubtitle(t){if(e){if(!t||t===`off`){if(typeof e.setOption==`function`)try{e.setOption(`captions`,`track`,{}),e.setOption(`cc`,`track`,{}),e.setOption(`captions`,`reload`,!0)}catch{}if(typeof e.unloadModule==`function`)try{e.unloadModule(`captions`)}catch{}}else{let n=String(t);if(typeof e.loadModule==`function`)try{e.loadModule(`captions`)}catch{}if(typeof e.setOption==`function`)try{e.setOption(`captions`,`track`,{languageCode:n}),e.setOption(`cc`,`track`,{languageCode:n}),e.setOption(`captions`,`reload`,!0)}catch{}}}},getSubtitles(){if(e&&typeof e.getOption==`function`)try{let t=e.getOption(`captions`,`tracklist`);if(Array.isArray(t)&&t.length>0)return t;let n=e.getOption(`captions`,`track`);return n&&Object.keys(n).length>0?[n]:[]}catch{return[]}return[]},load(t){e&&(typeof t==`string`?typeof e.loadVideoById==`function`&&e.loadVideoById(t):t&&typeof t==`object`&&typeof e.loadVideoById==`function`&&e.loadVideoById(t))},getState(){return i()},destroy(){o()}};return e&&typeof e.addEventListener==`function`&&e.addEventListener(`onStateChange`,e=>{let t=i(),n=e.data;n===1?(a(),s.emit?.(`play`,{state:t})):n===2?(o(),s.emit?.(`pause`,{state:t})):n===0&&(o(),s.emit?.(`ended`,{state:{...t,paused:!0,ended:!0}}))}),s}},se={create:e=>H.create(e),mount:(e,t)=>H.mount(e,t),provider:H},U=new class extends A{constructor(){super(`vimeo`)}async loadSdk(){return ee()}async initPlayer(e,t){let n=await this.loadSdk(),r=e.width||`100%`,i=e.height||`100%`,s=e.videoId||e.id||e.url||`76979871`,{hiddenWrapper:c,tempNode:l,cleanup:u}=a(t,r,i),d={id:typeof s==`number`?s:void 0,url:typeof s==`string`?s.startsWith(`http`)?s:`https://player.vimeo.com/video/${s}`:void 0,width:typeof r==`number`?r:void 0,height:typeof i==`number`?i:void 0,autoplay:e.autoplay??!1,muted:e.muted??!1,...e.playerOptions},f=new n.Player(l,d);await f.ready();let p=l.querySelector(`iframe`)||l;return p&&p.parentNode===c&&c.removeChild(p),u(),p&&o(p,r,i,t),{player:f,element:p,iframe:p?.tagName===`IFRAME`?p:null,destroy:()=>{try{f&&typeof f.destroy==`function`&&f.destroy()}catch{}u()}}}createAdapter(e){let t=!0,n=0,r=0,i=1,a=!1,o=1;e&&typeof e.getDuration==`function`&&e.getDuration().then(e=>{n=e||0}).catch(()=>{});let s={play(){e&&typeof e.play==`function`&&e.play().catch(()=>{})},pause(){e&&typeof e.pause==`function`&&e.pause().catch(()=>{})},toggle(){e&&(typeof e.getPaused==`function`?e.getPaused().then(t=>{t?e.play().catch(()=>{}):e.pause().catch(()=>{})}).catch(()=>{t?e.play().catch(()=>{}):e.pause().catch(()=>{})}):t?e.play().catch(()=>{}):e.pause().catch(()=>{}))},stop(){e&&typeof e.pause==`function`&&typeof e.setCurrentTime==`function`&&e.pause().then(()=>e.setCurrentTime(0)).catch(()=>{})},seek(t){e&&typeof e.getCurrentTime==`function`&&typeof e.setCurrentTime==`function`&&e.getCurrentTime().then(n=>{e.setCurrentTime(Math.max(0,n+Number(t))).catch(()=>{})}).catch(()=>{})},seekTo(t){e&&typeof e.setCurrentTime==`function`&&e.setCurrentTime(Number(t)).catch(()=>{})},getCurrentTime(){return r},getDuration(){return n},getVolume(){return i},setVolume(t){i=Number(t),e&&typeof e.setVolume==`function`&&e.setVolume(Math.min(1,Math.max(0,i))).catch(()=>{})},getMuted(){return a},setMuted(t){a=!!t,e&&typeof e.setMuted==`function`&&e.setMuted(a).catch(()=>{})},getPlaybackRate(){return o},setPlaybackRate(t){o=Number(t),e&&typeof e.setPlaybackRate==`function`&&e.setPlaybackRate(o).catch(()=>{})},paused(){return t},setRepeat(t){if(e&&typeof e.setLoop==`function`){let n=t===`one`||t===`all`||t===!0;e.setLoop(n).catch(()=>{})}},setQuality(t){e&&typeof e.setQuality==`function`&&e.setQuality(String(t)).catch(()=>{})},async getQualities(){if(e&&typeof e.getQualities==`function`)try{let t=await e.getQualities();return Array.isArray(t)?t.map(e=>e.id||e.label||String(e)):[]}catch{return[]}return[]},setSubtitle(t){e&&typeof e.enableTextTrack==`function`&&(!t||t===`off`?e.disableTextTrack?.().catch(()=>{}):e.enableTextTrack(String(t)).catch(()=>{}))},async getSubtitles(){if(e&&typeof e.getTextTracks==`function`)try{let t=await e.getTextTracks();return Array.isArray(t)?t:[]}catch{return[]}return[]},load(t){e&&typeof e.loadVideo==`function`&&e.loadVideo(t).catch(()=>{})},getState(){return{paused:t,currentTime:r,duration:n,volume:i,muted:a,playbackRate:o}}};return e&&typeof e.on==`function`&&(e.on(`play`,()=>{t=!1,s.emit?.(`play`,{state:{paused:!1,currentTime:r,duration:n}})}),e.on(`pause`,()=>{t=!0,s.emit?.(`pause`,{state:{paused:!0,currentTime:r,duration:n}})}),e.on(`timeupdate`,e=>{r=e.seconds||0,n=e.duration||n,s.emit?.(`timeupdate`,{state:{paused:t,currentTime:r,duration:n}})}),e.on(`seeked`,e=>{r=e.seconds||0,s.emit?.(`seeked`,{state:{paused:t,currentTime:r,duration:n}}),s.emit?.(`timeupdate`,{state:{paused:t,currentTime:r,duration:n}})}),e.on(`ended`,()=>{t=!0,s.emit?.(`ended`,{state:{paused:!0,ended:!0,currentTime:n,duration:n}})}),e.on(`volumechange`,e=>{typeof e.volume==`number`&&(i=e.volume),typeof e.muted==`boolean`&&(a=e.muted),s.emit?.(`volumechange`,{state:{volume:i,muted:a}})})),s}},ce={create:e=>U.create(e),mount:(e,t)=>U.mount(e,t),provider:U},W=new class extends A{constructor(){super(`soundcloud`)}async loadSdk(){return te()}async initPlayer(e,t){let n=await this.loadSdk(),r=e.width||`100%`,i=e.height||(e.visual?`300`:`166`),a=e.trackUrl||e.url||`https://api.soundcloud.com/tracks/293`,s=e.autoplay??e.auto_play??!1,c=e.visual??!1,l=document.createElement(`iframe`);l.id=`sremote-sc-${t}`,l.allow=`autoplay`,l.src=`https://w.soundcloud.com/player/?url=${encodeURIComponent(a)}&color=${encodeURIComponent(e.color||`#ff5500`)}&auto_play=${s}&visual=${c}&hide_cover=${!!e.hideCover}&show_teaser=${!!e.showTeaser}`,o(l,r,i,t);let u=n.Widget(l);return await new Promise(e=>{u.bind(n.Widget.Events.READY,()=>{e()}),setTimeout(e,2e3)}),{player:u,element:l,iframe:l,destroy:()=>{try{u&&typeof u.unbind==`function`&&(u.unbind(n.Widget.Events.READY),u.unbind(n.Widget.Events.PLAY),u.unbind(n.Widget.Events.PAUSE),u.unbind(n.Widget.Events.PLAY_PROGRESS),u.unbind(n.Widget.Events.SEEK),u.unbind(n.Widget.Events.FINISH))}catch{}}}}createAdapter(e){let t=typeof window<`u`?window.SC:null,n=!1,r=0,i=0,a=1,o=!1;e&&typeof e.getDuration==`function`&&e.getDuration(e=>{r=(e||0)/1e3});let s={play(){e&&typeof e.play==`function`&&(e.play(),n=!0)},pause(){e&&typeof e.pause==`function`&&(e.pause(),n=!1)},toggle(){e&&typeof e.toggle==`function`&&(e.toggle(),n=!n)},stop(){e&&typeof e.pause==`function`&&typeof e.seekTo==`function`&&(e.pause(),e.seekTo(0),n=!1)},seek(t){e&&typeof e.getPosition==`function`&&typeof e.seekTo==`function`&&e.getPosition(n=>{let r=Math.max(0,(n||0)+Number(t)*1e3);e.seekTo(r)})},seekTo(t){e&&typeof e.seekTo==`function`&&e.seekTo(Number(t)*1e3)},getCurrentTime(){return i},getDuration(){return r},getVolume(){return a},setVolume(t){a=Number(t),e&&typeof e.setVolume==`function`&&e.setVolume(Math.min(100,Math.max(0,a*100)))},getMuted(){return o},setMuted(t){o=!!t,e&&typeof e.setVolume==`function`&&e.setVolume(o?0:a*100)},paused(){return!n},next(){e&&typeof e.next==`function`&&e.next()},previous(){e&&typeof e.prev==`function`&&e.prev()},load(t,n={}){e&&typeof e.load==`function`&&e.load(t,n)},getState(){return{paused:!n,currentTime:i,duration:r,volume:a,muted:o}}};return t&&e&&typeof e.bind==`function`&&(e.bind(t.Widget.Events.PLAY,()=>{n=!0,s.emit?.(`play`,{state:{paused:!1,currentTime:i,duration:r}})}),e.bind(t.Widget.Events.PAUSE,()=>{n=!1,s.emit?.(`pause`,{state:{paused:!0,currentTime:i,duration:r}})}),e.bind(t.Widget.Events.PLAY_PROGRESS,e=>{i=(e?.currentPosition||0)/1e3,e?.duration&&(r=e.duration/1e3),s.emit?.(`timeupdate`,{state:{paused:!n,currentTime:i,duration:r}})}),e.bind(t.Widget.Events.SEEK,e=>{i=(e?.currentPosition||0)/1e3,s.emit?.(`seeked`,{state:{paused:!n,currentTime:i,duration:r}}),s.emit?.(`timeupdate`,{state:{paused:!n,currentTime:i,duration:r}})}),e.bind(t.Widget.Events.FINISH,()=>{n=!1,s.emit?.(`ended`,{state:{paused:!0,ended:!0,currentTime:r,duration:r}})})),s}},le={create:e=>W.create(e),mount:(e,t)=>W.mount(e,t),provider:W},G=new class extends A{constructor(){super(`dailymotion`)}async loadSdk(){return ne()}async initPlayer(e,t){let n=await this.loadSdk(),r=e.width||`100%`,i=e.height||`100%`,s=e.video||e.videoId||`x7tgad0`,{hiddenWrapper:c,tempNode:l,cleanup:u}=a(t,r,i),d={video:s,params:{autoplay:e.autoplay??!1,mute:e.mute??e.muted??!1,...e.params},...e.playerOptions},f=await n.createPlayer(l,d),p=l.querySelector(`iframe`)||l;return p&&p.parentNode===c&&c.removeChild(p),u(),p&&o(p,r,i,t),{player:f,element:p,iframe:p?.tagName===`IFRAME`?p:null,destroy:()=>{try{f&&typeof f.destroy==`function`&&f.destroy()}catch{}u()}}}createAdapter(e){let t=typeof window<`u`?window.dailymotion:null,n=!0,r=0,i=0,a=1,o=!1,s={play(){e&&typeof e.play==`function`&&e.play()},pause(){e&&typeof e.pause==`function`&&e.pause()},toggle(){e&&(n?s.play():s.pause())},stop(){e&&typeof e.pause==`function`&&typeof e.seek==`function`&&(e.pause(),e.seek(0))},seek(t){e&&typeof e.seek==`function`&&e.seek(Math.max(0,i+Number(t)))},seekTo(t){e&&typeof e.seek==`function`&&e.seek(Number(t))},getCurrentTime(){return i},getDuration(){return r},getVolume(){return a},setVolume(t){a=Number(t),e&&typeof e.setVolume==`function`&&e.setVolume(Math.min(1,Math.max(0,a)))},getMuted(){return o},setMuted(t){o=!!t,e&&typeof e.setMuted==`function`&&e.setMuted(o)},paused(){return n},setQuality(t){e&&typeof e.setQuality==`function`&&e.setQuality(String(t))},async getQualities(){if(e&&typeof e.getQualities==`function`)try{let t=await e.getQualities();return Array.isArray(t)?t:[]}catch{return[]}return[]},setSubtitle(t){e&&typeof e.setSubtitle==`function`&&e.setSubtitle(t?String(t):`off`)},async getSubtitles(){if(e&&typeof e.getSubtitles==`function`)try{let t=await e.getSubtitles();return Array.isArray(t)?t:[]}catch{return[]}return[]},load(t){e&&typeof e.load==`function`&&e.load(t)},getState(){return{paused:n,currentTime:i,duration:r,volume:a,muted:o}}};if(e&&typeof e.on==`function`){let c=t?.events||{};c.PLAYER_PLAY&&e.on(c.PLAYER_PLAY,()=>{n=!1,s.emit?.(`play`,{state:{paused:!1,currentTime:i,duration:r}})}),c.PLAYER_PAUSE&&e.on(c.PLAYER_PAUSE,()=>{n=!0,s.emit?.(`pause`,{state:{paused:!0,currentTime:i,duration:r}})}),c.PLAYER_TIMEUPDATE&&e.on(c.PLAYER_TIMEUPDATE,e=>{i=e?.videoTime??e?.time??i,r=e?.videoDuration??e?.duration??r,s.emit?.(`timeupdate`,{state:{paused:n,currentTime:i,duration:r}})}),c.PLAYER_SEEKED&&e.on(c.PLAYER_SEEKED,e=>{i=e?.videoTime??e?.time??i,s.emit?.(`seeked`,{state:{paused:n,currentTime:i,duration:r}}),s.emit?.(`timeupdate`,{state:{paused:n,currentTime:i,duration:r}})}),c.PLAYER_END&&e.on(c.PLAYER_END,()=>{n=!0,s.emit?.(`ended`,{state:{paused:!0,ended:!0,currentTime:r,duration:r}})}),c.PLAYER_VOLUMECHANGE&&e.on(c.PLAYER_VOLUMECHANGE,e=>{e?.volume!==void 0&&(a=e.volume),e?.muted!==void 0&&(o=e.muted),s.emit?.(`volumechange`,{state:{volume:a,muted:o}})})}return s}},ue={create:e=>G.create(e),mount:(e,t)=>G.mount(e,t),provider:G},K=new class extends A{constructor(){super(`twitch`)}async loadSdk(){return re()}async initPlayer(e,t){let n=await this.loadSdk(),r=e.width||`100%`,i=e.height||`100%`,{hiddenWrapper:s,tempNode:c,cleanup:l}=a(t,r,i),u=typeof window<`u`&&window.location.hostname||`localhost`,d=Array.isArray(e.parent)?e.parent:[e.parent||u],f={width:`100%`,height:`100%`,channel:e.channel||(!e.video&&!e.collection?`the8bitdrummer`:void 0),video:e.video,collection:e.collection,parent:d,autoplay:e.autoplay??!1,muted:e.muted??!1,...e.playerOptions},p=new n.Player(c.id,f);await new Promise(e=>{p.addEventListener(n.Player.READY,()=>e(),{once:!0}),setTimeout(e,2500)});let m=c.querySelector(`iframe`)||c;return m&&m.parentNode===s&&s.removeChild(m),l(),m&&o(m,r,i,t),{player:p,element:m,iframe:m?.tagName===`IFRAME`?m:null,destroy:()=>{try{p&&typeof p.destroy==`function`&&p.destroy()}catch{}l()}}}createAdapter(e){let t=typeof window<`u`?window.Twitch:null,n={play(){e&&typeof e.play==`function`&&e.play()},pause(){e&&typeof e.pause==`function`&&e.pause()},toggle(){!e||typeof e.isPaused!=`function`||(e.isPaused()?e.play():e.pause())},stop(){e&&typeof e.pause==`function`&&typeof e.seek==`function`&&(e.pause(),e.seek(0))},seek(t){e&&typeof e.getCurrentTime==`function`&&typeof e.seek==`function`&&e.seek(Math.max(0,(e.getCurrentTime()||0)+Number(t)))},seekTo(t){e&&typeof e.seek==`function`&&e.seek(Number(t))},getCurrentTime(){return e&&typeof e.getCurrentTime==`function`?e.getCurrentTime():0},getDuration(){return e&&typeof e.getDuration==`function`?e.getDuration():0},getVolume(){return e&&typeof e.getVolume==`function`?e.getVolume():1},setVolume(t){e&&typeof e.setVolume==`function`&&e.setVolume(Math.min(1,Math.max(0,Number(t))))},getMuted(){return e&&typeof e.getMuted==`function`?e.getMuted():!1},setMuted(t){e&&typeof e.setMuted==`function`&&e.setMuted(!!t)},paused(){return e&&typeof e.isPaused==`function`?e.isPaused():!0},load(t){e&&(typeof t==`string`?typeof e.setChannel==`function`&&e.setChannel(t):t?.video&&typeof e.setVideo==`function`?e.setVideo(t.video):t?.channel&&typeof e.setChannel==`function`&&e.setChannel(t.channel))},getState(){return{paused:!e?.isPaused||e.isPaused(),currentTime:e?.getCurrentTime?e.getCurrentTime():0,duration:e?.getDuration?e.getDuration():0,volume:e?.getVolume?e.getVolume():1,muted:e?.getMuted?e.getMuted():!1}}};return t&&e&&typeof e.addEventListener==`function`&&(e.addEventListener(t.Player.PLAY,()=>{n.emit?.(`play`,{state:{paused:!1,currentTime:e.getCurrentTime?e.getCurrentTime():0,duration:e.getDuration?e.getDuration():0}})}),e.addEventListener(t.Player.PAUSE,()=>{n.emit?.(`pause`,{state:{paused:!0,currentTime:e.getCurrentTime?e.getCurrentTime():0,duration:e.getDuration?e.getDuration():0}})}),e.addEventListener(t.Player.ENDED,()=>{n.emit?.(`ended`,{state:{paused:!0,ended:!0,currentTime:e.getDuration?e.getDuration():0,duration:e.getDuration?e.getDuration():0}})})),n}},de={create:e=>K.create(e),mount:(e,t)=>K.mount(e,t),provider:K},q=new class extends A{constructor(){super(`mixcloud`)}async loadSdk(){return ie()}async initPlayer(e,t){let n=await this.loadSdk(),r=e.width||`100%`,i=e.height||(e.mini?`60`:`120`),a=e.feed||e.url||`/spartacus/party-time/`,s=e.autoplay??e.auto_play??!1,c=e.mini??!0,l=e.hideCover??!0,u=e.light??!0,d=document.createElement(`iframe`);d.id=`sremote-mixcloud-${t}`,d.allow=`autoplay`,d.src=`https://player-widget.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(a)}&hide_cover=${+!!l}&mini=${+!!c}&light=${+!!u}&autoplay=${+!!s}`,o(d,r,i,t);let f=n.PlayerWidget(d);return f.ready&&await Promise.race([f.ready,new Promise(e=>setTimeout(e,2500))]),{player:f,element:d,iframe:d,destroy:()=>{}}}createAdapter(e){let t=!1,n=0,r=0;e&&typeof e.getDuration==`function`&&e.getDuration().then(e=>{n=e||0}).catch(()=>{});let i={play(){e&&typeof e.play==`function`&&(e.play(),t=!0)},pause(){e&&typeof e.pause==`function`&&(e.pause(),t=!1)},toggle(){e&&typeof e.togglePlay==`function`&&(e.togglePlay(),t=!t)},stop(){e&&typeof e.pause==`function`&&typeof e.seek==`function`&&(e.pause(),e.seek(0),t=!1)},seek(t){e&&typeof e.seek==`function`&&e.seek(Math.max(0,r+Number(t)))},seekTo(t){e&&typeof e.seek==`function`&&e.seek(Number(t))},getCurrentTime(){return r},getDuration(){return n},paused(){return!t},load(t){e&&typeof e.load==`function`&&e.load(t,!0)},getState(){return{paused:!t,currentTime:r,duration:n}}};return e?.events&&(e.events.play?.on?.(()=>{t=!0,i.emit?.(`play`,{state:{paused:!1,currentTime:r,duration:n}})}),e.events.pause?.on?.(()=>{t=!1,i.emit?.(`pause`,{state:{paused:!0,currentTime:r,duration:n}})}),e.events.progress?.on?.((e,a)=>{r=e||0,a&&(n=a),i.emit?.(`timeupdate`,{state:{paused:!t,currentTime:r,duration:n}})}),e.events.ended?.on?.(()=>{t=!1,i.emit?.(`ended`,{state:{paused:!0,ended:!0,currentTime:n,duration:n}})})),i}},fe={create:e=>q.create(e),mount:(e,t)=>q.mount(e,t),provider:q},J=new class extends A{constructor(){super(`spotify`)}async loadSdk(){return ae()}async initPlayer(e,t){let n=await this.loadSdk(),r=e.width||`100%`,i=e.height||(e.compact?`152`:`352`),s=e.uri||e.url||`spotify:track:4cOdK2wGLETKBW3PvgPWqT`,{hiddenWrapper:c,tempNode:l,cleanup:u}=a(t,r,i);return new Promise((a,d)=>{try{n.createController(l,{uri:s,width:r,height:i,...e.controllerOptions},e=>{let n=l.querySelector(`iframe`)||l;n&&n.parentNode===c&&c.removeChild(n),u(),n&&o(n,r,i,t),a({player:e,element:n,iframe:n?.tagName===`IFRAME`?n:null,destroy:()=>{try{e&&typeof e.destroy==`function`&&e.destroy()}catch{}u()}})})}catch(e){u(),d(e)}})}createAdapter(e){let t=!0,n=0,r=0,i={play(){e&&typeof e.resume==`function`?e.resume():e&&typeof e.play==`function`&&e.play()},pause(){e&&typeof e.pause==`function`&&e.pause()},toggle(){e&&typeof e.togglePlay==`function`&&e.togglePlay()},stop(){e&&typeof e.pause==`function`&&typeof e.seek==`function`&&(e.pause(),e.seek(0))},seek(t){e&&typeof e.seek==`function`&&e.seek(Math.max(0,n+Number(t)))},seekTo(t){e&&typeof e.seek==`function`&&e.seek(Number(t))},getCurrentTime(){return n},getDuration(){return r},paused(){return t},load(t){e&&typeof e.loadUri==`function`&&e.loadUri(t)},getState(){return{paused:t,currentTime:n,duration:r}}};return e&&typeof e.addListener==`function`&&(e.addListener(`playback_started`,e=>{t=!1,n=(e?.data?.position||0)/1e3,r=(e?.data?.duration||0)/1e3,i.emit?.(`play`,{state:{paused:!1,currentTime:n,duration:r}}),i.emit?.(`timeupdate`,{state:{paused:!1,currentTime:n,duration:r}})}),e.addListener(`playback_update`,e=>{t=!!e?.data?.isPaused,n=(e?.data?.position||0)/1e3,r=(e?.data?.duration||0)/1e3,i.emit?.(`timeupdate`,{state:{paused:t,currentTime,duration:r}}),t&&i.emit?.(`pause`,{state:{paused:!0,currentTime:n,duration:r}})})),i}},pe={create:e=>J.create(e),mount:(e,t)=>J.mount(e,t),provider:J},Y=new class extends A{constructor(){super(`tiktok`)}async initPlayer(e,t){let n=e.width||`100%`,r=e.height||`600px`,i=e.videoId||e.id||`6718335390845095173`,a=document.createElement(`iframe`);return a.id=`sremote-tiktok-${t}`,a.allow=`autoplay; fullscreen; encrypted-media`,a.allowFullscreen=!0,a.src=`https://www.tiktok.com/player/v1/${i}?music_info=${e.musicInfo===!1?0:1}&description=${e.description===!1?0:1}&autoplay=${+!!e.autoplay}`,o(a,n,r,t),{player:{iframe:a},element:a,iframe:a,destroy:()=>{}}}createAdapter(e,t){let n=t?.iframe||e?.iframe,r=!1,i=!1,a=0,o=0;function s(e,t){if(n?.contentWindow){let r={"x-tiktok-player":!0,type:e};t!==void 0&&(r.value=t),n.contentWindow.postMessage(r,`https://www.tiktok.com`)}}let c={play(){s(`play`)},pause(){s(`pause`)},toggle(){s(r?`pause`:`play`)},stop(){s(`pause`),s(`seekTo`,0)},seek(e){let t=Math.max(0,a+Number(e));a=t,s(`seekTo`,t)},seekTo(e){a=Number(e),s(`seekTo`,a)},getVolume(){return+!i},setVolume(e){Number(e)<=0?c.setMuted(!0):i&&c.setMuted(!1)},getMuted(){return i},setMuted(e){let t=e===void 0?!i:!!e;i=t,s(t?`mute`:`unMute`)},getCurrentTime(){return a},getDuration(){return o},paused(){return!r},getState(){return{paused:!r,currentTime:a,duration:o,muted:i}}};return typeof window<`u`&&window.addEventListener(`message`,e=>{if(e.origin!==`https://www.tiktok.com`||!e.data||!e.data[`x-tiktok-player`])return;let{type:t,value:n}=e.data;t===`onStateChange`?n===1?(r=!0,c.emit?.(`play`,{state:{paused:!1,currentTime:a,duration:o}})):n===2?(r=!1,c.emit?.(`pause`,{state:{paused:!0,currentTime:a,duration:o}})):n===0&&(r=!1,c.emit?.(`ended`,{state:{paused:!0,ended:!0,currentTime:o,duration:o}})):t===`onCurrentTime`?n&&(typeof n.currentTime==`number`&&(a=n.currentTime),typeof n.duration==`number`&&(o=n.duration),c.emit?.(`timeupdate`,{state:{paused:!r,currentTime:a,duration:o}})):t===`onMute`&&(i=!!n,c.emit?.(`volumechange`,{state:{muted:i}}))}),c}},me={create:e=>Y.create(e),mount:(e,t)=>Y.mount(e,t),provider:Y},X=new class extends A{constructor(){super(`niconico`)}async initPlayer(e,t){let n=e.width||`100%`,r=e.height||`100%`,i=e.watchId||e.videoId||e.id||`so46693656`,a=`niconico-player-${t}`,s=document.createElement(`iframe`);return s.id=a,s.allow=`autoplay; encrypted-media; fullscreen`,s.allowFullscreen=!0,s.src=`https://embed.nicovideo.jp/watch/${i}?jsapi=1&playerId=${a}&autoplay=${+!!e.autoplay}`,o(s,n,r,t),{player:{iframe:s,playerId:a},element:s,iframe:s,destroy:()=>{}}}createAdapter(e,t){let n=t?.iframe||e?.iframe,r=e?.playerId||n?.id,i=0,a=0,o=!1,s=1;function c(e,t={}){n?.contentWindow&&n.contentWindow.postMessage({sourceConnectorType:1,playerId:r,eventName:e,data:t},`https://embed.nicovideo.jp`)}let l={play(){c(`play`)},pause(){c(`pause`)},toggle(){c(o?`pause`:`play`)},stop(){c(`pause`),c(`seek`,{time:0})},seek(e){c(`seek`,{time:Math.max(0,a+Number(e))*1e3})},seekTo(e){c(`seek`,{time:Number(e)*1e3})},getVolume(){return s},setVolume(e){s=Number(e),c(`volumeChange`,{volume:s})},setMuted(e){c(`mute`,{mute:!!e})},getCurrentTime(){return a},getDuration(){return i},paused(){return!o},getState(){return{paused:!o,currentTime:a,duration:i,volume:s}}};return typeof window<`u`&&window.addEventListener(`message`,e=>{if(e.origin!==`https://embed.nicovideo.jp`||e.data?.playerId!==r)return;let{eventName:t,data:n}=e.data;t===`loadComplete`?n?.videoInfo?.lengthInSeconds&&(i=n.videoInfo.lengthInSeconds/1e3):t===`playerMetadataChange`?(n?.duration!==void 0&&(i=n.duration/1e3),n?.currentTime!==void 0&&(a=n.currentTime/1e3,l.emit?.(`timeupdate`,{state:{paused:!o,currentTime:a,duration:i}}))):t===`playerStatusChange`&&(n?.playerStatus===2?(o=!0,l.emit?.(`play`,{state:{paused:!1,currentTime:a,duration:i}})):n?.playerStatus===3?(o=!1,l.emit?.(`pause`,{state:{paused:!0,currentTime:a,duration:i}})):n?.playerStatus===4&&(o=!1,l.emit?.(`ended`,{state:{paused:!0,ended:!0,currentTime:i,duration:i}})))}),l}},he={create:e=>X.create(e),mount:(e,t)=>X.mount(e,t),provider:X};function Z(e={}){let t=new window.URLSearchParams,n=e.bvid||(typeof e.videoId==`string`&&e.videoId.startsWith(`BV`)?e.videoId:null),r=e.aid||e.avid||(typeof e.videoId==`number`||typeof e.videoId==`string`&&!e.videoId.startsWith(`BV`)?e.videoId:null);if(n)t.set(`bvid`,n);else if(r){let e=String(r).replace(/^av/i,``);t.set(`aid`,e)}else if(e.id){let n=String(e.id);n.startsWith(`BV`)?t.set(`bvid`,n):t.set(`aid`,n.replace(/^av/i,``))}else t.set(`bvid`,`BV1xx411c7mD`);e.cid&&t.set(`cid`,e.cid),e.page&&t.set(`page`,e.page),(e.t||e.startTime)&&t.set(`t`,e.t||e.startTime);let i=e.autoplay??!0;return t.set(`autoplay`,i?`1`:`0`),e.danmaku!==void 0&&t.set(`danmaku`,e.danmaku?`1`:`0`),(e.highQuality!==void 0||e.high_quality!==void 0)&&t.set(`high_quality`,e.highQuality??e.high_quality?`1`:`0`),`https://player.bilibili.com/player.html?${t.toString()}`}var Q=new class extends A{constructor(){super(`bilibili`)}async initPlayer(e,t){let n=e.width||`100%`,r=e.height||`100%`,i=document.createElement(`iframe`);return i.id=`sremote-bilibili-${t}`,i.allow=`autoplay; encrypted-media; fullscreen`,i.allowFullscreen=!0,i.style.border=`none`,i.src=Z(e),o(i,n,r,t),{player:{iframe:i,options:e},element:i,iframe:i,destroy:()=>{}}}createAdapter(e,t){let n=t?.iframe||e?.iframe;return{load(e,t=1){if(n){if(typeof e==`object`&&e)n.src=Z({...e,autoplay:!0});else{let r=String(e);r.startsWith(`BV`)?n.src=Z({bvid:r,page:t,autoplay:!0}):n.src=Z({aid:r,page:t,autoplay:!0})}}}}}},ge={create:e=>Q.create(e),mount:(e,t)=>Q.mount(e,t),provider:Q},$=new class extends A{constructor(){super(`facebook`)}async loadSdk(){return oe()}async initPlayer(e,t){let n=e.width||`500px`,r=e.height||`auto`,i=e.videoUrl||e.url||`https://www.facebook.com/facebook/videos/10153231379946729/`,a=document.createElement(`div`);a.id=`sremote-facebook-${t}`;let s=document.createElement(`div`);if(s.className=`fb-video`,s.setAttribute(`data-href`,i),s.setAttribute(`data-width`,typeof n==`number`?`${n}`:n),s.setAttribute(`data-show-text`,e.showText?`true`:`false`),s.setAttribute(`data-autoplay`,e.autoplay?`true`:`false`),s.setAttribute(`data-allowfullscreen`,`true`),a.appendChild(s),o(a,n,r,t),e.useSdk!==!1)try{let t=await this.loadSdk(e.appId);t&&typeof t.XFBML?.parse==`function`&&t.XFBML.parse(a)}catch{}return{player:{container:a,videoUrl:i},element:a,destroy:()=>{}}}createAdapter(){return{}}},_e={create:e=>$.create(e),mount:(e,t)=>$.mount(e,t),provider:$},ve={BaseProvider:A,youtube:se,vimeo:ce,soundcloud:le,dailymotion:ue,twitch:de,mixcloud:fe,spotify:pe,tiktok:me,niconico:he,bilibili:ge,facebook:_e};return e.BaseProvider=A,e.bilibili=ge,e.dailymotion=ue,e.default=ve,e.facebook=_e,e.mixcloud=fe,e.niconico=he,e.soundcloud=le,e.spotify=pe,e.tiktok=me,e.twitch=de,e.vimeo=ce,e.youtube=se,e})({});
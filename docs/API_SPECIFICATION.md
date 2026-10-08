# SRemote Complete API Matrix Specification (Bảng Ánh Xạ Toàn Diện)

> **Trạng thái:** Chuẩn hóa theo triết lý **Clean Fluent Design (Zero `get*` / `set*` trên Public API)**.  
> **Nguyên tắc cốt lõi:**
> 1. **Public User Fluent API**: **Loại bỏ hoàn toàn tiền tố `get*` và `set*`**. Chỉ sử dụng các động từ/danh từ ngắn gọn, biểu cảm (`volume`, `speed`, `mute`, `seekTo`, `seek`). Việc đọc trạng thái được nhất quán 100% qua **`remote.state`** (đọc đồng bộ tức thì) hoặc **`.tap(state => ...)`** (đọc snapshot trong chuỗi).
> 2. **Adapter Interface**: Giữ nguyên và tuân thủ nghiêm ngặt mô hình **`HTML5MediaElement`** (`setCurrentTime`, `setVolume`, `setPlaybackRate`, `setMuted`, `getCurrentTime`, `getVolume`, v.v.).
> 3. **Pipeline Flow & Error Recovery**: Mặc định **Fail-Fast** với Transaction Rollback. Hỗ trợ **`.lenient()`** (bỏ qua mọi lỗi trong chuỗi), **`.strict()`** (bật lại Fail-Fast) và **`.catch()`** (Error Boundary phục hồi chuỗi).
> 4. **Private Internal Engine**: Mapping 1-1 qua `SREMOTE_ACTIONS`, phân giải DOM native an toàn và điều phối qua `IDriver` + `pipeline.Tracker`.

---

## 1. Pipeline Flow & Error Handling Modifiers (Điều Khiển Luồng & Xử Lý Lỗi)

| STT | Chức Năng | Public User Interface (Clean Fluent) | Adapter Interface | Private Engine / Driver Logic | Ý Nghĩa Kiến Trúc |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | **Chế độ khoan dung (Lenient Mode)** | `remote.lenient()` | Không can thiệp | Bật cờ `this._lenient = true`. Bọc mọi bước trong chuỗi: nếu lỗi tự động nuốt/log warning và tiếp tục chạy các bước sau | Bỏ qua toàn bộ lỗi trong cả chuỗi mà không cần gắn `.catch()` lặp đi lặp lại |
| 2 | **Chế độ nghiêm ngặt (Strict Mode)** | `remote.strict()` | Không can thiệp | Bật cờ `this._lenient = false` (Mặc định). Nếu 1 bước lỗi, dừng chuỗi và reject Promise | Khôi phục lại chế độ Fail-Fast tại bất kỳ đoạn nào trong pipeline |
| 3 | **Bắt / Phục hồi lỗi (Error Boundary)** | `remote.catch(onRejected?)` | Không can thiệp | Chuỗi Promise catch handler: nếu không truyền tham số (`.catch()`), nuốt lỗi của bước trước và đưa chuỗi về trạng thái Resolved | Cho phép cô lập lỗi của 1 action cụ thể trong chuỗi mà các lệnh sau vẫn chạy |
| 4 | **Hoàn tất chuỗi (Finally)** | `remote.finally(onFinally)` | Không can thiệp | Thực thi hook dọn dẹp khi toàn bộ chuỗi kết thúc (bất kể thành công hay thất bại) | Đảm bảo tính toán tài nguyên / callback dọn dẹp |
| 5 | **Thenable Dispatch** | `await remote` / `remote.then(...)` | Không can thiệp | Flush toàn bộ hàng đợi microtask và trả về kết quả bước cuối | Cho phép gọi chuỗi async tự nhiên mà không cần nhiều câu lệnh `await` |

---

## 2. Playback Controls (Điều Khiển Phát Nhận)

| STT | Chức Năng | Public User Interface (Clean Fluent) | Adapter Interface (`SRemoteCustomAdapter`) | Private / Internal Action (`SREMOTE_ACTIONS` / Engine) | DOM Native Fallback (`HTMLMediaElement`) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 6 | **Phát (Play)** | `remote.play()` | `adapter.play()` | `SREMOTE_ACTIONS.PLAY` (`'play'`) | `safePlayMedia(el)` (Bypass autoplay policy / prototype hooks) |
| 7 | **Tạm dừng (Pause)** | `remote.pause()` | `adapter.pause()` | `SREMOTE_ACTIONS.PAUSE` (`'pause'`) | `safePauseMedia(el)` (`el.pause()`) |
| 8 | **Chuyển đổi (Toggle)** | `remote.toggle()` | `adapter.toggle()` hoặc helper `toggle(adapter)` | `SREMOTE_ACTIONS.TOGGLE` (`'toggle'`) | Đọc `el.paused` và dispatch `play()` / `pause()` tương ứng |
| 9 | **Dừng hẳn (Stop)** | `remote.stop()` | `adapter.stop()` (Fallback: `pause()` + `setCurrentTime(0)`) | `SREMOTE_ACTIONS.STOP` (`'stop'`) | `el.pause()`, gán `el.currentTime = 0` |

---

## 3. Seeking & Time Controls (Thời Gian & Tua)

| STT | Chức Năng | Public User Interface (Clean Fluent) | Adapter Interface (`SRemoteCustomAdapter`) | Private / Internal Action (`SREMOTE_ACTIONS` / Engine) | DOM Native Fallback (`HTMLMediaElement`) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 10 | **Tua tương đối** | `remote.seek(offset)` | `adapter.seek(offset)` (hoặc helper `seek(adapter)`) | `SREMOTE_ACTIONS.SEEK` (`'seek'`) | `el.currentTime = clamp(0, dur, el.currentTime + offset)` |
| 11 | **Tua tuyệt đối** | `remote.seekTo(sec)` | `adapter.setCurrentTime(sec)` | `SREMOTE_ACTIONS.SEEK_TO` (`'seekTo'`) / `CURRENT_TIME` | Gán `el.currentTime = clamp(0, dur, sec)` |
| 12 | **Đọc thời gian hiện tại** | `remote.state.currentTime` | `adapter.getCurrentTime()` | Snapshot state cache / `el.currentTime` | Đọc descriptor `el.currentTime` |
| 13 | **Đọc tổng thời lượng** | `remote.state.duration` | `adapter.getDuration()` | Snapshot state cache / `el.duration` | Đọc descriptor `el.duration` |

---

## 4. Audio & Volume Controls (Âm Lượng & Tắt Tiếng)

| STT | Chức Năng | Public User Interface (Clean Fluent) | Adapter Interface (`SRemoteCustomAdapter`) | Private / Internal Action (`SREMOTE_ACTIONS` / Engine) | DOM Native Fallback (`HTMLMediaElement`) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 14 | **Đặt âm lượng** | `remote.volume(val)` | `adapter.setVolume(vol: number)` (Dải chuẩn `0.0..1.0`) | `SREMOTE_ACTIONS.VOLUME` (`'volume'`) | `el.volume = clamp(0, 1, val)`; tự động un-mute nếu `val > 0` |
| 15 | **Đọc âm lượng** | `remote.state.volume` | `adapter.getVolume()` | Snapshot state cache / `el.volume` | Đọc descriptor `el.volume` |
| 16 | **Tắt/Bật tiếng** | `remote.mute(val = true)` | `adapter.setMuted(muted: boolean)` | `SREMOTE_ACTIONS.MUTE` (`'muted'`) | `el.muted = bool`; khôi phục âm lượng trước đó nếu un-mute |
| 17 | **Đọc trạng thái tắt tiếng** | `remote.state.muted` | `adapter.getMuted()` hoặc `adapter.isMuted()` | Snapshot state cache / `el.muted` | Đọc descriptor `el.muted` |

---

## 5. Playback Rate & Video Mode (Tốc Độ & Chế Độ Video)

| STT | Chức Năng | Public User Interface (Clean Fluent) | Adapter Interface (`SRemoteCustomAdapter`) | Private / Internal Action (`SREMOTE_ACTIONS` / Engine) | DOM Native Fallback (`HTMLMediaElement`) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 18 | **Đặt tốc độ phát** | `remote.speed(rate)` | `adapter.setPlaybackRate(rate: number)` | `SREMOTE_ACTIONS.SPEED` (`'speed'`) | Gán `el.playbackRate = rate` |
| 19 | **Đọc tốc độ phát** | `remote.state.playbackRate` | `adapter.getPlaybackRate()` | Snapshot state cache / `el.playbackRate` | Đọc descriptor `el.playbackRate` |
| 20 | **Bật/Tắt PiP** | `remote.pip(enable = true)` | `adapter.requestPip(bool)` hoặc `adapter.pip(bool)` | `SREMOTE_ACTIONS.PIP` (`'pip'`) / `ENTER_PIP` / `EXIT_PIP` | Gọi `el.requestPictureInPicture()` hoặc `document.exitPictureInPicture()` |

---

## 6. Media Content & Quality (Chất Lượng, Phụ Đề & Nguồn Phát - Chuẩn Hóa DTO)

| STT | Chức Năng | Public User Interface (Clean Fluent) | Adapter Interface (`SRemoteCustomAdapter`) | Private / Internal Action & DTO Schema | DOM Native Fallback (`HTMLMediaElement`) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 21 | **Nạp nguồn phát** | `remote.load(source: LoadSourceDTO)` | `adapter.load(source: LoadSourceDTO)` | Action `'load'`<br>`LoadSourceDTO = string \| { src: string, type?: string, id?: string }` | `el.src = source.src \|\| source; el.load()` |
| 22 | **Chọn chất lượng** | `remote.quality(level: string \| number)` | `adapter.setQuality(level)` | `SREMOTE_ACTIONS.QUALITY` (`'quality'`) | Không hỗ trợ native (chỉ hỗ trợ qua Adapter/HLS/Dash) |
| 23 | **Chọn phụ đề** | `remote.subtitle(track: string \| null)` | `adapter.setSubtitle(track)` | `SREMOTE_ACTIONS.SUBTITLE` (`'subtitle'`) | Bật/tắt `TextTrack` trong `el.textTracks` |

---

## 7. Playlist & Queue Controls (Danh Sách Phát & Lặp Lại)

| STT | Chức Năng | Public User Interface (Clean Fluent) | Adapter Interface (`SRemoteCustomAdapter`) | Private / Internal Action & DTO Schema | DOM Native Fallback (`HTMLMediaElement`) |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 24 | **Bài kế tiếp** | `remote.next()` | `adapter.next()` | `SREMOTE_ACTIONS.NEXT` (`'next'`) | Không hỗ trợ native (ủy quyền qua Adapter / MediaSession) |
| 25 | **Bài trước đó** | `remote.previous()` | `adapter.previous()` | `SREMOTE_ACTIONS.PREVIOUS` (`'previous'`) | Không hỗ trợ native (ủy quyền qua Adapter / MediaSession) |
| 26 | **Xáo trộn danh sách** | `remote.shuffle(enable = true)` | `adapter.setShuffle(enable: boolean)` | `SREMOTE_ACTIONS.SHUFFLE` (`'shuffle'`) | Không hỗ trợ native (ủy quyền qua Adapter) |
| 27 | **Lặp lại (Repeat)** | `remote.repeat(mode: RepeatModeDTO)` | `adapter.setRepeat(mode)` | `SREMOTE_ACTIONS.REPEAT`<br>`RepeatModeDTO = boolean \| 'off' \| 'one' \| 'all'` | Gán `el.loop = (mode === true \|\| mode === 'one')` |

---

## 8. Inspection, Tap & Reactive State (Kiểm Tra & Đọc Trạng Thái Không Đứt Chuỗi)

| STT | Chức Năng | Public User Interface (Clean Fluent) | Adapter Interface (`SRemoteCustomAdapter`) | Private / Internal Driver Interface | Ghi Chú Kiến Trúc |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 28 | **Trích xuất trạng thái trong chuỗi** | `remote.tap((state: SRemoteMediaState) => void)` | Không can thiệp | Hook nhận snapshot state sau khi các bước trước chạy xong, trả về `this` | Đọc toàn bộ trạng thái giữa chừng chuỗi mà không ngắt chuỗi |
| 29 | **Đọc snapshot trạng thái đồng bộ** | `remote.state` (getter thuộc tính đồng bộ) | Đóng góp qua `adapter.getState()` | Cache cập nhật liên tục từ `sremote:state-change` | Truy cập tức thì `.state.paused`, `.state.currentTime`, `.state.volume` không cần `await` |
| 30 | **Đọc capabilities** | `remote.capabilities` | `adapter.capabilities: SRemoteCapabilities` | `capabilities.get(target)` | Tự động phân tích các cờ tính năng (`play`, `seek`, `pip`, ...) |
| 31 | **Định danh instance** | `remote.instanceId` | Tự động sinh hoặc qua `target.dataset.sremoteId` | `instance.generateId()` | ID định danh instance do SRemote quản lý |

---

## 9. Lifecycle, Events & Driver Discovery (Vòng Đời, Sự Kiện & Discovery)

| STT | Chức Năng | Public User Interface (Clean Fluent) | Adapter Interface (`SRemoteCustomAdapter`) | Private / Internal Driver Interface | Ghi Chú Cơ Chế |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 32 | **Đăng ký sự kiện** | `remote.on(evt, handler)` / `sremote.on(...)` | `adapter.emit(evt, payload)` | `events.bind(target, handler)` / `instanceManager.globalEventListeners` | Tự động bắt `sremote:state-change`, `play`, `pause`, `timeupdate`, v.v. |
| 33 | **Hủy đăng ký sự kiện** | `remote.off(evt, handler)` / `sremote.off(...)` | Không yêu cầu | Hủy handler khỏi `WeakMap` / `Map` | Gỡ bỏ listener để tránh memory leak |
| 34 | **Discovery Handshake** | `await sremote.hello(options)` | Nhận sự kiện handshake | `SREMOTE_STORAGE_KEYS.HELLO_SEQ` + `postMessage` | Bắt tay hai chiều giữa parent window và child iframe/userscript |
| 35 | **Đăng ký Adapter** | `sremote.adapters.register(adapter, id)` | Truyền adapter tuân thủ contract | `adapterDriver.register(adapter, id)` | Đăng ký adapter với độ ưu tiên cao nhất trong pipeline |
| 36 | **Hủy đăng ký Adapter** | `sremote.adapters.unregister(id)` | Gọi `adapter.destroy?.()` | `adapterDriver.unregister(id)` | Xóa adapter khỏi driver map |
| 37 | **Dọn dẹp Lifecycle** | `provider.mount().then(r => r.destroy())` / `sremote.destroy()` | `adapter.destroy()` | `destroy()` dọn dẹp DOM element, unregister adapter, giải phóng timer | Gỡ bỏ element khỏi DOM và ngắt toàn bộ observers |
| 38 | **Transaction Tracking** | Tự động bên dưới các lệnh | Tự động nhận `isProgrammatic: true` | `pipeline.Tracker.startTransaction(action, val)` | Chống xung đột microtask và race condition khi lệnh dispatch liên tục |
| 39 | **Native Driver Discovery** | `await sremote.ready()` | Không yêu cầu | `window[Symbol.for('__sremote_native_driver__')]` / `sremote:driver:ready` | Zero-polling driver discovery (loại bỏ hoàn toàn polling 50ms) |

---

## 10. Ví Dụ Cú Pháp Minh Họa Chuẩn Clean Fluent (Zero `get*` / `set*`)

```javascript
import sremote from '@sremote/sdk';
import { YouTube } from '@sremote/ready2use';

// 1. Khởi tạo & mount (Nhận trực tiếp chainable Fluent instance)
const yt = await YouTube.mount('#player', { videoId: 'dQw4w9WgXcQ' });

// 2. Chuỗi lệnh Fluent cực kỳ thanh thoát (Không get, không set!)
await yt.remote
  .play()
  .seek(15)
  .volume(0.8)
  .speed(1.25)
  .tap(state => console.log(`Playing at ${state.currentTime}s, volume ${state.volume}`));

// 3. Đọc trạng thái đồng bộ tức thì mọi lúc (Zero await!)
console.log('Is paused?', yt.remote.state.paused);
console.log('Current time:', yt.remote.state.currentTime);
console.log('Current volume:', yt.remote.state.volume);

// 4. Lenient Mode & Error Boundary
await yt.remote
  .lenient()
  .seek(99999) // Tự động bỏ qua nếu lỗi
  .volume(0.5) // Tiếp tục thực thi
  .strict();

// 5. Multi-Instance Broadcasting (sremote.all)
// Phát đồng loạt, đổi âm lượng hoặc tạm dừng toàn bộ video/iframe trên trang:
await sremote.all('.video-player')
  .pause()
  .volume(0.3)
  .tap(states => console.log(`Controlled ${states.length} players simultaneously`));
```

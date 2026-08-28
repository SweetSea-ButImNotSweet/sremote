# API `sremote.debug` & `sremote_debug`

Bộ công cụ chẩn đoán, quét media, thao túng trực tiếp và kiểm thử (Mocking/Diagnostics) dành riêng cho Developer.

> [!NOTE]
> Bộ API Debug chỉ tồn tại khi cờ `ENABLE_DEBUG_API = true` được bật trong userscript. Khi tắt cờ này (`false`), các cổng debug sẽ hoàn toàn `undefined` để đảm bảo an toàn tuyệt đối khi phân phối.

---

## 👑 1. Bên Parent (`window.sremote.debug`)
Thao tác tổng quan từ trang cha (Top Window). Các lệnh gọi qua `.debug` **tự động Bypass Passkey & Permission** để tiện kiểm thử.

| Phương thức | Tham số | Mô tả |
| :--- | :--- | :--- |
| `scan()` | Không | Quét toàn bộ iframe trong trang, in `console.table` danh sách iframe, nguồn src, tình trạng kết nối và playback state. |
| `inspect(instanceId?)` | `instanceId?: string` | Tìm và tự động gọi `inspect(element)` của DevTools để nhảy thẳng tới thẻ `<video>`/`<iframe>` trong Elements tab. |
| `getMediaElement(instanceId?)` | `instanceId?: string` | Trả về `HTMLMediaElement` (nếu Same-Origin) hoặc thẻ `HTMLIFrameElement` trong DOM trang cha. |
| `getState(instanceId?)` | `instanceId?: string` | Lấy chi tiết toàn bộ trạng thái kỹ thuật của iframe: DOM Media Elements, MediaSession metadata & action handlers. |
| `dump(instanceId?)` | `instanceId?: string` | In báo cáo chi tiết dạng bảng trực tiếp ra DevTools Console của trang cha. |
| `play(instanceId?)` | `instanceId?: string` | Ép phát media ngay lập tức. |
| `pause(instanceId?)` | `instanceId?: string` | Ép dừng media. |
| `toggle(instanceId?)` | `instanceId?: string` | Chuyển đổi trạng thái play/pause. |
| `seek(offset, instanceId?)` | `offset: number, instanceId?: string` | Tua tương đối (cộng/trừ số giây). |
| `seekTo(time, instanceId?)` | `time: number, instanceId?: string` | Tua trực tiếp đến mốc thời gian (giây). |
| `setVolume(vol, instanceId?)` | `vol: number (0 -> 1 hoặc 0 -> 100), instanceId?: string` | Điều chỉnh âm lượng. |
| `setMute(muted?, instanceId?)` | `muted?: boolean, instanceId?: string` | Bật/tắt chế độ câm tiếng. |
| `setRate(rate, instanceId?)` | `rate: number (0.25 -> 4.0), instanceId?: string` | Điều chỉnh tốc độ phát. |
| `toggleLoop(instanceId?)` | `instanceId?: string` | Bật / tắt chế độ lặp lại video/audio. |
| `setSource(source, instanceId?)` | `source: string \| Blob \| File, instanceId?: string` | Gán đè URL hoặc Blob nguồn phát mới cho media. |
| `injectTestTone(freq?, dur?, instanceId?)` | `freq = 440, dur = 3, instanceId?: string` | Tự sinh file WAV PCM sóng Sine (tiếng Beep tần số `freq` Hz) nạp thẳng vào player. |
| `injectSilentTrack(dur?, instanceId?)` | `dur = 5, instanceId?: string` | Nạp file WAV PCM im lặng (test timeline/clock). |
| `injectWhiteNoise(dur?, instanceId?)` | `dur = 3, instanceId?: string` | Nạp file WAV White Noise kiểm tra output âm thanh. |
| `injectSampleVideo(instanceId?)` | `instanceId?: string` | Nạp video MP4 mẫu của Mozilla (`flower.mp4`). |
| `simulateStall(instanceId?)` | `instanceId?: string` | Giả lập phát sinh sự kiện `waiting` và `stalled` (kiểm tra UI buffering). |
| `restoreOriginal(instanceId?)` | `instanceId?: string` | Phục hồi lại nguồn phát media ban đầu trước khi bị inject. |

---

## 🛠️ 2. Bên Iframe Con (`window.sremote_debug`)
Dành cho lúc bạn mở DevTools và chuyển context console vào thẳng iframe đó.

| Thuộc tính / Phương thức | Mô tả |
| :--- | :--- |
| `sremote_debug.activeMedia` | Trả về trực tiếp phần tử `HTMLMediaElement` đang được SRemote quản lý. |
| `sremote_debug.inspect()` | Tự động gọi `inspect(activeMedia)` để DevTools nhảy ngay tới thẻ `<video>`/`<audio>` trong Elements tab. |
| `sremote_debug.getAllMedia()` | Trả về mảng danh sách toàn bộ các thẻ `<video>`, `<audio>` trong DOM & Pool. |
| `sremote_debug.getState()` | Lấy đối tượng trạng thái video (`getVideoState()`). |
| `sremote_debug.getMediaSession()` | Xem thông tin metadata và danh sách action handlers của `navigator.mediaSession`. |
| `sremote_debug.dump(index = 0)` | In bảng thông số kỹ thuật chi tiết của media phần tử thứ `index` ra Console. |
| `sremote_debug.setSource(url, index = 0)` | Đổi source của media thành URL chỉ định. |
| `sremote_debug.setBlob(blobOrFile, index = 0)` | Đổi source của media bằng đối tượng `Blob` hoặc `File`. |
| `sremote_debug.playTone(freq = 440, duration = 3, index = 0)` | Sinh sóng Sine Beep và phát ngay trên media. |
| `sremote_debug.playSilent(duration = 5, index = 0)` | Phát track âm thanh im lặng. |
| `sremote_debug.playNoise(duration = 3, index = 0)` | Phát track âm thanh White Noise. |
| `sremote_debug.restoreOriginal(index = 0)` | Khôi phục lại source ban đầu. |
| `sremote_debug.setCSS(css)` | Inject/cập nhật CSS động trực tiếp từ bên trong iframe. |
| `sremote_debug.getCSS()` | Lấy CSS động hiện tại của iframe. |
| `sremote_debug.removeCSS()` | Xóa CSS động của iframe. |

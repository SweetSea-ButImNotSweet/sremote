# Danh sách API SRemote

Tất cả các hàm được cung cấp qua đối tượng toàn cục `window.sremote` (hoặc instance client từ `@sremote/wrapper`).

---

## 0. Gói mở rộng: SRemote Ready2use (`@sremote/ready2use`)

👉 **Xem chi tiết tài liệu API:** **[SRemote Ready2use API Guide](./ready2use.md)**

Bộ Preset và Adapter dựng sẵn cho YouTube, Vimeo, Spotify, SoundCloud, Twitch, Dailymotion, TikTok, Mixcloud, NicoNico, Bilibili, Facebook.

```javascript
import { youtube } from '@sremote/ready2use';

const { remote } = await youtube.mount('#player-container', { videoId: 'dQw4w9WgXcQ' });
await remote.play();
```

---

## 1. Bảng các hàm API theo Domain


### 📡 A. Vòng đời, Sự kiện & Bảo mật
Khởi tạo bắt tay kết nối, quản lý lắng nghe sự kiện, đồng bộ metadata và bảo mật phiên:

| Hàm API | Cú pháp | Mô tả |
| :--- | :--- | :--- |
| **Phát lệnh chào** | `hello(options?, target?)` | Phát tín hiệu bắt tay tìm kiếm các frame con trong trang |
| **Lắng nghe sự kiện** | `on(event, handler, key?)` | Đăng ký lắng nghe sự kiện từ iframe/adapter (hỗ trợ `'*'`) |
| **Hủy lắng nghe** | `off(event, handler)` | Hủy đăng ký listener |
| **Khóa Session** | `lock(passkey?)` | Khóa bảo vệ phiên điều khiển của trang |
| **Metadata** | `bindMetadata(meta, instanceId?, key?)` | Cập nhật thông tin bài hát / video (Title, Artist, Artwork...) |

---

### 🎮 B. Điều khiển phát nhanh (Root Quick Controls)
Các hàm điều khiển phát nhanh tác động lên instance đang active (hoặc instance được chỉ định):

| Hàm API | Cú pháp | Mô tả |
| :--- | :--- | :--- |
| **Phát** | `play(instanceId?, key?)` | Gửi yêu cầu phát media |
| **Tạm dừng** | `pause(instanceId?, key?)` | Tạm dừng phát media |
| **Bật / Dừng toggle** | `toggle(instanceId?, key?)` | Đảo trạng thái giữa phát và tạm dừng |
| **Dừng hẳn** | `stop(instanceId?, key?)` | Dừng phát và đưa currentTime về 0 |
| **Tua tương đối** | `seek(offset, instanceId?, key?)` | Tua tiến (+) hoặc lùi (-) theo số giây |
| **Tua tuyệt đối** | `seekTo(time, instanceId?, key?)` | Nhảy đến mốc thời gian cụ thể (giây) |
| **Âm lượng** | `volume(vol, instanceId?, key?)` | Thiết lập âm lượng từ `0.0` đến `1.0` |
| **Tắt / Bật tiếng** | `mute(muted?, instanceId?, key?)` | Bật/tắt mute hoặc đảo trạng thái |
| **Tốc độ phát** | `rate(speed, instanceId?, key?)`<br>`playbackRate(speed, instanceId?, key?)` | Đổi tốc độ phát (0.25 - 4.0) |
| **Tải nguồn phát mới** | `load(source, instanceId?, key?)` | Nạp nguồn/video mới (ID video, URL hoặc object cấu hình) |
| **Độ phân giải / Quality** | `quality(level, instanceId?, key?)`<br>`getQualities(instanceId?, key?)` | Thiết lập hoặc lấy danh sách chất lượng video (`'1080p'`, `'720p'`, `'auto'`) |
| **Phụ đề / Subtitle** | `subtitle(track, instanceId?, key?)`<br>`getSubtitles(instanceId?, key?)` | Bật/tắt phụ đề (`'vi'`, `'en'`, `null`) hoặc lấy danh sách subtitle tracks |
| **Trộn bài / Shuffle** | `shuffle(enable?, instanceId?, key?)` | Bật/tắt hoặc toggle chế độ phát ngẫu nhiên playlist |
| **Lặp lại / Repeat** | `repeat(mode?, instanceId?, key?)` | Đặt chế độ lặp lại (`'off'`, `'all'`, `'one'`) |
| **Bài kế tiếp / Next** | `next(instanceId?, key?)` | Chuyển sang bài hát / video tiếp theo trong playlist |
| **Bài trước / Previous** | `previous(instanceId?, key?)` | Quay lại bài hát / video trước đó |
| **Picture-in-Picture** | `pip(enable?, instanceId?, key?)` | Bật / tắt hoặc toggle chế độ PiP |
| **Trạng thái media** | `status(instanceId?, key?)` | Lấy state hiện tại của media instance |
| **Tính năng hỗ trợ** | `capabilities(instanceId?, key?)` | Lấy danh sách capabilities/tính năng hỗ trợ của player hoặc adapter |

---

### 🗂️ C. Quản lý Instance (`sremote.instances`)

| Hàm API | Cú pháp | Mô tả |
| :--- | :--- | :--- |
| **Gán trước ID** | `instances.assign(iframeOrSelector, customId)` | Gán trước instanceId cho thẻ iframe trước khi bắt tay |
| **Lấy phần tử Iframe** | `instances.getIframe(instanceId, key?)` | Lấy thẻ `HTMLIFrameElement` tương ứng trên Parent DOM |
| **Lấy thông tin / State** | `instances.get(instanceId, key?)` | Lấy thông tin trạng thái media của instance |
| **Lấy Capabilities**| `instances.capabilities(instanceId?, key?)` | Lấy ma trận tính năng hỗ trợ của instance hoặc adapter |
| **Danh sách Instance** | `instances.list(key?)` | Liệt kê tất cả các instance & adapter đang kết nối |
| **Chế độ đa media** | `instances.setMultiMode(mode, key?)` | Cấu hình ép buộc Multi-mode (`true`), Single-mode (`false`) hoặc Auto (`null`) |
| **Kiểm tra đa media** | `instances.isMultiMode(key?)` | Kiểm tra xem trang có đang chạy ở chế độ đa media không |
| **Chế độ độc quyền** | `instances.setExclusive(mode, key?)` | Thiết lập phát độc quyền (`'auto'` / `instanceId` / `null`) |
| **Quét chủ động GM** | `instances.query(key?)` | Kích hoạt quét tìm các frame đang phát ngầm qua GM Storage |
| **Ghi chú Instance** | `instances.note(dict, key?)` | Đặt nhãn/ghi chú gợi nhớ cho các instance |

---

### 🔌 D. Custom Adapter Subsystem (`sremote.adapters`)

| Hàm API | Cú pháp | Mô tả |
| :--- | :--- | :--- |
| **Tạo Universal Adapter** | `createUniversalAdapter(options)` | Tạo adapter chuẩn hóa để bọc bất kỳ trình phát tùy biến nào của trang |
| **Đăng ký Adapter** | `adapters.register(adapter, instanceId?, key?)` | Đăng ký một custom adapter cho player nhúng đặc thù (YouTube, SoundCloud, Spotify, Vimeo...) |
| **Hủy Adapter** | `adapters.unregister(instanceId?, key?)` | Gỡ bỏ adapter đã đăng ký khỏi hệ thống |
| **Lấy Adapter** | `adapters.get(instanceId?, key?)` | Lấy đối tượng adapter đang hoạt động |


---

### ⚡ E. Giao tiếp & RPC Subsystem (`sremote.rpc`)

| Hàm API | Cú pháp | Mô tả |
| :--- | :--- | :--- |
| **Gọi RPC** | `rpc.call(action, params?, instanceId?, key?)` | Gọi thực thi một RPC action tùy biến từ Parent xuống Iframe |
| **Gửi Window Message** | `rpc.postMessage(message, targetOrigin?, instanceId?, from?, key?)` | Gửi thông điệp postMessage bắc cầu xuống cửa sổ iframe |
| **Lắng nghe Frame Msg** | `rpc.onMessage(handler, key?)` | Lắng nghe các thông điệp do iframe gửi ngược lên |

---

### 🎨 F. Tùy biến CSS Iframe (`sremote.css`)

| Hàm API | Cú pháp | Mô tả |
| :--- | :--- | :--- |
| **Áp dụng CSS** | `css.set(cssText, instanceId?, key?)` | Inject mã CSS trực tiếp vào bên trong iframe |
| **Đọc CSS hiện tại** | `css.get(instanceId?, key?)` | Lấy chuỗi CSS đang áp dụng trong iframe |
| **Xóa CSS** | `css.remove(instanceId?, key?)` | Gỡ bỏ toàn bộ CSS động đã inject trong iframe |

---

### 🛠️ G. Bộ công cụ chẩn đoán (`sremote.debug`)

| Hàm API | Cú pháp | Mô tả |
| :--- | :--- | :--- |
| **Quét DOM** | `debug.scan()` | Quét toàn bộ iframe trong trang và xuất bảng báo cáo |
| **Đọc trạng thái chi tiết**| `debug.getState(instanceId?)` | Lấy chi tiết state, media elements & MediaSession |
| **Dump ra console** | `debug.dump(instanceId?)` | In bảng chi tiết mọi thuộc tính media ra DevTools console |
| **Đổi nguồn phát test** | `debug.setSource(url, instanceId?)` | Thay thế nguồn video/audio bằng URL hoặc Blob tùy ý |
| **Tạo âm thanh Sine** | `debug.injectTestTone(freq?, dur?, instanceId?)` | Tạo file WAV âm thanh tần số tùy chọn (mặc định 440Hz) |
| **Tạo khoảng lặng** | `debug.injectSilentTrack(dur?, instanceId?)` | Tạo file WAV im lặng để test autoplay/permissions |
| **Tạo nhiễu trắng** | `debug.injectWhiteNoise(dur?, instanceId?)` | Tạo file WAV white noise |
| **Mô phỏng nghẽn mạng** | `debug.simulateStall(instanceId?)` | Bắn sự kiện `waiting` và `stalled` |
| **Khôi phục nguồn gốc** | `debug.restoreOriginal(instanceId?)` | Khôi phục lại URL media ban đầu trước khi debug |

---

## 2. Bảng các sự kiện (Events)

Các sự kiện được phát từ iframe/adapter và có thể đăng ký lắng nghe qua hàm `sremote.on(event, handler)`:

| Nhóm sự kiện | Tên sự kiện | Giải thích ý nghĩa |
| :--- | :--- | :--- |
| **Vòng đời & Kết nối** | `accept` | Bắt tay thành công và sẵn sàng nhận lệnh điều khiển media. |
| | `disconnect` | Iframe bị đóng, chuyển trang hoặc ngắt kết nối. |
| | `mediadisconnected` | Phần tử media bên trong iframe bị gỡ khỏi DOM hoặc bị huỷ. |
| **Giao tiếp Frame** | `iframe:message` / `message` | Nhận message do iframe gửi lên qua cầu nối. |
| **Trạng thái phát Media** | `play` | Bắt đầu yêu cầu phát media. |
| | `pause` | Media chuyển sang trạng thái tạm dừng. |
| | `playing` | Media thực sự đang chạy sau khi đã nạp đủ dữ liệu/vượt qua chờ đệm. |
| | `almostend` | Báo hiệu audio/video sắp hết (còn ~0.8s). Thường dùng xử lý cho các iframe tự huỷ nguồn phát khi chạm mốc kết thúc. |
| | `ended` | Media đã phát đến hết thời lượng. |
| | `timeupdate` | Thời gian phát hiện tại thay đổi liên tục theo tiến độ. |
| | `durationchange` | Tổng thời lượng của media được xác định hoặc cập nhật lại. |
| | `volumechange` | Âm lượng hoặc trạng thái tắt tiếng bị thay đổi. |
| | `ratechange` | Tốc độ phát (playbackRate) thay đổi. |
| | `seeking` | Bắt đầu thao tác tua thời gian. |
| | `seeked` | Đã hoàn tất thao tác tua đến mốc mới. |
| **Tải & Đệm dữ liệu** | `loadstart` | Bắt đầu nạp dữ liệu media. |
| | `loadedmetadata` | Đã tải xong thông tin kích thước, thời lượng và định dạng media. |
| | `loadeddata` | Đã nạp xong frame đầu tiên của media. |
| | `canplay` | Đã có thể phát được (nhưng có thể phải dừng lại để đệm tiếp). |
| | `canplaythrough` | Ước tính có đủ dữ liệu đệm để phát mượt đến hết mà không bị gián đoạn. |
| | `progress` | Trình duyệt đang tải tiếp các phân đoạn dữ liệu đệm. |
| | `waiting` | Media phải tạm dừng phát do đang chờ đệm thêm dữ liệu. |
| | `stalled` | Quá trình tải dữ liệu từ server bị nghẽn hoặc dừng đột ngột. |
| | `suspend` | Quá trình tải dữ liệu tạm dừng có chủ đích (ví dụ đã đệm đủ). |
| | `emptied` | Nguồn phát media bị xóa rỗng hoặc reset. |
| | `abort` | Tiến trình nạp media bị hủy ngang trước khi tải xong hoàn toàn. |
| | `error` | Xảy ra lỗi trong quá trình nạp hoặc giải mã media. |
| | `encrypted` | Media được mã hóa bản quyền (DRM) và đang khởi tạo luồng giải mã. |
| **Picture-in-Picture** | `enterpictureinpicture` | Video vừa chuyển sang chế độ cửa sổ nổi thu nhỏ (PiP). |
| | `exitpictureinpicture` | Video vừa thoát khỏi chế độ Picture-in-Picture. |
| **Chế độ đa Media & Cảnh báo** | `singleMediaDetected` | Phát hiện chỉ có đúng 1 media instance đang hoạt động. |
| | `multipleMediaDetected` | Phát hiện có từ 2 media instance trở lên cùng xuất hiện trong trang. |
| | `whereIsInstanceID` | Cảnh báo khi có nhiều media cùng hoạt động nhưng lệnh gọi lại không truyền `instanceId` chỉ định. |

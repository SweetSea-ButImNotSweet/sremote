# Nhật ký thay đổi (Changelog)

Tất cả các thay đổi đáng chú ý của dự án sẽ được ghi lại trong tài liệu này.

Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/lang/vi/).

---

## [2.1.0] - 2026-09-03

SRemote v2.1.0 là bản cập nhật tính năng lớn và nâng cao độ ổn định. Phiên bản này mở rộng khả năng tương thích nền tảng trong `@sremote/ready2use` bằng cách thêm 7 provider mới, cải tiến hoàn toàn tích hợp Facebook Video, tối ưu kiến trúc vòng đời player và khắc phục nhiều lỗi rò rỉ bộ nhớ cũng như runtime quan trọng.

### 🚀 Tính năng mới (Added)

- **7 Provider Nền tảng Mới (`@sremote/ready2use`)**:
  - **Twitter / X (`twitter`)**: Khởi tạo và điều khiển video tweet nhúng thông qua Twitter Widgets JS SDK chính thức (`platform.twitter.com/widgets.js`).
  - **PeerTube (`peertube`)**: Hỗ trợ điều khiển 2 chiều cho các instance PeerTube phi tập trung qua `@peertube/embed-api` (`play`, `pause`, `seek`, `volume`, `rate` và đồng bộ trạng thái).
  - **Rumble (`rumble`)**: Tự động nhận diện và tích hợp điều khiển cho video HTML5 nhúng (`rumble.com/embed/...`).
  - **Kick (`kick`)**: Tích hợp sẵn điều khiển trình phát livestream Kick (`player.kick.com/...`).
  - **Streamable (`streamable`)**: Điều khiển phát mượt mà cho các video clip HTML5 nhúng (`streamable.com/e/...`).
  - **Odysee / LBRY (`odysee`)**: Hỗ trợ điều khiển phát cho video nhúng phi tập trung (`odysee.com/$/embed/...`).
  - **Bandcamp (`bandcamp`)**: Hỗ trợ widget trình phát nhạc nhúng Bandcamp với khả năng nạp album và track động.
- **Nâng cấp Kiến trúc (`BaseProvider`)**:
  - **Pipeline Hợp nhất (`_instantiate`)**: Chuẩn hóa luồng khởi tạo và gắn DOM nhằm chống lệch trạng thái.
  - **Tự động suy luận tính năng & Fallbacks**: Adapter tự động cung cấp hàm `toggle()` dự phòng (nếu có `play` và `pause`) và tự phát hiện capability flags.
  - **Tự động dọn dẹp Remote Teardown**: Khi gọi `destroy()`, adapter sẽ tự động hủy đăng ký khỏi registry của SRemote instance (`remote.adapters.unregister`).
  - **Tiện ích chờ DOM sẵn sàng**: Thêm helper `waitForIframeLoad` kèm cấu hình timeout đảm bảo iframe sẵn sàng trước khi bắt tay trao đổi postMessage.
- **Tài liệu & Recipes**:
  - Bổ sung bộ công thức mẫu chạy trực tiếp (recipes) cho cả 7 nền tảng mới (hỗ trợ cả Vanilla JS và SDK `@sremote/wrapper`).
  - Hỗ trợ đa ngôn ngữ hoàn chỉnh (i18n) cho ghi chú, chú thích và mô tả nền tảng (Tiếng Việt & Tiếng Anh).

### 🔄 Thay đổi (Changed)

- **Cải tiến Tích hợp Facebook Video Player**:
  - Thay thế cách nhúng iframe tĩnh bằng tích hợp sâu với **Facebook JavaScript SDK (`connect.facebook.net/en_US/sdk.js`)**.
  - Đăng ký sự kiện `xfbml.ready` để liên kết controller với giao diện SRemote Adapter (`play`, `pause`, `seek`, `volume`, `mute` và cập nhật trạng thái phát thời gian thực).
- **Chuyển đổi URL SDK Dailymotion**: Cập nhật các recipe nhúng Dailymotion sang endpoint CDN mới tại `https://geo.dailymotion.com/libs/player.js`.
- **Cấu hình & Phụ thuộc**:
  - Đồng bộ phiên bản tất cả các package trong monorepo lên `v2.1.0`.
  - Bổ sung `tarballs/**` và `**/dist/**` vào danh sách bỏ qua của ESLint Flat Config.
  - Tinh gọn cấu hình Knip.
  - Nâng cấp các thư viện phụ thuộc: RollDown (`1.2.7`), Knip (`6.34.0`), Zod (`4.5.4`).

### 🐛 Sửa lỗi (Fixed)

- **Lỗi `ReferenceError` trong Spotify Provider**: Khắc phục lỗi nghiêm trọng trong sự kiện `playback_update` khi biến `currentTime` chưa được khai báo nhưng bị truy cập trực tiếp dẫn đến crash runtime.
- **Bảo vệ chống Instance giả lập trong `resolveSRemote`**: Khắc phục tình trạng provider gắn nhầm vào dummy object thông qua kiểm tra `!window.sremote.isDummy`, `!globalThis.sremote.isDummy` và ưu tiên `Symbol.for('__sremote_client__')`.
- **Chống rò rỉ bộ nhớ khi hủy (Teardown Memory Leaks)**: Thêm hook `destroy()` chuyên biệt cho các adapter **TikTok**, **NicoNico** và **YouTube** để gỡ bỏ window message listeners (`removeEventListener`) và hủy timer `timeupdate`.
- **Trích xuất Video ID Bilibili chuẩn xác**: Xử lý triệt để các trường hợp truyền options object lồng nhau, chuỗi `BV`/`av` thô hoặc URL `bilibili.com` đầy đủ.
- **Khắc phục giới hạn Vimeo oEmbed**: Thay thế cơ chế wrap DOM ngầm định của SDK bằng việc tạo thẻ `<iframe>` trực tiếp (`autoplay`, `muted`, `loop`, `api=1`) kết hợp kiểm soát timeout chống treo tiến trình mount.
- **Dọn dẹp SoundCloud an toàn**: Bổ sung kiểm tra `SC.Widget.Events` trước khi gỡ listener trong `destroy()`, ngăn ngừa lỗi unmount sớm.
- **Sửa lỗi Mount Container tùy biến**: Xử lý lỗi trùng lặp và tách rời phần tử khi truyền target `container` tùy biến trong provider **YouTube**, **Dailymotion** và **Spotify**.

### ⚠️ Tinh gọn & Gỡ bỏ API Cũ (Removed & Breaking Cleanups)

Nhằm chuẩn hóa bề mặt API, loại bỏ các alias trùng lặp gây rối và tối ưu hóa kiểu gõ TypeScript:

- **Loại bỏ các Alias dư thừa trên `SRemoteClient` / `sremote`**:
  - `sremote.rate()` và `sremote.playbackRate()` (đã chuẩn hóa dùng `sremote.speed()`).
  - `sremote.getCapabilities()` (chuẩn hóa dùng `sremote.capabilities()` hoặc `sremote.instances.capabilities()`).
  - `sremote.useAdapter()` / `sremote.removeAdapter()` / `sremote.getCustomAdapter()` (chuẩn hóa vào namespace `sremote.adapters.*`: `register`, `unregister`, `get`).
  - `sremote.promptUserscript()` (chuẩn hóa dùng `sremote.showInstallModal()`).
  - `sremote.adapters.set()` (chuẩn hóa dùng `sremote.adapters.register()`).
- **Tinh gọn Export của Module & Factory**:
  - Bỏ alias `createSRemoteClient` cũ (chuẩn hóa sang hàm khởi tạo `createSRemote`).
  - Ngừng re-export `lockGlobalSRemoteIfAbsent` và `promptUserscript` từ `@sremote/wrapper`.
- **Gỡ bỏ Tính năng Thử nghiệm & Chuyển sang Tự động**:
  - `sremote.bindMediaSession`: Gỡ bỏ hàm thủ công `bindMediaSession()` vì hiện tại SRemote đã **tự động liên kết và đồng bộ với `navigator.mediaSession`** của trình duyệt bất cứ khi nào có thể. Lập trình viên chỉ cần gọi `bindMetadata()` khi muốn tùy biến siêu dữ liệu bài hát/video.
  - Hàm nội bộ không dùng `getMediaPort` trong iframe handshake.

---

## [2.0.0] - 2026-08-20

- Phiên bản kiến trúc monorepo lớn đầu tiên của SRemote.
- Bộ điều khiển khung người dùng (Userscript Frame Controller) & SDK `@sremote/wrapper`.
- Cung cấp sẵn các provider Ready2Use cho YouTube, Spotify, Soundcloud, Vimeo, Bilibili, TikTok, Twitch, Dailymotion, Niconico.

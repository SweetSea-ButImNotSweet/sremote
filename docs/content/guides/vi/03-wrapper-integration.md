# 03. Cài đặt SRemote Wrapper & Bắt đầu tích hợp

Tài liệu này hướng dẫn cách nhúng thư viện `SRemote Wrapper` vào trang web của bạn và viết mã điều khiển trình phát media.

---

## 1. Cách tích hợp nhanh nhất: `@sremote/ready2use` (Khuyên dùng)

Nếu bạn muốn nhúng ngay các nền tảng video/nhạc phổ biến (YouTube, Vimeo, Spotify, SoundCloud, Twitch, TikTok...) mà **không muốn tự nhúng SDK bên thứ 3 hay tự viết Adapter thủ công**:

```bash
# npm
npm install @sremote/ready2use @sremote/wrapper

# pnpm
pnpm add @sremote/ready2use @sremote/wrapper
```

Chỉ cần gọi `mount()` để tự động tạo iframe, tải SDK và liên kết SRemote trong 1 dòng lệnh:

```javascript
import { youtube, vimeo, spotify } from '@sremote/ready2use';

// Gắn và điều khiển YouTube
const { remote } = await youtube.mount('#player-container', {
  videoId: 'dQw4w9WgXcQ'
});

// Điều khiển qua SRemote
await remote.play();
await remote.seek(30);
await remote.volume(0.8);
await remote.load('M7lc1UVf-VE'); // Đổi video khác
```

👉 Xem chi tiết danh sách tất cả các provider và hướng dẫn tạo custom provider tại **[Tài liệu SRemote Ready2use API](../../api/vi/ready2use.md)**.

---

## 2. Nạp SRemote Wrapper độc lập (Dành cho Iframe tự quản lý)

Nếu bạn đã có sẵn thẻ `<iframe>` trong HTML hoặc sử dụng các trình phát tùy biến, bạn có thể nạp `@sremote/wrapper` trực tiếp:

### Cách A: Cài đặt qua NPM (Dành cho React, Vue, Vite, Next.js...)
```bash
npm install @sremote/wrapper
```

Sau đó khởi tạo:
```javascript
import { createSRemote } from '@sremote/wrapper';

const remote = createSRemote();
await remote.ready();
```

### Cách B: Sử dụng thẻ `<script>` (Khuyên dùng cho HTML tĩnh)
Thêm file wrapper vào đầu thẻ `<head>` của trang:

```html
<script src="dist/sremote.wrapper.min.js"></script>
```

> [!TIP]
> **Thứ tự nạp script (Best Practice):**  
> Hãy luôn nạp hoặc khởi tạo `@sremote/wrapper` **càng sớm càng tốt trong `<head>`**, trước các script quảng cáo, analytics hoặc iframe bên thứ 3.  
> Nếu người dùng chưa cài Userscript, `@sremote/wrapper` sẽ tự động đóng băng và bảo vệ biến toàn cục `window.sremote` bằng một **Proxy an toàn (non-writable)**, ngăn chặn triệt để nguy cơ các script độc hại giả mạo hoặc chiếm quyền `window.sremote`.

---

## 3. Vòng đời bắt tay & Điều khiển cơ bản

Mô hình hoạt động chuẩn của SRemote gồm 2 bước: **Đăng ký sự kiện** → **Gửi lời chào `hello()`**.

```javascript
// 1. Đăng ký nhận sự kiện khi iframe kết nối thành công
window.sremote.on('accept', (data) => {
  console.log('✅ Đã kết nối với media:', data.instanceId);
  console.log('Loại media:', data.mediaType); // 'video' | 'audio' | 'mediasession' | 'adapter'
});

// 2. Lắng nghe tiến độ phát thời gian thực
window.sremote.on('timeupdate', (data) => {
  const { currentTime, duration } = data.state;
  console.log(`⏱️ Tiến độ: ${Math.round(currentTime)}s / ${Math.round(duration)}s`);
});

// 3. Kích hoạt handshake tìm kiếm iframe khi trang đã tải xong
document.addEventListener('DOMContentLoaded', () => {
  window.sremote.hello();
});
```

---

## 4. Các lệnh điều khiển phát phổ biến

Sau khi kết nối, bạn có thể gọi các API điều khiển mọi lúc:

```javascript
// Phát / Tạm dừng / Chuyển đổi trạng thái
window.sremote.play();
window.sremote.pause();
window.sremote.toggle();

// Tua tiến/lùi hoặc nhảy đến giây cụ thể
window.sremote.seek(10);     // Tua tới 10 giây
window.sremote.seek(-10);    // Tua lùi 10 giây
window.sremote.seekTo(120);  // Nhảy tới phút thứ 2 (120s)

// Chỉnh âm lượng & Tắt tiếng
window.sremote.volume(0.7);  // Âm lượng 70%
window.sremote.mute();       // Bật/tắt mute

// Tải nguồn phát mới (Dành cho Custom Adapters như YouTube loadVideoById)
window.sremote.load('M7lc1UVf-VE');
```

---

## 5. Tự viết Adapter bằng `adapters.set` hay `BaseProvider`?

- **Dùng `sremote.adapters.set()` / `sremote.adapters.register()`**: Nếu bạn đã có sẵn thẻ iframe trên website và chỉ cần viết một adapter object nhỏ để ánh xạ các hàm `play()`, `pause()`, `seekTo()`.
- **Kế thừa `BaseProvider`**: Nếu bạn muốn tạo một package / provider định sẵn hoàn chỉnh để tái sử dụng, tự động nạp SDK và cung cấp cả `mount()` lẫn `create()`.

👉 Xem chi tiết tại **[Tài liệu SRemote Ready2use API](../../api/vi/ready2use.md)**.

---

## 6. Tham khảo các mẫu tích hợp thực tế

Nếu bạn muốn xem trọn vẹn code mẫu cho React, Vue, hoặc tích hợp Custom Adapter SDK (YouTube, Spotify, SoundCloud):

👉 Hãy xem ngay trang **[Hướng dẫn triển khai (Recipes)](../../recipes.html)** để copy code mẫu chạy ngay!

---

## ⏭️ Bước tiếp theo
Sau khi viết mã kết nối, hãy tiếp tục sang **[04. Thử nghiệm & Chẩn đoán](./04-testing-debugging.md)** để kiểm tra trạng thái hoạt động thực tế.


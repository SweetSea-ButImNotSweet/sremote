# 03. Cài đặt SRemote Wrapper & Bắt đầu tích hợp

Tài liệu này hướng dẫn cách nhúng thư viện `SRemote Wrapper` vào trang web của bạn và lập trình điều khiển trình phát media.

---

## 1. Cách tích hợp nhanh nhất: `@sremote/ready2use` (Khuyến nghị)

Nếu bạn muốn nhúng ngay các nền tảng video/nhạc phổ biến (YouTube, Vimeo, Spotify, SoundCloud, Twitch, TikTok...) mà **không muốn mất công nhúng SDK bên thứ ba hay tự viết Adapter thủ công**:

```bash
# npm
npm install @sremote/ready2use @sremote/wrapper

# pnpm
pnpm add @sremote/ready2use @sremote/wrapper
```

Chỉ cần gọi `mount()` để tự động tạo iframe, nạp SDK nền tảng và liên kết với SRemote chỉ trong 1 dòng lệnh:

```javascript
import { youtube, vimeo, spotify } from '@sremote/ready2use';

// Khởi tạo và gắn trình phát YouTube vào container
const { remote } = await youtube.mount('#player-container', {
  videoId: 'dQw4w9WgXcQ'
});

// Điều khiển qua SRemote
await remote.play();
await remote.seek(30);
await remote.volume(0.8);
await remote.load('M7lc1UVf-VE'); // Đổi sang video khác
```

👉 Xem danh sách chi tiết các provider hỗ trợ và hướng dẫn tạo custom provider tại **[Tài liệu SRemote Ready2use API](../../api/vi/ready2use.md)**.

---

## 2. Nạp SRemote Wrapper độc lập (Dành cho Iframe tự quản lý)

Nếu bạn đã có sẵn thẻ `<iframe>` trong HTML hoặc sử dụng các trình phát tùy biến, bạn có thể nạp gói `@sremote/wrapper` trực tiếp:

### Cách A: Cài đặt qua NPM (Phù hợp với React, Vue, Vite, Next.js...)
```bash
npm install @sremote/wrapper
```

Sau đó khởi tạo:
```javascript
import { createSRemote } from '@sremote/wrapper';

const remote = createSRemote();
await remote.ready();
```

### Cách B: Nhúng trực tiếp qua thẻ `<script>` (Phù hợp với trang HTML tĩnh)
Thêm file wrapper vào đầu thẻ `<head>` của trang:

```html
<script src="dist/sremote.wrapper.min.js"></script>
```

> [!TIP]
> **Thứ tự nạp script tối ưu (Best Practice):**
> Hãy nạp hoặc khởi tạo `@sremote/wrapper` **càng sớm càng tốt trong thẻ `<head>`**, trước khi các script quảng cáo, analytics hoặc iframe bên thứ ba được tải.
> Nếu người dùng chưa cài Userscript, `@sremote/wrapper` sẽ tự động đóng băng và bảo vệ đối tượng toàn cục `window.sremote` bằng một **Proxy an toàn (non-writable)**, giúp ngăn chặn triệt để nguy cơ bị các script lạ giả mạo hoặc ghi đè `window.sremote`.

---

## 3. Vòng đời bắt tay & Điều khiển cơ bản

Mô hình hoạt động tiêu chuẩn của SRemote gồm 2 bước: **Đăng ký sự kiện** → **Gửi tín hiệu bắt tay `hello()`**.

```javascript
// 1. Đăng ký nhận sự kiện khi iframe kết nối thành công
window.sremote.on('accept', (data) => {
  console.log('✅ Đã kết nối với media instance:', data.instanceId);
  console.log('Loại media:', data.mediaType); // 'video' | 'audio' | 'mediasession' | 'adapter'
});

// 2. Lắng nghe tiến độ phát theo thời gian thực
window.sremote.on('timeupdate', (data) => {
  const { currentTime, duration } = data.state;
  console.log(`⏱️ Tiến độ: ${Math.round(currentTime)}s / ${Math.round(duration)}s`);
});

// 3. Kích hoạt handshake để tìm kiếm iframe sau khi trang đã tải xong DOM
document.addEventListener('DOMContentLoaded', () => {
  window.sremote.hello();
});
```

---

## 4. Các lệnh điều khiển phát phổ biến

Sau khi kết nối hoàn tất, bạn có thể gọi các API điều khiển bất kỳ lúc nào:

```javascript
// Phát / Tạm dừng / Đổi trạng thái phát
window.sremote.play();
window.sremote.pause();
window.sremote.toggle();

// Tua tiến, tua lùi hoặc nhảy đến mốc thời gian cụ thể
window.sremote.seek(10);     // Tua tiến 10 giây
window.sremote.seek(-10);    // Tua lùi 10 giây
window.sremote.seekTo(120);  // Nhảy tới giây thứ 120 (phút thứ 2)

// Chỉnh âm lượng & Bật/Tắt tiếng
window.sremote.volume(0.7);  // Đặt âm lượng 70%
window.sremote.mute();       // Bật hoặc tắt chế độ im lặng

// Nạp nguồn phát mới (Dành cho Custom Adapters như YouTube loadVideoById)
window.sremote.load('M7lc1UVf-VE');
```

---

## 5. Khi nào nên dùng `adapters.set` và khi nào nên kế thừa `BaseProvider`?

- **Sử dụng `sremote.adapters.set()` / `sremote.adapters.register()`**: Khi bạn đã có sẵn thẻ iframe trên trang và chỉ cần viết một adapter object gọn nhẹ để map các hàm `play()`, `pause()`, `seekTo()`.
- **Kế thừa `BaseProvider`**: Khi bạn muốn xây dựng một module/provider hoàn chỉnh để tái sử dụng lâu dài, tự động nạp SDK và cung cấp đầy đủ cả hai phương thức `mount()` và `create()`.

👉 Xem chi tiết tại **[Tài liệu SRemote Ready2use API](../../api/vi/ready2use.md)**.

---

## 6. Tham khảo các mẫu tích hợp thực tế

Nếu bạn muốn xem các ví dụ trọn vẹn cho React, Vue, hoặc tích hợp Custom Adapter SDK (YouTube, Spotify, SoundCloud):

👉 Hãy tham khảo ngay trang **[Hướng dẫn triển khai (Recipes)](../../recipes.html)** để xem và sử dụng mã nguồn mẫu!

---

## ⏭️ Bước tiếp theo
Sau khi hoàn tất kết nối, hãy tiếp tục sang **[04. Thử nghiệm & Chẩn đoán kết nối](./04-testing-debugging.md)** để kiểm tra hoạt động thực tế của trình phát.


# Use-case 4: Vượt rào cản Cross-Origin Iframe với Userscript

Đây là năng lực cốt lõi làm nên sức mạnh độc nhất của SRemote: **Cho phép trang cha điều khiển mọi trình phát bên trong thẻ `<iframe>` từ các tên miền khác nhau (Cross-Origin)** ngay cả khi dịch vụ đó không cung cấp bất kỳ API nào cho bên ngoài.

---

## 1. Cơ chế hoạt động của Userscript Engine
 
 Khi người dùng cài đặt extension (như Tampermonkey, Violentmonkey) và script **`sremote.user.js`**:
 
 1. **Agent tiêm vào Iframe**: Userscript tự động chạy trong ngữ cảnh của thẻ `<iframe>`, tự động nhận diện phần tử `<video>` / `<audio>` hoặc MediaSession của trang nhúng.
 2. **Kênh truyền bảo mật**: Một kết nối hai chiều riêng tư (`MessageChannel`) được thiết lập giữa trang cha và iframe thông qua bắt tay `sremote.hello()`.
 3. **Thực thi lệnh & Đồng bộ trạng thái**: Mọi lệnh như `play()`, `pause()`, `seek()`, `volume()` từ trang cha được chuyển tiếp qua MessagePort và thực thi trực tiếp trên media element đích trong nháy mắt.

---

### Case Study điển hình: "Cứu tinh cho những dịch vụ không có SDK như Bilibili"

Nhiều nền tảng chia sẻ video lớn (như Bilibili, Rumble, Kick...) cung cấp thẻ iframe để bạn nhúng nội dung lên website, nhưng **họ không hề cung cấp bất kỳ Player JavaScript SDK nào** để trang ngoài có thể gọi lệnh Play hay Pause.

Nếu không có Userscript:
- Thẻ iframe hoàn toàn là một "chiếc hộp đen" (Blackbox). Bạn bất lực trong việc điều khiển nó qua code.

Khi có Userscript của SRemote:
- Script chạy ngầm ngay bên trong iframe của Bilibili.
- Tự động bắt lấy thẻ `<video class="bpx-player-video-wrap">` nằm sâu trong DOM của Bilibili.
- Mở một kênh truyền `MessagePort` về trang web của bạn.
- Nhờ đó, bạn bấm nút `sremote.play()` trên trang cha là video Bilibili phát ngay lập tức!

---

## 2. Bước 1: Cấu hình thẻ `<iframe>` đúng chuẩn

Để trình duyệt không chặn luồng âm thanh hoặc mã thực thi, thẻ `<iframe>` nhúng của bạn **bắt buộc phải được cấp quyền hợp lệ** qua thuộc tính `allow`:

```html
<iframe
  id="cross-origin-frame"
  src="https://example-video-service.com/embed/12345"
  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
  allowfullscreen
  style="width: 100%; height: 450px; border: none; border-radius: 8px;">
</iframe>
```

> [!CAUTION]
> **Nếu bạn dùng thuộc tính `sandbox`:**  
> Bắt buộc phải thêm tối thiểu: `sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"`. Nếu thiếu `allow-scripts` hoặc `allow-same-origin`, Userscript và trình phát sẽ bị vô hiệu hóa hoàn toàn.

---

## 3. Bước 2: Bắt tay & Lắng nghe kết nối trong JavaScript

Trong mã nguồn website của bạn, sử dụng `@sremote/sdk`:

```javascript
import { sremote } from '@sremote/sdk';

// 1. Đăng ký sự kiện khi tìm thấy và kết nối thành công với iframe
sremote.on('accept', (data) => {
  console.log('✅ Đã kết nối thành công với instance:', data.instanceId);
  console.log('Loại media nhận diện:', data.mediaType); // 'video' | 'audio' | 'mediasession'
});

// 2. Lắng nghe cập nhật thời gian thực
sremote.on('timeupdate', ({ instanceId, state }) => {
  console.log(`[${instanceId}] Vị trí hiện tại: ${state.currentTime}s / ${state.duration}s`);
});

// 3. Khởi động kết nối: ready() tự động gửi tín hiệu bắt tay hello ngầm
await sremote.ready();

// 4. Điều khiển trực tiếp iframe xuyên domain bằng Fluent API (SRemote 4.0):
await sremote('#cross-origin-frame').play().seek(15).volume(0.8);
```

---

## 4. Bước 3: Xử lý UX khi người dùng chưa cài Userscript

Đối với các thẻ iframe cross-origin không có sẵn SDK nội bộ, trang cha bắt buộc cần cầu nối Userscript để giao tiếp. Khi người dùng truy cập trang mà chưa cài script, bạn có thể kiểm tra và hiển thị ngay một Modal hướng dẫn cài đặt trực quan:

```javascript
import { sremote } from '@sremote/sdk';

await sremote.ready();

// Kiểm tra xem cầu nối Userscript có khả dụng hay không:
if (!sremote.isUserscriptAvailable()) {
  sremote.showInstallModal({
    onSuccess: () => {
      console.log('🎉 Userscript đã được phát hiện và kích hoạt thành công!');
    },
    onClose: ({ success }) => {
      console.log('Modal đã đóng. Trạng thái kích hoạt:', success);
    }
  });
}
```

> [!NOTE]
> **Tại sao nên dùng `!sremote.isUserscriptAvailable()` thay vì kiểm tra `mode === 'unsupported'`?**  
> Mặc định SDK bật cờ `fallbackToDom: true`. Khi không có Userscript, SRemote sẽ tự động chuyển sang chế độ `mode = 'dom-direct'` (để điều khiển các thẻ video/audio nội bộ cùng trang). Do đó, `sremote.isUserscriptAvailable()` là phương thức kiểm tra chính xác nhất sự hiện diện của Userscript.

Modal tích hợp sẵn các ưu điểm:
- **Tự động nhận diện trình duyệt**: Hiển thị nút cài đặt Tampermonkey tương ứng với trình duyệt người dùng đang mở (Chrome, Edge, Firefox, Safari...).
- **Cách ly giao diện tuyệt đối (Shadow DOM)**: Không lo bị xung đột CSS hay vỡ layout trang web của bạn.
- **Tự động kích hoạt (`autoDetect`)**: Khi người dùng vừa bấm cài xong userscript trên Tampermonkey, modal sẽ tự động nhận diện và cập nhật trạng thái thành công mà không bắt người dùng phải tải lại trang.

---

## ⏭️ Bước tiếp theo
- Khám phá các tính năng quản lý nâng cao tại [Quản lý đa instance & Chế độ độc quyền](../advanced/multi-instance-management.md).
- Hoặc xem [Chẩn đoán & Xử lý sự cố](../advanced/troubleshooting-and-debugging.md).

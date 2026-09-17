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

// 3. Gửi tín hiệu bắt tay tìm kiếm sau khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', () => {
  sremote.hello();
});
```

---

## 4. Bước 3: Xử lý UX khi người dùng chưa cài Userscript

Nếu người dùng truy cập trang mà chưa cài Userscript, SRemote SDK sẽ nhận biết và kích hoạt chế độ `'unsupported'` đối với các iframe cross-origin.

Bạn có thể hiển thị một Modal hướng dẫn cài đặt cực kỳ thân thiện chỉ với 1 dòng lệnh:

```javascript
import { sremote, showInstallModal } from '@sremote/sdk';

await sremote.ready();

if (sremote.mode === 'unsupported') {
  // Hiển thị modal hướng dẫn người dùng cài đặt extension chỉ với 1 cú click
  showInstallModal({
    lang: 'vi', // 'vi' hoặc 'en'
    onDismiss: () => console.log('Người dùng đã đóng modal')
  });
}
```

Modal tích hợp sẵn giao diện đẹp mắt, hướng dẫn rõ ràng từng bước cài đặt Tampermonkey và nạp Userscript mà bạn không cần phải tự thiết kế lại từ đầu.

---

## ⏭️ Bước tiếp theo
- Khám phá các tính năng quản lý nâng cao tại [Quản lý đa instance & Chế độ độc quyền](../advanced/multi-instance-management.md).
- Hoặc xem [Chẩn đoán & Xử lý sự cố](../advanced/troubleshooting-and-debugging.md).

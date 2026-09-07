# 06. Xử lý sự cố thường gặp (Troubleshooting)

Tài liệu này tổng hợp các tình huống lỗi phổ biến trong quá trình tích hợp SRemote cùng các giải pháp xử lý cụ thể.

---

## 1. Chính sách Tự động phát (Autoplay Policy) của trình duyệt

### Hiện tượng:
Gọi `sremote.play()` nhưng trình duyệt báo lỗi `NotAllowedError: play() failed because the user didn't interact with the document first`.

### Nguyên nhân:
Các trình duyệt hiện đại (Chrome, Edge, Safari, Firefox) hạn chế tự động phát âm thanh nếu người dùng chưa có ít nhất một tương tác (click hoặc touch) trên trang.

### Giải pháp:
1. Đảm bảo thẻ `<iframe>` đã được cấp quyền `allow="autoplay"`.
2. Thiết kế nút Play/Bắt đầu trên giao diện của bạn để người dùng bấm, thay vì tự động gọi `sremote.play()` ngay khi trang vừa tải.

---

## 2. Lỗi `MISSING_MEDIA_SOURCE`

### Hiện tượng:
Console trả về mã lỗi `{ error: 'MISSING_MEDIA_SOURCE' }`.

### Nguyên nhân:
Một số trình phát tạo sẵn thẻ `<video>` hoặc `<audio>` rỗng (chưa có thuộc tính `src`) và chỉ nạp nguồn phát sau khi người dùng tương tác trực tiếp với trình phát lần đầu.

### Giải pháp:
- Hướng dẫn người dùng nhấp vào iframe một lần để kích hoạt trình phát tải tài nguyên.
- Hoặc sử dụng `adapters.set()` nếu nền tảng đó cung cấp SDK JavaScript chính thức.

---

## 3. Không nhận được sự kiện `accept` sau khi gọi `hello()`

### Các bước kiểm tra:
1. **Kiểm tra Userscript:** Đảm bảo tiện ích Tampermonkey / Violentmonkey đang bật và script `sremote.user.js` có quyền chạy trên domain của iframe.
2. **Kiểm tra thuộc tính `sandbox`:** Nếu iframe có `sandbox`, hãy chắc chắn đã thêm `allow-scripts allow-same-origin`.
3. **Thời điểm gọi `hello()`:** Đảm bảo gọi `sremote.hello()` sau khi DOM và iframe đã sẵn sàng (sự kiện `DOMContentLoaded` hoặc `iframe.onload`).

---

## 4. Bảng tra cứu mã lỗi nhanh (Error Codes Reference)

| Mã lỗi | Nguyên nhân | Hướng xử lý |
| :--- | :--- | :--- |
| `NOT_FOUND` / `INSTANCE_NOT_FOUND` | Không tìm thấy media instance tương ứng | Kiểm tra lại `instanceId` hoặc gọi lại `hello()` để phát hiện lại |
| `HANDSHAKE_TIMEOUT` / `TIMEOUT` | Iframe không phản hồi sau thời gian chờ | Kiểm tra userscript và trạng thái tải của iframe |
| `SECURITY_RESTRICTED` | Bị chặn bởi chính sách bảo mật trình duyệt | Bổ sung các quyền cần thiết trong thuộc tính `allow` của iframe |
| `ADAPTER_NOT_FOUND` | Tên adapter yêu cầu chưa được đăng ký | Đăng ký adapter qua `sremote.adapters.register()` hoặc `sremote.adapters.set()` |

> [!TIP]
> Bạn có thể tra cứu toàn bộ danh sách mã lỗi và giải thích chuyên sâu tại **[Tài liệu Mã lỗi & Khắc phục sự cố](./errors.md)**.


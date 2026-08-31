# 06. Xử lý sự cố thường gặp (Troubleshooting)

Tài liệu này tổng hợp các tình huống lỗi phổ biến trong quá trình tích hợp SRemote và các giải pháp khắc phục triệt để.

---

## 1. Chính sách Autoplay của trình duyệt

### Triệu chứng:
Gọi `sremote.play()` nhưng trình duyệt báo lỗi `NotAllowedError: play() failed because the user didn't interact with the document first`.

### Nguyên nhân:
Trình duyệt hiện đại (Chrome, Edge, Safari, Firefox) cấm phát âm thanh tự động trừ khi người dùng đã có tối thiểu 1 tương tác (click/touch) trên trang.

### Giải pháp:
1. Đảm bảo thẻ `<iframe>` đã có `allow="autoplay"`.
2. Thiết kế nút Play/Bắt đầu trên giao diện của bạn để người dùng bấm, thay vì gọi `sremote.play()` tự động ngay khi vừa tải trang.

---

## 2. Lỗi `MISSING_MEDIA_SOURCE`

### Triệu chứng:
Console trả về mã lỗi `{ error: 'MISSING_MEDIA_SOURCE' }`.

### Nguyên nhân:
Một số player tự tạo thẻ `<video>` hoặc `<audio>` rỗng (không có thuộc tính `src`) và chỉ nạp nguồn video sau khi người dùng bấm vào player lần đầu tiên.

### Giải pháp:
- Cho phép người dùng bấm một lần vào iframe để kích hoạt player khởi tạo nguồn.
- Hoặc sử dụng `adapters.set()` nếu dịch vụ đó cung cấp SDK chính thức.

---

## 3. Không nhận được sự kiện `accept` sau khi gọi `hello()`

### Các bước kiểm tra:
1. **Người dùng đã cài Userscript chưa?** Kiểm tra xem extension Tampermonkey / Violentmonkey có đang bật và script `sremote.user.js` có đang chạy trên domain của iframe không.
2. **Kiểm tra thuộc tính `sandbox`:** Nếu iframe có `sandbox`, hãy chắc chắn có `allow-scripts allow-same-origin`.
3. **Gọi `hello()` quá sớm:** Đảm bảo gọi `sremote.hello()` sau khi iframe đã nạp xong (sự kiện `DOMContentLoaded` hoặc `iframe.onload`).

---

## 4. Bảng tra cứu mã lỗi (Error Codes Reference)

| Mã lỗi | Nguyên nhân | Hướng xử lý |
| :--- | :--- | :--- |
| `NOT_FOUND` | Không tìm thấy media instance tương ứng | Kiểm tra lại `instanceId` hoặc gọi lại `hello()` |
| `HANDSHAKE_TIMEOUT` | Iframe không phản hồi sau thời gian chờ | Kiểm tra userscript và trạng thái nạp của iframe |
| `SECURITY_RESTRICTED` | Bị chặn bởi chính sách bảo mật trình duyệt | Cấp thêm quyền trong thuộc tính `allow` của iframe |
| `ADAPTER_NOT_FOUND` | Gọi tên custom adapter chưa được đăng ký | Đăng ký adapter qua `sremote.adapters.set()` trước khi gọi |

> [!TIP]
> Bạn có thể tra cứu thêm cẩm nang chi tiết tại **[Tài liệu Mã lỗi & Khắc phục sự cố](./errors.md)**.

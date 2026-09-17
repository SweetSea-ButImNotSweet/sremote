# Chẩn đoán & Xử lý sự cố (Troubleshooting & Debugging)

Tài liệu này tổng hợp các kỹ thuật kiểm thử, công cụ tự chẩn đoán và hướng dẫn xử lý các vấn đề phổ biến nhất trong quá trình phát triển với SRemote.

---

## 1. Bộ công cụ tự chẩn đoán (`sremote.debug`)

SRemote tích hợp sẵn một namespace **`sremote.debug`** cho phép bạn kiểm tra nhanh toàn bộ hệ thống ngay trong DevTools Console:

```javascript
import { sremote } from '@sremote/sdk';

// 1. Chạy bộ kiểm thử tự động toàn diện trên tất cả các kết nối:
const testResults = await sremote.debug.runAllTests();
console.table(testResults);

// 2. Xuất toàn bộ trạng thái handshake, adapter và instance:
console.log(sremote.debug.dumpState());
```

---

## 2. Các sự cố phổ biến & Cách xử lý

### Sự cố 1: Lỗi chính sách Autoplay (`NotAllowedError`)
- **Hiện tượng**: Gọi `sremote.play()` bị từ chối với lỗi: `NotAllowedError: play() failed because the user didn't interact with the document first`.
- **Nguyên nhân**: Trình duyệt hiện đại (Chrome, Edge, Safari, Firefox) cấm phát âm thanh tự động nếu người dùng chưa có ít nhất 1 tương tác (click/tap) trên trang.
- **Cách khắc phục**:
  1. Đảm bảo thẻ `<iframe>` đã có quyền `allow="autoplay"`.
  2. Không gọi `sremote.play()` ngay trong sự kiện nạp trang. Hãy gắn lệnh `play()` vào một nút bấm trên giao diện để người dùng chủ động kích hoạt.

### Sự cố 2: Iframe không phản hồi sau khi gọi `hello()`
- **Hiện tượng**: Không nhận được sự kiện `accept`.
- **Nguyên nhân**:
  1. Nếu là Iframe khác domain: Người dùng chưa cài Userscript hoặc script chưa bật quyền chạy trên domain của iframe.
  2. Thẻ `<iframe>` bị chặn bởi thuộc tính `sandbox` thiếu cờ `allow-scripts` hoặc `allow-same-origin`.
  3. Gọi `hello()` quá sớm khi iframe chưa kịp tải xong HTML.
- **Cách khắc phục**: Gọi `sremote.hello()` bên trong sự kiện `iframe.onload` hoặc `DOMContentLoaded`.

### Sự cố 3: Lỗi `MISSING_MEDIA_SOURCE`
- **Hiện tượng**: Console trả về mã lỗi `{ error: 'MISSING_MEDIA_SOURCE' }`.
- **Nguyên nhân**: Trình phát trong iframe tạo sẵn thẻ `<video>` rỗng và chỉ nạp thuộc tính `src` sau khi người dùng bấm vào player lần đầu tiên.
- **Cách khắc phục**: Hướng dẫn người dùng click vào iframe một lần để kích hoạt nạp media, hoặc dùng `@sremote/ready2use` để tự động hóa toàn bộ việc tải tài nguyên.

---

## 3. Bảng tra cứu mã lỗi chuẩn (Error Codes Reference)

| Mã lỗi | Ý nghĩa | Hướng xử lý |
| :--- | :--- | :--- |
| `NOT_FOUND` / `INSTANCE_NOT_FOUND` | Không tìm thấy media instance tương ứng với ID | Kiểm tra lại `instanceId` hoặc gọi lại `hello()` để quét lại |
| `HANDSHAKE_TIMEOUT` / `TIMEOUT` | Iframe không phản hồi tín hiệu bắt tay | Kiểm tra lại Userscript và trạng thái nạp của iframe |
| `SECURITY_RESTRICTED` | Bị trình duyệt chặn quyền phát hoặc CORS | Bổ sung các quyền `autoplay; encrypted-media` vào thuộc tính `allow` |
| `ADAPTER_NOT_FOUND` | Tên adapter yêu cầu chưa được đăng ký | Đăng ký adapter qua `sremote.adapters.register()` |

---

## ⏭️ Bước tiếp theo
- Tra cứu danh sách 22 nền tảng tại [Bảng ma trận tương thích](./compatibility-matrix.md).

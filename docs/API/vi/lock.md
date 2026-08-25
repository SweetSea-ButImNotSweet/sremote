# sremote.lock
Khóa phiên làm việc hiện tại của SRemote trên trang cha, yêu cầu tất cả các lệnh gọi API tiếp theo phải cung cấp Passkey hợp lệ.

## Tham số
Hàm này không nhận tham số.

## Giá trị trả về
Trả về `boolean` (`true`).

## Lưu ý
- **Không có hàm `unlock()` bằng code:** Một khi đã gọi `sremote.lock()`, phiên làm việc sẽ bị khoá hoàn toàn cho tới khi trang được tải lại. Bạn **không thể** mở khoá lại bằng JavaScript trong trang.
- **Bắt buộc dùng Passkey:** Mọi lệnh gọi API sau đó (như `hello()`, `play()`, `status()`, `list()`, ...) đều sẽ bị chặn và báo lỗi nếu không truyền kèm `key` hợp lệ.
- **Cách duy nhất để tiếp tục:**
  1. Người dùng mở menu của tiện ích mở rộng (Tampermonkey/Violentmonkey) trên trang hiện tại.
  2. Chọn mục **🔑 Tạo & Copy Passkey** để sinh mã khóa bí mật (dạng `SR-XXXX-XXXX-XXXX-XXXX`).
  3. Lấy mã này truyền vào tham số `key` của các hàm API (ví dụ: `sremote.hello({ key: 'SR-...' })` hoặc `sremote.play(instanceId, 'SR-...')`).
  4. Nếu muốn gỡ bỏ hoàn toàn trạng thái khóa, người dùng phải thao tác trực tiếp qua menu tiện ích hoặc tải lại trang.

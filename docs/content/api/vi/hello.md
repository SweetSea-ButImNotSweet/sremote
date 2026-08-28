# sremote.hello
Gửi tín hiệu bắt tay (handshake) đầu tiên tới tất cả các iframe con trong trang hoặc một iframe cụ thể được chỉ định.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `options` | `Object` | `{}` | Tuỳ chọn cấu hình kết nối. Có các trường:<br>- `css` (`string`): Chuỗi CSS tuỳ chỉnh muốn nạp ngay từ đầu (`document-start`) vào iframe.<br>- `multiMode` (`boolean \| null`): Bật/tắt chế độ đa media.<br>- `target` (`Window`): Cửa sổ iframe nhận tín hiệu.<br>- `key` (`string`): Passkey xác thực nếu domain bị khoá. |
| `target` | `Window` | `null` | Cửa sổ `contentWindow` của iframe muốn gửi bắt tay trực tiếp (nếu không truyền qua `options.target`). |

## Lưu ý
- Khi gọi `hello()`, script sẽ sinh ra một cặp `handshakeId` và `handshakeToken` bí mật để xác thực phiên bắt tay an toàn với iframe.
- Nếu truyền `options.css`, CSS này sẽ được lưu tạm qua GM Storage và nạp thẳng vào `document.documentElement` của iframe ngay từ giai đoạn `document-start` trước khi DOM được parse, giúp tránh hiện tượng chớp/giật giao diện (FOUC).
- Nếu domain đang bật chế độ khoá bảo vệ (Lock), bắt buộc phải cung cấp đúng `key` trong `options.key` thì lệnh mới được thực thi.

# sremote.config
Gửi cấu hình tuỳ chỉnh tới media bên trong iframe hoặc điều chỉnh các hành vi xử lý sự kiện nội bộ.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `options` | `Object` | **Bắt buộc** | Đối tượng chứa các thiết lập cấu hình:<br>- `treatAlmostEndAsEnd` (`boolean`): Nếu đặt `true`, khi media sắp phát xong (còn cách đoạn kết khoảng 0.8 giây), script sẽ phát thẳng sự kiện `ended` thay vì phát `almostend`. |
| `instanceId` | `string` | `null` | Định danh của media instance muốn áp dụng cấu hình. Nếu để trống, áp dụng cho instance hoạt động gần nhất (hoặc `'all'`). |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Lưu ý
- **Bản chất của `almostend`:** Là sự kiện đặc thù do SRemote phát trước khi audio/video kết thúc khoảng 0.8 giây. Mục đích chính là phục vụ những trường hợp iframe của bên dịch vụ tự động xóa hoặc huỷ phần tử nguồn phát ngay khi chạm mốc `ended`.
- **Vai trò của `treatAlmostEndAsEnd`:** Là một quy ước tiện lợi (convention) giúp lập trình viên web không cần phải viết thêm logic xử lý riêng cho sự kiện `almostend` mà vẫn có thể đón đầu sự kiện `ended` như bình thường.

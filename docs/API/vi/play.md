# sremote.play
Gửi lệnh phát (play) tới media trong iframe hoặc custom adapter.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Định danh của media instance muốn điều khiển. Nếu để trống, sẽ áp dụng cho instance đang hoạt động gần nhất (hoặc tất cả nếu truyền `'all'`). |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Lưu ý
- Trong chế độ đa media (`multiMode`), nếu có nhiều media cùng hoạt động mà không chỉ định `instanceId`, lệnh sẽ bị cảnh báo lỗi `whereIsInstanceID`.
- Có thể truyền `instanceId = 'all'` để phát đồng thời toàn bộ các media đã kết nối.

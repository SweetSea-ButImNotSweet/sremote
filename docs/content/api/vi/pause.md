# sremote.pause
Gửi lệnh tạm dừng (pause) tới media trong iframe hoặc custom adapter.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Định danh của media instance muốn tạm dừng. Nếu để trống, sẽ áp dụng cho instance hoạt động gần nhất. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Lưu ý
- Tương tự như `play`, nếu bật `multiMode` và có từ 2 media trở lên, bạn cần chỉ định rõ `instanceId` hoặc truyền `'all'`.

# sremote.stop
Dừng hẳn media và tua thời gian phát về mốc 0 giây.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Định danh của media instance muốn dừng. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Lưu ý
- Lệnh này sẽ kết hợp tạm dừng media và gán `currentTime = 0`.

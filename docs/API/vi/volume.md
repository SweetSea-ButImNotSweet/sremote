# sremote.volume
Điều chỉnh âm lượng của media.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `vol` | `number` | **Bắt buộc** | Mức âm lượng cần thiết lập. Chấp nhận thang `0.0` đến `1.0` hoặc từ `1` đến `100`. |
| `instanceId` | `string` | `null` | Định danh của media instance muốn chỉnh âm lượng. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Lưu ý
- Nếu truyền giá trị từ `1` đến `100`, script sẽ tự động chia cho `100` để quy về khoảng chuẩn `0.0` - `1.0`.

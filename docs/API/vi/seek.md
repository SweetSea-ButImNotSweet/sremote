# sremote.seek
Tua tương đối một khoảng thời gian (cộng hoặc trừ thêm giây) so với thời điểm hiện tại của media.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `offset` | `number` | **Bắt buộc** | Số giây cần tua (giá trị dương để tua tới, giá trị âm để tua lùi). |
| `instanceId` | `string` | `null` | Định danh của media instance muốn tua. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Lưu ý
- Thời gian sau khi tua sẽ tự động được chặn dưới không cho nhỏ hơn 0.

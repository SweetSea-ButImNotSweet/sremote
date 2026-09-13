# sremote.speed / sremote.rate

Thay đổi tốc độ phát của media bên trong iframe hoặc adapter đích.

## Cú pháp
- `sremote.speed(rate, targetOrId?, key?)`
- `sremote.rate(rate, targetOrId?, key?)` *(Alias)*
- `sremote.playbackRate(rate, targetOrId?, key?)` *(Alias)*

## Tham số
| Tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `rate` | `number` | **Bắt buộc** | Tốc độ phát mong muốn (ví dụ: `0.5`, `1.0`, `1.25`, `1.5`, `2.0`). |
| `targetOrId` | `string \| HTMLElement` | `null` | Định danh instance hoặc phần tử đích cần chỉnh tốc độ. |
| `key` | `string` | `null` | Passkey xác thực nếu đã bật domain lock. |

## Giá trị trả về
Trả về một Promise chứa kết quả thực thi lệnh (`success: true/false`).

## Ví dụ
```javascript
// Đặt tốc độ 1.5x cho player đang active
await sremote.speed(1.5);

// Đặt tốc độ 2.0x cho một instance cụ thể
await sremote.speed(2.0, 'iframe-youtube');
```

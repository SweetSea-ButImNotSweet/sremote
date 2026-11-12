# sremote.speed

Thay đổi tốc độ phát của media bên trong iframe hoặc adapter đích.

## Cú pháp
- `sremote.speed(rate, targetOrId?, key?)`
- `sremote(target).speed(rate)` *(Fluent Instance)*

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

// Fluent chaining trên instance cụ thể
await sremote('#iframe-youtube').speed(2.0).play();
```

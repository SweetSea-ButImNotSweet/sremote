# sremote.css.remove
Gỡ bỏ toàn bộ CSS tuỳ chỉnh (Dynamic CSS) đang áp dụng trên iframe.

## Cú pháp
```javascript
sremote.css.remove(instanceId?, key?);
```

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Định danh instance của iframe đích (nếu để trống sẽ áp dụng cho iframe hoạt động gần nhất). |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Giá trị trả về
Trả về một `Promise<{ success: boolean }>` xác nhận đã gỡ bỏ thẻ CSS động.

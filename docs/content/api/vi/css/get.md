# sremote.css.get
Lấy chuỗi CSS tuỳ chỉnh (Dynamic CSS) đang được áp dụng trên iframe.

## Cú pháp
```javascript
sremote.css.get(instanceId?, key?);
```

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Định danh instance của iframe đích (nếu để trống sẽ lấy từ iframe hoạt động gần nhất). |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Giá trị trả về
Trả về một `Promise<{ success: boolean, css: string }>` chứa chuỗi CSS hiện tại.

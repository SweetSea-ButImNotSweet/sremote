# sremote.instances.setMultiMode
Thiết lập chế độ điều khiển đa media (Multi-instance mode).

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `mode` | `boolean \| null` | **Bắt buộc** | `true`: Bắt buộc bật multi mode.<br>`false`: Bắt buộc dùng single mode.<br>`null`: Tự động nhận diện dựa trên số lượng iframe/instance đang chạy. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

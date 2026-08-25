# sremote.setExclusive
Thiết lập chế độ phát độc quyền (Exclusive playback) nhằm đảm bảo chỉ có 1 media được phép phát tại một thời điểm.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `mode` | `string \| 'auto' \| null` | **Bắt buộc** | - `'auto'`: Tự động tạm dừng tất cả các media khác mỗi khi có bất kỳ media nào bắt đầu phát.<br>- `instanceId`: Chỉ định duy nhất instance này được phát, tạm dừng tất cả các instance còn lại.<br>- `null`: Tắt chế độ phát độc quyền. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

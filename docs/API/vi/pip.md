# sremote.pip
Bật, tắt hoặc chuyển đổi trạng thái chế độ Hình-trong-Hình (Picture-in-Picture).

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `enable` | `boolean \| string` | `undefined` | `true` để bật PiP, `false` để tắt PiP. Nếu không truyền boolean (hoặc truyền chuỗi `instanceId`), hàm sẽ tự động đảo trạng thái PiP. |
| `instanceId` | `string` | `null` | Định danh của video instance muốn bật/tắt PiP. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

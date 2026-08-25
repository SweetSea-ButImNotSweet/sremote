# sremote.note
Gán ghi chú định danh (label/tag) cho từng media instance để dễ quản lý trong môi trường nhiều iframe.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `notesDict` | `Record<string, string>` | **Bắt buộc** | Đối tượng từ điển ánh xạ giữa `instanceId` và chuỗi ghi chú (Ví dụ: `{ "sv_123": "Main Video", "sv_456": "Side Video" }`). |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

# sremote.query
Quét và phát hiện các media instance đang hoạt động thông qua cơ chế lưu trữ nội bộ (GM Storage).

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Giá trị trả về
Trả về mảng `Array<Object>` các báo cáo instance tìm được, gồm:
- `instanceId` (`string`): Mã định danh instance.
- `location` (`string`): URL trang chứa media.
- `origin` (`string`): Nguồn origin.
- `title` (`string`): Tiêu đề trang (`document.title`).
- `hasMedia` (`boolean`): Đang có phần tử media hoạt động hay không.
- `mediaType` (`string`): Loại media.
- `lastActive` (`number`): Timestamp hoạt động gần nhất.

# sremote.instances.list
Lấy danh sách tất cả các instance media trong iframe và các custom adapter đang hoạt động.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Giá trị trả về
Trả về một mảng `Array<Object>` các instance, mỗi phần tử chứa:
- `instanceId` (`string`): Mã định danh duy nhất.
- `location` (`string`): URL của frame chứa media.
- `origin` (`string`): Nguồn origin của frame.
- `note` (`string`): Ghi chú định danh (nếu được đặt qua `sremote.note`).
- `mediaType` (`'video' | 'audio' | 'mediasession' | 'adapter'`): Phân loại nguồn media.
- `state` (`Object`): Trạng thái chi tiết của media.

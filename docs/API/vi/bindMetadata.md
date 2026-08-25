# sremote.bindMetadata
Gán thông tin metadata bài phát/video tùy chỉnh (`title`, `artist`, `album`, `artwork`) vào MediaSession của iframe.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `meta` | `Object` | **Bắt buộc** | Đối tượng chứa thông tin metadata:<br>- `title` (`string`): Tựa đề bài phát/video.<br>- `artist` (`string`): Tác giả/Kênh/Nghệ sĩ.<br>- `album` (`string`): Album.<br>- `artwork` (`Array<{ src, sizes?, type? }>`): Danh sách ảnh đại diện. |
| `instanceId` | `string` | `null` | Định danh của media instance. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Lưu ý
- Nếu `artwork` chứa Blob URL do trang cha tạo, SRemote sẽ tự động điều phối clone dữ liệu Blob nhị phân qua cổng port để vượt qua rào cản Same-Origin Policy (SOP).

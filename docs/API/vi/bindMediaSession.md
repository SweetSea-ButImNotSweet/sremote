# sremote.bindMediaSession
Kích hoạt tự động bind metadata và các action handler của `navigator.mediaSession` cho media bên trong iframe.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Định danh của media instance muốn bind. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Lưu ý
- Khi được gọi, script trong iframe sẽ tự động thu thập tiêu đề (`og:title`, `title`), tên trang/nghệ sĩ và ảnh poster/artwork từ meta tag để tạo `MediaMetadata` và đăng ký các action handler cơ bản (`play`, `pause`, `stop`, `seekto`, ...).

# sremote.load

Tải và nạp nguồn phát mới (video, audio, playlist) vào player hoặc iframe đích. Tùy theo từng nền tảng/adapter, giá trị `source` có thể là đường dẫn URL, ID video (ví dụ YouTube ID), hoặc object cấu hình.

## Cú pháp
`sremote.load(source, targetOrId?, key?)`

## Tham số
| Tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `source` | `string \| Object` | **Bắt buộc** | Đường dẫn URL, Video ID, hoặc object mô tả nguồn phát của provider. |
| `targetOrId` | `string \| HTMLElement` | `null` | Định danh instance hoặc thẻ DOM đích cần nạp nguồn. |
| `key` | `string` | `null` | Passkey xác thực nếu đã bật domain lock. |

## Giá trị trả về
Trả về một Promise chứa kết quả thực thi lệnh (`success: true/false`).

## Ví dụ
```javascript
// Nạp video mới vào player đang hoạt động
await sremote.load('https://example.com/stream.mp4');

// Nạp video YouTube mới qua adapter
await sremote.load('dQw4w9WgXcQ', 'youtube-player');
```

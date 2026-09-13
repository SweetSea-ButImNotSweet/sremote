# sremote.subtitle

Kích hoạt ngôn ngữ/track phụ đề, hoặc tắt phụ đề trên player mục tiêu.

## Cú pháp
`sremote.subtitle(track, targetOrId?, key?)`

## Tham số
| Tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `track` | `string \| null` | **Bắt buộc** | Mã ngôn ngữ hoặc ID của track phụ đề (ví dụ: `'vi'`, `'en'`), hoặc `null` / `'off'` để tắt phụ đề. |
| `targetOrId` | `string \| HTMLElement` | `null` | Định danh instance hoặc thẻ DOM đích cần chọn phụ đề. |
| `key` | `string` | `null` | Passkey xác thực nếu đã bật domain lock. |

## Giá trị trả về
Trả về một Promise chứa kết quả thực thi lệnh (`success: true/false`).

## Hàm liên quan
- [`sremote.getSubtitles`](./getSubtitles.md): Lấy danh sách các track phụ đề có sẵn.

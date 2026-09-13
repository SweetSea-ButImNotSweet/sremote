# sremote.repeat

Cấu hình chế độ lặp lại bài hát hoặc danh sách phát trên các provider có hỗ trợ.

## Cú pháp
`sremote.repeat(mode?, targetOrId?, key?)`

## Tham số
| Tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `mode` | `'off' \| 'all' \| 'one' \| boolean` | `'all'` | Chế độ lặp lại: `'off'` (tắt lặp lại), `'all'` (lặp lại toàn bộ danh sách), `'one'` (lặp lại 1 bài hiện tại), hoặc boolean (`true` tương đương `'all'`, `false` tương đương `'off'`). |
| `targetOrId` | `string \| HTMLElement` | `null` | Định danh instance hoặc thẻ DOM đích. |
| `key` | `string` | `null` | Passkey xác thực nếu đã bật domain lock. |

## Giá trị trả về
Trả về một Promise chứa kết quả thực thi lệnh (`success: true/false`).

## Ví dụ
```javascript
// Lặp lại 1 bài hiện tại
await sremote.repeat('one');

// Tắt lặp lại
await sremote.repeat('off');
```

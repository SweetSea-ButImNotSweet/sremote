# sremote.previous

Quay lại bài hát hoặc video trước đó trong danh sách phát (playlist/queue).

## Cú pháp
`sremote.previous(targetOrId?, key?)`

## Tham số
| Tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `targetOrId` | `string \| HTMLElement` | `null` | Định danh instance hoặc thẻ DOM đích. |
| `key` | `string` | `null` | Passkey xác thực nếu đã bật domain lock. |

## Giá trị trả về
Trả về một Promise chứa kết quả thực thi lệnh (`success: true/false`).

## Hàm liên quan
- [`sremote.next`](./next.md): Chuyển sang bài tiếp theo.

# sremote.getQualities

Lấy danh sách các mức chất lượng / độ phân giải mà media hoặc adapter mục tiêu đang hỗ trợ.

## Cú pháp
`sremote.getQualities(targetOrId?, key?)`

## Tham số
| Tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `targetOrId` | `string \| HTMLElement` | `null` | Định danh instance hoặc thẻ DOM đích cần truy vấn. |
| `key` | `string` | `null` | Passkey xác thực nếu đã bật domain lock. |

## Giá trị trả về
Trả về một mảng chứa các nhãn chất lượng (hoặc Promise trả về `string[]`), ví dụ: `['1080p', '720p', '480p', '360p', 'auto']`.

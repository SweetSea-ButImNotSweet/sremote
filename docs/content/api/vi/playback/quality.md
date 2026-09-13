# sremote.quality

Thiết lập chất lượng / độ phân giải video trên player hoặc iframe đích.

## Cú pháp
`sremote.quality(level, targetOrId?, key?)`

## Tham số
| Tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `level` | `string \| number` | **Bắt buộc** | Mức chất lượng mong muốn (ví dụ: `'1080p'`, `'720p'`, `'480p'`, `'auto'`, hoặc số pixel chiều cao `1080`). |
| `targetOrId` | `string \| HTMLElement` | `null` | Định danh instance hoặc thẻ DOM đích cần chỉnh chất lượng. |
| `key` | `string` | `null` | Passkey xác thực nếu đã bật domain lock. |

## Giá trị trả về
Trả về một Promise chứa kết quả thực thi lệnh (`success: true/false`).

## Hàm liên quan
- [`sremote.getQualities`](./getQualities.md): Lấy danh sách độ phân giải được hỗ trợ.

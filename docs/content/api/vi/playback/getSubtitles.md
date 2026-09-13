# sremote.getSubtitles

Lấy danh sách tất cả các track phụ đề / caption có sẵn của media mục tiêu.

## Cú pháp
`sremote.getSubtitles(targetOrId?, key?)`

## Tham số
| Tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `targetOrId` | `string \| HTMLElement` | `null` | Định danh instance hoặc thẻ DOM đích cần truy vấn. |
| `key` | `string` | `null` | Passkey xác thực nếu đã bật domain lock. |

## Giá trị trả về
Trả về một mảng (hoặc Promise trả về mảng) chứa thông tin các track phụ đề:
```typescript
Array<{
  id: string;
  label?: string;
  lang?: string;
  src?: string;
}>
```

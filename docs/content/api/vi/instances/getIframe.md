# sremote.instances.getIframe
Lấy ra phần tử DOM `HTMLIFrameElement` tương ứng với một `instanceId`.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | **Bắt buộc** | Mã định danh của media instance. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Giá trị trả về
- `HTMLIFrameElement | null`: Trả về phần tử iframe tương ứng nếu tìm thấy trên DOM, hoặc `null` nếu không tìm thấy hoặc chưa được cấp quyền truy cập.

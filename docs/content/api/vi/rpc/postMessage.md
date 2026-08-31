# sremote.rpc.postMessage
Gửi dữ liệu/message tới window context của iframe mục tiêu (thông qua `iframe.contentWindow.postMessage` trực tiếp hoặc qua cầu nối MessagePort).

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `message` | `any` | **Bắt buộc** | Dữ liệu/thông điệp muốn gửi tới iframe. |
| `targetOrigin` | `string` | `'*'` | Target origin cho phép nhận message. |
| `instanceId` | `string` | `null` | Mã định danh của iframe instance mục tiêu (nếu để trống, gửi tới instance hoạt động gần nhất). |
| `from` | `string` | `'parent'` | Nguồn gửi (`'parent'` gửi trực tiếp vào iframe, hoặc `'iframe'` phát ra từ context nội bộ). |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Giá trị trả về
- `boolean`: `true` nếu gửi thành công, `false` nếu thất bại hoặc thiếu quyền truy cập.

# sremote.rpc.call
Gọi một phương thức RPC tuỳ chỉnh bất đồng bộ (trả về Promise) sang phía iframe.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `action` | `string` | **Bắt buộc** | Tên hành động/RPC method muốn gọi (ví dụ: `'setIframeCSS'`, `'getIframeCSS'`, `'removeIframeCSS'`, ...). |
| `params` | `any` | `undefined` | Dữ liệu/tham số truyền kèm theo RPC request. |
| `instanceId` | `string` | `null` | Mã định danh của media instance mục tiêu (nếu để trống, gọi tới instance hoạt động gần nhất). |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Giá trị trả về
- `Promise<{ success: boolean, data?: any, error?: string, message?: string, instanceId?: string }>`:
  - Nếu thành công: `{ success: true, data: res, ... }`
  - Nếu thất bại: `{ success: false, error: 'AUTH_FAILED' | 'INSTANCE_NOT_FOUND' | 'TIMEOUT' | 'PORT_ERROR' | 'ACTION_NOT_FOUND' | 'EXECUTION_ERROR', message: string, ... }` (Promise luôn resolve đối tượng này để thuận tiện kiểm tra mà không bị crash unhandled rejection).

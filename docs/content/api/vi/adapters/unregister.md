# sremote.adapters.unregister
Gỡ bỏ một Custom Adapter đã được đăng ký trước đó trên trang cha.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Mã định danh của adapter muốn gỡ bỏ (nếu để trống hoặc chỉ có 1 adapter, sẽ gỡ adapter hiện tại). |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Giá trị trả về
- `boolean`: Trả về `true` nếu gỡ bỏ thành công, ngược lại trả về `false`.

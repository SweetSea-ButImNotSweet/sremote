# sremote.getCustomAdapter
Lấy đối tượng Custom Adapter đã được đăng ký trước đó.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Mã định danh của adapter cần lấy. Nếu không truyền và chỉ có 1 adapter tồn tại, sẽ trả về adapter đó. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Giá trị trả về
Trả về đối tượng `adapter` tương ứng hoặc `null` nếu không tìm thấy.

# sremote.instances.capabilities

Lấy ma trận tính năng hỗ trợ của một instance dựa trên `instanceId`.

## Cú pháp
`sremote.instances.capabilities(instanceId?, key?)`
*(Alias: `sremote.instances.getCapabilities(instanceId?, key?)`)*

## Tham số
| Tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Định danh duy nhất của media instance. Nếu bỏ qua, sẽ lấy instance đang active. |
| `key` | `string` | `null` | Passkey xác thực nếu đã bật domain lock. |

## Giá trị trả về
Trả về đối tượng `SRemoteCapabilities` liệt kê các thao tác hỗ trợ (như `play`, `pause`, `seek`, `volume`, `quality`,...), hoặc `null` nếu không tìm thấy.

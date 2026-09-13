# sremote.instances.get

Lấy snapshot trạng thái media phát hiện tại của một instance dựa trên `instanceId`.

## Cú pháp
`sremote.instances.get(instanceId?, key?)`

## Tham số
| Tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Định danh duy nhất của media instance. Nếu bỏ qua, sẽ lấy instance đang active. |
| `key` | `string` | `null` | Passkey xác thực nếu đã bật domain lock. |

## Giá trị trả về
Trả về đối tượng `SRemoteMediaState` chứa các thông số như `paused`, `currentTime`, `duration`, `volume`, `muted`, `src`,... hoặc `null` nếu không tìm thấy.

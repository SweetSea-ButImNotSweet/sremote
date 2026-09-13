# sremote.instances.list

Lấy danh sách tất cả các media instance trong iframe và các custom adapter đang kết nối.

## Tham số
| Tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `key` | `string` | `null` | Passkey xác thực nếu đã bật domain lock. |

## Giá trị trả về
Trả về một mảng `Array<SRemoteInstanceInfo>`, mỗi phần tử đại diện cho một instance gồm:
- `instanceId` (`string`): Định danh duy nhất của instance.
- `location` (`string`): URL của frame chứa media.
- `origin` (`string`): Origin của frame.
- `note` (`string`): Nhãn mô tả ngữ nghĩa (nếu đã gán qua `sremote.instances.note`).
- `mediaType` (`'video' | 'audio' | 'mediasession' | 'adapter'`): Phân loại nguồn phát.
- `capabilities` (`SRemoteCapabilities | null`): Ma trận tính năng mà instance này hỗ trợ.
- `state` (`SRemoteMediaState | null`): Trạng thái phát chi tiết của media.
- `status` (`'ready' | 'connecting' | 'disconnected'`): Trạng thái kết nối.

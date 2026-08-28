# sremote.status
Lấy ảnh chụp nhanh (snapshot) trạng thái hiện tại của media instance hoặc custom adapter.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | `null` | Định danh của media instance cần lấy trạng thái. Nếu để trống, lấy của instance hoạt động gần nhất. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Giá trị trả về
Trả về `Object` trạng thái gồm các trường:
- `paused` (`boolean`): Đang dừng hay không.
- `ended` (`boolean`): Đã phát hết video hay chưa.
- `currentTime` (`number`): Thời gian phát hiện tại (giây).
- `duration` (`number \| null`): Tổng thời lượng (giây).
- `buffered` (`number`): Đoạn đệm đã tải (giây).
- `volume` (`number`): Âm lượng (`0.0` - `1.0`).
- `muted` (`boolean`): Đang tắt tiếng hay không.
- `playbackRate` (`number`): Tốc độ phát.
- `readyState` (`number`): Mức sẵn sàng của media.
- `src` (`string`): Nguồn URL của media.
- `fullscreen` (`boolean`): Đang toàn màn hình hay không.
- `pictureInPicture` (`boolean`): Đang mở PiP hay không.

Trả về `null` nếu không tìm thấy instance hoặc bị chặn quyền.

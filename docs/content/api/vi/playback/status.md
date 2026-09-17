# sremote.status

Lấy snapshot thông tin trạng thái phát hiện tại của một media instance hoặc custom adapter.

## Tham số
| Tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string \| HTMLElement` | `null` | Định danh instance cần truy vấn. Nếu bỏ trống, sẽ truy vấn instance active gần nhất. |
| `key` | `string` | `null` | Passkey xác thực nếu đã bật domain lock. |

## Giá trị trả về
Trả về một đối tượng `SRemoteMediaState` gồm các trường:
- `paused` (`boolean`): Trạng thái đang tạm dừng hay đang phát.
- `ended` (`boolean`): Đã phát hết bài/video hay chưa.
- `currentTime` (`number`): Thời gian phát hiện tại (tính bằng giây).
- `duration` (`number | null`): Tổng thời lượng bài/video (tính bằng giây).
- `buffered` (`number`): Thời gian đã tải vào bộ nhớ đệm (giây).
- `volume` (`number`): Mức âm lượng từ `0.0` đến `1.0`.
- `muted` (`boolean`): Trạng thái tắt tiếng.
- `playbackRate` (`number`): Tốc độ phát hiện tại.
- `readyState` (`number`): Mã trạng thái sẵn sàng của thẻ media.
- `src` (`string`): URL nguồn phát.
- `loop` (`boolean`): Đang bật lặp lại thẻ media hay không.
- `repeat` (`'off' | 'one' | 'all' | boolean`): Chế độ lặp lại của playlist / player.
- `shuffle` (`boolean`): Chế độ phát ngẫu nhiên có đang bật không.
- `quality` (`string | number`): Độ phân giải/chất lượng hiện tại.
- `subtitle` (`string | null`): Ngôn ngữ hoặc mã track phụ đề đang chọn.
- `fullscreen` (`boolean`): Trạng thái toàn màn hình.
- `pictureInPicture` (`boolean`): Trạng thái hình-trong-hình (PiP).

Trả về `null` nếu không tìm thấy instance hoặc bị chặn quyền truy cập.

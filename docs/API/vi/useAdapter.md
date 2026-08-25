# sremote.useAdapter
Đăng ký một Custom Adapter tự định nghĩa cho nguồn media tùy biến (như YouTube Iframe API, Video.js, SDK phát ngoài, ...) để gom về giao diện điều khiển thống nhất của SRemote.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `adapter` | `Object` | **Bắt buộc** | Đối tượng adapter triển khai các phương thức điều khiển (`play()`, `pause()`, `toggle()`, `seekTo(time)`, `setVolume(vol)`, `setMuted(muted)`, `getCurrentTime()`, `getDuration()`, `paused()`, ...). |
| `instanceId` | `string` | `null` | Mã định danh mong muốn gán cho adapter. Nếu không truyền, hệ thống sẽ tự sinh ID `adapter_...`. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Giá trị trả về
Trả về `instanceId` (`string`) của adapter vừa đăng ký.

## Lưu ý
- Khi đăng ký, SRemote sẽ tự động inject hàm `adapter.emit(eventName, payload)` vào đối tượng adapter để bạn có thể chủ động bắn các sự kiện (`play`, `pause`, `timeupdate`, ...) về cho các listener `sremote.on()`.

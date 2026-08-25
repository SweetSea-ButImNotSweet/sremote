# Danh sách API SRemote

Tất cả các hàm được cung cấp qua đối tượng toàn cục `window.sremote`.

## 1. Bảng các hàm API

| Nhóm | Các hàm API |
| :--- | :--- |
| **Kết nối & Khởi tạo** | `hello(options?, target?)` |
| **Cấu hình & Thiết lập** | `config(options, instanceId?, key?)` |
| **Điều khiển phát** | `play(instanceId?, key?)`<br>`pause(instanceId?, key?)`<br>`toggle(instanceId?, key?)`<br>`stop(instanceId?, key?)` |
| **Tua & Thời gian** | `seek(offset, instanceId?, key?)`<br>`seekTo(time, instanceId?, key?)` |
| **Âm lượng** | `volume(vol, instanceId?, key?)`<br>`mute(muted?, instanceId?, key?)` |
| **Hiển thị** | `pip(enable?, instanceId?, key?)` |
| **Trạng thái & Quản lý** | `status(instanceId?, key?)`<br>`list(key?)`<br>`query(key?)`<br>`note(notesDict, key?)` |
| **Sự kiện** | `on(event, handler, key?)`<br>`off(event, handler)` |
| **Custom Adapter** | `useAdapter(adapter, instanceId?, key?)`<br>`getCustomAdapter(instanceId?, key?)` |
| **MediaSession & Metadata** | `bindMediaSession(instanceId?, key?)`<br>`bindMetadata(meta, instanceId?, key?)` |
| **Chế độ phát** | `setMultiMode(mode, key?)`<br>`isMultiMode(key?)`<br>`setExclusive(mode, key?)` |
| **Bảo mật** | `lock()` |

## 2. Bảng các sự kiện (Events)

Các sự kiện này được phát từ iframe/adapter và có thể đăng ký lắng nghe qua hàm `sremote.on(event, handler)` (hoặc dùng `'*'` để bắt toàn bộ sự kiện):

| Nhóm sự kiện | Tên sự kiện | Giải thích ý nghĩa |
| :--- | :--- | :--- |
| **Vòng đời & Kết nối** | `accept` | Bắt tay thành công và sẵn sàng nhận lệnh điều khiển media. |
| | `disconnect` | Iframe bị đóng, chuyển trang hoặc ngắt kết nối. |
| | `mediadisconnected` | Phần tử media bên trong iframe bị gỡ khỏi DOM hoặc bị huỷ. |
| **Trạng thái phát Media** | `play` | Bắt đầu yêu cầu phát media. |
| | `pause` | Media chuyển sang trạng thái tạm dừng. |
| | `playing` | Media thực sự đang chạy sau khi đã nạp đủ dữ liệu/vượt qua chờ đệm. |
| | `almostend` | Báo hiệu audio/video sắp hết (còn ~0.8s). Thường dùng xử lý cho các iframe tự huỷ nguồn phát khi chạm mốc kết thúc. |
| | `ended` | Media đã phát đến hết thời lượng. |
| | `timeupdate` | Thời gian phát hiện tại thay đổi liên tục theo tiến độ. |
| | `durationchange` | Tổng thời lượng của media được xác định hoặc cập nhật lại. |
| | `volumechange` | Âm lượng hoặc trạng thái tắt tiếng bị thay đổi. |
| | `ratechange` | Tốc độ phát (playbackRate) thay đổi. |
| | `seeking` | Bắt đầu thao tác tua thời gian. |
| | `seeked` | Đã hoàn tất thao tác tua đến mốc mới. |
| **Tải & Đệm dữ liệu** | `loadstart` | Bắt đầu nạp dữ liệu media. |
| | `loadedmetadata` | Đã tải xong thông tin kích thước, thời lượng và định dạng media. |
| | `loadeddata` | Đã nạp xong frame đầu tiên của media. |
| | `canplay` | Đã có thể phát được (nhưng có thể phải dừng lại để đệm tiếp). |
| | `canplaythrough` | Ước tính có đủ dữ liệu đệm để phát mượt đến hết mà không bị gián đoạn. |
| | `progress` | Trình duyệt đang tải tiếp các phân đoạn dữ liệu đệm. |
| | `waiting` | Media phải tạm dừng phát do đang chờ đệm thêm dữ liệu. |
| | `stalled` | Quá trình tải dữ liệu từ server bị nghẽn hoặc dừng đột ngột. |
| | `suspend` | Quá trình tải dữ liệu tạm dừng có chủ đích (ví dụ đã đệm đủ). |
| | `emptied` | Nguồn phát media bị xóa rỗng hoặc reset. |
| | `abort` | Tiến trình nạp media bị hủy ngang trước khi tải xong hoàn toàn. |
| | `error` | Xảy ra lỗi trong quá trình nạp hoặc giải mã media. |
| | `encrypted` | Media được mã hóa bản quyền (DRM) và đang khởi tạo luồng giải mã. |
| **Picture-in-Picture** | `enterpictureinpicture` | Video vừa chuyển sang chế độ cửa sổ nổi thu nhỏ (PiP). |
| | `exitpictureinpicture` | Video vừa thoát khỏi chế độ Picture-in-Picture. |
| **Chế độ đa Media & Cảnh báo** | `singleMediaDetected` | Phát hiện chỉ có đúng 1 media instance đang hoạt động. |
| | `multipleMediaDetected` | Phát hiện có từ 2 media instance trở lên cùng xuất hiện trong trang. |
| | `whereIsInstanceID` | Cảnh báo khi có nhiều media cùng hoạt động nhưng lệnh gọi lại không truyền `instanceId` chỉ định. |

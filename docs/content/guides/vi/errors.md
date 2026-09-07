# Mã Lỗi & Khắc Phục Sự Cố (Error Codes & Troubleshooting)

Trong SRemote, các phương thức điều khiển (`play`, `pause`, `seek`, ...), hàm gọi RPC tùy chỉnh (`call`), cũng như các cơ chế truyền thông nội bộ (MessagePort, Queue) đều tuân theo **chuẩn phản hồi an toàn (Safe Response Pattern)**.

Các lỗi logic nghiệp vụ hoặc vận hành **sẽ không throw exception hay reject Promise**, mà luôn được trả về dưới dạng một đối tượng kết quả chuẩn:

```typescript
interface SRemoteResponse<T = any> {
  success: boolean;
  data?: T;             // Kết quả trả về nếu thành công (dành cho call/status)
  error?: string;       // Mã lỗi chuẩn (SCREAMING_SNAKE_CASE)
  message?: string;     // Giải thích chi tiết nguyên nhân lỗi
  instanceId?: string;  // ID của media instance mục tiêu (nếu có)
  action?: string;      // Tên hành động được thực thi
}
```

---

## 📋 Bảng Tổng Hợp Mã Lỗi Chuẩn

| Mã Lỗi (`error`) | Tình Huống Kích Hoạt | Phương Thức Liên Quan |
| :--- | :--- | :--- |
| [`AUTH_FAILED`](#auth_failed) | Domain bị khóa bảo mật hoặc Passkey không hợp lệ. | Toàn bộ API (`play`, `pause`, `call`, ...) |
| [`WHERE_IS_INSTANCE_ID`](#where_is_instance_id) | Chế độ Multi-mode phát hiện nhiều media nhưng không chỉ định `instanceId`. | Các lệnh điều khiển phát (`play`, `seek`, ...) |
| [`INSTANCE_NOT_FOUND`](#instance_not_found) | `instanceId` yêu cầu không tồn tại hoặc chưa kết nối Port thành công. | Các lệnh điều khiển & `call()`, `status()` |
| [`MISSING_MEDIA_SOURCE`](#missing_media_source) | Thẻ `<video>` / `<audio>` rỗng chưa nạp link nguồn (`readyState = 0`). | `play()`, `toggle()` |
| [`NO_MEDIA_FOUND`](#no_media_found) | Không tìm thấy bất kỳ phần tử video/audio nào bên trong iframe. | `call('debug_*')`, các lệnh điều khiển |
| [`TIMEOUT`](#timeout) | Quá thời gian chờ phản hồi RPC (5000ms) hoặc hết hạn hàng đợi lệnh. | `call()`, queue điều khiển |
| [`PORT_ERROR` / `PORT_DISCONNECTED`](#port_error--port_disconnected) | Port MessageChannel bị ngắt kết nối hoặc lỗi postMessage. | `call()`, `dispatchCommand` |
| [`ACTION_NOT_FOUND`](#action_not_found) | Gọi RPC method chưa được đăng ký trong iframe. | `call()` |
| [`EXECUTION_ERROR`](#execution_error) | Phát sinh exception trong hàm xử lý RPC bên trong iframe. | `call()` |
| [`NO_SRC_PROVIDED`](#no_src_provided) | Gọi RPC thay đổi nguồn phát nhưng thiếu tham số `src`. | `call('debug_setSource', ...)` |
| [`NO_SAVED_SOURCE`](#no_saved_source) | Gọi khôi phục nguồn gốc nhưng trước đó chưa có nguồn nào được lưu. | `call('debug_restoreOriginal')` |

---

## 🛠️ Chi Tiết Từng Lỗi & Hướng Dẫn Khắc Phục

---

### `AUTH_FAILED`
> **Thông báo mẫu:** `Access denied. Valid Passkey is required for command 'play'`

#### Nguyên nhân:
- Trang web hiện tại đã bị khóa bằng `sremote.lock()` hoặc cấu hình yêu cầu Passkey bảo mật.
- Khi gọi hàm điều khiển, bạn không truyền kèm `key` hoặc truyền sai Passkey.

#### Cách khắc phục:
Truyền Passkey hợp lệ vào tham số `key` của hàm:
```javascript
// Ví dụ với lệnh play
const res = await sremote.play('inst_123', 'MY_SECRET_PASSKEY');

// Hoặc xác thực ngay từ khi handshake
sremote.hello({ key: 'MY_SECRET_PASSKEY' });
```

---

### `WHERE_IS_INSTANCE_ID`
> **Thông báo mẫu:** `Multiple medias detected; instanceId is required for command 'play'`

#### Nguyên nhân:
- Chế độ nhiều media (`multiMode`) đang hoạt động và SRemote đã kết nối đồng thời với từ 2 iframe/media trở lên.
- Bạn gọi lệnh điều khiển nhưng không truyền `instanceId` để xác định rõ muốn thao tác trên media nào.

#### Cách khắc phục:
1. **Chỉ định ID cụ thể:** Lấy ID từ sự kiện `accept` hoặc danh sách `sremote.list()`:
   ```javascript
   const list = sremote.list();
   if (list.length > 0) {
     await sremote.play(list[0].instanceId);
   }
   ```
2. **Hoặc áp dụng cho tất cả:** Truyền `'all'` nếu muốn điều khiển toàn bộ các media đang phát:
   ```javascript
   await sremote.play('all');
   ```

---

### `INSTANCE_NOT_FOUND`
> **Thông báo mẫu:** `Instance 'video_player_01' not found` hoặc `No active port for instance 'unknown'`

#### Nguyên nhân:
- `instanceId` bạn truyền không tồn tại trong danh sách quản lý của SRemote.
- Iframe chứa media đó đã bị xóa khỏi DOM hoặc chưa hoàn tất chu trình bắt tay (handshake).

#### Cách khắc phục:
- Kiểm tra danh sách các instance đang sẵn sàng:
  ```javascript
  console.log('Các media đang kết nối:', sremote.list());
  ```
- Nếu dùng gán ID trước (`sremote.assignId(iframe, 'custom_id')`), hãy đảm bảo gọi `sremote.hello()` sau khi gán ID để iframe nhận diện.

---

### `MISSING_MEDIA_SOURCE`
> **Thông báo mẫu:** `The iframe service has not loaded any media source into the media element (readyState = 0); play() is ineffective.`

#### Nguyên nhân:
- Trình phát bên thứ ba đã tạo sẵn thẻ `<video>` hoặc `<audio>` nhưng **chưa nạp link nguồn phát (`src`)**, dẫn đến `readyState = 0`.
- Hiện tượng này thường xảy ra ở các dịch vụ video bắt buộc người dùng phải nhấp vào ảnh bìa (poster) hoặc nút Play gốc trước thì mới bắt đầu tải dữ liệu video.

#### Cách khắc phục:
- Lắng nghe sự kiện `canplay` hoặc `loadeddata` trước khi gọi lệnh `play()`:
  ```javascript
  sremote.on('loadeddata', ({ instanceId }) => {
    sremote.play(instanceId);
  });
  ```
- Hoặc hiển thị nút nhắc người dùng nhấp trực tiếp vào iframe một lần để kích hoạt trình phát.

---

### `NO_MEDIA_FOUND`
> **Thông báo mẫu:** `No media element found to set source` hoặc `No media element or MediaSession handler found for command 'play'`

#### Nguyên nhân:
- Bên trong iframe không chứa bất kỳ thẻ `<video>`, `<audio>` hoặc MediaSession handler nào để thực thi lệnh.
- Iframe chỉ chứa tài liệu văn bản, quảng cáo tĩnh hoặc không có nội dung đa phương tiện.

#### Cách khắc phục:
- Kiểm tra xem iframe có thực sự chứa video/audio hay không bằng `sremote.debug.scan()`.
- Đảm bảo iframe đã hoàn tất quá trình tải DOM trước khi gửi lệnh điều khiển.

---

### `TIMEOUT`
> **Thông báo mẫu:** `RPC call 'getIframeCSS' timed out after 5000ms` hoặc `Command timed out waiting for iframe handshake`

#### Nguyên nhân:
- Gửi yêu cầu RPC sang iframe nhưng phía iframe không phản hồi sau 5 giây (do iframe bị treo, lỗi script nội bộ hoặc đã chuyển sang trang khác).
- Gửi lệnh khi iframe đang ở trạng thái kết nối dở dang (`connecting`) nhưng quá 10 giây vẫn không handshake thành công.

#### Cách khắc phục:
- Kiểm tra xem iframe có bị chuyển hướng sang domain khác không hỗ trợ userscript hay không.
- Gọi lại `sremote.hello()` để thiết lập lại kết nối với các iframe trên trang.

---

### `PORT_ERROR` / `PORT_DISCONNECTED`
> **Thông báo mẫu:** `Error posting command 'seek' to port for 'inst_123'`

#### Nguyên nhân:
- Kênh truyền `MessagePort` giữa trang cha và iframe bị gián đoạn (do iframe bị xóa, reload trang nội bộ hoặc bị hạn chế bởi sandbox).

#### Cách khắc phục:
- SRemote tích hợp sẵn cơ chế dọn dẹp kết nối tự động (liveness reaper). Nếu bạn vừa tạo lại thẻ iframe, chỉ cần gọi lại `sremote.hello()`.

---

### `ACTION_NOT_FOUND`
> **Thông báo mẫu:** `Custom action 'custom_filter' not found`

#### Nguyên nhân:
- Bạn gọi `sremote.call('custom_action_name')` nhưng phía iframe chưa đăng ký hàm xử lý (handler) cho action đó.

#### Cách khắc phục:
- Đảm bảo phía iframe đã đăng ký handler qua RPC registry hoặc kiểm tra lại tên `action` xem có đúng chính tả hay không (ví dụ: `'setIframeCSS'`, `'getIframeCSS'`, ...).

---

### `EXECUTION_ERROR`
> **Thông báo mẫu:** `Error: Cannot read properties of undefined` (hoặc thông báo lỗi nội bộ khi chạy RPC)

#### Nguyên nhân:
- Xảy ra ngoại lệ (exception) hoặc lỗi cú pháp trong quá trình thực thi hàm RPC bên trong iframe.

#### Cách khắc phục:
- Kiểm tra các tham số truyền vào hàm `sremote.call(action, params)` có đúng định dạng mong đợi hay không.
- Mở DevTools Console của ngữ cảnh iframe để xem chi tiết stack trace lỗi.

---

### `NO_SRC_PROVIDED`
> **Thông báo mẫu:** `Parameter "src" is required`

#### Nguyên nhân:
- Gọi RPC thay đổi nguồn phát (như `debug_setSource`) nhưng truyền tham số `params` rỗng hoặc thiếu thuộc tính `src`.

#### Cách khắc phục:
- Truyền đầy đủ URL nguồn phát hợp lệ:
  ```javascript
  await sremote.call('debug_setSource', { src: 'https://example.com/audio.mp3' });
  ```

---

### `NO_SAVED_SOURCE`
> **Thông báo mẫu:** `No original source was previously saved to restore`

#### Nguyên nhân:
- Gọi hành động khôi phục nguồn gốc (`debug_restoreOriginal`) khi trước đó chưa từng gọi đổi nguồn phát qua `debug_setSource`.

#### Cách khắc phục:
- Chỉ gọi lệnh khôi phục nguồn gốc sau khi đã từng thay đổi nguồn phát bằng `debug_setSource`.

---

## 💡 Mẫu Xử Lý Lỗi Khuyến Nghị (Best Practice)

Nhờ cơ chế Safe Response, bạn không cần dùng khối `try...catch` bọc quanh Promise mà có thể kiểm tra trực tiếp qua thuộc tính `success`:

```javascript
async function safePlayMedia(targetId) {
  const result = await window.sremote.play(targetId);

  if (!result.success) {
    switch (result.error) {
      case 'AUTH_FAILED':
        console.error('Lỗi xác thực: Cần cung cấp Passkey chính xác!');
        break;
      case 'WHERE_IS_INSTANCE_ID':
        console.warn('Phát hiện nhiều media, tự động chuyển sang phát tất cả...');
        await window.sremote.play('all');
        break;
      case 'MISSING_MEDIA_SOURCE':
        console.warn('Trình phát chưa tải xong nguồn video, vui lòng đợi...');
        break;
      default:
        console.warn(`Lệnh phát thất bại [${result.error}]:`, result.message);
    }
    return false;
  }

  console.log('Phát media thành công:', result.instanceId);
  return true;
}
```


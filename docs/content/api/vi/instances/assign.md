# sremote.instances.assign

Gán trước một `instanceId` định danh tùy chỉnh cho thẻ `<iframe>` trước hoặc trong khi handshake bắt đầu.

---

## Cú pháp

```javascript
// Chuẩn namespace mới:
sremote.instances.assign(iframeOrSelector, customId);

// Hoặc alias ngắn gọn:
sremote.instances.assign(iframeOrSelector, customId);
```

---

## Tham số

| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `iframeOrSelector` | `HTMLIFrameElement` \| `string` | **Bắt buộc** | Phần tử DOM của thẻ iframe hoặc CSS selector trỏ tới thẻ iframe (ví dụ: `'#player-frame'`). |
| `customId` | `string` | **Bắt buộc** | Mã định danh tùy chỉnh muốn gán cho iframe. |

---

## Giá trị trả về
- `boolean`: Trả về `true` nếu gán thành công, ngược lại trả về `false` (ví dụ phần tử không tồn tại hoặc `customId` không hợp lệ).

---

## Ví dụ

```javascript
// 1. Gán ID tùy chỉnh 'main-player' cho iframe trước khi kết nối
sremote.instances.assign('#my-iframe', 'main-player');

// 2. Sau đó gửi hello và điều khiển trực tiếp qua ID này
sremote.hello();
sremote.play('main-player');
```

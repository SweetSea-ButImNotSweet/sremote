# sremote.assignId
Gán trước một `instanceId` định danh tuỳ chỉnh cho thẻ `<iframe>` trước hoặc trong khi handshake bắt đầu.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `iframeOrSelector` | `HTMLIFrameElement` \| `string` | **Bắt buộc** | Phần tử DOM của thẻ iframe hoặc CSS selector trỏ tới thẻ iframe (ví dụ: `'#player-frame'`). |
| `customId` | `string` | **Bắt buộc** | Mã định danh tuỳ chỉnh muốn gán cho iframe. |

## Giá trị trả về
- `boolean`: Trả về `true` nếu gán thành công, ngược lại trả về `false` (ví dụ phần tử không tồn tại hoặc `customId` không hợp lệ).

## Ví dụ
```javascript
// Gán ID tùy chỉnh 'main-player' cho iframe trước khi kết nối
sremote.assignId('#my-iframe', 'main-player');

// Sau đó gửi hello và điều khiển trực tiếp qua ID này
sremote.hello();
sremote.play('main-player');
```

# sremote.rpc.onMessage
Lắng nghe các thông điệp/message tùy ý được gửi từ iframe lên trang cha (thông qua cầu nối MessagePort).

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `handler` | `Function` | **Bắt buộc** | Hàm callback nhận dữ liệu payload khi có message từ iframe. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Giá trị trả về
- `Function`: Hàm unsubscribe giúp huỷ đăng ký lắng nghe khi không còn nhu cầu.

## Dữ liệu callback
Callback nhận được một object chứa:
- `instanceId` (`string`): ID của iframe gửi thông điệp.
- `data` (`any`): Nội dung thông điệp.
- `origin` (`string`): Origin của trang iframe.
- `location` (`string`): Đường dẫn URL đầy đủ của iframe.

## Ví dụ
```javascript
const unbind = sremote.rpc.onMessage(payload => {
  console.log(`Nhận tin nhắn từ instance ${payload.instanceId}:`, payload.data);
});

// Khi cần gỡ bỏ lắng nghe:
// unbind();
```

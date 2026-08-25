# sremote.on
Đăng ký lắng nghe sự kiện phát sinh từ iframe media hoặc adapter.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `event` | `string` | **Bắt buộc** | Tên sự kiện muốn lắng nghe (ví dụ: `'play'`, `'pause'`, `'timeupdate'`, `'ended'`, `'accept'`, `'disconnect'`, hoặc `'*'` để bắt toàn bộ sự kiện). Không phân biệt hoa thường. |
| `handler` | `Function` | **Bắt buộc** | Hàm callback xử lý sự kiện `(payload) => void`. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Giá trị trả về
Trả về một hàm `() => void` dùng để hủy đăng ký (unsubscribe) listener tương ứng.

## Lưu ý
- Hỗ trợ cơ chế **Sticky Replay**: Nếu đăng ký sự kiện `'accept'` hoặc `'*'` sau khi iframe đã kết nối thành công trước đó, callback sẽ được gọi ngay lập tức với dữ liệu kết nối đã lưu.

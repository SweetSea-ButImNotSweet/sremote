# sremote.off
Hủy đăng ký một hàm callback đã gắn với sự kiện trước đó.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `event` | `string` | **Bắt buộc** | Tên sự kiện cần gỡ listener. |
| `handler` | `Function` | **Bắt buộc** | Tham chiếu tới hàm callback đã truyền vào `sremote.on`. |

# sremote.instances.remove

Xóa bỏ và giải phóng một instance khỏi hệ thống quản lý của SRemote (xóa adapter, giải phóng cache và thông báo ngắt kết nối).

---

## Cú pháp

```javascript
sremote.instances.remove(instanceId, key?);
```

---

## Tham số

| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `instanceId` | `string` | **Bắt buộc** | Mã định danh duy nhất của instance cần xóa. |
| `key` | `string` | `null` | Passkey xác thực nếu có kích hoạt domain lock. |

---

## Giá trị trả về
- `boolean`: Trả về `true` nếu xóa thành công, ngược lại trả về `false`.

---

## Ví dụ

```javascript
// Hủy và giải phóng instance 'youtube-player'
sremote.instances.remove('youtube-player');
```

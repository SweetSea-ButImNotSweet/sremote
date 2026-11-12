# API `sremote.debug`

Bộ công cụ chẩn đoán, quét media và kiểm thử (Diagnostics) dành riêng cho lập trình viên.

> [!NOTE]
> Bộ API Debug chỉ tồn tại khi cờ `ENABLE_DEBUG_API = true` được bật trong Userscript (mặc định bật ở môi trường phát triển). Khi tắt cờ này (`false`), các cổng debug nâng cao từ Bridge sẽ trả về `null` hoặc mảng rỗng để đảm bảo an toàn tuyệt đối khi phân phối.
> Mọi thao tác debug được tập trung thông qua namespace `sremote.debug` trên SDK Client.

---

## 👑 Thao tác Chẩn đoán Kỹ thuật (`sremote.debug`)
Thao tác tổng quan từ trang cha (Top Window). Các lệnh gọi qua `.debug` **tự động Bypass Passkey & Permission** để tiện kiểm thử.

| Phương thức | Tham số | Mô tả |
| :--- | :--- | :--- |
| `scan()` | Không | Quét toàn bộ iframe trong trang, trả về danh sách iframe, nguồn src, tình trạng kết nối và playback state. |
| `inspect(instanceId?)` | `instanceId?: string` | Tìm và tự động gọi `inspect(element)` của DevTools để nhảy thẳng tới thẻ `<video>`/`<iframe>` trong Elements tab. |
| `getMediaElement(instanceId?)` | `instanceId?: string` | Trả về `HTMLMediaElement` (nếu Same-Origin) hoặc thẻ `HTMLIFrameElement` trong DOM trang cha. |
| `getState(instanceId?)` | `instanceId?: string` | Lấy chi tiết toàn bộ trạng thái kỹ thuật của iframe: DOM Media Elements, MediaSession metadata & action handlers. |
| `capabilities(instanceId?)` | `instanceId?: string` | Kiểm tra ma trận tính năng được hỗ trợ của instance tương ứng. |
| `dump(instanceId?)` | `instanceId?: string` | In báo cáo chi tiết dạng bảng trực tiếp ra DevTools Console của trang cha. |
| `setSource(source, instanceId?)` | `source: string \| Blob \| File, instanceId?: string` | Gán đè URL hoặc Blob nguồn phát mới cho media. |
| `logLevel(level?)` | `level?: number` | Xem hoặc cập nhật mức độ log chi tiết khi debug tại runtime (`0: NONE`, `1: ERROR`, `2: WARN`, `3: INFO`, `4: DEBUG`). |

## Ví dụ sử dụng
```javascript
// 1. Quét nhanh tất cả player trong trang:
const iframes = sremote.debug.scan();
console.table(iframes);

// 2. In toàn bộ thông tin chẩn đoán ra console:
sremote.debug.dump();

// 3. Bật mức log DEBUG:
sremote.debug.logLevel(4);
```

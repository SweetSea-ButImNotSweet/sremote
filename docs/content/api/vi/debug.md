# API `sremote.debug`

Bộ công cụ chẩn đoán, quét media và kiểm thử (Diagnostics) dành riêng cho Developer.

> [!NOTE]
> Bộ API Debug chỉ tồn tại khi cờ `ENABLE_DEBUG_API = true` được bật trong userscript. Khi tắt cờ này (`false`), các cổng debug sẽ hoàn toàn `undefined` để đảm bảo an toàn tuyệt đối khi phân phối.
> Kể từ phiên bản mới, Userscript không tự ý gán `sremote_debug` vào iframe hay tự tạo `window.sremote`. Mọi thao tác debug được tập trung thông qua `sremote.debug` trên SDK.

---

## 👑 Thao tác Debug (`window.sremote.debug`)
Thao tác tổng quan từ trang cha (Top Window). Các lệnh gọi qua `.debug` **tự động Bypass Passkey & Permission** để tiện kiểm thử.

| Phương thức | Tham số | Mô tả |
| :--- | :--- | :--- |
| `scan()` | Không | Quét toàn bộ iframe trong trang, in `console.table` danh sách iframe, nguồn src, tình trạng kết nối và playback state. |
| `inspect(instanceId?)` | `instanceId?: string` | Tìm và tự động gọi `inspect(element)` của DevTools để nhảy thẳng tới thẻ `<video>`/`<iframe>` trong Elements tab. |
| `getMediaElement(instanceId?)` | `instanceId?: string` | Trả về `HTMLMediaElement` (nếu Same-Origin) hoặc thẻ `HTMLIFrameElement` trong DOM trang cha. |
| `getState(instanceId?)` | `instanceId?: string` | Lấy chi tiết toàn bộ trạng thái kỹ thuật của iframe: DOM Media Elements, MediaSession metadata & action handlers. |
| `dump(instanceId?)` | `instanceId?: string` | In báo cáo chi tiết dạng bảng trực tiếp ra DevTools Console của trang cha. |
| `play(instanceId?)` | `instanceId?: string` | Ép phát media ngay lập tức. |
| `pause(instanceId?)` | `instanceId?: string` | Ép dừng media. |
| `toggle(instanceId?)` | `instanceId?: string` | Chuyển đổi trạng thái play/pause. |
| `seek(offset, instanceId?)` | `offset: number, instanceId?: string` | Tua tương đối (cộng/trừ số giây). |
| `seekTo(time, instanceId?)` | `time: number, instanceId?: string` | Tua trực tiếp đến mốc thời gian (giây). |
| `setVolume(vol, instanceId?)` | `vol: number (0 -> 1 hoặc 0 -> 100), instanceId?: string` | Điều chỉnh âm lượng. |
| `setMute(muted?, instanceId?)` | `muted?: boolean, instanceId?: string` | Bật/tắt chế độ câm tiếng. |
| `setRate(rate, instanceId?)` | `rate: number (0.25 -> 4.0), instanceId?: string` | Điều chỉnh tốc độ phát. |
| `setSource(source, instanceId?)` | `source: string \| Blob \| File, instanceId?: string` | Gán đè URL hoặc Blob nguồn phát mới cho media. |
| `logLevel(level?)` | `level?: number` | Xem hoặc cập nhật mức độ log chi tiết khi debug tại runtime. |


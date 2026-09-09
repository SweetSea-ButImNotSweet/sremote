# SRemote Connection Architecture Rewrite - TODO Tracker

Dự án tái cấu trúc triệt để tầng kết nối (Transport Layer) giữa Parent (Top Window) và Child (Iframe), tách biệt hoàn toàn giữa **Kênh Truyền Thông (Transport)** và **Trạng Thái Media (Media State)**.

---

## 📋 Danh sách công việc (Work Breakdown)

### Giai đoạn 1: Thiết kế Kiến trúc & State Machine (Architectural Design)
- [x] **Task 1.1:** Soạn thảo Implementation Plan chi tiết phân tách Transport Layer vs Media Layer.
- [x] **Task 1.2:** Định nghĩa State Machine cho Transport Connection (`DISCONNECTED`, `CONNECTING`, `CONNECTED`, `TERMINATED`).
- [x] **Task 1.3:** Định nghĩa State Machine cho Media State (`NO_MEDIA`, `MEDIA_RESOLVING`, `MEDIA_READY`, `PLAYING`, `PAUSED`).
- [x] **Task 1.4:** Thống nhất bảng danh mục Message Protocol (phân loại Transport frames vs Media frames).

---

### Giai đoạn 2: Xây dựng Module Transport Độc lập (Clean Rewrite Core)
- [x] **Task 2.1:** Viết lại `packages/userscript/src/parent/transport.js` (quản lý MessagePort, token verification, challenge, blacklist, heartbeat độc lập).
- [x] **Task 2.2:** Viết lại `packages/userscript/src/iframe/transport.js` (quản lý handshake, MessageChannel, port binding, reconnect).
- [x] **Task 2.3:** Tách biệt triệt để: Sự kiện mất media / đổi video (`noMedia`, `srcChange`) **không được kích hoạt** đóng MessagePort.

---

### Giai đoạn 3: Tích hợp với Dispatcher & Media Resolver (Integration)
- [x] **Task 3.1:** Cập nhật `parent/index.js` (chuyển `dispatchCommand` sang dùng `TransportManager` mới, đảm bảo thứ tự ưu tiên Adapter > Top DOM Media > MediaSession > Iframe Port).
- [x] **Task 3.2:** Cập nhật `iframe/index.js` (khi `checkActiveMediaLiveness` không tìm thấy media, chỉ thông báo `mediaStateChanged` với `hasMedia: false`, giữ nguyên port).
- [x] **Task 3.3:** Xóa bỏ hoàn toàn các đoạn code cũ thừa thãi/vá víu trong `handshake.js` và `liveness.js`.

---

### Giai đoạn 4: Kiểm thử & Đóng gói (Verification & Packaging)
- [x] **Task 4.1:** Test kịch bản YouTube đổi bài / reload video không đổi iframe (xác nhận port vẫn sống, lệnh play/pause thông suốt).
- [x] **Task 4.2:** Test kịch bản React Strict Mode (mount -> unmount -> remount iframe) với Grace Period.
- [x] **Task 4.3:** Test kịch bản Iframe không có token -> One-time Challenge -> Blacklist.
- [x] **Task 4.4:** Chạy build bundle & `npm run pack` kiểm tra toàn bộ artifacts.

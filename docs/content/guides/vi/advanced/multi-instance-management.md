# Quản lý đa Instance & Chế độ độc quyền (Multi-Instance)

Trong các ứng dụng web phức tạp (như nền tảng học online nhiều màn hình, trang tin tức tổng hợp, hoặc sàn thương mại điện tử với nhiều video sản phẩm), trên một trang web có thể xuất hiện nhiều trình phát media đồng thời.

Namespace **`sremote.instances`** cung cấp bộ công cụ toàn diện để quản lý danh sách, điều hướng và tự động hóa trạng thái giữa các player.

---

## 1. Lấy danh sách các Instance đang kết nối

Để biết hiện tại đang có những trình phát nào đang hoạt động trên trang:

```javascript
import { sremote } from '@sremote/sdk';

// Lấy mảng chứa toàn bộ instance ID đang kết nối
const activeInstances = sremote.instances.list();
console.log('Các player đang online:', activeInstances);
// Kết quả: ['sv_youtube_1', 'sv_vimeo_2', 'slot_course_intro']
```

---

## 2. Chế độ phát độc quyền (`setExclusive`)

Một vấn đề phổ biến trong thiết kế trải nghiệm người dùng (UX) là: **Khi người dùng bấm Play ở video A, các video B, C khác đang phát phải tự động Pause** để tránh tình trạng âm thanh bị chồng chéo hỗn loạn.

SRemote giải quyết vấn đề này tự động chỉ với 1 dòng lệnh:

```javascript
// Bật chế độ tự động độc quyền:
sremote.instances.setExclusive('auto');
```

- **`'auto'`**: Bất cứ khi nào một instance phát tín hiệu `play`, SRemote sẽ tự động gửi lệnh `pause()` tới tất cả các instance còn lại trên trang.
- **`'none'`**: Cho phép nhiều video/audio phát đồng thời (mặc định).

---

## 3. Gán nhãn ngữ nghĩa với `instances.assign()`

Mặc định, các instance sẽ được cấp mã định danh ngẫu nhiên (ví dụ `sv_youtube_1a2b3c`). Để code dễ đọc và bảo trì, bạn có thể gán nhãn cố định cho phần tử DOM:

```javascript
// Gán phần tử DOM với một tên định danh dễ nhớ:
sremote.instances.assign('#video-header', 'hero-player');
sremote.instances.assign('#sidebar-podcast', 'podcast-player');

// SRemote 4.0: Điều khiển trực tiếp bằng Fluent Selector hoặc ID gán nhãn:
await sremote('hero-player').play();
await sremote('podcast-player').volume(0.5);

// Hoặc gọi trực tiếp bằng DOM selector & method chaining:
await sremote('#video-header').play().seek(10);
```

---

## 4. Kiểm tra trạng thái chi tiết của từng Instance

Bạn có thể tra cứu nhanh trạng thái của một instance cụ thể:

```javascript
const state = sremote.instances.get('hero-player')?.state;

if (state) {
  console.log('Trạng thái player:', {
    paused: state.paused,
    currentTime: state.currentTime,
    duration: state.duration,
    volume: state.volume
  });
}
```

---

## ⏭️ Bước tiếp theo
- Tra cứu các mã lỗi và kỹ thuật kiểm thử tại [Chẩn đoán & Xử lý sự cố](./troubleshooting-and-debugging.md).

# Use-case 3: Điều khiển Media trực tiếp trên cùng trang (Không Iframe)

Không chỉ giải quyết bài toán iframe xuyên domain, **SRemote SDK** còn hoạt động như một thư viện điều phối media cực mạnh cho các thẻ `<video>` và `<audio>` chuẩn HTML5 nằm trực tiếp trên trang chính (**Same-Origin / Local Media**).

Trong kịch bản này, SRemote hoạt động ở chế độ **`'dom-direct'`** — hoàn toàn độc lập và **không đòi hỏi người dùng phải cài đặt Userscript**.

---

## 1. Khi nào nên dùng SRemote cho Media nội bộ?

Nếu trang web của bạn đã có thẻ `<video src="...">`, tại sao lại nên dùng SRemote thay vì gọi trực tiếp `videoElement.play()`?

1. **API đồng bộ và an toàn**: Tự động bọc lỗi Promise (tránh lỗi Uncaught Promise Rejection khi dính chính sách Autoplay).
2. **Quản lý đa phương tiện (Multi-instance)**: Tự động điều phối nhiều video cùng lúc. Ví dụ: khi video A bấm phát thì video B tự động dừng (chế độ phát độc quyền `exclusive`).
3. **Thống nhất logic ứng dụng**: Dù ứng dụng của bạn vừa có video tự host (MP4/HLS) vừa có video nhúng YouTube, code giao diện của bạn chỉ cần gọi một hàm `sremote.play()` duy nhất.

---

## 2. Cách triển khai cực kỳ đơn giản

Chỉ cần cài đặt `@sremote/sdk`:

```bash
npm install @sremote/sdk
```

### HTML:
```html
<video id="hero-video" src="/videos/intro.mp4" controls width="640"></video>
```

### JavaScript:
```javascript
import { createSRemoteClient } from '@sremote/sdk';

// Khởi tạo client SRemote
const sremote = createSRemoteClient({
  fallbackToDom: true // Tự động nhận diện media trên DOM nếu không có userscript
});

await sremote.ready();
console.log('Chế độ hoạt động:', sremote.mode); // Sẽ in ra: 'dom-direct'

// Điều khiển thẻ video trực tiếp:
await sremote.play();
await sremote.seek(15);      // Tua tới 15s
await sremote.volume(0.8);   // Âm lượng 80%

// Lắng nghe sự kiện phát
sremote.on('timeupdate', ({ state }) => {
  console.log(`Tiến độ video nội bộ: ${state.currentTime}s / ${state.duration}s`);
});
```

---

## 3. Tự động liên kết nhiều thẻ Media với `instances.assign()`

Nếu trang của bạn có nhiều video (ví dụ: video bài giảng và video giải trí góc phải màn hình):

```html
<video id="lecture-video" src="/lecture.mp4"></video>
<video id="pip-video" src="/companion.mp4"></video>
```

Bạn có thể gán nhãn cho từng video để điều khiển độc lập:

```javascript
import { sremote } from '@sremote/sdk';

// Gán selector với một ID dễ nhớ
sremote.instances.assign('#lecture-video', 'lecture');
sremote.instances.assign('#pip-video', 'companion');

// Điều khiển chính xác từng video theo ID hoặc selector trực tiếp (SRemote 4.0):
await sremote('lecture').play();
await sremote('companion').pause();

// Hoặc gọi trực tiếp qua CSS Selector:
await sremote('#lecture-video').play();

// Hoặc bật chế độ phát độc quyền (chỉ cho phép 1 video phát tại 1 thời điểm):
sremote.instances.setExclusive('auto');
```

---

## ⏭️ Bước tiếp theo
- Khi bạn cần nhúng các iframe phức tạp khác domain mà không có sẵn SDK chính thức, hãy tìm hiểu [Use-case 4: Vượt rào cản Cross-Origin Iframe với Userscript](./04-cross-origin-userscript.md).

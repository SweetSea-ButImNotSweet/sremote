# Hướng dẫn Thiết lập Iframe & Tích hợp SRemote cho Developer

Tài liệu này hướng dẫn chi tiết cách cấu hình thẻ `<iframe>` chuẩn kỹ thuật và các bước tích hợp `SRemote` vào ứng dụng web của bạn (Vanilla JS, SPA React, Vue, v.v.).

---

## 1. Thiết lập thẻ `<iframe>` chuẩn kỹ thuật

Khi nhúng video/audio từ một dịch vụ bên thứ ba (YouTube, Spotify, SoundCloud, Dailymotion, Player tùy biến...), bảo mật trình duyệt sẽ giới hạn một số tính năng nếu bạn không cấp đủ quyền qua thuộc tính `allow`.

### 📌 Cấu trúc `<iframe>` khuyến nghị:
```html
<iframe
  id="media-frame"
  src="https://target-service.com/embed/..."
  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
  allowfullscreen
  loading="lazy"
  style="width: 100%; height: 450px; border: none;">
</iframe>
```

### 🔍 Giải thích các quyền quan trọng trong `allow`:
- **`autoplay`** *(Bắt buộc)*: Cho phép media bên trong iframe được quyền phát hoặc tự động phát.
- **`encrypted-media`** *(Bắt buộc với DRM/Spotify/Netflix/Widevine)*: Cho phép iframe khởi tạo luồng giải mã dữ liệu mã hóa bản quyền số.
- **`picture-in-picture`**: Cho phép video kích hoạt chế độ cửa sổ nổi thu nhỏ qua API `sremote.pip()`.
- **`fullscreen` / `allowfullscreen`**: Cho phép phóng to toàn màn hình.

> [!WARNING]
> Nếu thiếu `autoplay` hoặc `encrypted-media`, trình duyệt sẽ chặn luồng âm thanh/hình ảnh khiến lệnh `sremote.play()` không thể khởi chạy.

---

## 2. Vòng đời tích hợp & Kết nối (Handshake Lifecycle)

SRemote hoạt động bằng cơ chế bắt tay bảo mật **Handshake ID & MessageChannel (MessagePort)** giữa trang cha và iframe.

```
Top Window (Website của bạn)                  Iframe (Chứa Media Player)
          │                                              │
          │─── sremote.hello() (postMessage) ───────────>│
          │                                              │ 
          │<─── accept (Tạo cổng MessagePort riêng) ─────│ (Kèm MediaMetadata)
          │                                              │
     [SẴN SÀNG ĐIỀU KHIỂN]                         [LẮNG NGHE LỆNH]
          │─── sremote.play() / pause() / seek() ───────>│
          │<─── timeupdate / ended / volumechange ───────│
```

---

## 3. Các bước tích hợp cơ bản (Vanilla JS)

### Bước 1: Lắng nghe sự kiện kết nối
Đăng ký nhận sự kiện `'accept'` từ SRemote trước hoặc ngay khi gọi handshake. SRemote hỗ trợ **Sticky Replay**, vì vậy ngay cả khi bạn đăng ký sau khi iframe đã kết nối, callback vẫn sẽ nhận được sự kiện:

```javascript
// Lắng nghe khi iframe kết nối thành công
window.sremote.on('accept', (data) => {
  console.log('✅ Đã kết nối tới media instance:', data.instanceId);
  console.log('Loại media:', data.mediaType); // 'video' | 'audio' | 'mediasession' | 'adapter'
});

// Lắng nghe tiến độ phát
window.sremote.on('timeupdate', (data) => {
  console.log('Tiến độ:', data.state.currentTime, '/', data.state.duration);
});

// Lắng nghe khi media kết thúc
window.sremote.on('ended', () => {
  console.log('🎉 Bài hát/Video đã phát xong');
});
```

### Bước 2: Bắt đầu tìm kiếm & Bắt tay (`sremote.hello`)
Gọi `sremote.hello()` khi trang đã sẵn sàng:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Gửi bắt tay tới tất cả các iframe trong trang
  window.sremote.hello();
});
```

Nếu bạn có nhiều iframe và chỉ muốn kết nối tới một iframe cụ thể:
```javascript
const myFrame = document.getElementById('media-frame');
window.sremote.hello({
  target: myFrame.contentWindow
});
```

---

## 4. Chống giật/chớp giao diện với Dynamic CSS (Anti-FOUC)

Nếu bạn muốn ẩn thanh điều khiển mặc định, nút rác hoặc logo của bên thứ ba trong iframe, hãy truyền `css` trực tiếp vào `hello()`:

```javascript
window.sremote.hello({
  css: `
    /* Ẩn các nút điều khiển mặc định để dùng UI của web bạn */
    .native-controls, .watermark-logo, .ad-banner {
      display: none !important;
    }
  `
});
```

> [!TIP]
> CSS truyền qua `hello({ css: '...' })` được nạp thẳng vào `document.documentElement` của iframe ngay từ giai đoạn `document-start` trước khi DOM được dựng, loại bỏ hoàn toàn hiện tượng chớp/giật giao diện (Flash of Unstyled Content).

---

## 5. Xử lý các tình huống thực tế thường gặp

### A. Lỗi `MISSING_MEDIA_SOURCE` & Chính sách Autoplay của trình duyệt
Một số dịch vụ nhúng (như video player tự viết hoặc audio player lười nạp) tạo thẻ `<video>` rỗng và chỉ nạp thuộc tính `src` sau khi người dùng bấm nút Play lần đầu.
- Khi gọi `sremote.play()`, nếu media chưa có `src`, SRemote sẽ trả về `{ error: 'MISSING_MEDIA_SOURCE' }`.
- **Cách xử lý:** Thiết kế giao diện trên trang cha có nút "Khởi động Player" hoặc gợi ý người dùng click 1 lần vào iframe để kích hoạt âm thanh theo chính sách Autoplay của trình duyệt.

### B. Sử dụng trong ứng dụng Single Page App (React / Vue)
Khi làm việc với SPA, component chứa iframe có thể bị mount/unmount liên tục:

```jsx
import React, { useEffect, useRef } from 'react';

export function CustomMediaPlayer({ src }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    // 1. Đăng ký sự kiện
    const unsubAccept = window.sremote.on('accept', (data) => {
      console.log('Player ready:', data.instanceId);
    });

    const unsubTime = window.sremote.on('timeupdate', (data) => {
      // Cập nhật timeline state trên UI cha
    });

    // 2. Kích hoạt handshake khi iframe đã render
    if (iframeRef.current) {
      window.sremote.hello({
        target: iframeRef.current.contentWindow
      });
    }

    // 3. Dọn dẹp listener khi unmount
    return () => {
      unsubAccept();
      unsubTime();
    };
  }, [src]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      style={{ width: '100%', height: '400px', border: 0 }}
    />
  );
}
```

### C. Quản lý nhiều Iframe cùng lúc (`multiMode` & `setExclusive`)
Nếu website của bạn nhúng nhiều video trên cùng một trang (như trang khóa học, danh sách playlist, dashboard giám sát):

```javascript
// Bật chế độ tự động dừng các video khác khi có 1 video bắt đầu phát
window.sremote.setExclusive('auto');

// Hoặc điều khiển chính xác instance bằng instanceId
window.sremote.play('sv_youtube_1');
window.sremote.pause('sv_spotify_2');

// Phát hoặc dừng toàn bộ cùng lúc
window.sremote.play('all');
window.sremote.pause('all');
```

---

## 6. Đăng ký Custom Adapter cho Player đặc thù (`useAdapter`)

Nếu một iframe sử dụng SDK phát nhạc riêng (ví dụ YouTube Iframe API với `YT.Player` hoặc SoundCloud Widget SDK), bạn có thể bọc nó qua Custom Adapter để dùng chung toàn bộ bảng điều khiển của SRemote:

```javascript
const adapterId = window.sremote.useAdapter({
  play() { ytPlayer.playVideo(); },
  pause() { ytPlayer.pauseVideo(); },
  toggle() { ytPlayer.getPlayerState() === 1 ? ytPlayer.pauseVideo() : ytPlayer.playVideo(); },
  seekTo(seconds) { ytPlayer.seekTo(seconds, true); },
  setVolume(vol) { ytPlayer.setVolume(vol * 100); },
  getCurrentTime() { return ytPlayer.getCurrentTime(); },
  getDuration() { return ytPlayer.getDuration(); },
  paused() { return ytPlayer.getPlayerState() !== 1; }
}, 'my_youtube_player');

// Bây giờ bạn có thể điều khiển qua SRemote như bình thường:
window.sremote.play(adapterId);
```

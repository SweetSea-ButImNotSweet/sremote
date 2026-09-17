# Bắt đầu trong 5 phút với SRemote

Chào mừng bạn đến với **SRemote**! Hướng dẫn này sẽ giúp bạn nhúng và điều khiển một trình phát media (video/audio) bên thứ ba trên trang web của bạn chỉ trong vòng chưa đầy 5 phút.

---

## 1. Cài đặt các gói cần thiết

SRemote cung cấp hai gói thư viện phối hợp hoàn hảo cho frontend hiện đại:
- **`@sremote/sdk`**: Universal Client SDK để điều khiển, quản lý sự kiện và kết nối media.
- **`@sremote/ready2use`**: Bộ sưu tập 22 trình phát định sẵn (YouTube, Vimeo, Spotify, SoundCloud, Twitch, TikTok...).

Cài đặt bằng trình quản lý gói ưa thích của bạn:

```bash
# npm
npm install @sremote/sdk @sremote/ready2use

# pnpm
pnpm add @sremote/sdk @sremote/ready2use

# yarn
yarn add @sremote/sdk @sremote/ready2use
```

---

## 2. Nhúng và điều khiển trình phát đầu tiên

Hãy thử nhúng một video YouTube vào trang web và điều khiển nó thông qua `sremote`:

### HTML:
Tạo một container chứa player trong file HTML của bạn:
```html
<div id="player-box" style="width: 100%; max-width: 720px; aspect-ratio: 16/9;"></div>

<div style="margin-top: 12px; display: flex; gap: 8px;">
  <button id="btn-play">▶ Phát</button>
  <button id="btn-pause">⏸ Tạm dừng</button>
  <button id="btn-seek">⏩ Tua 10s</button>
</div>
```

### JavaScript:
```javascript
import { sremote } from '@sremote/sdk';
import { youtube } from '@sremote/ready2use';

// 1. Gắn YouTube Player vào container bằng mount()
// (Hàm mount tự động đăng ký adapter vào sremote và kích hoạt player)
await youtube.mount('#player-box', {
  videoId: 'dQw4w9WgXcQ',
  playerVars: {
    autoplay: 0,
    controls: 1
  }
});

// 2. Điều khiển tự nhiên và trực tiếp qua sremote:
document.getElementById('btn-play').onclick = async () => {
  await sremote.play();
};

document.getElementById('btn-pause').onclick = async () => {
  await sremote.pause();
};

document.getElementById('btn-seek').onclick = async () => {
  await sremote.seek(10); // Tua tiến 10 giây so với thời điểm hiện tại
};

// 3. Lắng nghe tiến độ phát theo thời gian thực
sremote.on('timeupdate', ({ state }) => {
  console.log(`⏱️ Thời gian: ${Math.round(state.currentTime)}s / ${Math.round(state.duration)}s`);
});
```

> [!TIP]
> **Điều khiển Scoped độc lập theo từng Component (Tùy chọn):**  
> Nếu bạn xây dựng ứng dụng với React / Vue và muốn giữ bộ điều khiển cục bộ chỉ trong phạm vi một component riêng biệt mà không gọi qua `sremote` toàn cục, hàm `mount()` cũng trả về sẵn một bộ điều khiển scoped:
> ```javascript
> const { remote, destroy } = await youtube.mount('#player-box', { videoId: '...' });
> await remote.play();
> await remote.seekTo(30);
> ```

---

## 3. Điều gì vừa diễn ra ngầm phía dưới?

Khi bạn gọi `youtube.mount('#player-box', { videoId: ... })`:
1. **Tải SDK tự động**: `@sremote/ready2use` tự động nạp SDK chính thức của nền tảng (ví dụ `iframe_api` của YouTube).
2. **Khởi tạo DOM**: Thẻ `<iframe>` được tạo ra với đầy đủ các thuộc tính bảo mật và cấp quyền cần thiết (`allow="autoplay; encrypted-media..."`).
3. **Chuẩn hóa Adapter**: Một Adapter theo **chuẩn HTML5 Media Element** được tạo ra để đồng nhất mọi phương thức phát (`play()`, `pause()`, `seek()`, `seekTo()`, `volume()`).
4. **Tự động liên kết vào `sremote`**: Adapter tự động đăng ký vào client `sremote`. Vì vậy, bạn chỉ cần gọi `sremote.play()` hay `sremote.seek()` là lệnh sẽ được thực thi ngay lập tức.

---

## 4. Dọn dẹp tài nguyên (Cleanup)

Khi người dùng chuyển trang hoặc component trong React / Vue / Svelte bị unmount, chỉ cần gọi hàm `destroy`:

```javascript
const yt = await youtube.mount('#player-box', { videoId: '...' });

// Khi component unmount:
yt.destroy();
```
Hàm `destroy()` sẽ tự động hủy player, gỡ bỏ các event listener ngầm và dọn dẹp sạch sẽ DOM container.

---

## ⏭️ Bước tiếp theo
- Khám phá [Kiến trúc tổng quan của SRemote](../concepts/architecture-overview.md) để hiểu rõ cách hoạt động của hệ sinh thái.
- Hoặc đi thẳng vào [Use-case 1: Nhúng và điều khiển 22 nền tảng](../use-cases/01-popular-players-ready2use.md).

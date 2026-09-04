[ English ](../README.md) | [ Tiếng Việt ]

# SRemote

> **Framework & SDK Điều Khiển Media Nhúng (Cross-Origin) Đa Nền Tảng**

[![License: LGPL v3](https://img.shields.io/badge/License-LGPL_v3-blue.svg)](../LICENSE)
[![npm version](https://img.shields.io/npm/v/@sremote/wrapper.svg)](https://www.npmjs.com/package/@sremote/wrapper)

**SRemote** cung cấp một giao diện điều khiển thống nhất cho media nhúng trên web (HTML5 video/audio, YouTube, Spotify, Vimeo, SoundCloud, Bilibili và nhiều nền tảng khác). Dự án làm việc quanh giới hạn Same-Origin Policy (SOP) thông qua cầu nối Userscript tùy chọn, kèm theo SDK phía client cho lập trình viên.

---

## 📦 Các gói trong Monorepo

| Gói | Mục đích | Tài liệu |
| :--- | :--- | :--- |
| **`@sremote/wrapper`** | SDK phía client giúp tự động nhận diện, kết nối, điều khiển player và hiển thị modal hướng dẫn cài đặt | [Wrapper README](../packages/wrapper/README.md) |
| **`@sremote/ready2use`** | Bộ preset & adapter dựng sẵn cho nhiều nền tảng (YouTube, Spotify, Apple Music, v.v.) | [Ready2Use README](../packages/ready2use/README.md) |
| **`@sremote/userscript`** | Cầu nối Userscript cho trình duyệt giúp điều khiển các iframe bị chặn bởi Same-Origin Policy | [Userscript Hướng Dẫn](../packages/userscript/README/vi.md) |

---

## 🚀 Bắt đầu nhanh

### 1. Dùng thư viện `@sremote/wrapper` (Khuyên dùng cho Web App hiện đại)

```bash
npm install @sremote/wrapper
```

```javascript
import { createSRemote } from '@sremote/wrapper';

const remote = createSRemote();
await remote.ready();

// Hiển thị modal hướng dẫn nếu trang web yêu cầu userscript cho iframe bên thứ ba
if (!remote.isUserscriptAvailable()) {
  remote.showInstallModal();
}

// Điều khiển thống nhất tất cả player
await remote.play();
await remote.seek(10);
await remote.volume(0.8);
```

### 2. Dùng gói preset `@sremote/ready2use` (Preset dựng sẵn cho YouTube, Spotify...)

```bash
npm install @sremote/ready2use @sremote/wrapper
```

```javascript
import { youtube, spotify } from '@sremote/ready2use';

// Tự động chèn iframe YouTube vào DOM và kết nối sẵn với SRemote
const yt = await youtube.mount('#player-container', {
  videoId: 'dQw4w9WgXcQ'
});

await yt.remote.play();
await yt.remote.seek(15);
```

### 3. Dùng trực tiếp qua thẻ Script (`window.sremote`)

```html
<script src="https://cdn.jsdelivr.net/npm/@sremote/wrapper/dist/index.global.js"></script>
<script>
  window.sremote.hello();
  window.sremote.on('accept', (data) => console.log('Đã kết nối:', data.instanceId));
  window.sremote.play();
</script>
```

---

## 🎯 Khả năng hỗ trợ & Độ tương thích

| Nền tảng | Cơ chế hỗ trợ | Ghi chú tích hợp |
| :--- | :---: | :--- |
| **HTML5 Media thuần (Plyr, VideoJS...)** | ✅ Native | Điều khiển trực tiếp qua DOM/event, không cần adapter |
| **Bilibili / Rumble / Kick / Bandcamp** | ✅ Userscript Discovery | Tự động nhận diện qua Userscript |
| **YouTube** | ⚡ Adapter / Ready2Use | Qua YouTube IFrame Player API |
| **Spotify** | ⚡ Adapter / Ready2Use | Qua Spotify IFrame API |
| **Apple Music (MusicKit)** | ⚡ Adapter / Ready2Use | Qua MusicKit JS |
| **SoundCloud** | ⚡ Adapter / Ready2Use | Qua SoundCloud Widget API |
| **Vimeo / Dailymotion / Twitch / Mixcloud** | ⚡ Adapter / Ready2Use | Qua Player SDK chính thức |
| **NicoNico Douga** | ⚡ PostMessage Mode | Giao thức 2 chiều postMessage |

---

## 👤 Dành cho người dùng cuối (Cài đặt Userscript)

Nếu bạn được trang web chuyển hướng sang đây để cài Userscript:
- 👉 Hãy đọc [Hướng dẫn Userscript](../packages/userscript/README/vi.md) để hiểu tại sao trang web cần cầu nối này.
- Link tải Userscript trực tiếp: [`dist/sremote.user.js`](https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.user.js)

---

## 📖 Tài liệu kỹ thuật & Tham khảo

- 📘 **Tài liệu Kỹ thuật:** [SRemote Documentation](../docs/index.html)
- 🍳 **Cookbook / Thư viện code mẫu:** [Recipes](../docs/recipes.html)
- 🎮 **Test Harness:** [Demo](../demo/index.html)

---

## 🛠️ Phát triển & Build Monorepo

```bash
# Cài đặt dependencies
npm install

# Khởi động dev server với hot reload
npm run dev

# Build toàn bộ packages (Userscript, Wrapper, Ready2Use)
npm run build

# Format mã nguồn
npm run format
```

---

## 📄 License

Dự án được phân phối dưới giấy phép **GNU Lesser General Public License v3.0 (LGPL-3.0)** - xem chi tiết tại file [LICENSE](../LICENSE).
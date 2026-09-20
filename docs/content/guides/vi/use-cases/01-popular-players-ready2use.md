# Use-case 1: Nhúng và điều khiển 22 nền tảng với Ready2Use

Đây là phương án tích hợp **nhanh nhất, phổ biến nhất và được khuyến nghị hàng đầu** cho các ứng dụng web hiện đại.

Khi kết hợp `@sremote/sdk` và `@sremote/ready2use`, bạn không cần nhúng SDK bên thứ ba thủ công, không cần cấu hình thẻ `<iframe>` và **không bắt buộc người dùng cuối phải cài đặt Userscript**.

---

## 1. Cài đặt

```bash
npm install @sremote/sdk @sremote/ready2use
```

---

## 2. Hai phương thức khởi tạo: `.mount()` và `.create()`

Tất cả 22 nền tảng được xuất khẩu từ `@sremote/ready2use` đều cung cấp hai hàm khởi tạo linh hoạt:

### A. Phương thức `.mount(container, options)` (Khuyên dùng)
Tự động tạo DOM element / iframe, gắn vào vùng chứa (`container`) chỉ định, đồng thời **tự động liên kết adapter vào `sremote`**:

```javascript
import { sremote } from '@sremote/sdk';
import { youtube } from '@sremote/ready2use';

await youtube.mount('#my-player-container', {
  videoId: 'dQw4w9WgXcQ',
  width: '100%',
  height: 400
});

// Điều khiển tự nhiên và đồng bộ qua sremote:
await sremote.play();
await sremote.pause();
await sremote.seek(15);
```

### B. Phương thức `.create(options)` (Dành cho React / Vue)
Tạo sẵn đối tượng DOM và adapter nhưng **chưa gắn vào DOM**. Thích hợp khi bạn muốn tự quản lý việc gắn thẻ iframe qua lifecycle của component UI:

```javascript
import { sremote } from '@sremote/sdk';
import { vimeo } from '@sremote/ready2use';

const vm = await vimeo.create({
  videoId: '76979871',
  width: '100%',
  height: 400
});

// Tự tay gắn iframe vào DOM của component:
document.getElementById('wrapper-box').appendChild(vm.iframe);

// Điều khiển qua sremote như bình thường:
await sremote.play();
```

---

## 3. Hai mô hình điều khiển: Toàn cục (`sremote`) vs Độc lập Scoped (`remote`)

SRemote hỗ trợ cả hai mô hình kiến trúc tùy theo cách tổ chức dự án của bạn:

### Mô hình 1: Điều khiển tập trung qua `sremote` (Khuyên dùng cho toàn trang / Dashboard)
Khi trang web có thanh điều khiển chung (Global Media Bar, Floating Player Controls) hoặc quản lý nhiều player:

```javascript
import { sremote } from '@sremote/sdk';
import { youtube } from '@sremote/ready2use';

const yt = await youtube.mount('#player', { videoId: 'dQw4w9WgXcQ' });

// Điều khiển active player hiện tại:
await sremote.play();
await sremote.seekTo(45);
await sremote.volume(0.8);
await sremote.toggle();

// Hoặc điều khiển đích danh theo instanceId hoặc DOM selector (SRemote 4.0):
await sremote(yt.instanceId).play();
await sremote('#player').seekTo(45);

// Lắng nghe sự kiện toàn cục:
sremote.on('timeupdate', ({ instanceId, state }) => {
  console.log(`[${instanceId}] Vị trí: ${state.currentTime}s / ${state.duration}s`);
});
```

### Mô hình 2: Điều khiển Scoped độc lập qua thuộc tính `remote` (Dành cho Component cô lập)
Nếu bạn đang viết một UI component tái sử dụng độc lập (ví dụ: một Card sản phẩm trong React có chứa video), bạn có thể lấy trực tiếp bộ điều khiển scoped `remote` mà không cần phụ thuộc vào client toàn cục:

```javascript
const { remote, destroy } = await youtube.mount('#player', { videoId: 'dQw4w9WgXcQ' });

// Điều khiển cô lập bên trong component:
await remote.play();
await remote.pause();
await remote.seekTo(30);
await remote.toggle();

// Dọn dẹp khi component unmount:
// destroy();
```

---

## 4. Danh sách 22 Nền tảng được hỗ trợ

| Nền tảng | Import | Trạng thái Adapter | Cơ chế tích hợp |
| :--- | :--- | :---: | :--- |
| **YouTube** | `import { youtube } from '@sremote/ready2use'` | ✅ Full | YouTube IFrame Player API (`YT.Player`) |
| **Vimeo** | `import { vimeo } from '@sremote/ready2use'` | ✅ Full | Vimeo Player SDK (`@vimeo/player`) |
| **SoundCloud** | `import { soundcloud } from '@sremote/ready2use'` | ✅ Full | SoundCloud Widget API (`SC.Widget`) |
| **Dailymotion** | `import { dailymotion } from '@sremote/ready2use'` | ✅ Full | Dailymotion Player SDK |
| **Twitch** | `import { twitch } from '@sremote/ready2use'` | ✅ Full | Twitch Interactive Player SDK |
| **Mixcloud** | `import { mixcloud } from '@sremote/ready2use'` | ✅ Full | Mixcloud Widget API |
| **Spotify** | `import { spotify } from '@sremote/ready2use'` | ✅ Full | Spotify IFrame API (`EmbedController`) |
| **Apple MusicKit** | `import { applemusickit } from '@sremote/ready2use'` | ✅ Full | Apple MusicKit JS v3 SDK |
| **PeerTube** | `import { peertube } from '@sremote/ready2use'` | ✅ Full | PeerTube Embed API |
| **TikTok** | `import { tiktok } from '@sremote/ready2use'` | ✅ Full | TikTok Official Embed Player (v1) postMessage |
| **NicoNico** | `import { niconico } from '@sremote/ready2use'` | ✅ Full | NicoNico Player PostMessage Protocol |
| **Facebook** | `import { facebook } from '@sremote/ready2use'` | ✅ Full | Facebook Video Player SDK |
| **Apple Music (Embed)** | `import { applemusic } from '@sremote/ready2use'` | ⚠️ Fallback | Web Embed Player |
| **Rumble** | `import { rumble } from '@sremote/ready2use'` | ⚠️ Fallback | Rumble Embed Player |
| **Kick** | `import { kick } from '@sremote/ready2use'` | ⚠️ Fallback | Kick Interactive Player |
| **Streamable** | `import { streamable } from '@sremote/ready2use'` | ⚠️ Fallback | Streamable Embed |
| **Odysee / LBRY** | `import { odysee } from '@sremote/ready2use'` | ⚠️ Fallback | Odysee Embed |
| **Bandcamp** | `import { bandcamp } from '@sremote/ready2use'` | ⚠️ Fallback | Audio player widget |
| **Twitter / X** | `import { twitter } from '@sremote/ready2use'` | ❌ View-only (`null`) | Twitter Embed Widget |
| **Instagram** | `import { instagram } from '@sremote/ready2use'` | ❌ View-only (`null`) | Instagram Embed Frame |
| **Threads** | `import { threads } from '@sremote/ready2use'` | ❌ View-only (`null`) | Threads Reel Frame |
| **Bilibili** | `import { bilibili } from '@sremote/ready2use'` | ❌ View-only (`null`) | Bilibili Player Embed Frame |

> [!IMPORTANT]
> **Lưu ý về các Widget View-only:**  
> Các nền tảng `twitter`, `threads`, `bilibili`, `instagram` chỉ hỗ trợ nhúng thẻ xem (view-only) mà không cung cấp API điều khiển lập trình 2 chiều. Thuộc tính `adapter` của chúng trả về `null` một cách có chủ đích để SRemote không tạo adapter rỗng gây lỗi.

---

## ⏭️ Bước tiếp theo
- Nếu bạn có một trình phát video nội bộ hoặc dịch vụ chưa có sẵn trong danh sách trên, hãy xem [Use-case 2: Tự viết Custom Player Adapter](./02-custom-player-adapter.md).

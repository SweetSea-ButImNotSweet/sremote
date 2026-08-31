# SRemote Ready2use API (`@sremote/ready2use`)

Gói tiện ích mở rộng cung cấp các **trình phát định sẵn (Ready-to-use Providers)** cho các nền tảng video/audio phổ biến.

`@sremote/ready2use` tự động hóa toàn bộ các bước:
1. Nạp SDK bên thứ 3 (YouTube IFrame API, Vimeo Player SDK, Spotify IFrame SDK...).
2. Tạo và cấu hình thẻ `<iframe>` hoặc DOM container chuẩn.
3. Đóng gói sẵn **Custom Adapter** tương thích chuẩn SRemote.
4. Đăng ký và kết nối trực tiếp vào `sremote` chỉ với 1 dòng lệnh.

---

## 1. Cài đặt

```bash
# npm
npm install @sremote/ready2use @sremote/wrapper

# pnpm
pnpm add @sremote/ready2use @sremote/wrapper
```

---

## 2. Danh sách các Provider có sẵn

Tất cả các provider xuất ra đều hỗ trợ 2 phương thức chính: `.mount()` và `.create()`.

| Provider | Import | Nền tảng & Cơ chế |
| :--- | :--- | :--- |
| **YouTube** | `import { youtube } from '@sremote/ready2use'` | YouTube IFrame Player API (`YT.Player`) |
| **Vimeo** | `import { vimeo } from '@sremote/ready2use'` | Vimeo Player SDK (`@vimeo/player`) |
| **SoundCloud** | `import { soundcloud } from '@sremote/ready2use'` | SoundCloud Widget API (`SC.Widget`) |
| **Dailymotion** | `import { dailymotion } from '@sremote/ready2use'` | Dailymotion Player SDK |
| **Twitch** | `import { twitch } from '@sremote/ready2use'` | Twitch Interactive Player SDK |
| **Mixcloud** | `import { mixcloud } from '@sremote/ready2use'` | Mixcloud Widget API |
| **Spotify** | `import { spotify } from '@sremote/ready2use'` | Spotify IFrame API (`EmbedController`) |
| **TikTok** | `import { tiktok } from '@sremote/ready2use'` | TikTok Official Embed Player (v1) qua 2-way postMessage |
| **NicoNico** | `import { niconico } from '@sremote/ready2use'` | NicoNico Player PostMessage Protocol |
| **Bilibili** | `import { bilibili } from '@sremote/ready2use'` | Bilibili Player Embed + SRemote Auto-Discovery |
| **Facebook** | `import { facebook } from '@sremote/ready2use'` | Facebook Video Player Embed |

---

## 3. Cú pháp sử dụng cơ bản

### A. Phương thức `mount(container, options)` (Khuyên dùng)
Tạo phần tử iframe/container, gắn trực tiếp vào DOM container và tự động đăng ký adapter vào SRemote.

```javascript
import { youtube, vimeo, spotify } from '@sremote/ready2use';
import { sremote } from '@sremote/wrapper';

// Gắn YouTube Player vào thẻ có id="player-box"
const { element, iframe, adapter, instanceId, capabilities, destroy } = await youtube.mount('#player-box', {
  videoId: 'dQw4w9WgXcQ',
  playerVars: {
    autoplay: 0,
    controls: 1
  }
});

// Điều khiển tức thì qua SRemote client:
await sremote.play(instanceId);
await sremote.seek(30, instanceId);
await sremote.volume(0.8, instanceId);

// Đổi video mới:
await sremote.load('M7lc1UVf-VE', instanceId);

// Dọn dẹp player khi component bị unmount:
// destroy();
```

### B. Phương thức `create(options)` (Dành cho React / Vue / Svelte)
Tạo DOM iframe và SRemote adapter mà **không** tự động gắn vào DOM. Thích hợp khi bạn muốn quản lý lifecycle mount qua framework UI.

```javascript
import { soundcloud } from '@sremote/ready2use';
import { sremote } from '@sremote/wrapper';

const { iframe, adapter, instanceId, destroy } = await soundcloud.create({
  trackUrl: 'https://api.soundcloud.com/tracks/293',
  color: '#ff5500'
});

// 1. Bạn tự chèn iframe vào nơi bạn muốn:
document.getElementById('my-music-wrapper').appendChild(iframe);

// 2. Tự đăng ký adapter vào SRemote (nếu không dùng mount):
sremote.adapters.register(adapter, instanceId);

// 3. Điều khiển:
sremote.play(instanceId);
```

---

## 4. Cấu trúc kết quả trả về (`ProviderMountResult` / `ProviderCreateResult`)

Cả `provider.mount()` và `provider.create()` trả về một Promise chứa object đầy đủ context:

```typescript
interface ProviderMountResult {
  element: HTMLElement;       // DOM element được tạo ra (thường là iframe hoặc div wrapper)
  iframe?: HTMLIFrameElement; // Thẻ iframe (nếu provider tạo iframe)
  adapter: SRemoteCustomAdapter; // SRemote Custom Adapter object
  player: any;                // Native Player instance từ SDK bên thứ 3 (YT.Player, Vimeo.Player...)
  instanceId: string;         // Mã định danh instance duy nhất
  capabilities: SRemoteCapabilities; // Ma trận tính năng hỗ trợ
  destroy: () => void;        // Hàm hủy player, gỡ listener và xóa DOM an toàn
}
```

---

## 5. Hướng dẫn tự viết Custom Provider với `BaseProvider`

Nếu bạn muốn tạo một provider đóng gói sẵn mới cho một player chuyên biệt hoặc private player nội bộ:

> [!TIP]
> **So sánh `BaseProvider` và `sremote.adapters.set`:**
> - Dùng **`sremote.adapters.set()`** (hoặc `createUniversalAdapter`): Khi bạn đã có sẵn thẻ iframe trên trang và chỉ cần viết một adapter object để điều khiển. Đây là cách nhẹ và nhanh nhất cho 90% trường hợp.
> - Kế thừa **`BaseProvider`**: Khi bạn muốn tạo một package hoặc module tái sử dụng, tự động tải SDK của bên thứ 3, tự sinh thẻ iframe, và cung cấp cả `create()` lẫn `mount()`.

### Mẫu triển khai Provider mở rộng:

```javascript
import { BaseProvider } from '@sremote/ready2use';

export class MyCustomVideoProvider extends BaseProvider {
  constructor() {
    super('my-custom-video'); // Tên prefix định danh
  }

  // 1. (Tùy chọn) Nạp SDK của bên thứ 3
  async loadSdk() {
    if (window.MySDK) return window.MySDK;
    // Tải script SDK nếu cần
    return window.MySDK;
  }

  // 2. Khởi tạo native player
  async initPlayer(options, instanceId) {
    const SDK = await this.loadSdk();
    
    const iframe = document.createElement('iframe');
    iframe.src = `https://example.com/embed/${options.videoId}`;
    iframe.style.width = options.width || '100%';
    iframe.style.height = options.height || '400px';

    const player = new SDK.Player(iframe);

    return {
      player,
      element: iframe,
      iframe,
      destroy: () => player.destroy?.()
    };
  }

  // 3. Ánh xạ thành SRemote Custom Adapter
  createAdapter(player, context) {
    return {
      play: () => player.play(),
      pause: () => player.pause(),
      seekTo: (sec) => player.seek(sec),
      getCurrentTime: () => player.currentTime || 0,
      getDuration: () => player.duration || 0,
      paused: () => player.isPaused(),
      setVolume: (vol) => player.setVolume(vol),
      setMuted: (muted) => player.setMuted(muted),
      load: (source) => player.load(source)
    };
  }
}

// Khởi tạo instance và xuất hàm tiện ích
export const myCustomProvider = new MyCustomVideoProvider();
export const myCustomVideo = {
  create: (opts) => myCustomProvider.create(opts),
  mount: (container, opts) => myCustomProvider.mount(container, opts),
  provider: myCustomProvider
};
```

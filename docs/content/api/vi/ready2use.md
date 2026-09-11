# SRemote Ready2use API (`@sremote/ready2use`)

Gói tiện ích mở rộng cung cấp các **trình phát định sẵn (Ready-to-use Providers)** cho các nền tảng video/audio/embed phổ biến.

`@sremote/ready2use` tự động hóa toàn bộ các bước:
1. Nạp SDK bên thứ 3 (YouTube IFrame API, Vimeo Player SDK, Spotify IFrame SDK, Apple MusicKit...).
2. Tạo và cấu hình thẻ `<iframe>` hoặc DOM container chuẩn.
3. Đóng gói sẵn **Adapter chuẩn HTML5 Media Element** tương thích SRemote.
4. Cung cấp bộ điều khiển độc lập **`remote` (Remote Controller)** điều khiển trực tiếp tức thì.
5. Đăng ký và kết nối trực tiếp vào `sremote` chỉ với 1 dòng lệnh.

---

## 1. Cài đặt

```bash
# npm
npm install @sremote/ready2use @sremote/wrapper

# pnpm
pnpm add @sremote/ready2use @sremote/wrapper
```

---

## 2. Danh sách 22 Provider có sẵn

Tất cả các provider xuất ra đều hỗ trợ 2 phương thức chính: `.mount(container, options)` và `.create(options)`.

| Provider | Import | Adapter SRemote | Nền tảng & Cơ chế |
| :--- | :--- | :---: | :--- |
| **YouTube** | `import { youtube } from '@sremote/ready2use'` | ✅ Chuẩn | YouTube IFrame Player API (`YT.Player`) |
| **Vimeo** | `import { vimeo } from '@sremote/ready2use'` | ✅ Chuẩn | Vimeo Player SDK (`@vimeo/player`) |
| **SoundCloud** | `import { soundcloud } from '@sremote/ready2use'` | ✅ Chuẩn | SoundCloud Widget API (`SC.Widget`) |
| **Dailymotion** | `import { dailymotion } from '@sremote/ready2use'` | ✅ Chuẩn | Dailymotion Player SDK |
| **Twitch** | `import { twitch } from '@sremote/ready2use'` | ✅ Chuẩn | Twitch Interactive Player SDK |
| **Mixcloud** | `import { mixcloud } from '@sremote/ready2use'` | ✅ Chuẩn | Mixcloud Widget API |
| **Spotify** | `import { spotify } from '@sremote/ready2use'` | ✅ Chuẩn | Spotify IFrame API (`EmbedController`) |
| **Apple MusicKit** | `import { applemusickit } from '@sremote/ready2use'` | ✅ Chuẩn | Apple MusicKit JS v3 SDK |
| **PeerTube** | `import { peertube } from '@sremote/ready2use'` | ✅ Chuẩn | PeerTube Embed API |
| **TikTok** | `import { tiktok } from '@sremote/ready2use'` | ✅ Chuẩn | TikTok Official Embed Player (v1) qua 2-way postMessage |
| **NicoNico** | `import { niconico } from '@sremote/ready2use'` | ✅ Chuẩn | NicoNico Player PostMessage Protocol |
| **Facebook** | `import { facebook } from '@sremote/ready2use'` | ✅ Chuẩn | Facebook Embedded Video SDK |
| **Apple Music (Embed)** | `import { applemusic } from '@sremote/ready2use'` | ⚠️ Fallback | Apple Music Web Player Embed |
| **Rumble** | `import { rumble } from '@sremote/ready2use'` | ⚠️ Fallback | Rumble Embed Player |
| **Kick** | `import { kick } from '@sremote/ready2use'` | ⚠️ Fallback | Kick Interactive Player Embed |
| **Streamable** | `import { streamable } from '@sremote/ready2use'` | ⚠️ Fallback | Streamable Embed Player |
| **Odysee / LBRY** | `import { odysee } from '@sremote/ready2use'` | ⚠️ Fallback | Odysee Embed Player |
| **Bandcamp** | `import { bandcamp } from '@sremote/ready2use'` | ⚠️ Fallback | Bandcamp Embed Widget |
| **Twitter / X** | `import { twitter } from '@sremote/ready2use'` | ❌ Không (`null`) | Twitter Embed Widget (chỉ hiển thị embed view-only) |
| **Instagram** | `import { instagram } from '@sremote/ready2use'` | ❌ Không (`null`) | Instagram Embed Frame (chỉ hiển thị embed view-only) |
| **Threads** | `import { threads } from '@sremote/ready2use'` | ❌ Không (`null`) | Threads Post/Reel Frame (chỉ hiển thị embed view-only) |
| **Bilibili** | `import { bilibili } from '@sremote/ready2use'` | ❌ Không (`null`) | Bilibili Player Embed (chỉ hiển thị iframe embed) |

> [!NOTE]
> Các widget mạng xã hội và embed tĩnh (`twitter`, `threads`, `bilibili`, `instagram`) chỉ phục vụ việc nhúng hiển thị mà không có Interactive Player API 2 chiều. Vì vậy, `createAdapter()` của chúng trả về `null` một cách có chủ đích để SRemote không đăng ký adapter ảo/rỗng vào hệ thống.

---

## 3. Cú pháp sử dụng cơ bản

### A. Phương thức `mount(container, options)` (Khuyên dùng)
Tạo phần tử iframe/container, gắn trực tiếp vào DOM container, trả về bộ điều khiển `remote` và tự động đăng ký adapter vào SRemote.

```javascript
import { youtube, vimeo } from '@sremote/ready2use';
import { sremote } from '@sremote/wrapper';

// Gắn YouTube Player vào thẻ có id="player-box"
const yt = await youtube.mount('#player-box', {
  videoId: 'dQw4w9WgXcQ',
  playerVars: {
    autoplay: 0,
    controls: 1
  }
});

// 1. Cách 1: Điều khiển trực tiếp bằng `remote` (Không cần qua sremote):
await yt.remote.play();
await yt.remote.seekTo(30);   // Nhảy tuyệt đối đến giây 30
await yt.remote.seek(10);     // Nhảy tương đối: tới 10 giây
await yt.remote.setVolume(0.8);
await yt.remote.toggle();     // Đảo trạng thái Play / Pause

// 2. Cách 2: Điều khiển qua SRemote wrapper instance:
await sremote.play(yt.instanceId);
await sremote.seek(45, yt.instanceId);

// Lắng nghe sự kiện phát theo thời gian thực (timeupdate, play, pause, ended...):
sremote.on('timeupdate', (data) => {
  if (data.instanceId === yt.instanceId) {
    console.log(`⏱️ Thời gian: ${Math.round(data.state.currentTime)}s / ${Math.round(data.state.duration)}s`);
  }
});

sremote.on('ended', (data) => {
  if (data.instanceId === yt.instanceId) {
    console.log('🎉 Video đã phát xong!');
  }
});

// Dọn dẹp player khi unmount component:
// yt.destroy();
```

### B. Phương thức `create(options)` (Dành cho React / Vue / Svelte)
Tạo DOM iframe, adapter và controller mà **không** tự động gắn vào DOM. Thích hợp khi bạn muốn quản lý lifecycle mount qua framework UI.

```javascript
import { soundcloud } from '@sremote/ready2use';

const { iframe, remote, instanceId, destroy } = await soundcloud.create({
  trackUrl: 'https://api.soundcloud.com/tracks/293',
  color: '#ff5500'
});

// 1. Bạn tự chèn iframe vào nơi bạn muốn:
document.getElementById('my-music-wrapper').appendChild(iframe);

// 2. Điều khiển trực tiếp qua remote:
await remote.play();
```

---

## 4. Cấu trúc kết quả trả về (`ProviderMountResult` / `ProviderCreateResult`)

Cả `provider.mount()` và `provider.create()` trả về một Promise chứa object đầy đủ context:

```typescript
interface ProviderMountResult {
  element: HTMLElement;         // DOM element được tạo ra (thường là iframe hoặc div wrapper)
  iframe?: HTMLIFrameElement;   // Thẻ iframe (nếu provider tạo iframe)
  remote: RemoteController;     // Trình điều khiển trực tiếp độc lập (standalone Promise-based)
  adapter: SRemoteCustomAdapter | null; // SRemote Custom Adapter chuẩn HTML5 Media Element
  player: any;                  // Native Player instance từ SDK bên thứ 3 (YT.Player, Vimeo.Player...)
  instanceId: string;           // Mã định danh instance duy nhất
  capabilities: SRemoteCapabilities; // Ma trận tính năng hỗ trợ
  destroy: () => void;          // Hàm hủy player, gỡ listener và xóa DOM an toàn
}
```

---

## 5. Chuẩn hóa Adapter theo `HTML5MediaElement`

Toàn bộ adapter của `@sremote/ready2use` được chuẩn hóa theo mô hình `HTML5MediaElement`:

- **Playback**: `play()`, `pause()`, `toggle()`
- **Vị trí & Tua (Seeking)**:
  - `getCurrentTime()`: Lấy vị trí thời gian hiện tại (giây).
  - `setCurrentTime(seconds)`: Phương thức cốt lõi đặt vị trí phát tuyệt đối (chuẩn HTML5).
  - `seekTo(seconds)`: Alias tiêu chuẩn trỏ tới `setCurrentTime(seconds)`.
  - `seek(deltaSeconds)`: Tua tương đối so với vị trí hiện tại (`currentTime + delta`).
- **Âm lượng (Volume)**: `getVolume()`, `setVolume(0..1)`, `getMuted()`, `setMuted(boolean)`, `toggleMuted()`
- **Trạng thái**: `getState()`, `getDuration()`, `isPaused()`
- **Sự kiện**: Bắn qua `adapter.emit(eventName, payload)` (`play`, `pause`, `timeupdate`, `ended`, `seeking`, `seeked`, `volumechange`).

---

## 6. Bộ tiện ích `Polyfills`

`@sremote/ready2use` xuất khẩu đối tượng `Polyfills` giúp việc xây dựng các adapter tùy biến trở nên dễ dàng và nhất quán:

```javascript
import { Polyfills } from '@sremote/ready2use';

const { setCurrentTime, seekTo, seek, toggle, Volume } = Polyfills;
```

- **`setCurrentTime(adapter, nativeSeekFn)`**: Gắn phương thức đặt thời gian tuyệt đối và đồng bộ trạng thái.
- **`seekTo(adapter)`**: Tự động gán alias `adapter.seekTo` trỏ đến `adapter.setCurrentTime`.
- **`seek(adapter)`**: Cung cấp hàm tua tương đối dựa trên `adapter.getCurrentTime()`.
- **`toggle(adapter)`**: Tự động phát/dừng dựa trên trạng thái `isPaused()`.
- **Class `Volume`**: Quản lý volume tập trung:
  - Chuẩn hóa khoảng giá trị `[0..1]`.
  - Hỗ trợ lưu trữ trạng thái trước khi mute để khôi phục khi unmute.
  - Cung cấp hook callback `onVolumeChange(vol)` và `onMuteChange(muted)` để đồng bộ với SDK gốc.

---

## 7. Hướng dẫn tự viết Custom Provider với `BaseProvider`

Nếu bạn muốn tạo một provider đóng gói sẵn mới cho một player chuyên biệt hoặc private player nội bộ:

> [!TIP]
> **So sánh `BaseProvider` và `sremote.adapters.set`:**
> - Dùng **`sremote.adapters.set()`**: Khi bạn đã có sẵn thẻ iframe trên trang và chỉ cần viết một adapter object để điều khiển.
> - Kế thừa **`BaseProvider`**: Khi bạn muốn tạo một package hoặc module tái sử dụng, tự động tải SDK của bên thứ 3, tự sinh thẻ iframe, cung cấp cả `create()` lẫn `mount()`, và tích hợp sẵn `remote` controller cùng quản lý vòng đời `destroy()`.

### Mẫu triển khai Provider mở rộng:

```javascript
import { BaseProvider, Polyfills } from '@sremote/ready2use';

export class MyCustomVideoProvider extends BaseProvider {
  constructor() {
    super('my-custom-video'); // Tên prefix định danh
  }

  // 1. (Tùy chọn) Nạp SDK của bên thứ 3
  async loadSdk() {
    if (window.MySDK) return window.MySDK;
    // Tải script SDK nếu cần...
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

  // 3. Ánh xạ thành SRemote Custom Adapter theo chuẩn HTML5
  createAdapter(player, context) {
    const volume = new Polyfills.Volume({
      onVolumeChange: (vol) => player.setVolume(vol * 100),
      onMuteChange: (muted) => player.setMuted(muted)
    });

    const adapter = {
      play: () => player.play(),
      pause: () => player.pause(),
      getCurrentTime: () => player.currentTime || 0,
      getDuration: () => player.duration || 0,
      isPaused: () => player.isPaused(),
      getVolume: () => volume.getVolume(),
      setVolume: (vol) => volume.setVolume(vol),
      getMuted: () => volume.getMuted(),
      setMuted: (muted) => volume.setMuted(muted),
      load: (source) => player.load(source),
      getState: () => ({
        paused: player.isPaused(),
        currentTime: player.currentTime || 0,
        duration: player.duration || 0
      })
    };

    // Gắn các tiện ích chuẩn HTML5
    Polyfills.setCurrentTime(adapter, (sec) => player.seek(sec));
    Polyfills.seekTo(adapter);
    Polyfills.seek(adapter);
    Polyfills.toggle(adapter);

    // Lắng nghe event từ SDK gốc của Player và phát signal sự kiện
    if (player && typeof player.on === 'function') {
      player.on('play', () => adapter.emit?.('play', { state: adapter.getState() }));
      player.on('pause', () => adapter.emit?.('pause', { state: adapter.getState() }));
      player.on('timeupdate', () => adapter.emit?.('timeupdate', { state: adapter.getState() }));
      player.on('ended', () => adapter.emit?.('ended', { state: { ...adapter.getState(), paused: true, ended: true } }));
    }

    return adapter;
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

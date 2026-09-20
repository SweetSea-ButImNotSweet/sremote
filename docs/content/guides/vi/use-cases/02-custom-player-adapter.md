# Use-case 2: Tự viết Custom Adapter cho Player riêng

Khi bạn sử dụng một trình phát video nội bộ của công ty (in-house player), một player mã nguồn mở (như Video.js, Plyr, JWPlayer) hoặc một dịch vụ bên thứ ba chưa có sẵn trong `@sremote/ready2use`, bạn hoàn toàn có thể tự tạo **Custom Adapter** để tích hợp mượt mà vào hệ sinh thái SRemote.

---

## 1. Hai cách tiếp cận: `sremote.adapters.register` vs `BaseProvider`

Tùy vào quy mô dự án, SRemote cung cấp 2 giải pháp:

| Tiêu chí | Dùng `sremote.adapters.register()` | Kế thừa `BaseProvider` |
| :--- | :--- | :--- |
| **Khi nào nên dùng?** | Khi bạn đã có sẵn thẻ iframe/player trên trang và chỉ cần viết 1 adapter object ánh xạ nhanh. | Khi muốn đóng gói thành module tái sử dụng, tự động nạp SDK và cung cấp cả `mount()` lẫn `create()`. |
| **Độ phức tạp** | Rất thấp (chỉ cần viết 1 object đơn giản). | Trung bình (cần tạo class kế thừa). |
| **Gói thư viện** | Chỉ cần `@sremote/sdk`. | Dùng `@sremote/ready2use`. |

---

## 2. Cách 1: Viết Adapter nhanh với `sremote.adapters.register()`

Giả sử bạn có một player SDK tùy biến với các hàm riêng:

```javascript
import { sremote } from '@sremote/sdk';

// Giả sử myPlayerInstance là đối tượng player của bạn:
const myPlayer = new CustomPlayerSDK('#my-video');

// Tạo adapter object tuân theo chuẩn HTML5 Media Element:
const myAdapter = {
  play: () => myPlayer.start(),
  pause: () => myPlayer.stop(),
  getCurrentTime: () => myPlayer.getPositionSeconds(),
  getDuration: () => myPlayer.getTotalDuration(),
  setCurrentTime: (sec) => myPlayer.jumpTo(sec),
  seekTo: (sec) => myPlayer.jumpTo(sec),
  seek: (delta) => myPlayer.jumpTo(myPlayer.getPositionSeconds() + delta),
  toggle: () => (myPlayer.isPlaying() ? myPlayer.stop() : myPlayer.start()),
  getState: () => ({
    paused: !myPlayer.isPlaying(),
    currentTime: myPlayer.getPositionSeconds(),
    duration: myPlayer.getTotalDuration()
  })
};

// Đăng ký adapter vào SRemote với một ID tùy ý:
sremote.adapters.register(myAdapter, 'my-custom-player');

// Bây giờ bạn có thể điều khiển xuyên suốt qua SRemote (hoặc chuỗi lệnh fluent):
await sremote('my-custom-player').play();
await sremote('my-custom-player').seek(15);
```

---

## 3. Cách 2: Kế thừa `BaseProvider` và sử dụng bộ trợ năng `Polyfills` (Khuyên dùng)

`@sremote/ready2use` xuất khẩu đối tượng **`Polyfills`** giúp bạn không phải tự tay tính toán các hàm tua tương đối, toggle play hay quản lý âm lượng.

### Bộ trợ năng `Polyfills` bao gồm:
- **`Polyfills.setCurrentTime(adapter, nativeSeekFn)`**: Gắn hàm nhảy mốc thời gian tuyệt đối.
- **`Polyfills.seekTo(adapter)`**: Tự động gán alias `seekTo` trỏ về `setCurrentTime`.
- **`Polyfills.seek(adapter)`**: Tự động tính toán tua tương đối dựa trên `getCurrentTime()`.
- **`Polyfills.toggle(adapter)`**: Tự động đảo trạng thái dựa trên `isPaused()`.
- **Class `Polyfills.Volume`**: Quản lý mức âm lượng `[0..1]`, caching giá trị khi mute và khôi phục khi unmute.

### Ví dụ triển khai hoàn chỉnh một Custom Provider:

```javascript
import { BaseProvider, Polyfills } from '@sremote/ready2use';

export class MyCustomPlayerProvider extends BaseProvider {
  constructor() {
    super('custom-player'); // Prefix định danh
  }

  // 1. (Tùy chọn) Nạp file script SDK nếu cần
  async loadSdk() {
    if (window.MySDK) return window.MySDK;
    // Tải script tag nếu cần...
    return window.MySDK;
  }

  // 2. Khởi tạo phần tử DOM và Native Player
  async initPlayer(options, instanceId) {
    const SDK = await this.loadSdk();

    const iframe = document.createElement('iframe');
    iframe.src = `https://my-service.com/embed/${options.videoId}`;
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

  // 3. Xây dựng Adapter chuẩn HTML5
  createAdapter(player, context) {
    // Khởi tạo trình quản lý Volume chuẩn
    const volume = new Polyfills.Volume({
      onVolumeChange: (vol) => player.setSoundLevel(vol * 100),
      onMuteChange: (muted) => player.setSilent(muted)
    });

    const adapter = {
      play: () => player.play(),
      pause: () => player.pause(),
      getCurrentTime: () => player.currentTime || 0,
      getDuration: () => player.duration || 0,
      isPaused: () => player.isPaused(),
      getVolume: () => volume.getVolume(),
      setVolume: (v) => volume.setVolume(v),
      getMuted: () => volume.getMuted(),
      setMuted: (m) => volume.setMuted(m),
      load: (src) => player.changeSource(src),
      getState: () => ({
        paused: player.isPaused(),
        currentTime: player.currentTime || 0,
        duration: player.duration || 0
      })
    };

    // Áp dụng các polyfill chuẩn HTML5 chỉ bằng 1 dòng mỗi hàm:
    Polyfills.setCurrentTime(adapter, (sec) => player.seek(sec));
    Polyfills.seekTo(adapter);
    Polyfills.seek(adapter);
    Polyfills.toggle(adapter);

    // Lắng nghe sự kiện từ Native Player và bắn ngược lại về SRemote:
    player.on?.('timeupdate', () => {
      adapter.emit?.('timeupdate', { state: adapter.getState() });
    });

    return adapter;
  }
}

// Xuất khẩu để sử dụng:
export const myCustomProvider = new MyCustomPlayerProvider();
```

Sử dụng Provider vừa tạo:
```javascript
const myVideo = await myCustomProvider.mount('#container', { videoId: '12345' });
await myVideo.remote.play();
await myVideo.remote.seek(10);
```

---

## ⏭️ Bước tiếp theo
- Nếu bạn có các video nằm trực tiếp trên trang web của mình mà không dùng iframe, hãy xem [Use-case 3: Điều khiển Media trực tiếp trên cùng trang](./03-same-origin-direct-media.md).

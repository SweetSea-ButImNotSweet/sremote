# sremote.adapters.create / createUniversalAdapter

Hàm khởi tạo (factory helper) giúp đóng gói bất kỳ trình phát video/audio tùy biến hoặc SDK web của bên thứ ba thành một đối tượng `SRemoteCustomAdapter` chuẩn tắc.

## Cú pháp
- `sremote.adapters.create(options?: UniversalAdapterOptions): SRemoteCustomAdapter`
- `createUniversalAdapter(options?: UniversalAdapterOptions): SRemoteCustomAdapter` *(Import trực tiếp từ `@sremote/sdk`)*

## Các tùy chọn (`options`)
Đối tượng `options` cho phép định nghĩa các hàm callback và thuộc tính tương ứng:
- `name?: string`: Tên gợi nhớ của adapter (mặc định: `'universal-adapter'`).
- `mediaElement?: HTMLMediaElement`: Thẻ media gốc sẵn có trong trang để tự động map thuộc tính.
- `capabilities?: SRemoteCapabilities`: Ghi đè ma trận cờ tính năng hỗ trợ.
- `play?: () => void | Promise<void>`: Callback khi nhận lệnh phát.
- `pause?: () => void | Promise<void>`: Callback khi nhận lệnh tạm dừng.
- `toggle?: () => void | Promise<void>`: Callback khi nhận lệnh toggle.
- `stop?: () => void | Promise<void>`: Callback khi nhận lệnh dừng hẳn.
- `seek?: (offset: number) => void | Promise<void>`: Callback khi tua tương đối (+/- giây).
- `seekTo?: (time: number) => void | Promise<void>`: Callback khi tua đến mốc thời gian cụ thể.
- `getCurrentTime?: () => number | Promise<number>`: Hàm lấy thời gian phát hiện tại (giây).
- `getDuration?: () => number | Promise<number>`: Hàm lấy tổng thời lượng (giây).
- `getVolume?: () => number | Promise<number>`: Hàm lấy mức âm lượng (`0.0` - `1.0`).
- `setVolume?: (vol: number) => void | Promise<void>`: Callback khi đặt âm lượng.
- `getMuted?: () => boolean | Promise<boolean>`: Hàm lấy trạng thái tắt tiếng.
- `setMuted?: (muted: boolean) => void | Promise<void>`: Callback khi bật/tắt tiếng.
- `getPlaybackRate?: () => number | Promise<number>`: Hàm lấy tốc độ phát.
- `setPlaybackRate?: (rate: number) => void | Promise<void>`: Callback khi đổi tốc độ.
- `setQuality?: (quality: string | number) => void | Promise<void>`: Callback đổi chất lượng video.
- `getQualities?: () => string[] | Promise<string[]>`: Getter lấy danh sách độ phân giải.
- `setSubtitle?: (sub: string | null) => void | Promise<void>`: Callback chọn track phụ đề.
- `getSubtitles?: () => any[] | Promise<any[]>`: Getter lấy danh sách phụ đề.
- `setShuffle?: (shuffle: boolean) => void | Promise<void>`: Callback bật/tắt phát ngẫu nhiên.
- `setRepeat?: (mode: 'off' | 'all' | 'one' | boolean) => void | Promise<void>`: Callback lặp lại.
- `next?: () => void | Promise<void>`: Callback chuyển bài kế tiếp.
- `previous?: () => void | Promise<void>`: Callback quay lại bài trước đó.
- `load?: (source: any) => void | Promise<void>`: Callback khi nạp nguồn mới.

## Ví dụ
```javascript
// Cách 1: Sử dụng trực tiếp từ sremote.adapters.create
const myAdapter = sremote.adapters.create({
  name: 'TrinhPhatTuyBien',
  play: () => player.playVideo(),
  pause: () => player.pauseVideo(),
  getCurrentTime: () => player.getCurrentTime(),
  getDuration: () => player.getDuration(),
});

// Đăng ký vào hệ thống SRemote
sremote.adapters.register(myAdapter, 'my-player-1');
```

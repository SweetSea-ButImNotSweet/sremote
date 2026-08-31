# sremote.adapters.register

Đăng ký một Custom Adapter cho các dịch vụ nhúng hoặc player JavaScript đặc thù (YouTube Iframe API, SoundCloud Widget, Spotify Embed, Vimeo SDK, Twitch Player, TikTok Embed, HTML5 Audio/Video, v.v.).

---

## Cú pháp

```javascript
// Chuẩn namespace mới:
sremote.adapters.register(adapter, instanceId?, key?);

// Các alias tương đương:
sremote.adapters.use(adapter, instanceId?, key?);
sremote.adapters.register(adapter, instanceId?, key?);
```

---

## Tham số

| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `adapter` | `object` | **Bắt buộc** | Đối tượng chứa các hàm triển khai: `play()`, `pause()`, `toggle()`, `seek(offset)`, `seekTo(sec)`, `volume(vol)`, `mute(bool)`, `getCurrentTime()`, `getDuration()`, `paused()`. |
| `instanceId` | `string` | Tự sinh | Tên định danh cho adapter (ví dụ: `'youtube_player'`). |
| `key` | `string` | `null` | Passkey xác thực nếu trang đang bật chế độ khóa. |

---

## Đồng bộ sự kiện ngược lại SRemote (`adapter.emit`)

Khi adapter được đăng ký, SRemote sẽ tự động gắn phương thức `adapter.emit(eventName, payload)` để adapter có thể phát ngược lại các sự kiện (`play`, `pause`, `timeupdate`, `ended`) về Parent và SDK.

```javascript
const adapter = {
  play() { player.playVideo(); },
  pause() { player.pauseVideo(); },
  getCurrentTime() { return player.getCurrentTime(); },
  getDuration() { return player.getDuration(); },
  paused() { return player.getPlayerState() !== 1; }
};

sremote.adapters.register(adapter, 'youtube_player');

// Lắng nghe sự kiện từ SDK bên thứ 3 và đồng bộ vào SRemote:
player.on('timeupdate', () => {
  adapter.emit('timeupdate', {
    state: {
      paused: adapter.paused(),
      currentTime: adapter.getCurrentTime(),
      duration: adapter.getDuration()
    }
  });
});
```

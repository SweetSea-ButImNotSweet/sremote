# 04. Thử nghiệm & Chẩn đoán kết nối

Sau khi nhúng mã điều khiển, tài liệu này hướng dẫn cách kiểm tra trạng thái hoạt động, tra cứu thông tin player và debug khi gặp sự cố kết nối.

---

## 1. Kiểm tra danh sách & trạng thái Player đang kết nối

SRemote cung cấp các phương thức truy vấn trạng thái đồng bộ và bất đồng bộ:

```javascript
// Lấy danh sách tất cả instance ID đã kết nối
const instances = window.sremote.list();
console.log('Các player đang kết nối:', instances); // Ví dụ: ['sv_youtube_1', 'sv_bilibili_2']

// Lấy thông tin trạng thái chi tiết của player
const state = window.sremote.status();
console.log('Trạng thái hiện tại:', {
  paused: state.paused,
  currentTime: state.currentTime,
  duration: state.duration,
  volume: state.volume,
  muted: state.muted,
  playbackRate: state.playbackRate
});
```

---

## 2. Lắng nghe các sự kiện vòng đời (Lifecycle Events)

Đăng ký nhận đầy đủ các sự kiện để kiểm tra luồng dữ liệu:

```javascript
// Sự kiện khi bắt đầu phát
window.sremote.on('play', () => console.log('▶ Đang phát media'));

// Sự kiện khi tạm dừng
window.sremote.on('pause', () => console.log('⏸ Đã tạm dừng media'));

// Sự kiện khi kết thúc bài hát / video
window.sremote.on('ended', () => console.log('🎉 Media đã phát xong'));

// Sự kiện khi âm lượng thay đổi
window.sremote.on('volumechange', (data) => {
  console.log('🔊 Âm lượng mới:', data.state.volume, 'Muted:', data.state.muted);
});
```

---

## 3. Sử dụng Bộ công cụ Debug tích hợp (`sremote.debug`)

SRemote tích hợp sẵn bộ công cụ tự chẩn đoán để kiểm tra nhanh các API ngay trong DevTools Console:

```javascript
// Chạy bộ test tự động toàn diện
window.sremote.debug.runAllTests().then(results => {
  console.table(results);
});

// Hoặc kiểm tra chi tiết cấu hình Handshake
console.log(window.sremote.debug.dumpState());
```

> [!TIP]
> Chi tiết toàn bộ phương thức trong bộ công cụ debug có thể tra cứu tại **[Tài liệu API debug](/api/debug.md)**.

---

## ⏭️ Bước tiếp theo
Sau khi thử nghiệm thành công, hãy tiếp tục sang **[05. Best Practices & Hướng dẫn End-User](./05-ux-best-practices.md)** để hoàn thiện trải nghiệm người dùng trên website của bạn.

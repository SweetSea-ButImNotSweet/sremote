# 05. Best Practices & Hướng dẫn End-User

Để ứng dụng của bạn hoạt động mượt mà và người dùng cuối không cảm thấy bỡ ngỡ hoặc từ chối cài đặt extension, hãy áp dụng các nguyên tắc thiết kế UX/UI sau đây.

---

## 1. Giải thích cho người dùng: Vì sao cần cài Extension / Userscript?

Người dùng phổ thông thường e ngại khi thấy thông báo cài đặt tiện ích mở rộng. Do đó, cách diễn đạt trên giao diện trang của bạn là vô cùng quan trọng:

### ❌ Cách diễn đạt KHÔNG NÊN:
> *"Vui lòng cài đặt script bên thứ ba này thì web mới chạy được."* → Dễ gây hiểu lầm là mã độc hoặc trang web lỗi.

### ✅ Cách diễn đạt NÊN DÙNG:
> *"Để bạn có thể điều khiển âm lượng, tua bài hát và nghe nhạc nền tiện lợi trực tiếp từ thanh công cụ của trang, trình duyệt cần tiện ích cầu nối điều khiển media `SRemote`."*

---

## 2. Thiết kế Banner / Dialog gợi ý thông minh

Khi `sremote.hello()` không tìm thấy kết nối sau một khoảng thời gian nhất định (ví dụ 3 giây), bạn có thể hiển thị một thanh thông báo thân thiện:

```javascript
let isConnected = false;

window.sremote.on('accept', () => {
  isConnected = true;
  hideInstallBanner();
});

window.sremote.hello();

// Kiểm tra nếu sau 3s chưa kết nối thì hiện banner hướng dẫn
setTimeout(() => {
  if (!isConnected) {
    showInstallBanner();
  }
}, 3000);
```

### Các bước hướng dẫn người dùng nên tóm gọn trong 3 bước:
1. Cài tiện ích [Tampermonkey](https://www.tampermonkey.net/) hoặc [Violentmonkey](https://violentmonkey.github.io/).
2. Nhấp nút **Cài đặt SRemote Userscript** (dẫn tới link file `.user.js`).
3. Tải lại trang và bấm **Allow (Cho phép)** nếu có popup bảo mật.

---

## 3. Chống giật/chớp giao diện với Dynamic CSS (Anti-FOUC)

Nếu bạn muốn ẩn thanh điều khiển mặc định, nút quảng cáo hoặc logo của bên thứ ba trong iframe để đồng bộ giao diện website của bạn:

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

## ⏭️ Bước tiếp theo
Xem bài cuối cùng **[06. Xử lý sự cố thường gặp](./06-troubleshooting.md)** để nắm rõ cách xử lý các mã lỗi kỹ thuật.

# 05. Best Practices & Hướng dẫn Người dùng cuối (End-User)

Để ứng dụng của bạn hoạt động mượt mà và người dùng cuối không cảm thấy e ngại khi được yêu cầu cài đặt extension, hãy áp dụng các nguyên tắc thiết kế UX/UI sau đây.

---

## 1. Giải thích lý do: Vì sao cần cài Extension / Userscript?

Người dùng phổ thông thường dè chừng khi thấy thông báo yêu cầu cài tiện ích mở rộng. Vì vậy, cách bạn truyền đạt thông điệp trên giao diện là yếu tố quyết định:

### ❌ Cách diễn đạt KHÔNG NÊN:
> *"Vui lòng cài đặt script bên thứ ba này thì web mới chạy được."* → Dễ gây cảm giác trang web bị lỗi hoặc nghi ngờ có mã độc.

### ✅ Cách diễn đạt NÊN DÙNG:
> *"Để điều khiển âm lượng, tua nhanh và đồng bộ nhạc nền trực tiếp trên thanh công cụ của website, trình duyệt cần tiện ích cầu nối điều khiển media `SRemote`."*

---

## 2. Thiết kế Banner / Dialog gợi ý thông minh

Khi `sremote.hello()` không tìm thấy kết nối sau một khoảng thời gian nhất định (ví dụ 3 giây), bạn có thể hiển thị một thông báo hướng dẫn thân thiện:

```javascript
let isConnected = false;

window.sremote.on('accept', () => {
  isConnected = true;
  hideInstallBanner();
});

window.sremote.hello();

// Nếu sau 3 giây chưa nhận được phản hồi kết nối, hiển thị banner hướng dẫn
setTimeout(() => {
  if (!isConnected) {
    showInstallBanner();
  }
}, 3000);
```

### Các bước hướng dẫn người dùng nên tóm gọn trong 3 bước trực quan:
1. Cài đặt tiện ích quản lý script: [Tampermonkey](https://www.tampermonkey.net/) hoặc [Violentmonkey](https://violentmonkey.github.io/).
2. Bấm nút **Cài đặt SRemote Userscript** (trỏ tới file `.user.js`).
3. Tải lại trang và bấm **Allow (Cho phép)** nếu trình duyệt hiển thị hộp thoại xác nhận quyền.

---

## 3. Tránh giật/chớp giao diện bằng Dynamic CSS (Anti-FOUC)

Nếu bạn muốn ẩn thanh điều khiển mặc định, logo hoặc banner quảng cáo của bên thứ ba trong iframe để đồng bộ với giao diện riêng của trang web:

```javascript
window.sremote.hello({
  css: `
    /* Ẩn các nút điều khiển mặc định để dùng giao diện riêng của bạn */
    .native-controls, .watermark-logo, .ad-banner {
      display: none !important;
    }
  `
});
```

> [!TIP]
> CSS được truyền qua `hello({ css: '...' })` sẽ được chèn trực tiếp vào `document.documentElement` của iframe ngay từ giai đoạn `document-start` (trước khi DOM được render). Điều này giúp triệt tiêu hoàn toàn hiện tượng chớp/giật giao diện (Flash of Unstyled Content - FOUC).

---

## ⏭️ Bước tiếp theo
Xem bài cuối cùng **[06. Xử lý sự cố thường gặp](./06-troubleshooting.md)** để nắm rõ cách xử lý các tình huống lỗi kỹ thuật thường gặp.


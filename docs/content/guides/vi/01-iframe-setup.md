# 01. Cách tạo thẻ `<iframe>` đúng chuẩn

Tài liệu này hướng dẫn chi tiết cách cấu hình thẻ `<iframe>` an toàn, chuẩn kỹ thuật và tối ưu tương thích khi nhúng trình phát media (video/audio) từ dịch vụ bên thứ ba vào website của bạn.

---

## 1. Cấu trúc thẻ `<iframe>` khuyến nghị

Khi nhúng video/audio từ bên thứ ba (YouTube, Spotify, SoundCloud, Bilibili, Dailymotion, Player tùy biến...), bảo mật trình duyệt sẽ giới hạn một số tính năng quan trọng nếu bạn không cấp quyền qua thuộc tính `allow`.

```html
<iframe
  id="media-frame"
  src="https://target-service.com/embed/..."
  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
  allowfullscreen
  loading="lazy"
  style="width: 100%; height: 450px; border: none; border-radius: 8px;">
</iframe>
```

---

## 2. Giải thích các quyền quan trọng trong `allow`

| Quyền hạn | Bắt buộc? | Mô tả & Tác dụng |
| :--- | :---: | :--- |
| **`autoplay`** | ⭐ **Bắt buộc** | Cho phép media bên trong iframe được quyền phát hoặc tự động phát âm thanh/hình ảnh khi nhận lệnh từ trang cha. |
| **`encrypted-media`** | ⭐ **Bắt buộc DRM** | Cho phép iframe khởi tạo luồng giải mã dữ liệu bản quyền số (Spotify, Netflix, Widevine, Apple FairPlay...). |
| **`picture-in-picture`** | Khuyên dùng | Cho phép video kích hoạt chế độ cửa sổ nổi thu nhỏ qua API `sremote.pip()`. |
| **`fullscreen` / `allowfullscreen`**| Khuyên dùng | Cho phép trình phát phóng to toàn màn hình. |
| **`clipboard-write`** | Tùy chọn | Cho phép iframe sao chép link chia sẻ hoặc timestamp vào clipboard. |

> [!WARNING]
> Nếu thiếu quyền `autoplay` hoặc `encrypted-media`, trình duyệt sẽ tự động chặn luồng audio/video khiến lệnh `sremote.play()` không thể phát âm thanh hoặc bị dừng ngay lập tức.

---

## 3. Thiết kế Responsive & Tỷ lệ khung hình (Aspect Ratio)

Để khung video tự động co giãn theo kích thước màn hình mà không bị vỡ tỷ lệ 16:9:

### Cách hiện đại với CSS `aspect-ratio` (Khuyên dùng):
```css
.video-container {
  width: 100%;
  max-width: 800px;
  aspect-ratio: 16 / 9;
}

.video-container iframe {
  width: 100%;
  height: 100%;
  border: none;
}
```

---

## 4. Lưu ý sống còn về thuộc tính `sandbox`

Nếu bạn sử dụng thuộc tính `sandbox` trên thẻ `<iframe>` để tăng cường bảo mật, bạn **phải** cấp tối thiểu các cờ sau để SRemote và Player có thể giao tiếp:

```html
<iframe
  src="https://..."
  sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
  allow="autoplay; encrypted-media">
</iframe>
```

> [!CAUTION]
> - Nếu đặt thuộc tính `sandbox` rỗng (`sandbox=""`) hoặc thiếu `allow-scripts`, mã JavaScript của Player và Userscript sẽ bị chặn hoàn toàn.
> - Nếu thiếu `allow-same-origin`, iframe sẽ bị cách ly hoàn toàn và không thể lưu trữ local state hoặc thiết lập cổng `MessageChannel`.

---

## ⏭️ Bước tiếp theo
Sau khi tạo thẻ `<iframe>`, hãy tiếp tục sang **[02. Kiểm tra tính tương thích dịch vụ](./02-compatibility-check.md)** để kiểm tra xem dịch vụ của bạn có thể điều khiển trực tiếp được hay không.

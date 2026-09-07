# 01. Thiết lập thẻ `<iframe>` đúng chuẩn

Tài liệu này hướng dẫn chi tiết cách cấu hình thẻ `<iframe>` chuẩn kỹ thuật, đảm bảo an toàn và tối ưu khả năng tương thích khi nhúng trình phát media (video/audio) từ dịch vụ bên thứ ba vào website của bạn.

---

## 1. Cấu trúc thẻ `<iframe>` chuẩn khuyến nghị

Khi nhúng video/audio từ bên thứ ba (YouTube, Spotify, SoundCloud, Bilibili, Dailymotion, Player tùy biến...), trình duyệt sẽ hạn chế một số tính năng nếu thẻ `<iframe>` chưa được cấp quyền phù hợp qua thuộc tính `allow`.

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

| Quyền hạn | Mức độ | Mục đích & Tác dụng |
| :--- | :---: | :--- |
| **`autoplay`** | ⭐ **Bắt buộc** | Cho phép trình phát bên trong iframe phát video/audio hoặc tự động phát khi nhận lệnh từ trang cha. |
| **`encrypted-media`** | ⭐ **Bắt buộc DRM** | Cho phép iframe giải mã nội dung số có bản quyền (Spotify, Netflix, Widevine, Apple FairPlay...). |
| **`picture-in-picture`** | Khuyến nghị | Cho phép kích hoạt chế độ thu nhỏ cửa sổ nổi (PiP) qua API `sremote.pip()`. |
| **`fullscreen` / `allowfullscreen`**| Khuyến nghị | Cho phép trình phát phóng to toàn màn hình. |
| **`clipboard-write`** | Tùy chọn | Cho phép iframe sao chép đường dẫn chia sẻ hoặc timestamp vào clipboard. |

> [!WARNING]
> Nếu thiếu quyền `autoplay` hoặc `encrypted-media`, trình duyệt sẽ chặn luồng phát, khiến lệnh `sremote.play()` không phát được âm thanh hoặc bị dừng ngay lập tức.

---

## 3. Thiết kế Responsive & Tỷ lệ khung hình (Aspect Ratio)

Để khung video tự động co giãn theo kích thước màn hình mà vẫn giữ đúng tỷ lệ chuẩn 16:9:

### Sử dụng thuộc tính CSS `aspect-ratio` hiện đại (Khuyến nghị):
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

## 4. Lưu ý quan trọng khi dùng thuộc tính `sandbox`

Nếu bạn sử dụng thuộc tính `sandbox` trên thẻ `<iframe>` để tăng cường bảo mật, bạn **bắt buộc phải cấp tối thiểu** các cờ sau để SRemote và trình phát có thể hoạt động:

```html
<iframe
  src="https://..."
  sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
  allow="autoplay; encrypted-media">
</iframe>
```

> [!CAUTION]
> - Nếu đặt thuộc tính `sandbox` rỗng (`sandbox=""`) hoặc thiếu `allow-scripts`, mã JavaScript của trình phát và Userscript sẽ bị chặn hoàn toàn.
> - Nếu thiếu `allow-same-origin`, iframe sẽ bị cách ly hoàn toàn và không thể lưu trữ dữ liệu cục bộ hay thiết lập kênh truyền `MessageChannel`.

---

## ⏭️ Bước tiếp theo
Sau khi tạo thẻ `<iframe>`, hãy tiếp tục sang **[02. Bảng dịch vụ hỗ trợ & Kiểm tra tương thích](./02-compatibility-check.md)** để kiểm tra các tính năng được hỗ trợ trên nền tảng của bạn.


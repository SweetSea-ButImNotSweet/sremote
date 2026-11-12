[ English ](../README.md) | [ Tiếng Việt ]

# SRemote Userscript
*(hay, Sea's Remote - Cầu nối Userscript)*

Một userscript được viết ra chỉ để giải quyết vấn nạn "trời ơi đất hỡi": trang thì muốn nhúng video của bên khác nhưng bên khác cho nhúng thì không đưa luôn cái remote.

---

## 📌 Userscript này dành cho ai?

### 1. Nếu bạn là người dùng được một trang web hướng dẫn sang đây:
Một website xem phim/nghe nhạc bảo bạn cài userscript này để có thể điều khiển trình phát? Đây là lý do:

> **Hình ảnh chiếc Remote Tivi:** Hãy tưởng tượng bạn sang nhà bạn xem phim, nhưng bạn của bạn cất tiệt chiếc remote điều khiển. Mỗi khi muốn tua nhanh, chỉnh âm lượng hay tạm dừng đi lấy nước, bạn đều phải nhờ họ làm hộ. Rất bất tiện đúng không?
>
> Trên môi trường web cũng diễn ra tình trạng tương tự:
> 1. **Dịch vụ không cung cấp API:** Rất nhiều nền tảng video lớn (Bilibili, Kick, Rumble...) cho phép nhúng video vào trang khác, nhưng hoàn toàn không cung cấp API để website bên ngoài có thể gọi lệnh Play hay Pause.
> 2. **Chính sách bảo mật trình duyệt (Same-Origin Policy):** Trình duyệt nghiêm cấm trang cha can thiệp vào mã nguồn của thẻ `<iframe>` từ một tên miền khác.

**SRemote Userscript** chính là chiếc điều khiển từ xa còn thiếu. Khi được cài đặt, nó đóng vai trò cầu nối an toàn giúp trang web bạn đang duyệt có thể bấm Play, Pause, tua và chỉnh âm lượng mượt mà.

### 2. Nếu bạn là lập trình viên (Developer):
SRemote Userscript là cầu nối kỹ thuật phối hợp cùng `@sremote/sdk`. Script tự động nhận diện phần tử media trong iframe và thiết lập kênh truyền tin `MessageChannel` có xác thực về trang cha với độ trễ tối thiểu.

---

## 🚀 Hướng dẫn Cài đặt
1. Cài đặt tiện ích mở rộng quản lý userscript trên trình duyệt ([Tampermonkey](https://www.tampermonkey.net/) hoặc [Violentmonkey](https://violentmonkey.github.io/)).
2. Thêm script bằng một trong hai đường dẫn dưới đây:
   - **Cài đặt trực tiếp:** [sremote.user.js](https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.user.js)
   - **Bản nén rút gọn:** [sremote.min.user.js](https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.min.user.js)
3. Tải lại trang web có nhúng media. Khi hộp thoại xin quyền SRemote xuất hiện, bấm **Đồng ý** (có thể tích chọn "Nhớ quyền cho trang web này").

---

## 🛠️ Nguyên lý hoạt động
Khi chạy trên trình duyệt:
1. Tự động kiểm tra và nhận diện các phần tử media (`<video>`, `<audio>`) bên trong iframe.
2. Thiết lập kênh truyền tin nhắn bảo mật hai chiều (`MessageChannel` / `postMessage`) giữa trang web cha và iframe con.
3. Cho phép trang web cha gửi các lệnh điều khiển tiêu chuẩn (`play`, `pause`, `seek`, `volume`, `speed`) mà không bị chặn bởi rào cản Same-Origin Policy.

---

## Build & Phát triển

```bash
# Cài đặt dependencies tại thư mục gốc
npm install

# Build Userscript
npm run build:userscript

# Chế độ Live Reload phát triển
npm run dev
```

---

## License
Userscript này được phân phối dưới giấy phép **GNU Lesser General Public License v3.0 (LGPL-3.0)**.

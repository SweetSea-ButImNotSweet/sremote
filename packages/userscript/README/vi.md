[ English ](../README.md) | [ Tiếng Việt ]

# SRemote Userscript
*(hay, Sea's Remote - Cầu nối Userscript)*

Một userscript được viết ra chỉ để giải quyết vấn nạn "trời ơi đất hỡi": trang thì muốn nhúng video của bên khác nhưng bên khác cho nhúng thì không đưa luôn cái remote.

---

## Nếu bạn tự dưng thấy project này trên mạng thấy hay quá mà muốn cài
Thì hãy khoan bấm cài, cho dù project này nghe có "ngầu" đến mấy. Bản chất của SRemote là một **SDK / cầu nối kỹ thuật** cho lập trình viên. Nếu bạn không phải là Dev đang tìm cách điều khiển iframe, cũng chẳng có trang web nào bảo bạn sang đây cài để xem phim hay nghe nhạc... thì cài vào chỉ tổ chật Tampermonkey chứ nó chả tự phát huy phép thuật nào đâu. Đừng cài vội nhé!

## Nếu bạn chỉ đơn giản là lướt internet nhưng bị trang web đẩy sang đây
Bạn bị trang web nhờ sang đây và cài userscript của mình? Trước khi bạn soạn một tin nhắn "tình thương mến thương" chửi dev bên đấy từ A tới Z, hãy ở đây và để tui kể cho bạn lí do tại sao "bên đấy PHẢI BẤT LỰC LẮM RỒI mới phải đưa bạn sang đây", và bật mí tí luôn: tui cũng từng rơi vào tình cảnh của những dev đấy rồi.

Hình dung như này: bạn sang nhà bạn chơi, hai đứa ngồi xem phim. Nhưng mà bạn không được cầm remote, nó hỏi bạn muốn xem gì nó mở cho. Bạn muốn tua nhanh, bạn muốn tăng giảm âm lượng, bạn muốn đổi phim? Nope, nó vẫn không đưa remote cho bạn, nó thích mở gì là việc của nó. Nghe có tức tức không?

Thì đây cũng vậy, dù bản chất về công nghệ hơi khác biệt một chút:

- **Ngắn gọn:** Web bạn truy cập không có remote để mà điều khiển video mà mình nhúng từ một dịch vụ khác.
- **Nói đầy đủ:** Có 2 nguyên nhân:
  1. **Không có API bên ngoài:** Dịch vụ bên kia không cung cấp cho web bạn truy cập API (API hiểu đơn giản là ngôn ngữ đọc hiểu thống nhất của 2 dịch vụ khác nhau); hay hiểu đơn giản, dịch vụ bên kia giả bộ câm điếc không muốn nói chuyện với trang bên này.
  2. **Chính sách Same-Origin Policy (SOP):** Tức là trang này không thể can thiệp vào trang khác nếu 2 trang không cùng tên miền. Hiểu đơn giản là A-kun không thể nhận vơ B-chan làm em gái rồi sai vặt vì 2 đứa đâu có cùng dòng máu huyết thống đâu =)))

Vì những lí do trên, **SRemote Userscript** ra đời chỉ để làm đúng một nhiệm vụ duy nhất: tạo một chiếc remote thống nhất cho các website có thể điều khiển video nhúng từ các dịch vụ khác mà tới 2026 rồi bên đấy không có nổi một cái điều khiển từ xa.

---

## Thế, tôi chỉ lướt internet bình thường, nhưng trang bảo tôi cài cái này, thì tôi cài như nào?
1. Cài đặt tiện ích mở rộng quản lý userscript trên trình duyệt của bạn (khuyên dùng [Tampermonkey](https://www.tampermonkey.net/) hoặc [Violentmonkey](https://violentmonkey.github.io/)).
2. Thêm script `dist/sremote.user.js` vào tiện ích mở rộng và bật kích hoạt:
   - **Link cài đặt trực tiếp:** [sremote.user.js](https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.user.js)
   - **Bản rút gọn (Minified):** [sremote.min.user.js](https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.min.user.js)
3. Khi tải lại trang web có nhúng media, nếu trang yêu cầu cấp quyền điều khiển, hãy chọn **Đồng ý** (có thể chọn tích chọn nhớ quyền cho trang web đó).

---

## Nguyên lý hoạt động
Khi được cài đặt, Userscript sẽ chạy ngầm trên trình duyệt:
1. Tự động kiểm tra và nhận diện các phần tử media (`<video>`, `<audio>`) bên trong iframe.
2. Thiết lập kênh truyền tin nhắn bảo mật hai chiều (`MessageChannel` / `postMessage`) giữa trang web cha và iframe con.
3. Cho phép trang web cha gửi các lệnh điều khiển tiêu chuẩn (`play`, `pause`, `seek`, `volume`, `rate`) mà không bị chặn bởi rào cản Same-Origin Policy.

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

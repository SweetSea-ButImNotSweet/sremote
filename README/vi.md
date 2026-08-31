[ English ](../README.md) | [ Tiếng Việt ]

# SRemote
*(hay, Sea's Remote, nghĩa là: Điều khiển từ xa của Sea)*

Một userscript được viết ra chỉ để giải quyết vấn nạn "trời ơi đất hỡi": trang thì muốn nhúng video của bên khác nhưng bên khác cho nhúng thì không đưa luôn cái remote

## Nếu bạn tự dưng thấy project này trên mạng thấy hay quá mà muốn cài
Thì hãy khoan bấm cài, cho dù project này nghe có "ngầu" đến mấy. Bản chất của SRemote là một **SDK / cầu nối kỹ thuật** cho lập trình viên. Nếu bạn không phải là Dev đang tìm cách điều khiển iframe, cũng chẳng có trang web nào bảo bạn sang đây cài để xem phim hay nghe nhạc... thì cài vào chỉ tổ chật Tampermonkey chứ nó chả tự phát huy phép thuật nào đâu. Đừng cài vội nhé!

## Nếu bạn chỉ đơn giản là lướt internet nhưng bị trang web đẩy sang đây
Bạn bị trang web nhờ sang đây và cài userscript của mình? Trước khi bạn soạn một tin nhắn "tình thương mến thương" chửi dev bên đấy từ A tới Z, hãy ở đây và để tui kể cho bạn lí do tại sao "bên đấy PHẢI BẤT LỰC LẮM RỒI mới phải đưa bạn sang đây", và bật mí tí luôn: tui cũng từng rơi vào tình cảnh của những dev đấy rồi.

Hình dung như này: bạn sang nhà bạn chơi, hai đứa ngồi xem phim. Nhưng mà bạn không được cầm remote, nó hỏi bạn muốn xem gì nó mở cho. Bạn muốn tua nhanh, bạn muốn tăng giảm âm lượng, bạn muốn đổi phim? Nope, nó vẫn không đưa remote cho bạn, nó thích mở gì là việc của nó. Nghe có tức tức không?

Thì đây cũng vậy, dù bản chất về công nghệ hơi khác biệt một chút:

- Ngắn gọn: Web bạn truy cập không có remote để mà điều khiển video mà mình nhúng từ một dịch vụ khác.
- Nói đầy đủ: Có 2 nguyên nhân:
  1. Dịch vụ bên kia không cung cấp cho web bạn truy cập API (API hiểu đơn giản là ngôn ngữ đọc hiểu thống nhất của 2 dịch vụ khác nhau); hay hiểu đơn giản, dịch vụ bên kia giả bộ câm điếc không muốn nói chuyện với trang bên này.
  2. Chính sách Same-Origin Policy, tức là trang này không thể can thiệp vào trang khác nếu 2 trang không cùng tên miền. Hiểu đơn giản là A-kun không thể nhận vơ B-chan làm em gái rồi sai vặt vì 2 đứa đâu có cùng dòng máu huyết thống đâu =)))

Vì những lí do trên, SRemote ra đời chỉ để làm đúng một nhiệm vụ duy nhất: tạo một cái remote thống nhất cho các website có thể điều khiển video nhúng từ các dịch vụ khác mà tới 2026 rồi bên đấy không có nổi một cái điều khiển từ xa.

## Thế, tôi chỉ lướt internet bình thường, nhưng trang bảo tôi cài cái này, thì tôi cài như nào?
1. Cài đặt tiện ích mở rộng quản lý userscript trên trình duyệt của bạn (khuyên dùng Tampermonkey hoặc ViolentMonkey).
2. Thêm script `dist/sremote.user.js` vào tiện ích mở rộng và bật kích hoạt.
3. Khi tải lại trang web có nhúng media, nếu trang yêu cầu cấp quyền điều khiển, hãy chọn **Đồng ý** (có thể chọn tích chọn nhớ quyền cho trang web đó).

## Tôi có website riêng muốn tích hợp cái này thì làm như nào?

Bạn có thể tích hợp qua 2 cách:

### Cách 1: Dùng thư viện `@sremote/wrapper` (Khuyên dùng cho Web App hiện đại)
Nếu dự án của bạn dùng React, Vue, Svelte, Vite hay Next.js:
```bash
npm install @sremote/wrapper
```
```javascript
import { createSRemote, showInstallModal } from '@sremote/wrapper';

const remote = createSRemote();
await remote.ready();

// Kiểm tra nếu userscript chưa có, mở modal hướng dẫn người dùng cài đặt
if (!remote.isUserscriptAvailable()) {
  remote.showInstallModal();
}

// Điều khiển như bình thường, wrapper tự động lo liệu phần bắt tay & adapter
remote.play();
```

### Cách 2: Dùng gói preset `@sremote/ready2use` (Mì ăn liền cho YouTube, v.v.)
Nếu bạn muốn nhúng và điều khiển các player bên thứ 3 (như YouTube) mà không cần tự load SDK hay tự viết adapter từ đầu:
```bash
npm install @sremote/ready2use @sremote/wrapper
```
```javascript
import { youtube } from '@sremote/ready2use';

// Tự động chèn iframe vào DOM và kết nối sẵn với SRemote
const { remote } = await youtube.mount('#player-container', {
  videoId: 'dQw4w9WgXcQ'
});

await remote.play();
await remote.seek(15);
await remote.load('M7lc1UVf-VE'); // Đổi video khác
```

### Cách 3: Dùng trực tiếp qua `window.sremote` (Thuần HTML/JS)
1. Nhúng `iframe` chứa video/audio từ nguồn bạn cần phát. Đừng quên bật đầy đủ các quyền qua thuộc tính `allow` (đặc biệt cần thiết với YouTube, Spotify hay các dịch vụ streaming bảo vệ bản quyền):
   ```html
   <iframe
     src="https://..."
     allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
     allowfullscreen>
   </iframe>
   ```
2. Gọi `sremote.hello()` từ trang cha (top-level window) để bắt đầu tìm kiếm và kết nối tới media bên trong iframe:
   ```javascript
   // Khởi tạo kết nối tới tất cả iframe hoặc truyền target cụ thể
   window.sremote.hello();
   ```
3. Lắng nghe các sự kiện hoặc trạng thái sẵn sàng từ `sremote`:
   ```javascript
   window.sremote.on('accept', (data) => {
     console.log('Đã kết nối thành công tới media:', data.instanceId);
   });

   window.sremote.on('timeupdate', (data) => {
     console.log('Tiến độ phát:', data.state.currentTime);
   });
   ```
4. Gọi các hàm điều khiển trực tiếp qua đối tượng toàn cục `window.sremote` (ví dụ: `sremote.play()`, `sremote.pause()`, `sremote.seek(10)`).

---

## Bảng tra cứu độ tương thích nhanh (Compatibility Snapshot)

| Nền tảng | Cơ chế hỗ trợ | Ghi chú tích hợp |
| :--- | :---: | :--- |
| **HTML5 Media thuần (Plyr, VideoJS...)** | ✅ Tự động (Zero-Config) | Nhúng vào là chạy trực tiếp |
| **Bilibili Embed** | ✅ Tự động (Zero-Config) | Nhúng với `autoplay=1` |
| **YouTube** | ⚡ Adapter Mode | Cần thêm `enablejsapi=1` |
| **SoundCloud** | ⚡ Adapter Mode | Kết nối qua SoundCloud Widget API |
| **Spotify** | ⚡ Adapter Mode | Kết nối qua Spotify IFrame API |
| **Vimeo / Dailymotion / Twitch** | ⚡ Adapter Mode | Kết nối qua Player SDK chính thức |
| **NicoNico Douga** | ⚡ PostMessage Mode | Kết nối qua giao thức 2 chiều |

---

## Tài liệu & Tra cứu API
- Xem hướng dẫn chi tiết và danh mục toàn bộ API tại [Tài liệu Kỹ thuật SRemote](../docs/index.html).
- Xem thư viện mẫu nhúng iframe & code Adapter tại [Cookbook](../docs/recipes.html).
- Trải nghiệm thử nghiệm đa slot: [Live Demo](../demo/index.html).

---

## Giới hạn kĩ thuật đã biết
1. Ưu tiên dùng trực tiếp API chính thức từ iframe (nếu dịch vụ có hỗ trợ). SRemote cung cấp `adapters.set` nếu bạn cần gom về một giao diện điều khiển chung.
2. Một số dịch vụ yêu cầu người dùng tương tác vào nút Phát (Play) lần đầu. Theo những gì tui đã biết cho tới thời điểm hiện tại thì có 2 khả năng: một là do chính sách chặn tự động phát (may sao bên Firefox người dùng có thể chọn Cho phép tự động phát video có âm thanh). Hai là có thể do watcher trong một số dịch vụ không chịu nạp nguồn media nếu như state nội bộ trong đó báo chưa thấy nút Phát.
3. SRemote không phải là cây đũa thần của Harry Potter cho mọi dịch vụ. Một số trường hợp hiếm gặp sẽ không hỗ trợ nếu trang nhúng không sử dụng thẻ HTML5 Video/Audio tiêu chuẩn hoặc không đăng ký MediaSession API.
4. SRemote chỉ đóng vai trò làm remote điều khiển media đã nhúng, không có khả năng vượt rào (bypass) các hạn chế nhúng hay chặn phát từ phía dịch vụ.

---

## Báo cáo lỗi
1. Mô tả chi tiết lỗi gặp phải và các bước tái hiện.
2. Tên dịch vụ, URL trang web hoặc link test xảy ra lỗi.
3. Bản thử nghiệm tối giản (Minimal reproduction) nếu có thể.

---

## Donate
(Sẽ chèn sau khi tui hỏi được ngân hàng có cách nào tạo STK mà không cần lập tài khoản mới)

---

## License
Dự án được phân phối dưới giấy phép **GNU Lesser General Public License v3.0 (LGPL-3.0)** - xem chi tiết tại file [LICENSE](../LICENSE).
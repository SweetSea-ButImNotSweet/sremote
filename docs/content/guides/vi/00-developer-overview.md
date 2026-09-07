# 00. Tổng quan kiến trúc (Developer Overview)

Tài liệu này hướng dẫn cách tích hợp, điều khiển và mở rộng hệ sinh thái **SRemote** trên website hoặc ứng dụng web của bạn.

---

## 1. Vấn đề: Rào cản Cross-Origin Iframe Media

Khi xây dựng các trang web tổng hợp, nền tảng học trực tuyến, danh sách phát đa nguồn hay media dashboard, chúng ta thường phải nhúng trình phát của bên thứ ba qua thẻ `<iframe>` (như YouTube, Spotify, SoundCloud, Vimeo, TikTok, Bilibili, Dailymotion...).

Lúc này, trình duyệt sẽ chặn các thao tác điều khiển do chính sách cùng nguồn gốc (**Same-Origin Policy**):

```
❌ DOMException: Blocked a frame with origin "https://my-app.com" from accessing a cross-origin frame "https://youtube.com".
```

### Hạn chế khi dùng SDK riêng lẻ của từng nền tảng:
1. **API bị phân mảnh**: Mỗi dịch vụ có một cách khởi tạo riêng (YouTube dùng `iframe_api`, Spotify yêu cầu Web Playback OAuth Token, SoundCloud dùng Widget API).
2. **Khó đồng bộ trạng thái**: Thiếu cơ chế quản lý vòng đời tập trung (ví dụ: muốn khi bấm Play nhạc Spotify thì video YouTube tự động Pause).
3. **Không can thiệp được UI/State**: Trang cha không thể chèn CSS tùy biến, không theo dõi được tiến trình đệm (buffer) ngầm hoặc bắt các sự kiện media theo một chuẩn chung.

---

## 2. Kiến trúc giải pháp của SRemote

**SRemote** giải quyết triệt để rào cản này bằng kiến trúc **Distributed Dual-Engine** (kết hợp giữa Userscript và Client SDK) với hai thành phần phối hợp:

```mermaid
flowchart TD
    subgraph ParentApp["Trang Web của bạn (Parent Web App)"]
        App["React / Vue / Svelte / Next.js / Vanilla JS"]
        Wrapper["@sremote/wrapper (Client SDK)"]
        App --> Wrapper
    end

    subgraph BrowserContext["Trình duyệt người dùng (Browser Context)"]
        UserscriptParent["Userscript (Parent Frame Controller)"]
        Wrapper -.->|DOM Bridge / window.sremote| UserscriptParent
        GMStorage[("GM Storage / Tampermonkey Cache")]
        UserscriptParent <--> GMStorage
    end

    subgraph ThirdPartyIframes["Các Iframe bên thứ 3 (Cross-Origin)"]
        subgraph IframeA["Iframe A (e.g. YouTube)"]
            AgentA["Userscript (Iframe Agent A)"]
            VideoA["HTML5 Video / YT.Player"]
            AgentA --> VideoA
        end
        subgraph IframeB["Iframe B (e.g. Spotify)"]
            AgentB["Userscript (Iframe Agent B)"]
            VideoB["HTML5 Audio / Spotify Player"]
            AgentB --> VideoB
        end
    end

    UserscriptParent -->|Dedicated MessageChannel / Port| AgentA
    UserscriptParent -->|Dedicated MessageChannel / Port| AgentB
    AgentA <--> GMStorage
    AgentB <--> GMStorage
```

---

## 3. Phân chia vai trò: Userscript Engine vs. Wrapper Client SDK

| Tiêu chí | Userscript Engine (`@sremote/userscript`) | Wrapper Client SDK (`@sremote/wrapper`) |
| :--- | :--- | :--- |
| **Môi trường thực thi** | Tiện ích mở rộng trên trình duyệt người dùng (Tampermonkey, Violentmonkey, Greasemonkey...) | Tích hợp trực tiếp vào mã nguồn frontend qua npm hoặc thẻ `<script>` |
| **Nhiệm vụ chính** | - Vượt qua rào cản Cross-Origin.<br>- Thiết lập kênh truyền `MessagePort` bảo mật giữa các frame.<br>- Lắng nghe sự kiện và can thiệp trực tiếp vào thẻ `<video>`, `<audio>` hoặc context Player trong iframe. | - Cung cấp bộ API hướng đối tượng, hỗ trợ 100% TypeScript.<br>- Tự động phát hiện Userscript.<br>- Tự động chuyển sang chế độ `dom-direct` nếu iframe cùng domain.<br>- Tích hợp sẵn modal UI hướng dẫn cài đặt Userscript khi cần. |
| **Dung lượng** | ~32KB Gzip (độc lập, tối ưu) | ~8KB Gzip (Zero dependencies) |
| **Định dạng phát hành** | UserScript `.user.js` | ESM, CommonJS, IIFE Bundle |

---

## 4. Các chế độ hoạt động (`client.mode`)

Khi gọi `createSRemoteClient()`, SDK sẽ tự động kiểm tra môi trường và hoạt động ở một trong 3 chế độ:

```javascript
import { createSRemoteClient } from '@sremote/wrapper';

const client = createSRemoteClient({
  fallbackToDom: true, // Tự động fallback sang DOM trực tiếp nếu cùng domain
  timeout: 2000,       // Thời gian chờ phát hiện userscript (ms)
});

await client.ready();
console.log('Chế độ hoạt động:', client.mode);
```

- **`'userscript'`**: Đã kết nối với Userscript. Bạn có toàn quyền điều khiển mọi iframe xuyên domain.
- **`'dom-direct'`**: Trình duyệt chưa cài Userscript nhưng media nằm cùng domain hoặc ngay trên trang cha. Client sẽ điều khiển trực tiếp qua HTML5 Media Element API tiêu chuẩn.
- **`'unsupported'`**: Không có Userscript và iframe khác domain (bị chặn CORS). Lúc này bạn có thể gọi `client.showInstallModal()` để hướng dẫn người dùng cài đặt userscript.

---

## 5. Tổ chức API theo Domain

Thay vì dùng flat API dễ gây nhầm lẫn, SRemote phân nhóm các phương thức theo từng nhóm chức năng (Domain) rõ ràng:

```javascript
// 1. Điều khiển phát nhanh (áp dụng cho instance đang được chọn)
await client.play();
await client.pause();
await client.seek(-10);    // Tua lùi 10s trước đó
await client.seekTo(10);   // Tua tới giây thứ 10
await client.volume(0.8);

// 2. Quản lý Instance & Multi-mode (sremote.instances)
client.instances.setExclusive('auto'); // Tự động pause các video khác khi có một video phát
const list = client.instances.list();  // Danh sách các frame đang kết nối
client.instances.assign('#video-1', 'slot-course-intro');

// 3. Đăng ký Custom Adapter cho Player đặc thù (sremote.adapters)
client.adapters.register(myCustomPlayerAdapter, 'custom-player-id');

// 4. Gọi RPC hai chiều (sremote.rpc)
const res = await client.rpc.call('getCapabilities');

// 5. Chèn CSS động vào Iframe (sremote.css)
await client.css.set('body { filter: contrast(1.1); }');

// 6. Lắng nghe sự kiện toàn cục
client.on('timeupdate', ({ instanceId, state }) => {
  console.log(`[${instanceId}] Tiến độ: ${state.currentTime}/${state.duration}`);
});
```

---

## 6. Quy trình tích hợp cơ bản

1. **Bước 1**: Nhúng thẻ Iframe với đầy đủ thuộc tính `allow="autoplay; encrypted-media; picture-in-picture"` (Xem chi tiết tại [01. Thiết lập thẻ Iframe đúng chuẩn](./01-iframe-setup.md)).
2. **Bước 2**: Cài đặt `@sremote/wrapper`:
   ```bash
   npm install @sremote/wrapper
   ```
3. **Bước 3**: Khởi tạo client và gắn các thao tác UI với các hàm điều khiển (`client.play()`, `client.pause()`, `client.seek()`).
4. **Bước 4**: Hiển thị thông báo hoặc modal hướng dẫn cài Userscript nếu `client.mode === 'unsupported'`.

---

## Đọc tiếp
- 📖 [01. Thiết lập thẻ `<iframe>` đúng chuẩn](./01-iframe-setup.md)
- 📊 [02. Bảng dịch vụ hỗ trợ & Kiểm tra tương thích](./02-compatibility-check.md)
- 💻 [03. Hướng dẫn tích hợp SRemote Wrapper](./03-wrapper-integration.md)


# Tutorial 06: Bàn Điều Khiển 4 Màn Hình Livestream Song Song (Multi-Stream Dashboard)

Trong các sự kiện thể thao lớn (World Cup, F1), giải đấu Esports (League of Legends, CS:GO) hoặc hệ thống giám sát an ninh (CCTV), người dùng thường có nhu cầu **theo dõi cùng lúc 4 góc máy quay (Multiple Camera Angles)** trên một màn hình duy nhất.

Tuy nhiên, nếu bật cả 4 luồng video cùng phát âm thanh thì người nghe sẽ bị "loạn cào cào" vì tiếng ồn chồng chéo.

Trong tutorial này, chúng ta sẽ xây dựng một **Multi-Stream Command Center**:
- Hiển thị lưới Grid 2x2 chứa 4 màn hình livestream độc lập.
- Tính năng **"Solo Audio (Nghe Độc Quyền)"**: Nhấp vào bất kỳ màn hình nào, màn hình đó sẽ mở âm thanh 100%, đồng thời 3 màn hình còn lại sẽ **tự động tắt tiếng (Mute)** mà hình ảnh vẫn tiếp tục chạy mượt mà.
- Nút tổng chỉ huy: **"Mute All"** và **"Pause All"**.

> [!TIP]
> **Trải nghiệm ngay bản demo hoạt động thực tế**: Mở [🚀 Live Demo: 06-multi-stream](../../../../demo/apps/06-multi-stream/index.html) để tương tác trực tiếp trên trình duyệt.

---

## 🎯 Mục tiêu Bạn Sẽ Đạt Được

Sau bài học này, bạn sẽ nắm vững:
1. Cách quản lý đồng thời một mảng gồm nhiều đối tượng `SRemoteClient` độc lập trên cùng 1 trang.
2. **Kỹ thuật Solo Audio Pattern (Master/Solo Channel)**: Điều khiển trạng thái âm thanh có điều kiện giữa nhiều player.
3. Kỹ thuật điều khiển hàng loạt (Batch Operations) bằng `Promise.all()`.
4. Thiết kế giao diện phản hồi trực quan với viền phát sáng (Glow Border) cho màn hình đang được Solo Audio.

```mermaid
flowchart TD
    subgraph Multi_Stream_Dashboard ["Lưới 4 Màn Hình Livestream"]
        M1["Màn hình 1 (Chính)"]
        M2["Màn hình 2 (Góc quay Flycam)"]
        M3["Màn hình 3 (Khoang lái Driver)"]
        M4["Màn hình 4 (Bàn bình luận viên)"]
    end
    User["👤 Người xem click Màn hình 3"] -->|"Kích hoạt Solo Audio"| M3
    M3 -->|"sremote.setVolume(1.0) & Highlight viền xanh"| M3
    M3 -->|"Tự động tắt tiếng các luồng còn lại"| M1 & M2 & M4
```

---

## Bước 1: Khởi Tạo Lưới Grid 2x2 & Thanh Điều Khiển Tổng

Hãy tạo file `index.html`. Chúng ta thiết kế:
- Thanh công cụ điều khiển tổng ở trên cùng: Nút `Mute All`, `Unmute All`, `Tạm dừng tất cả`.
- Lưới 4 ô (`#stream-grid`), mỗi ô chứa slot video, nhãn tên camera và nút bật Solo Audio riêng.

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Multi-Stream Dashboard - SRemote Tutorial 06</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <div class="dashboard-wrapper">
    <!-- Thanh điều khiển tổng -->
    <header class="dashboard-header">
      <div>
        <h1>📺 Multi-Camera Esports Center</h1>
        <p class="subtitle">Nhấp vào một màn hình để nghe Solo Audio của góc quay đó</p>
      </div>
      <div class="master-actions">
        <button id="btn-mute-all" class="btn btn-warning">🔇 Mute Tất Cả</button>
        <button id="btn-toggle-all" class="btn btn-primary">⏯ Phát/Dừng Tất Cả</button>
      </div>
    </header>

    <!-- Lưới 4 màn hình Grid 2x2 -->
    <div class="stream-grid" id="stream-grid">
      <!-- 4 ô màn hình sẽ được render động hoặc dựng sẵn -->
    </div>
  </div>

  <script type="module" src="app.js"></script>
</body>
</html>
```

Và định dạng bằng `style.css`:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #090d16;
  color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding: 24px;
}

.dashboard-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.subtitle {
  color: #94a3b8;
  font-size: 13.5px;
  margin-top: 4px;
}

.master-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #0284c7;
  color: #fff;
}

.btn-primary:hover {
  background: #0369a1;
}

.btn-warning {
  background: #334155;
  color: #f8fafc;
}

.btn-warning:hover {
  background: #475569;
}

/* Lưới Grid 2x2 */
.stream-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stream-card {
  background: #111827;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid transparent;
  transition: border-color 0.2s, box-shadow 0.2s;
}

/* Viền phát sáng khi màn hình đang được Solo Audio */
.stream-card.solo-active {
  border-color: #38bdf8;
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.35);
}

.stream-video-slot {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
}

.stream-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #0f172a;
}

.camera-label {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
}

.solo-btn {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.stream-card.solo-active .solo-btn {
  background: #0284c7;
  color: #fff;
  border-color: #38bdf8;
}
```

---

## Bước 2: Định Nghĩa Danh Sách 4 Camera & Render DOM Động

Mở file `app.js`. Chúng ta định nghĩa mảng 4 camera gồm tên góc quay và `videoId` tương ứng:

```javascript
import { SRemoteClient } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

// Cấu hình 4 luồng video độc lập
const streamsData = [
  { id: 'cam-1', name: 'Camera 1: Toàn Cảnh Sân Vận Động', videoId: 'jfKfPfyJRdk' },
  { id: 'cam-2', name: 'Camera 2: Góc Quay Flycam Trên Cao', videoId: 'dQw4w9WgXcQ' },
  { id: 'cam-3', name: 'Camera 3: Khoang Lái Tuyển Thủ', videoId: '4xDzrJKXOOY' },
  { id: 'cam-4', name: 'Camera 4: Bàn Bình Luận Viên', videoId: 'M7lc1UVf-VE' }
];

// Mảng lưu trữ các instance SRemoteClient
const activeStreams = [];

const streamGrid = document.getElementById('stream-grid');
const btnMuteAll = document.getElementById('btn-mute-all');
const btnToggleAll = document.getElementById('btn-toggle-all');

// Render 4 card ra giao diện
streamsData.forEach((stream, index) => {
  const card = document.createElement('div');
  card.className = `stream-card ${index === 0 ? 'solo-active' : ''}`;
  card.id = `card-${stream.id}`;
  card.innerHTML = `
    <div id="slot-${stream.id}" class="stream-video-slot"></div>
    <div class="stream-footer">
      <span class="camera-label">🎥 ${stream.name}</span>
      <button class="solo-btn" id="btn-solo-${stream.id}">🔊 Solo Audio</button>
    </div>
  `;
  streamGrid.appendChild(card);
});
```

---

## Bước 3: Khởi Tạo Độc Lập 4 SRemote Client

Mỗi thẻ iframe cần có một đối tượng `SRemoteClient` riêng để điều khiển. Chúng ta duyệt qua từng camera và khởi tạo song song:

```javascript
async function initMultiStreams() {
  console.log('⚡ Đang khởi tạo 4 luồng video song song...');

  for (let i = 0; i < streamsData.length; i++) {
    const data = streamsData[i];
    
    // Mount YouTube vào slot tương ứng
    const handle = await youtube.mount(`#slot-${data.id}`, {
      videoId: data.videoId,
      playerVars: { controls: 0, autoplay: 1 }
    });

    // Tạo SRemoteClient riêng gắn với iframe này
    const client = new SRemoteClient({ target: handle.iframe });

    activeStreams.push({
      id: data.id,
      client: client,
      card: document.getElementById(`card-${data.id}`)
    });

    // Gắn sự kiện click vào nút Solo Audio hoặc click vào cả khung hình
    document.getElementById(`btn-solo-${data.id}`).addEventListener('click', () => {
      setSoloAudio(data.id);
    });
  }

  // Mặc định ban đầu: Chỉ mở tiếng Camera 1, tắt tiếng 3 camera còn lại
  await setSoloAudio('cam-1');
  console.log('✅ Cả 4 camera đã sẵn sàng!');
}
```

---

## Bước 4: Lập Trình Tính Năng Solo Audio (Nghe Độc Quyền)

Khi người dùng kích hoạt Solo Audio cho một Camera (ví dụ `cam-3`):
1. Tìm client của `cam-3` và đặt `setVolume(1)`.
2. Duyệt qua tất cả các client còn lại và đặt `setVolume(0)`.
3. Cập nhật class CSS `.solo-active` để viền của camera đó phát sáng.

```javascript
async function setSoloAudio(targetCamId) {
  console.log(`🎧 Đang kích hoạt Solo Audio cho: ${targetCamId}`);

  // Thực hiện song song để đảm bảo tốc độ phản hồi tức thì
  await Promise.all(activeStreams.map(async (stream) => {
    if (stream.id === targetCamId) {
      // Bật tiếng 100% cho camera được chọn
      await stream.client.setVolume(1);
      stream.card.classList.add('solo-active');
      stream.card.querySelector('.solo-btn').textContent = '🔊 Đang Nghe';
    } else {
      // Tắt tiếng tất cả các camera khác
      await stream.client.setVolume(0);
      stream.card.classList.remove('solo-active');
      stream.card.querySelector('.solo-btn').textContent = '🔇 Solo Audio';
    }
  }));
}
```

---

## Bước 5: Lập Trình Lệnh Tổng Chỉ Huy (Batch Controls)

Thực hiện đồng loạt lệnh lên toàn bộ 4 màn hình bằng `Promise.all`:

```javascript
// 1. Tắt tiếng toàn bộ 4 màn hình
btnMuteAll.addEventListener('click', async () => {
  console.log('🔇 Đang mute toàn bộ các luồng...');
  await Promise.all(activeStreams.map(async (s) => {
    await s.client.setVolume(0);
    s.card.classList.remove('solo-active');
    s.card.querySelector('.solo-btn').textContent = '🔇 Bật Tiếng';
  }));
});

// 2. Play / Pause đồng loạt cả 4 màn hình
let areAllPlaying = true;
btnToggleAll.addEventListener('click', async () => {
  areAllPlaying = !areAllPlaying;
  console.log(`⏯ Đang chuyển trạng thái toàn bộ sang: ${areAllPlaying ? 'Play' : 'Pause'}`);
  
  await Promise.all(activeStreams.map(async (s) => {
    if (areAllPlaying) {
      await s.client.play();
    } else {
      await s.client.pause();
    }
  }));
});

// Khởi chạy hệ thống
initMultiStreams();
```

---

## 💡 Bài Tập Thử Thách Mở Rộng

1. **Phóng to Toàn màn hình (Full Grid / Maximize)**: Thêm nút ⛶ Phóng to ở mỗi camera để mở rộng camera đó chiếm 100% diện tích dashboard, tạm ẩn 3 camera còn lại.
2. **Kéo Thả Đổi Vị Trí (Drag & Drop Cameras)**: Sử dụng HTML5 Drag and Drop API để người xem tự do tráo đổi vị trí của các góc quay theo ý muốn.

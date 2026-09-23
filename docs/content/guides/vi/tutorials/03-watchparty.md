# Tutorial 03: Xây dựng Rạp Chiếu Phim Trực Tuyến Đồng Bộ (WatchParty SyncTheater)

Tính năng **WatchParty (Cùng xem phim từ xa)** là một trong những trải nghiệm thú vị và thách thức nhất trong lập trình web đa phương tiện. Khi một người bấm Tạm dừng để đi vệ sinh hoặc tua lại một cảnh ấn tượng, tất cả người xem trong phòng đều phải đồng bộ theo ngay lập tức.

Trong bài hướng dẫn thực chiến này, chúng ta sẽ tự tay dựng một ứng dụng WatchParty hoàn chỉnh hoạt động theo thời gian thực (Real-time) bằng **SRemote** và **BroadcastChannel API**.

> [!TIP]
> **Trải nghiệm ngay bản demo hoạt động thực tế**: Mở [🚀 Live Demo: 03-watchparty](../../../../demo/apps/03-watchparty/index.html) để tương tác trực tiếp trên trình duyệt.

---

## 🎯 Mục tiêu Bạn Sẽ Đạt Được

Sau bài học này, bạn sẽ nắm vững:
1. Cách thiết lập kênh truyền thông tin đồng bộ thời gian thực giữa các tab hoặc giữa Host và Guest.
2. **Kỹ thuật chống bẫy Vòng Lặp Vô Tận (Ping-Pong Echo Loop)**: Ngăn chặn hiện tượng sự kiện đồng bộ bị dội ngược qua lại giữa các máy.
3. **Cơ chế Bù trừ Độ trễ & Đồng hồ Lệch (Clock Drift & Seek Sync)**: Chỉ can thiệp tua video (`seekTo`) khi độ lệch thời gian thực sự vượt ngưỡng cho phép (Threshold), tránh giật lag khung hình.
4. Quản lý quyền: Host (Chủ phòng điều khiển) và Member (Khách xem đồng bộ).

```mermaid
sequenceDiagram
    autonumber
    participant Host as 👑 Chủ phòng (Host)
    participant Channel as 📡 Kênh BroadcastChannel
    participant Guest as 👥 Người xem (Guest)

    Host->>Host: Bấm Tạm dừng (Pause)
    Host->>Channel: Gửi gói tin: { type: 'PAUSE', time: 45.2 }
    Channel->>Guest: Nhận gói tin { type: 'PAUSE', time: 45.2 }
    Note over Guest: Bật cờ isRemoteAction = true
    Guest->>Guest: SRemote.pause() & tua về 45.2s nếu lệch
    Note over Guest: Tắt cờ isRemoteAction (Không gửi ngược lại)
```

---

## Bước 1: Chuẩn Bị Giao Diện & Bộ Styling (HTML/CSS)

> [!TIP]
> **🚀 Lối Tắt Tiết Kiệm Thời Gian (Khuyên Dùng)**  
> Để kiểm thử đồng bộ 2 màn hình (Host & Guest) và tập trung vào thuật toán gói tin BroadcastChannel với **SRemote SDK**, bạn hãy lấy sẵn các file giao diện Flat 2.0 từ thư mục `demo/apps/03-watchparty`:
> - 📄 **HTML mẫu**: [`index.html`](../../../../demo/apps/03-watchparty/index.html)
> - 🎨 **CSS dùng chung (Design System & Variables)**: [`common.css`](../../../../demo/apps/common.css)
> - 🎨 **CSS riêng của bài (Theater Grid & Packet Logs)**: [`style.css`](../../../../demo/apps/03-watchparty/style.css)
>
> *Cấu trúc thư mục làm việc khuyến nghị:*
> ```text
> my-watchparty/
> ├── common.css     <-- Tải từ demo/apps/common.css
> ├── style.css      <-- Tải từ demo/apps/03-watchparty/style.css
> ├── index.html     <-- Đã link sẵn common.css & style.css
> └── app.js         <-- Nơi bạn sẽ viết toàn bộ code logic trong bài này!
> ```

### 🔑 Các Phần Tử DOM Trọng Tâm Cần Điều Khiển Trong JS
Các `id` quan trọng mà file `app.js` sẽ kết nối và xử lý:

| Phần tử DOM | `id` | Vai trò trong ứng dụng |
| :--- | :--- | :--- |
| `<div>` Màn hình Host | `#host-player` | Vùng mount player của Host (chủ phòng) |
| `<b>` Giờ Host | `#host-time` | Đồng hồ thời gian thực của Host |
| `<span>` Trạng thái Host | `#host-state` | Hiển thị Playing / Paused của Host |
| `<div>` Màn hình Guest | `#guest-player` | Vùng mount player của Guest (người xem theo) |
| `<b>` Giờ Guest | `#guest-time` | Đồng hồ thời gian thực của Guest |
| `<span>` Trạng thái Guest | `#guest-state` | Hiển thị Syncing / Paused / In Sync |
| `<div>` Log List | `#log-list` | Danh sách hiển thị các gói tin BroadcastChannel thời gian thực |

<details>
<summary><b>👀 Nhấn vào đây nếu bạn muốn xem hoặc tự viết toàn bộ mã HTML & CSS</b></summary>

#### Mã nguồn `index.html`:
```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App 03: WatchParty SyncTheater - SRemote Demo</title>
  <!-- 1. CSS Dùng chung: Biến theme, Flat buttons & badges -->
  <link rel="stylesheet" href="common.css">
  <!-- 2. CSS Riêng của bài: Grid chia đôi màn hình & Console Logs -->
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <main class="demo-main-layout">
    <div class="watchparty-container">
      <header class="theater-header">
        <div>
          <h1 class="theater-title">🎬 WatchParty SyncTheater</h1>
          <p class="theater-subtitle">Đồng bộ hai màn hình thời gian thực qua BroadcastChannel</p>
        </div>
        <div class="room-status-badge">
          <span class="status-dot"></span>
          <span>Phòng: #movie-sync</span>
        </div>
      </header>

      <div class="theater-grid">
        <!-- Host Screen -->
        <div class="screen-card">
          <div class="screen-badge host-badge">👑 Chủ Phòng (Host Controller)</div>
          <div id="host-player" class="video-box"></div>
          <div class="screen-footer">
            <span>Thời gian: <b id="host-time" class="time-val">00:00</b></span>
            <span id="host-state" class="state-pill">Paused</span>
          </div>
        </div>

        <!-- Guest Screen -->
        <div class="screen-card">
          <div class="screen-badge guest-badge">👥 Khách Xem (Synced Guest)</div>
          <div id="guest-player" class="video-box"></div>
          <div class="screen-footer">
            <span>Thời gian: <b id="guest-time" class="time-val">00:00</b></span>
            <span id="guest-state" class="state-pill">Syncing</span>
          </div>
        </div>
      </div>

      <!-- Realtime Packet Logs -->
      <div class="logs-card">
        <div class="logs-header">📡 Nhật ký đồng bộ gói tin (Real-time BroadcastChannel Logs):</div>
        <div id="log-list" class="log-list"></div>
      </div>
    </div>
  </main>

  <script type="module" src="app.js"></script>
</body>
</html>
```

#### Mã nguồn `style.css`:
```css
.demo-main-layout {
  flex: 1;
  padding: 24px 20px 40px;
  display: flex;
  justify-content: center;
}

.watchparty-container {
  max-width: 1100px;
  width: 100%;
}

.theater-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.theater-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-main);
}

.theater-subtitle {
  font-size: 13.5px;
  color: var(--text-muted);
  margin-top: 2px;
}

.room-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.status-dot {
  width: 8px;
  height: 8px;
  background-color: var(--color-success);
  border-radius: 50%;
}

.theater-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.screen-card {
  background-color: var(--bg-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
}

.screen-badge {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.host-badge {
  background-color: #8b5cf6;
  color: #ffffff;
}

.guest-badge {
  background-color: var(--color-primary);
  color: #ffffff;
}

.video-box {
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: #000000;
}

.screen-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  font-size: 13px;
  background-color: var(--bg-surface);
  border-top: 1px solid var(--border-color);
  color: var(--text-muted);
}

.time-val {
  color: var(--text-main);
}

.state-pill {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background-color: var(--bg-surface-elevated);
  border: 1px solid var(--border-color);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-main);
}

.logs-card {
  background-color: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.logs-header {
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.log-list {
  max-height: 140px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-item {
  font-size: 12.5px;
  font-family: monospace;
  color: var(--border-focus);
}
```
</details>

---

---

## Bước 2: Thiết Lập Kênh Đồng Bộ Thời Gian Thực Với `BroadcastChannel`

Thay vì phải thiết lập server Node.js và WebSocket phức tạp chỉ để học nguyên lý, trình duyệt hiện đại cung cấp sẵn **`BroadcastChannel API`** cho phép các tab hoặc iframe trên cùng trình duyệt gửi nhận gói tin cho nhau với độ trễ gần như bằng 0 (Zero Latency).

Tạo file `app.js` và khởi tạo kênh:

```javascript
import { SRemoteClient } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

// Tạo kênh đồng bộ chung
const syncChannel = new BroadcastChannel('watchparty_theater_room');

// Hàm ghi log ra giao diện
const logList = document.getElementById('log-list');
function logMessage(text) {
  const div = document.createElement('div');
  div.className = 'log-item';
  div.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  logList.prepend(div);
}
```

---

## Bước 3: Khởi Tạo 2 Client SRemote Độc Lập Cho Host & Guest

Chúng ta khởi tạo 2 instance riêng biệt:
- Client của Host gắn vào `#host-player`.
- Client của Guest gắn vào `#guest-player` (tắt tiếng `mute: 1` để không bị vang âm thanh 2 lần trên cùng 1 máy).

```javascript
let hostClient = null;
let guestClient = null;

async function initTheater() {
  logMessage('⚡ Đang khởi tạo phòng chiếu phim...');

  // 1. Mount Host Player
  const hostHandle = await youtube.mount('#host-player', {
    videoId: 'dQw4w9WgXcQ',
    playerVars: { controls: 1 }
  });
  // Tạo client riêng cho Host
  hostClient = new SRemoteClient({ target: hostHandle.iframe });

  // 2. Mount Guest Player
  const guestHandle = await youtube.mount('#guest-player', {
    videoId: 'dQw4w9WgXcQ',
    playerVars: { controls: 0 } // Guest không cần controls để tránh thao tác nhầm
  });
  // Tạo client riêng cho Guest
  guestClient = new SRemoteClient({ target: guestHandle.iframe });

  // Tắt tiếng Guest để tránh dội âm trên cùng 1 máy
  await guestClient.setVolume(0);

  logMessage('✅ Cả 2 màn hình đã kết nối SRemote thành công!');
  setupSyncLogic();
}
```

---

## Bước 4: Giải Quyết Bẫy Vòng Lặp Vô Tận (Echo Loop) & Bù Lệch Thời Gian

### 1. Bẫy Echo Loop là gì?
Nếu Host Play ➔ gửi gói tin qua Guest ➔ Guest thực hiện Play ➔ Guest lại vô tình phát ra sự kiện `play` và gửi ngược lại Host ➔ Hai bên dội gói tin qua lại vô tận làm đơ trình duyệt!

### 2. Giải pháp: Biến cờ `isRemoteAction`
Khi Guest nhận được lệnh đồng bộ từ mạng và chuẩn bị gọi `guestClient.play()`, ta bật cờ `isRemoteAction = true`. Khi đó, sự kiện `play` nội bộ của Guest sẽ bị bỏ qua và không gửi đi đâu cả.

### 3. Ngưỡng dung sai độ lệch thời gian (Drift Threshold):
Mạng internet luôn có độ trễ 100ms - 300ms. Nếu Host ở giây 10.2s mà Guest ở giây 10.5s thì **không được gọi `seekTo`**, vì gọi tua liên tục sẽ khiến video bị khựng (Buffering). Chỉ khi độ lệch `|hostTime - guestTime| > 1.5s` ta mới thực hiện tua bù!

Thêm hàm `setupSyncLogic()` vào `app.js`:

```javascript
let isRemoteAction = false;

function setupSyncLogic() {
  const hostTimeEl = document.getElementById('host-time');
  const guestTimeEl = document.getElementById('guest-time');
  const hostStateEl = document.getElementById('host-state');
  const guestStateEl = document.getElementById('guest-state');

  // ==========================================
  // PHÍA HOST: Lắng nghe hành động và gửi gói tin
  // ==========================================
  
  hostClient.on('play', async () => {
    hostStateEl.textContent = 'Playing';
    const currentTime = await hostClient.getCurrentTime();
    logMessage(`👑 Host bấm Play tại giây ${currentTime.toFixed(1)} -> Gửi gói tin`);
    
    syncChannel.postMessage({
      action: 'PLAY',
      time: currentTime
    });
  });

  hostClient.on('pause', async () => {
    hostStateEl.textContent = 'Paused';
    const currentTime = await hostClient.getCurrentTime();
    logMessage(`👑 Host bấm Pause tại giây ${currentTime.toFixed(1)} -> Gửi gói tin`);

    syncChannel.postMessage({
      action: 'PAUSE',
      time: currentTime
    });
  });

  hostClient.on('seeked', async ({ currentTime }) => {
    logMessage(`👑 Host tua video tới ${currentTime.toFixed(1)}s -> Gửi gói tin`);
    syncChannel.postMessage({
      action: 'SEEK',
      time: currentTime
    });
  });

  hostClient.on('timeupdate', ({ currentTime }) => {
    hostTimeEl.textContent = `${currentTime.toFixed(1)}s`;
  });

  // ==========================================
  // PHÍA GUEST: Nhận gói tin và đồng bộ video
  // ==========================================

  guestClient.on('timeupdate', ({ currentTime }) => {
    guestTimeEl.textContent = `${currentTime.toFixed(1)}s`;
  });

  syncChannel.onmessage = async (event) => {
    const { action, time } = event.data;
    const currentGuestTime = await guestClient.getCurrentTime();
    const timeDelta = Math.abs(currentGuestTime - time);

    logMessage(`👥 Guest nhận lệnh: [${action}] mốc ${time.toFixed(1)}s (Lệch: ${timeDelta.toFixed(2)}s)`);

    // Bật cờ chặn Echo Loop
    isRemoteAction = true;

    if (action === 'PLAY') {
      guestStateEl.textContent = 'Playing';
      // Nếu lệch quá 1.5 giây thì mới tua lại cho khớp
      if (timeDelta > 1.5) {
        await guestClient.seekTo(time);
      }
      await guestClient.play();
    } 
    else if (action === 'PAUSE') {
      guestStateEl.textContent = 'Paused';
      await guestClient.pause();
      if (timeDelta > 0.5) {
        await guestClient.seekTo(time);
      }
    } 
    else if (action === 'SEEK') {
      await guestClient.seekTo(time);
    }

    // Tắt cờ sau khi lệnh thực thi xong
    setTimeout(() => {
      isRemoteAction = false;
    }, 200);
  };
}
```

---

## Bước 5: Kiểm Thử Thực Tế

Khởi chạy bằng cách gọi `initTheater()` ở cuối file `app.js`:

```javascript
initTheater();
```

Bây giờ bạn mở trang trên trình duyệt:
1. Bấm nút **Play** trên khung hình của Host: Màn hình của Guest sẽ lập tức chạy theo.
2. Bấm nút **Pause** hoặc **Tua đến phút 01:30** trên Host: Màn hình Guest sẽ tự động nhảy đến đúng mốc 01:30 mà không có bất kỳ hiện tượng giật vòng lặp nào!

---

## 💡 Bài Tập Thử Thách Mở Rộng

1. **Thay thế bằng Socket.io / WebRTC DataChannel**: Thay vì `BroadcastChannel` (chỉ chạy trên cùng trình duyệt), hãy tích hợp thêm một máy chủ WebSocket để bạn bè ở hai đầu đất nước có thể xem phim cùng nhau.
2. **Nút "Đồng bộ lại" (Resync Button)**: Tạo một nút bấm bên phía Guest để nếu Guest bị rớt mạng lag, bấm nút sẽ đọc thời gian của Host và tua thẳng tới mốc hiện tại.

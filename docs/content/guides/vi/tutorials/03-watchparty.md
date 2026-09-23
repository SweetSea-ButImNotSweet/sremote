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
> **📥 Tải Nhanh Bộ Giao Diện Mẫu (Starter Kit)**  
> Để bắt đầu ngay mà không cần mất thời gian gõ HTML & CSS, bạn hãy nhấp vào nút **`📥 Tải Starter Files`** ở thanh công cụ phía trên đầu trang tài liệu để tải về máy:
> - `index.html`: Khung sườn chia đôi 2 màn hình (Host & Guest) Flat 2.0.
> - `style.css`: File định dạng layout cho Theater Grid & Packet Logs.
> - `common.css`: Hệ thống biến màu sắc và theme chung.
>
> Đặt các file trên vào cùng thư mục làm việc với file `app.js` của bạn.

### 🔑 Các Phần Tử DOM Trọng Tâm Cần Điều Khiển Trong JS
Trong suốt bài hướng dẫn này, file `app.js` sẽ kết nối và điều khiển trực tiếp các phần tử có `id` sau:

| Phần tử DOM | `id` | Vai trò trong ứng dụng |
| :--- | :--- | :--- |
| `<div>` Màn hình Host | `#host-player` | Vùng mount player của Host (chủ phòng) |
| `<b>` Giờ Host | `#host-time` | Đồng hồ thời gian thực của Host |
| `<span>` Trạng thái Host | `#host-state` | Hiển thị Playing / Paused của Host |
| `<div>` Màn hình Guest | `#guest-player` | Vùng mount player của Guest (người xem theo) |
| `<b>` Giờ Guest | `#guest-time` | Đồng hồ thời gian thực của Guest |
| `<span>` Trạng thái Guest | `#guest-state` | Hiển thị Syncing / Paused / In Sync |
| `<div>` Log List | `#log-list` | Danh sách hiển thị các gói tin BroadcastChannel thời gian thực |

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

# Tutorial 01: Tự tay Chế tạo Custom Video/Audio Player từ Số 0

Chào mừng bạn đến với bài hướng dẫn thực hành đầu tiên! Trong bài học này, chúng ta sẽ không dùng bộ điều khiển mặc định của YouTube hay trình duyệt, mà sẽ **tự tay xây dựng một giao diện Custom Media Player hoàn chỉnh** bằng HTML/CSS và JavaScript thuần, kết nối và điều khiển mượt mà thông qua **SRemote**.

> [!TIP]
> **Trải nghiệm ngay bản demo hoạt động thực tế**: Mở [🚀 Live Demo: 01-simple-player](../../../../demo/apps/01-simple-player/index.html) để tương tác trực tiếp trên trình duyệt.

---

## 🎯 Mục tiêu Bạn Sẽ Đạt Được

Sau khi hoàn thành bài tutorial này, bạn sẽ nắm vững:
1. Cách ẩn hoặc tùy biến giao diện nhúng của bên thứ 3 và thay thế bằng nút bấm của riêng mình.
2. Cơ chế đồng bộ trạng thái 2 chiều (Bi-directional State Sync) giữa Player và UI.
3. **Kỹ thuật Scrubber Tua Mượt (Smooth Scrubbing)**: Giải quyết dứt điểm lỗi kinh điển "giằng co con trỏ" (Scrubber Fighting) khi người dùng đang kéo thanh tua.
4. Điều khiển âm lượng và tính năng ghi nhớ mức âm lượng khi Mute/Unmute.

```mermaid
flowchart LR
    A["Giao diện Tự chế (Custom UI)"] <-->|"SRemote SDK (Bi-directional)"| B["YouTube / Video Frame"]
    subgraph UI_Components ["Thành phần UI Bạn Sẽ Dựng"]
        C["Nút Play / Pause"]
        D["Thanh Scrubber (Tua mịn)"]
        E["Đồng hồ Thời gian 00:00"]
        F["Thanh Âm lượng / Mute"]
    end
    UI_Components --> A
```

---

## Bước 1: Chuẩn Bị Giao Diện & Bộ Styling (HTML/CSS)

> [!TIP]
> **📥 Tải Nhanh Bộ Giao Diện Mẫu (Starter Kit)**  
> Để bắt đầu ngay mà không cần mất thời gian gõ HTML & CSS, bạn hãy nhấp vào nút **`📥 Tải Starter Files`** ở thanh công cụ phía trên đầu trang tài liệu để tải về máy:
> - `index.html`: Khung sườn giao diện chuẩn Flat 2.0.
> - `style.css`: File định dạng layout cho Player.
> - `common.css`: Hệ thống biến màu sắc và theme chung.
>
> Đặt các file trên vào cùng thư mục làm việc với file `app.js` của bạn.

### 🔑 Các Phần Tử DOM Trọng Tâm Cần Điều Khiển Trong JS
Trong suốt bài hướng dẫn này, file `app.js` sẽ kết nối và điều khiển trực tiếp các phần tử có `id` sau:

| Phần tử DOM | `id` | Vai trò trong ứng dụng |
| :--- | :--- | :--- |
| `<div>` Slot Video | `#video-container` | Khung hiển thị rỗng để SRemote gắn (mount) video iframe |
| `<button>` Play | `#btn-play` | Nút chuyển đổi trạng thái Play / Pause |
| `<span>` Đồng hồ | `#time-display` | Nhãn hiển thị thời gian phát (`00:00 / 00:00`) |
| `<input type="range">` | `#seek-bar` | Thanh kéo tua video (Scrubber) mượt mà |
| `<button>` Mute | `#btn-mute` | Nút bật / tắt tiếng |
| `<input type="range">` | `#volume-bar` | Thanh trượt tăng giảm âm lượng (0 - 1) |

---

## Bước 2: Nạp Video và Kết Nối SRemote

Hãy tạo file `app.js`. Ở bước này, chúng ta nhập SDK và adapter `youtube` từ CDN, sau đó gắn video YouTube vào `#video-container`.

> [!TIP]
> Chúng ta truyền `controls: 0` vào `playerVars` để ẩn bộ điều khiển mặc định của YouTube, chỉ giữ lại khung hình hiển thị.

```javascript
import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

// Lấy các phần tử DOM cần thiết
const videoContainer = document.getElementById('video-container');
const btnPlay = document.getElementById('btn-play');
const timeDisplay = document.getElementById('time-display');
const seekBar = document.getElementById('seek-bar');
const btnMute = document.getElementById('btn-mute');
const volumeBar = document.getElementById('volume-bar');

// Hàm format giây thành chuỗi mm:ss
function formatTime(seconds) {
  if (isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Khởi tạo Player
async function initPlayer() {
  console.log('⚡ Đang khởi tạo YouTube Player qua SRemote...');
  
  await youtube.mount('#video-container', {
    videoId: 'M7lc1UVf-VE', // Video mẫu YouTube Developers
    playerVars: {
      controls: 0, // Ẩn điều khiển gốc của YouTube
      autoplay: 0,
      rel: 0
    }
  });

  console.log('✅ Player đã sẵn sàng kết nối!');
}

initPlayer();
```

---

## Bước 3: Lập Trình Nút Play/Pause & Đồng Bộ Trạng Thái 2 Chiều

Nếu chỉ viết sự kiện click để đổi icon nút:
```javascript
// ❌ CÁCH LÀM SAI / NGÂY THƠ:
btnPlay.addEventListener('click', () => {
  btnPlay.textContent = '⏸'; // Tự đổi icon trước khi video thực sự phát
  sremote.play();
});
```
Nếu video bị lag mạng, buffering hoặc người dùng click trực tiếp vào video, UI sẽ bị lệch trạng thái (Out of sync).

**Cách làm chuẩn với SRemote**:
1. Nút bấm chỉ gửi tín hiệu yêu cầu: `await sremote.toggle()`.
2. UI chỉ đổi trạng thái khi SRemote phát sự kiện xác nhận `play` hoặc `pause`.

Thêm đoạn mã sau vào `app.js`:

```javascript
// Click nút -> Yêu cầu toggle
btnPlay.addEventListener('click', async () => {
  await sremote.toggle();
});

// Lắng nghe phản hồi từ Player để cập nhật UI
sremote.on('play', () => {
  btnPlay.textContent = '⏸';
  btnPlay.setAttribute('aria-label', 'Pause');
});

sremote.on('pause', () => {
  btnPlay.textContent = '▶';
  btnPlay.setAttribute('aria-label', 'Play');
});

sremote.on('ended', () => {
  btnPlay.textContent = '🔄';
  seekBar.value = 100;
});
```

---

## Bước 4: Xây Dựng Thanh Scrubber Tua Mượt (Smooth Scrubbing)

Đây là phần quan trọng nhất trong việc lập trình Custom Player:
- Player liên tục phát ra sự kiện `timeupdate` (khoảng 4 lần/giây) thông báo vị trí hiện tại.
- Nếu bạn cứ cập nhật `seekBar.value = currentTime` liên tục, khi người dùng **đang giữ chuột để kéo thanh trượt**, con trỏ sẽ bị sự kiện `timeupdate` kéo giật ngược về vị trí cũ! Hiện tượng này gọi là **Scrubber Fighting**.

### Giải Pháp: Sử Dụng Cờ `isScrubbing`

Chúng ta đặt một biến cờ `isScrubbing = false`:
1. Khi người dùng bấm chuột vào thanh trượt (`mousedown` / `touchstart`), đặt `isScrubbing = true`.
2. Khi `isScrubbing === true`, bỏ qua việc cập nhật `seekBar.value` từ `timeupdate`.
3. Khi người dùng thả chuột (`change` hoặc `mouseup`), lấy giá trị mới gọi `sremote.seekTo(newTime)` rồi mới trả cờ về `false`.

Hãy bổ sung logic này vào `app.js`:

```javascript
let isScrubbing = false;
let videoDuration = 0;

// Cập nhật thời lượng tổng khi video sẵn sàng
sremote.on('durationchange', ({ duration }) => {
  videoDuration = duration;
  seekBar.max = duration;
});

// Lắng nghe tiến trình phát
sremote.on('timeupdate', ({ currentTime }) => {
  // Chỉ cập nhật slider nếu người dùng KHÔNG đang kéo chuột
  if (!isScrubbing && videoDuration > 0) {
    seekBar.value = currentTime;
    timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(videoDuration)}`;
  }
});

// 1. Khi người dùng bắt đầu chạm/kéo slider
seekBar.addEventListener('input', () => {
  isScrubbing = true;
  // Cập nhật tạm thời đồng hồ hiển thị theo vị trí ngón tay/chuột
  timeDisplay.textContent = `${formatTime(seekBar.value)} / ${formatTime(videoDuration)}`;
});

// 2. Khi người dùng thả tay ra -> Thực hiện lệnh Seek thực sự
seekBar.addEventListener('change', async () => {
  const targetSeconds = parseFloat(seekBar.value);
  await sremote.seekTo(targetSeconds);
  isScrubbing = false;
});
```

---

## Bước 5: Lập Trình Âm Lượng & Phím Tắt Mute

Để có trải nghiệm người dùng cao cấp:
- Khi người dùng bấm Mute, ta lưu lại mức âm lượng hiện tại (`lastVolume`).
- Khi bấm Unmute, ta khôi phục lại đúng mức âm lượng trước đó thay vì đặt bừa về 100%.

Thêm code sau vào `app.js`:

```javascript
let lastVolume = 1;

// Thay đổi âm lượng qua thanh slider
volumeBar.addEventListener('input', async () => {
  const vol = parseFloat(volumeBar.value);
  await sremote.setVolume(vol);
  
  if (vol === 0) {
    btnMute.textContent = '🔇';
  } else {
    btnMute.textContent = '🔊';
    lastVolume = vol;
  }
});

// Bật / Tắt tiếng (Mute toggle)
btnMute.addEventListener('click', async () => {
  const currentVol = parseFloat(volumeBar.value);
  
  if (currentVol > 0) {
    // Đang có tiếng -> Tắt tiếng
    lastVolume = currentVol;
    volumeBar.value = 0;
    await sremote.setVolume(0);
    btnMute.textContent = '🔇';
  } else {
    // Đang tắt tiếng -> Khôi phục mức âm lượng trước đó
    const restoreVol = lastVolume > 0 ? lastVolume : 0.5;
    volumeBar.value = restoreVol;
    await sremote.setVolume(restoreVol);
    btnMute.textContent = '🔊';
  }
});
```

---

## Bước 6: Toàn Bộ Mã Nguồn Hoàn Chỉnh (Checkpoint)

Dưới đây là toàn bộ file `app.js` hoàn chỉnh sau khi ghép tất cả các bước lại với nhau:

```javascript
import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

const btnPlay = document.getElementById('btn-play');
const timeDisplay = document.getElementById('time-display');
const seekBar = document.getElementById('seek-bar');
const btnMute = document.getElementById('btn-mute');
const volumeBar = document.getElementById('volume-bar');

let isScrubbing = false;
let videoDuration = 0;
let lastVolume = 1;

function formatTime(seconds) {
  if (isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function init() {
  await youtube.mount('#video-container', {
    videoId: 'M7lc1UVf-VE',
    playerVars: { controls: 0, autoplay: 0 }
  });

  // State Sync
  sremote.on('play', () => { btnPlay.textContent = '⏸'; });
  sremote.on('pause', () => { btnPlay.textContent = '▶'; });
  sremote.on('ended', () => { btnPlay.textContent = '🔄'; });

  sremote.on('durationchange', ({ duration }) => {
    videoDuration = duration;
    seekBar.max = duration;
  });

  sremote.on('timeupdate', ({ currentTime }) => {
    if (!isScrubbing && videoDuration > 0) {
      seekBar.value = currentTime;
      timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(videoDuration)}`;
    }
  });

  // Controls Event Listeners
  btnPlay.addEventListener('click', () => sremote.toggle());

  seekBar.addEventListener('input', () => {
    isScrubbing = true;
    timeDisplay.textContent = `${formatTime(seekBar.value)} / ${formatTime(videoDuration)}`;
  });

  seekBar.addEventListener('change', async () => {
    await sremote.seekTo(parseFloat(seekBar.value));
    isScrubbing = false;
  });

  volumeBar.addEventListener('input', async () => {
    const val = parseFloat(volumeBar.value);
    await sremote.setVolume(val);
    btnMute.textContent = val === 0 ? '🔇' : '🔊';
    if (val > 0) lastVolume = val;
  });

  btnMute.addEventListener('click', async () => {
    const cur = parseFloat(volumeBar.value);
    if (cur > 0) {
      lastVolume = cur;
      volumeBar.value = 0;
      await sremote.setVolume(0);
      btnMute.textContent = '🔇';
    } else {
      const res = lastVolume || 0.5;
      volumeBar.value = res;
      await sremote.setVolume(res);
      btnMute.textContent = '🔊';
    }
  });
}

init();
```

---

## 💡 Bài Tập Thử Thách Mở Rộng (Challenge)

Để rèn luyện sâu hơn, bạn hãy thử tự làm thêm:
1. **Phím tắt Spacebar**: Bắt sự kiện phím Space trên cửa sổ trình duyệt để Play/Pause mà không cần rê chuột click. *(Gợi ý: Xem bài Tutorial 07)*.
2. **Buffer Bar (Thanh đệm mạng)**: Lắng nghe sự kiện `progress` của SRemote để vẽ một dải màu xám nhạt thể hiện phần trăm video đã tải về máy.

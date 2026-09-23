# Tutorial 11: Đồng Hồ Tập Luyện Smart Gym HIIT / TABATA với Kỹ Thuật Audio Ducking

Trong các ứng dụng phòng tập thể hình thông minh (Smart Gym App) hay ứng dụng đếm giờ HIIT/TABATA (như Nike Training Club hay Freeletics), một trải nghiệm âm thanh cực kỳ chuyên nghiệp là **Audio Ducking (Nén âm lượng nhạc nền)**:
- Người tập đang nghe một bản nhạc Remix / EDM sôi động từ YouTube hoặc Spotify với âm lượng 100%.
- Khi hiệp tập sắp kết thúc (3 giây đếm ngược cuối cùng: 3... 2... 1... BEEP!), hệ thống **tự động hạ nhỏ âm lượng nhạc nền xuống 20% (Ducking)** để người tập nghe rõ mồn một tiếng còi hiệu lệnh của huấn luyện viên.
- Ngay khi tiếng còi kết thúc và bước vào hiệp nghỉ ngơi (hoặc hiệp tập mới), âm lượng nhạc nền sẽ **tự động bùng nổ trở lại 100%**!

Trong tutorial này, chúng ta sẽ xây dựng ứng dụng đếm giờ HIIT chuyên nghiệp này bằng **Web Audio API** và **SRemote**.

> [!TIP]
> **Trải nghiệm ngay bản demo hoạt động thực tế**: Mở [🚀 Live Demo: 11-gym-ducking](../../../../demo/apps/11-gym-ducking/index.html) để tương tác trực tiếp trên trình duyệt.

---

## 🎯 Mục tiêu Bạn Sẽ Đạt Được

Sau bài học này, bạn sẽ nắm vững:
1. Cách xây dựng máy trạng thái hữu hạn (FSM) cho bộ đếm HIIT: `WORK (Tập 20s)` ➔ `REST (Nghỉ 10s)` ➔ `Lặp lại số hiệp (Rounds)`.
2. Tạo âm thanh tiếng còi Beep chuẩn xác bằng **Web Audio API** (`OscillatorNode`) mà không cần nạp file mp3 ngoài.
3. **Kỹ thuật Audio Ducking Thời Gian Thực**: Tự động hạ âm lượng nhạc nền qua `sremote.setVolume(0.2)` khi phát hiệu lệnh và hồi phục `1.0` khi dứt còi.
4. Cơ chế giữ màn hình điện thoại không bị tắt (**Screen WakeLock API**).

```mermaid
flowchart TD
    A["Hiệp Tập Luyện (WORK 20s) - Nhạc EDM 100%"] --> B{"Đếm ngược đến giây thứ 3?"}
    B -- "Chưa" --> A
    B -- "Còn 3 giây" --> C["Kích hoạt Audio Ducking:<br>SRemote.setVolume(0.2)"]
    C --> D["Phát 3 tiếng còi: Beep... Beep... BEEEEEP!"]
    D --> E["Hết hiệp tập -> Chuyển sang NGHỈ (REST 10s)"]
    E --> F["Khôi phục nhạc nền: SRemote.setVolume(1.0)"]
```

---

## Bước 1: Chuẩn Bị Giao Diện & Bộ Styling (HTML/CSS)

> [!TIP]
> **📥 Tải Nhanh Bộ Giao Diện Mẫu (Starter Kit)**  
> Để bắt đầu ngay mà không cần mất thời gian gõ HTML & CSS, bạn hãy nhấp vào nút **`📥 Tải Starter Files`** ở thanh công cụ phía trên đầu trang tài liệu để tải về máy:
> - `index.html`: Khung sườn bộ đếm hiệp tập HIIT Gym và ô phát nhạc Workout EDM Flat 2.0.
> - `style.css`: File định dạng layout cho Phase Card, Countdown Timer & trạng thái màu sắc hiệp tập.
> - `common.css`: Hệ thống biến màu sắc và theme chung.
>
> Đặt các file trên vào cùng thư mục làm việc với file `app.js` của bạn.

### 🔑 Các Phần Tử DOM Trọng Tâm Cần Điều Khiển Trong JS
Trong suốt bài hướng dẫn này, file `app.js` sẽ kết nối và điều khiển trực tiếp các phần tử có `id` sau:

| Phần tử DOM | `id` | Vai trò trong ứng dụng |
| :--- | :--- | :--- |
| `<div>` Thẻ hiệp tập | `#phase-card` | Thẻ đổi màu nền theo giai đoạn: Chuẩn bị, Tập luyện (Sprint đỏ), Nghỉ ngơi (Xanh) |
| `<div>` Chỉ số hiệp | `#round-indicator` | Hiển thị hiệp hiện tại (`HIỆP 1 / 8`) |
| `<div>` Tên giai đoạn | `#phase-name` | Tên trạng thái tập luyện (`CHUẨN BỊ`, `NƯỚC RÚT`, `NGHỈ`) |
| `<div>` Đồng hồ đếm ngược | `#timer-countdown` | Bộ số đếm ngược thời gian của từng hiệp |
| `<button>` Bắt đầu tập | `#btn-start-workout` | Nút kích hoạt bài tập HIIT và phát nhạc nền Gym |
| `<button>` Tạm dừng | `#btn-pause-workout` | Nút tạm dừng bộ đếm thời gian bài tập |
| `<span>` Huy hiệu Ducking | `#ducking-status` | Trạng thái hiển thị khi nhạc nền bị giảm âm lượng để nhường tiếng còi beep |
| `<div>` Slot Video Nhạc | `#workout-music-slot` | Vùng mount player YouTube phát nhạc nền sôi động |

---

## Bước 2: Tạo Tiếng Còi Beep Bằng Web Audio API (Không Cần File MP3)

Mở file `app.js`. Trình duyệt tích hợp sẵn bộ tổng hợp âm thanh `AudioContext`. Chúng ta viết hàm phát tiếng còi Beep ngắn:

```javascript
import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

// Bộ phát âm thanh Web Audio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeepSound(frequency = 880, duration = 0.2) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.value = frequency; // 880Hz = Nốt La cao

  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}
```

---

## Bước 3: Nạp Nhạc Nền Gym & Cấu Hình Các Hiệp HIIT

```javascript
// Cấu hình bài tập HIIT
const WORK_SECONDS = 20; // 20 giây tập hết sức
const REST_SECONDS = 10; // 10 giây nghỉ
const TOTAL_ROUNDS = 8;  // 8 hiệp Tabata

let currentRound = 1;
let currentPhase = 'PREPARE'; // 'PREPARE' | 'WORK' | 'REST'
let secondsLeft = 5;
let timerId = null;
let isWorkingOut = false;

const phaseCard = document.getElementById('phase-card');
const phaseNameEl = document.getElementById('phase-name');
const timerCountdownEl = document.getElementById('timer-countdown');
const roundIndicatorEl = document.getElementById('round-indicator');
const duckingStatusEl = document.getElementById('ducking-status');
const btnStartWorkout = document.getElementById('btn-start-workout');
const btnPauseWorkout = document.getElementById('btn-pause-workout');

async function initGymApp() {
  await youtube.mount('#workout-music-slot', {
    videoId: '4xDzrJKXOOY', // Workout EDM Livestream
    playerVars: { controls: 1, autoplay: 0 }
  });
  await sremote.setVolume(1);
  console.log('✅ Hệ thống phòng Gym thông minh đã sẵn sàng!');
}
```

---

## Bước 4: Lập Trình Kỹ Thuật Audio Ducking (Hạ Nhạc Nền 20%)

Đây là điểm then chốt:
1. Khi `secondsLeft === 3`: Hạ nhạc nền xuống 20% bằng `await sremote.setVolume(0.2)` và phát tiếng còi Beep 1.
2. Khi `secondsLeft === 2`: Tiếp tục phát Beep 2.
3. Khi `secondsLeft === 1`: Tiếp tục phát Beep 3.
4. Khi chuyển sang hiệp mới (`secondsLeft === 0`): Phát còi dài tần số cao và **khôi phục âm lượng 100%** bằng `await sremote.setVolume(1.0)`!

```javascript
function startWorkout() {
  if (isWorkingOut) return;
  isWorkingOut = true;
  sremote.play(); // Bật nhạc nền

  timerId = setInterval(async () => {
    secondsLeft--;
    timerCountdownEl.textContent = String(secondsLeft).padStart(2, '0');

    // 1. KÍCH HOẠT AUDIO DUCKING TẠI 3 GIÂY CUỐI
    if (secondsLeft === 3) {
      console.log('🔉 Bắt đầu Audio Ducking: Giảm nhạc nền xuống 20%');
      await sremote.setVolume(0.2);
      duckingStatusEl.textContent = 'Ducking (20%)';
      duckingStatusEl.classList.add('active');
      playBeepSound(660, 0.2); // Beep thấp
    } 
    else if (secondsLeft === 2 || secondsLeft === 1) {
      playBeepSound(660, 0.2); // Beep thấp
    }

    // 2. KHI HẾT THỜI GIAN HIỆP
    if (secondsLeft <= 0) {
      playBeepSound(1320, 0.6); // Tiếng còi dài kết thúc hiệp!
      switchPhase();
    }
  }, 1000);
}

async function switchPhase() {
  // Khôi phục lại âm lượng nhạc nền 100%
  await sremote.setVolume(1);
  duckingStatusEl.textContent = 'Bình thường (100%)';
  duckingStatusEl.classList.remove('active');

  if (currentPhase === 'PREPARE' || currentPhase === 'REST') {
    // Chuyển sang hiệp WORK
    currentPhase = 'WORK';
    secondsLeft = WORK_SECONDS;
    phaseNameEl.textContent = '🔥 TẬP HẾT SỨC!';
    phaseCard.className = 'phase-card work-phase';
  } else if (currentPhase === 'WORK') {
    // Chuyển sang hiệp REST hoặc kết thúc bài tập
    if (currentRound >= TOTAL_ROUNDS) {
      clearInterval(timerId);
      isWorkingOut = false;
      phaseNameEl.textContent = '🎉 HOÀN THÀNH!';
      timerCountdownEl.textContent = '00';
      alert('Chúc mừng bạn đã hoàn thành trọn vẹn 8 hiệp TABATA!');
      return;
    }
    currentRound++;
    currentPhase = 'REST';
    secondsLeft = REST_SECONDS;
    phaseNameEl.textContent = '☕ NGHỈ NGƠI';
    phaseCard.className = 'phase-card rest-phase';
    roundIndicatorEl.textContent = `HIỆP ${currentRound} / ${TOTAL_ROUNDS}`;
  }

  timerCountdownEl.textContent = String(secondsLeft).padStart(2, '0');
}

btnStartWorkout.addEventListener('click', startWorkout);
btnPauseWorkout.addEventListener('click', () => {
  isWorkingOut = false;
  clearInterval(timerId);
  sremote.pause();
});

// Khởi chạy
initGymApp();
```

---

## 💡 Bài Tập Thử Thách Mở Rộng

1. **Giữ sáng màn hình (Screen WakeLock)**: Sử dụng `navigator.wakeLock.request('screen')` để màn hình điện thoại người tập không bị khóa tự động trong suốt buổi tập.
2. **Tùy biến thời gian (Custom Intervals)**: Thêm các ô input cho phép người tập tự điều chỉnh số giây Work (ví dụ 45s) và Rest (ví dụ 15s) theo thể lực cá nhân.

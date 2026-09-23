# Tutorial 04: Nền Tảng Học Trực Tuyến EdTech Tự Động Khóa Video Bắt Làm Bài Tập

Trong các nền tảng học trực tuyến (E-Learning / LMS như Coursera, Udemy hay EdX), một kỹ thuật giữ chân và kiểm tra mức độ hiểu bài của học viên là **Interactive Video Checkpoints**:
- Khi video bài giảng phát tới một mốc thời gian định trước (ví dụ phút thứ 00:30), hệ thống **tự động tạm dừng video và khóa màn hình**.
- Một hộp thoại câu hỏi trắc nghiệm (Quiz Modal) hiện ra đè lên video.
- Học viên **bắt buộc phải trả lời chính xác** mới được mở khóa để xem tiếp nội dung bài giảng.
- Học viên **không thể tua lách qua điểm kiểm tra (Anti-cheat Seek Guard)**.

Trong bài hướng dẫn này, chúng ta sẽ tự tay lập trình tính năng này từng bước bằng **SRemote**.

> [!TIP]
> **Trải nghiệm ngay bản demo hoạt động thực tế**: Mở [🚀 Live Demo: 04-edtech-quiz](../../../../demo/apps/04-edtech-quiz/index.html) để tương tác trực tiếp trên trình duyệt.

---

## 🎯 Mục tiêu Bạn Sẽ Đạt Được

Sau bài học này, bạn sẽ nắm vững:
1. Cách định nghĩa cấu trúc mảng điểm kiểm tra bài học (**Checkpoints Metadata**).
2. Lắng nghe dòng thời gian qua sự kiện `timeupdate` và kích hoạt ngắt tự động (Trigger Interruption).
3. **Kỹ thuật Chống Gian Lận (Anti-cheat Seek Guard)**: Ngăn học viên kéo thanh tua nhảy cóc qua câu hỏi nếu chưa hoàn thành.
4. Cơ chế mở khóa và hoàn nguyên trạng thái phát sau khi nộp bài thành công.

```mermaid
flowchart TD
    A["Video đang phát..."] --> B{"Chạm mốc Checkpoint (30s)?"}
    B -- "Chưa" --> A
    B -- "Đúng mốc" --> C["SRemote: Tự động pause() & Khóa Player"]
    C --> D["Hiển thị Modal Trắc Nghiệm"]
    D --> E{"Học viên trả lời đúng?"}
    E -- "Sai" --> F["Thông báo chọn lại"]
    F --> D
    E -- "Chính xác" --> G["Mở khóa Checkpoint & SRemote.play()"]
    G --> A
```

---

## Bước 1: Chuẩn Bị Giao Diện & Bộ Styling (HTML/CSS)

> [!TIP]
> **🚀 Lối Tắt Tiết Kiệm Thời Gian (Khuyên Dùng)**  
> Để tập trung vào cơ chế ngắt video tự động (Time-gate checkpoint) và điều khiển **SRemote SDK**, bạn hãy tải hoặc sao chép sẵn các file giao diện Flat 2.0 từ thư mục `demo/apps/04-edtech-quiz`:
> - 📄 **HTML mẫu**: [`index.html`](../../../../demo/apps/04-edtech-quiz/index.html)
> - 🎨 **CSS dùng chung (Design System & Variables)**: [`common.css`](../../../../demo/apps/common.css)
> - 🎨 **CSS riêng của bài (Course Player & Quiz Overlay)**: [`style.css`](../../../../demo/apps/04-edtech-quiz/style.css)
>
> *Cấu trúc thư mục làm việc khuyến nghị:*
> ```text
> my-edtech-quiz/
> ├── common.css     <-- Tải từ demo/apps/common.css
> ├── style.css      <-- Tải từ demo/apps/04-edtech-quiz/style.css
> ├── index.html     <-- Đã link sẵn common.css & style.css
> └── app.js         <-- Nơi bạn sẽ viết toàn bộ code logic trong bài này!
> ```

### 🔑 Các Phần Tử DOM Trọng Tâm Cần Điều Khiển Trong JS
Các `id` quan trọng mà file `app.js` sẽ kết nối và xử lý:

| Phần tử DOM | `id` | Vai trò trong ứng dụng |
| :--- | :--- | :--- |
| `<div>` Slot Video | `#video-slot` | Vùng mount player bài giảng video |
| `<div>` Modal Quiz | `#quiz-overlay` | Lớp phủ làm mờ và khóa tương tác khi dừng kiểm tra |
| `<h3>` Câu hỏi | `#quiz-question` | Thẻ hiển thị nội dung câu hỏi trắc nghiệm |
| `<div>` Danh sách đáp án | `#quiz-options` | Vùng render các nút bấm chọn đáp án A, B, C, D |
| `<div>` Thông báo | `#quiz-feedback` | Hiển thị thông báo khi trả lời đúng / sai |
| `<b>` Trạng thái học | `#learning-status` | Hiển thị trạng thái học tập (Đang học / Bị khóa) |
| `<span>` Đồng hồ giây | `#video-time` | Bộ đếm giây bài giảng hiện tại |

<details>
<summary><b>👀 Nhấn vào đây nếu bạn muốn xem hoặc tự viết toàn bộ mã HTML & CSS</b></summary>

#### Mã nguồn `index.html`:
```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>App 04: EdTech Interactive Quiz - SRemote Demo</title>
  <!-- 1. CSS Dùng chung: Biến theme, Badges, Typography -->
  <link rel="stylesheet" href="common.css">
  <!-- 2. CSS Riêng của bài: Khung video & Lớp phủ Quiz Overlay -->
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <main class="demo-main-layout">
    <div class="course-container">
      <header class="course-header">
        <span class="badge-tag">Khóa học JavaScript Thực Chiến</span>
        <h2>Bài 04: Biến, Kiểu dữ liệu và Vòng lặp</h2>
        <p class="instructor">Giảng viên: SRemote Academy • Tự động dừng tại mốc 15s & 45s</p>
      </header>

      <!-- Khung video bài giảng -->
      <div class="video-wrapper">
        <div id="video-slot" class="video-slot"></div>

        <!-- Modal Trắc nghiệm Flat 2.0 (Mặc định ẩn) -->
        <div id="quiz-overlay" class="quiz-overlay hidden">
          <div class="quiz-card">
            <div class="quiz-badge">⚡ Điểm Dừng Kiểm Tra Kiến Thức</div>
            <h3 id="quiz-question" class="quiz-title">Đang nạp câu hỏi...</h3>
            <div id="quiz-options" class="quiz-options"></div>
            <div id="quiz-feedback" class="quiz-feedback"></div>
          </div>
        </div>
      </div>

      <!-- Thanh tiến độ học tập -->
      <div class="progress-footer">
        <span>Trạng thái: <b id="learning-status">Đang theo dõi bài giảng</b></span>
        <span id="video-time" class="time-counter">0s</span>
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
  padding: 30px 16px;
  display: flex;
  justify-content: center;
}

.course-container {
  width: 100%;
  max-width: 820px;
}

.course-header {
  margin-bottom: 16px;
}

.badge-tag {
  display: inline-block;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.course-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 4px;
}

.instructor {
  font-size: 13.5px;
  color: var(--text-muted);
}

.video-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background-color: #000000;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
}

.video-slot {
  width: 100%;
  height: 100%;
}

/* Modal lớp phủ trắc nghiệm Flat 2.0 */
.quiz-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 50;
  transition: opacity 0.25s ease;
}

.quiz-overlay.hidden {
  display: none;
}

.quiz-card {
  background-color: var(--bg-surface);
  border: 1px solid var(--border-color);
  padding: 24px;
  border-radius: var(--radius-md);
  max-width: 520px;
  width: 100%;
  box-shadow: var(--shadow-lg);
}

.quiz-badge {
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.quiz-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 16px;
  color: var(--text-main);
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.option-btn {
  background-color: var(--bg-surface-elevated);
  border: 1px solid var(--border-color);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  color: var(--text-main);
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.18s ease;
}

.option-btn:hover {
  background-color: var(--color-primary-light);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.quiz-feedback {
  min-height: 20px;
  font-size: 13px;
  font-weight: 600;
}

.quiz-feedback.error {
  color: var(--color-danger);
}

.progress-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  background-color: var(--bg-surface);
  border-radius: var(--radius-md);
  margin-top: 14px;
  font-size: 13px;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}

.time-counter {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--text-main);
}
```
</details>

---

---

## Bước 2: Khởi Tạo SRemote & Dữ Liệu Checkpoints Bài Học

Tạo file `app.js`. Chúng ta định nghĩa một mảng các điểm dừng kiểm tra (`checkpoints`). Mỗi checkpoint gồm:
- `time`: Giây kích hoạt ngắt video.
- `question`: Nội dung câu hỏi.
- `options`: Mảng các phương án lựa chọn.
- `correct`: Chỉ số phương án chính xác.
- `passed`: Trạng thái đã vượt qua bài kiểm tra hay chưa (mặc định `false`).

```javascript
import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

// 1. Khai báo danh sách bài tập trắc nghiệm gắn với timeline
const checkpoints = [
  {
    time: 15, // Dừng tại giây thứ 15
    question: "Từ khóa nào trong JavaScript được dùng để khai báo hằng số không thể gán lại?",
    options: ["var", "let", "const", "def"],
    correct: 2,
    passed: false
  },
  {
    time: 45, // Dừng tại giây thứ 45
    question: "Kết quả của biểu thức `typeof null` trong JavaScript là gì?",
    options: ["'null'", "'undefined'", "'object'", "'boolean'"],
    correct: 2,
    passed: false
  }
];

let activeCheckpoint = null;
let maxAllowedTime = 0; // Chặn tua vượt checkpoint

const quizOverlay = document.getElementById('quiz-overlay');
const quizQuestion = document.getElementById('quiz-question');
const quizOptions = document.getElementById('quiz-options');
const quizFeedback = document.getElementById('quiz-feedback');
const learningStatus = document.getElementById('learning-status');
const videoTimeEl = document.getElementById('video-time');

// 2. Khởi tạo Player
async function initCourse() {
  await youtube.mount('#video-slot', {
    videoId: 'W6NZfCO5SIk', // JavaScript Tutorial mẫu
    playerVars: { controls: 1, autoplay: 0 }
  });

  console.log('🎓 Bài giảng đã sẵn sàng!');
  setupQuizTriggers();
}
```

---

## Bước 3: Lập Trình Cơ Chế Ngắt Tự Động & Bật Modal

Viết hàm `setupQuizTriggers()` để theo dõi từng giây phát của video:
1. Khi video chạm hoặc vượt qua mốc `cp.time` mà bài tập đó `passed === false`:
2. Lập tức gọi `await sremote.pause()`.
3. Hiển thị modal câu hỏi trắc nghiệm tương ứng.

```javascript
function setupQuizTriggers() {
  sremote.on('timeupdate', async ({ currentTime }) => {
    videoTimeEl.textContent = `${Math.floor(currentTime)}s`;

    // Nếu đang mở modal bài tập thì luôn đảm bảo video giữ trạng thái Pause
    if (activeCheckpoint) {
      return;
    }

    // Cập nhật mốc thời gian lớn nhất học viên đã đạt được hợp lệ
    if (currentTime > maxAllowedTime) {
      maxAllowedTime = currentTime;
    }

    // Tìm xem có checkpoint nào chưa pass mà video đã chạy tới hay không
    const pendingCp = checkpoints.find(cp => !cp.passed && currentTime >= cp.time);

    if (pendingCp) {
      console.log(`🛑 Đạt điểm dừng kiểm tra tại giây ${pendingCp.time}!`);
      // 1. Tạm dừng video ngay lập tức
      await sremote.pause();
      
      // 2. Đưa video về chính xác mốc checkpoint
      await sremote.seekTo(pendingCp.time);

      // 3. Mở modal trắc nghiệm
      showQuizModal(pendingCp);
    }
  });
}
```

---

## Bước 4: Xử Lý Logic Trả Lời & Mở Khóa Tiếp Tục Học

Hàm `showQuizModal` sẽ dựng các nút phương án trắc nghiệm và bắt sự kiện click của học viên:

```javascript
function showQuizModal(cp) {
  activeCheckpoint = cp;
  learningStatus.textContent = 'Đang làm bài tập kiểm tra...';
  learningStatus.style.color = '#38bdf8';

  quizQuestion.textContent = cp.question;
  quizOptions.innerHTML = '';
  quizFeedback.textContent = '';
  quizFeedback.className = 'quiz-feedback';

  // Render các phương án lựa chọn
  cp.options.forEach((optText, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = `${String.fromCharCode(65 + index)}. ${optText}`;

    btn.addEventListener('click', () => handleAnswer(index));
    quizOptions.appendChild(btn);
  });

  // Hiển thị modal
  quizOverlay.classList.remove('hidden');
}

async function handleAnswer(selectedIndex) {
  if (!activeCheckpoint) return;

  if (selectedIndex === activeCheckpoint.correct) {
    // TRẢ LỜI ĐÚNG
    quizFeedback.textContent = '🎉 Chính xác! Bạn tiếp tục theo dõi bài giảng nhé.';
    quizFeedback.style.color = '#10b981';

    // Đánh dấu đã vượt qua checkpoint này
    activeCheckpoint.passed = true;

    // Cho học viên 1.2s nhìn kết quả trước khi tắt modal và tự động play tiếp
    setTimeout(async () => {
      quizOverlay.classList.add('hidden');
      learningStatus.textContent = 'Đang theo dõi bài giảng';
      learningStatus.style.color = '#94a3b8';
      
      const nextStartTime = activeCheckpoint.time + 0.5;
      activeCheckpoint = null;
      
      // Mở khóa và tiếp tục phát
      await sremote.seekTo(nextStartTime);
      await sremote.play();
    }, 1200);

  } else {
    // TRẢ LỜI SAI
    quizFeedback.textContent = '❌ Chưa chính xác. Vui lòng suy nghĩ và thử lại!';
    quizFeedback.className = 'quiz-feedback error';
  }
}
```

---

## Bước 5: Kỹ Thuật Chống Gian Lận Tua Bài (Anti-Cheat Seek Guard)

Nhiều học viên thông minh sẽ thử kéo thanh tua của YouTube để nhảy vọt qua giây 45 nhằm tránh phải làm bài tập.  
Để ngăn chặn điều này, chúng ta lắng nghe sự kiện `seeked`:

```javascript
// Chống tua cóc qua checkpoint chưa hoàn thành
sremote.on('seeked', async ({ currentTime }) => {
  // Tìm checkpoint chưa hoàn thành sớm nhất
  const unpassedCp = checkpoints.find(cp => !cp.passed);

  if (unpassedCp && currentTime > unpassedCp.time) {
    console.warn('⚠️ Phát hiện hành vi tua qua bài tập chưa làm! Đang tua ngược lại...');
    alert(`Bạn cần hoàn thành câu hỏi kiểm tra tại mốc ${unpassedCp.time}s trước khi xem phần tiếp theo!`);
    
    // Ép tua ngược lại đúng mốc checkpoint và pause
    await sremote.seekTo(unpassedCp.time);
    await sremote.pause();
  }
});

// Khởi chạy
initCourse();
```

---

## 💡 Bài Tập Thử Thách Mở Rộng

1. **Gửi kết quả lên Máy chủ (LMS Webhook)**: Khi học viên trả lời đúng checkpoint, hãy dùng `fetch('/api/quiz-progress')` để lưu trạng thái hoàn thành bài học vào cơ sở dữ liệu.
2. **Nút "Xem lại 10s trước"**: Thêm một nút trong modal trắc nghiệm cho phép học viên tua lùi 10 giây để nghe lại đoạn giảng giải trước khi đưa ra câu trả lời.

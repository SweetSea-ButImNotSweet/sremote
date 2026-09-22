# Tutorial 08: Trình Ghi Chú Bài Giảng Đính Kèm Mốc Thời Gian (Lecture Timestamped Notes)

Khi xem các video bài giảng kỹ thuật dài 2 - 3 tiếng trên YouTube, sinh viên và lập trình viên thường có thói quen vừa xem vừa ghi chép. Các công cụ ghi chú thông minh hiện đại (như Notion, Roam Research hay Otter.ai) đều có tính năng **Timestamped Notes**:
- Khi học viên bấm nút "Tạo ghi chú" (hoặc phím tắt), hệ thống **tự động chụp lại chính xác mốc thời gian đang phát** (ví dụ `04:15`).
- Khi bấm vào tag `[04:15]`, video lập tức tự động tua đến đúng giây đó để học viên ôn lại kiến thức.
- Khi video phát lướt qua mốc `04:15`, ghi chú tương ứng sẽ **tự động đổi màu highlight** trên màn hình để thu hút sự chú ý.

Trong bài hướng dẫn này, chúng ta sẽ xây dựng ứng dụng ghi chú bài giảng thông minh này từ A đến Z với **SRemote**.

> [!TIP]
> **Trải nghiệm ngay bản demo hoạt động thực tế**: Mở [🚀 Live Demo: 08-timestamp-notes](../../../../demo/apps/08-timestamp-notes/index.html) để tương tác trực tiếp trên trình duyệt.

---

## 🎯 Mục tiêu Bạn Sẽ Đạt Được

Sau bài học này, bạn sẽ nắm vững:
1. Cách lấy thời gian hiện tại chính xác `await sremote.getCurrentTime()` theo thời gian thực.
2. Thiết kế cấu trúc dữ liệu ghi chú có gắn mốc `timestamp` và lưu bền vững vào `localStorage`.
3. **Cơ chế Tương Tác 2 Chiều**:
   - Nhấp vào ghi chú ➔ Tua video (`sremote.seekTo()`).
   - Video đang phát ➔ Tự động highlight ghi chú đang khớp thời gian (`sremote.on('timeupdate')`).
4. Phím tắt tiện lợi `Ctrl + Enter` (hoặc `Cmd + Enter`) để lưu ghi chú nhanh mà không cần rời tay khỏi bàn phím.

```mermaid
flowchart LR
    subgraph UI ["Giao diện 2 Cột"]
        Video["Video Bài Giảng"]
        Notes["Cột Ghi Chú Notion"]
    end

    User["👤 Học viên bấm Ghi Chú"] -->|"Chụp mốc sremote.getCurrentTime()"| Notes
    Notes -->|"Click tag [04:15]"| Video
    Video -->|"timeupdate chạm mốc 04:15"| Notes
```

---

## Bước 1: Khởi Tạo Layout 2 Cột (Video Bên Trái, Sổ Ghi Chép Bên Phải)

Tạo file `index.html`:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lecture Timestamped Notes - SRemote Tutorial 08</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <div class="app-layout">
    <!-- CỘT BÊN TRÁI: Video bài giảng -->
    <div class="video-column">
      <header class="lecture-header">
        <h2>📚 CS50: Giới Thiệu Thuật Toán Sắp Xếp</h2>
        <span class="lecture-meta">Đại học Harvard • Bài giảng trực tuyến</span>
      </header>
      <div id="video-embed-slot" class="video-embed-slot"></div>
    </div>

    <!-- CỘT BÊN PHẢI: Sổ ghi chép thông minh -->
    <div class="notes-column">
      <div class="notes-header">
        <h3>📝 Sổ Ghi Chép Bài Học</h3>
        <span id="current-clock" class="clock-badge">Mốc hiện tại: 00:00</span>
      </div>

      <!-- Khung nhập ghi chú nhanh -->
      <div class="note-input-box">
        <textarea id="note-input" placeholder="Gõ ghi chú tại đây... (Bấm Ctrl + Enter để lưu nhanh)"></textarea>
        <button id="btn-add-note" class="btn-primary">Ghi mốc này</button>
      </div>

      <!-- Danh sách các ghi chú đã tạo -->
      <div class="notes-list-wrapper">
        <div class="list-title">Ghi chú đã lưu (Nhấp để tua):</div>
        <ul id="notes-list" class="notes-list"></ul>
      </div>
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
  height: 100vh;
  overflow: hidden;
}

.app-layout {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  height: 100vh;
}

.video-column {
  padding: 24px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.lecture-header {
  margin-bottom: 16px;
}

.lecture-header h2 {
  font-size: 20px;
  margin-bottom: 4px;
}

.lecture-meta {
  font-size: 13px;
  color: #94a3b8;
}

.video-embed-slot {
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.notes-column {
  background: #0f172a;
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.clock-badge {
  background: #1e293b;
  color: #38bdf8;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.note-input-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

textarea {
  width: 100%;
  height: 70px;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 13.5px;
  resize: none;
}

textarea:focus {
  outline: none;
  border-color: #38bdf8;
}

.btn-primary {
  align-self: flex-end;
  background: #0284c7;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #0369a1;
}

.list-title {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 12px;
}

.notes-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.note-card {
  background: #1e293b;
  border-radius: 8px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s;
}

.note-card:hover {
  background: #334155;
}

/* Đổi màu highlight khi video đang phát tới mốc của ghi chú này */
.note-card.active-note {
  border-color: #38bdf8;
  background: rgba(2, 132, 199, 0.15);
}

.note-top-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.time-tag {
  background: #0284c7;
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11.5px;
  font-weight: bold;
}

.btn-del {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 12px;
}

.btn-del:hover {
  color: #f87171;
}

.note-body {
  font-size: 13px;
  line-height: 1.4;
  color: #e2e8f0;
}
```

---

## Bước 2: Nạp Video & Quản Lý State Danh Sách Ghi Chú

Mở file `app.js`. Chúng ta định dạng thời gian giây sang `mm:ss`, tải các ghi chú đã lưu từ `localStorage` và nạp video qua SRemote:

```javascript
import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

// Lấy danh sách ghi chú từ localStorage hoặc mảng rỗng
let notes = JSON.parse(localStorage.getItem('lecture_notes_v1') || '[]');

const currentClockEl = document.getElementById('current-clock');
const noteInput = document.getElementById('note-input');
const btnAddNote = document.getElementById('btn-add-note');
const notesListEl = document.getElementById('notes-list');

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function initLecture() {
  await youtube.mount('#video-embed-slot', {
    videoId: '8hly31xKli0', // CS50 Algorithms Lecture
    playerVars: { controls: 1, autoplay: 0 }
  });

  console.log('✅ Bài giảng đã kết nối SRemote!');
  renderNotes();
  setupEventListeners();
}
```

---

## Bước 3: Chụp Mốc Thời Gian Thực & Lưu Ghi Chú

Khi người dùng bấm "Ghi mốc này" hoặc bấm `Ctrl + Enter`:
1. Đọc thời gian chính xác: `const time = await sremote.getCurrentTime()`.
2. Tạo một object ghi chú mới gồm: `id`, `time`, `text`.
3. Đẩy vào mảng và lưu vào `localStorage`.

```javascript
async function saveCurrentNote() {
  const text = noteInput.value.trim();
  if (!text) return;

  // Chụp chính xác giây hiện tại của video qua SRemote
  const currentTime = await sremote.getCurrentTime();

  const newNote = {
    id: Date.now(),
    time: Math.floor(currentTime),
    text: text
  };

  // Sắp xếp các ghi chú theo thứ tự thời gian tăng dần
  notes.push(newNote);
  notes.sort((a, b) => a.time - b.time);

  // Lưu vào localStorage
  localStorage.setItem('lecture_notes_v1', JSON.stringify(notes));

  noteInput.value = '';
  renderNotes();
}
```

---

## Bước 4: Render Ghi Chú & Kỹ Thuật Tương Tác 2 Chiều

### 1. Click vào ghi chú ➔ Tua video:
Khi người dùng bấm vào card ghi chú, ta gọi `await sremote.seekTo(note.time)` và `await sremote.play()`.

### 2. Video phát ➔ Highlight ghi chú đang hoạt động:
Lắng nghe `sremote.on('timeupdate')`, so sánh thời gian hiện tại với mốc của các ghi chú để gắn class `.active-note`.

```javascript
function renderNotes() {
  notesListEl.innerHTML = '';

  if (notes.length === 0) {
    notesListEl.innerHTML = '<li style="color: #64748b; font-size: 13px;">Chưa có ghi chú nào. Hãy vừa xem vừa ghi chép nhé!</li>';
    return;
  }

  notes.forEach((note) => {
    const li = document.createElement('li');
    li.className = 'note-card';
    li.id = `note-${note.id}`;
    li.innerHTML = `
      <div class="note-top-bar">
        <span class="time-tag">⏱ ${formatTime(note.time)}</span>
        <button class="btn-del" title="Xóa ghi chú">✕</button>
      </div>
      <div class="note-body">${note.text}</div>
    `;

    // Click vào cả card -> Tua video tới mốc đó ngay lập tức
    li.addEventListener('click', async (e) => {
      if (e.target.classList.contains('btn-del')) return;
      console.log(`⏩ Đang tua video tới mốc ${note.time}s...`);
      await sremote.seekTo(note.time);
      await sremote.play();
    });

    // Nút xóa ghi chú
    li.querySelector('.btn-del').addEventListener('click', () => {
      notes = notes.filter(n => n.id !== note.id);
      localStorage.setItem('lecture_notes_v1', JSON.stringify(notes));
      renderNotes();
    });

    notesListEl.appendChild(li);
  });
}

function setupEventListeners() {
  // Bấm nút lưu ghi chú
  btnAddNote.addEventListener('click', saveCurrentNote);

  // Phím tắt Ctrl + Enter trong ô nhập liệu
  noteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveCurrentNote();
    }
  });

  // Lắng nghe timeline video để cập nhật đồng hồ và highlight ghi chú
  sremote.on('timeupdate', ({ currentTime }) => {
    currentClockEl.textContent = `Mốc hiện tại: ${formatTime(currentTime)}`;

    // Tìm ghi chú gần nhất trước hoặc bằng currentTime
    const active = [...notes].reverse().find(n => currentTime >= n.time && currentTime < n.time + 15);

    document.querySelectorAll('.note-card').forEach(el => el.classList.remove('active-note'));
    if (active) {
      const el = document.getElementById(`note-${active.id}`);
      if (el) el.classList.add('active-note');
    }
  });
}

// Khởi chạy
initLecture();
```

---

## 💡 Bài Tập Thử Thách Mở Rộng

1. **Xuất file Markdown (Export to .md)**: Thêm nút "Xuất file ghi chú" để tải về file `.md` chứa toàn bộ các mốc `[04:15](https://youtube.com/watch?v=...&t=255s)` để lưu trữ vào Obsidian hoặc Notion.
2. **Ảnh chụp khung hình (Thumbnail Snapshot)**: Khi tạo ghi chú, lưu thêm ảnh thumbnail của video tại thời điểm đó để xem trước trực quan.

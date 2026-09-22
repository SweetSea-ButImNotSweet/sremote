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



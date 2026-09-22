import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

if (window.setupDemoTopBar) {
  window.setupDemoTopBar({
    appName: 'App 08: Lecture Timestamped Notes',
    tutorialPath: 'content/guides/vi/blueprints/08-timestamp-notes.md'
  });
}

const Icons = window.DemoIcons || { trash: '✕' };
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
    videoId: '8hly31xKli0',
    playerVars: { controls: 1, autoplay: 0 }
  });

  renderNotes();
  setupEventListeners();
}

async function saveCurrentNote() {
  const text = noteInput.value.trim();
  if (!text) return;

  const currentTime = await sremote.getCurrentTime();

  const newNote = {
    id: Date.now(),
    time: Math.floor(currentTime),
    text: text
  };

  notes.push(newNote);
  notes.sort((a, b) => a.time - b.time);
  localStorage.setItem('lecture_notes_v1', JSON.stringify(notes));

  noteInput.value = '';
  renderNotes();
}

function renderNotes() {
  notesListEl.innerHTML = '';

  if (notes.length === 0) {
    notesListEl.innerHTML = '<li style="color: var(--text-muted); font-size: 13px;">Chưa có ghi chú nào. Hãy vừa xem vừa ghi chép nhé!</li>';
    return;
  }

  notes.forEach((note) => {
    const li = document.createElement('li');
    li.className = 'note-card';
    li.id = `note-${note.id}`;
    li.innerHTML = `
      <div class="note-top-bar">
        <span class="time-tag">⏱ ${formatTime(note.time)}</span>
        <button class="btn-del" title="Xóa ghi chú">${Icons.trash}</button>
      </div>
      <div class="note-body">${note.text}</div>
    `;

    li.addEventListener('click', async (e) => {
      if (e.target.closest('.btn-del')) return;
      await sremote.seekTo(note.time);
      await sremote.play();
    });

    li.querySelector('.btn-del').addEventListener('click', (e) => {
      e.stopPropagation();
      notes = notes.filter(n => n.id !== note.id);
      localStorage.setItem('lecture_notes_v1', JSON.stringify(notes));
      renderNotes();
    });

    notesListEl.appendChild(li);
  });
}

function setupEventListeners() {
  btnAddNote.addEventListener('click', saveCurrentNote);

  noteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveCurrentNote();
    }
  });

  sremote.on('timeupdate', ({ currentTime }) => {
    currentClockEl.textContent = `Mốc: ${formatTime(currentTime)}`;

    const active = [...notes].reverse().find(n => currentTime >= n.time && currentTime < n.time + 15);

    document.querySelectorAll('.note-card').forEach(el => el.classList.remove('active-note'));
    if (active) {
      const el = document.getElementById(`note-${active.id}`);
      if (el) el.classList.add('active-note');
    }
  });
}

initLecture();

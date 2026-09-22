import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

if (window.setupDemoTopBar) {
  window.setupDemoTopBar({ appName: 'App 04: EdTech Interactive Quiz', tutorialPath: 'content/guides/vi/blueprints/04-edtech-quiz.md' });
}

const checkpoints = [
  { time: 15, question: 'Từ khóa nào trong JavaScript được dùng để khai báo hằng số không thể gán lại?', options: ['var', 'let', 'const', 'def'], correct: 2, passed: false },
  { time: 45, question: 'Kết quả của biểu thức `typeof null` trong JavaScript là gì?', options: ["'null'", "'undefined'", "'object'", "'boolean'"], correct: 2, passed: false },
];

let activeCheckpoint = null;
let maxAllowedTime = 0;

const quizOverlay = document.getElementById('quiz-overlay');
const quizQuestion = document.getElementById('quiz-question');
const quizOptions = document.getElementById('quiz-options');
const quizFeedback = document.getElementById('quiz-feedback');
const learningStatus = document.getElementById('learning-status');
const videoTimeEl = document.getElementById('video-time');

async function initCourse() {
  await youtube.mount('#video-slot', { videoId: 'W6NZfCO5SIk', playerVars: { controls: 1, autoplay: 0 } });

  setupQuizTriggers();
}

function setupQuizTriggers() {
  sremote.on('timeupdate', async ({ currentTime }) => {
    videoTimeEl.textContent = `${Math.floor(currentTime)}s`;

    if (activeCheckpoint) return;

    if (currentTime > maxAllowedTime) {
      maxAllowedTime = currentTime;
    }

    const pendingCp = checkpoints.find(cp => !cp.passed && currentTime >= cp.time);

    if (pendingCp) {
      await sremote.pause();
      await sremote.seekTo(pendingCp.time);
      showQuizModal(pendingCp);
    }
  });
}

function showQuizModal(cp) {
  activeCheckpoint = cp;
  learningStatus.textContent = 'Đang làm bài tập kiểm tra...';
  learningStatus.style.color = 'var(--color-primary)';

  quizQuestion.textContent = cp.question;
  quizOptions.innerHTML = '';
  quizFeedback.textContent = '';
  quizFeedback.className = 'quiz-feedback';

  cp.options.forEach((optText, index) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = `${String.fromCharCode(65 + index)}. ${optText}`;

    btn.addEventListener('click', () => handleAnswer(index));
    quizOptions.appendChild(btn);
  });

  quizOverlay.classList.remove('hidden');
}

async function handleAnswer(selectedIndex) {
  if (!activeCheckpoint) return;

  if (selectedIndex === activeCheckpoint.correct) {
    quizFeedback.textContent = '🎉 Chính xác! Bạn tiếp tục theo dõi bài giảng nhé.';
    quizFeedback.style.color = 'var(--color-success)';
    activeCheckpoint.passed = true;

    setTimeout(async () => {
      quizOverlay.classList.add('hidden');
      learningStatus.textContent = 'Đang theo dõi bài giảng';
      learningStatus.style.color = 'var(--text-muted)';

      const nextStartTime = activeCheckpoint.time + 0.5;
      activeCheckpoint = null;

      await sremote.seekTo(nextStartTime);
      await sremote.play();
    }, 1200);
  } else {
    quizFeedback.textContent = '❌ Chưa chính xác. Vui lòng suy nghĩ và thử lại!';
    quizFeedback.className = 'quiz-feedback error';
  }
}

sremote.on('seeked', async ({ currentTime }) => {
  const unpassedCp = checkpoints.find(cp => !cp.passed);

  if (unpassedCp && currentTime > unpassedCp.time) {
    alert(`Bạn cần hoàn thành câu hỏi kiểm tra tại mốc ${unpassedCp.time}s trước khi xem tiếp!`);
    await sremote.seekTo(unpassedCp.time);
    await sremote.pause();
  }
});

initCourse();

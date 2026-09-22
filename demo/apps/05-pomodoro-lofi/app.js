import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

// Các hằng số thời gian (tính bằng giây)
const WORK_TIME = 25 * 60; // 25 phút
const BREAK_TIME = 5 * 60; // 5 phút

let timeLeft = WORK_TIME;
let timerInterval = null;
let isRunning = false;
let currentMode = 'WORK'; // 'WORK' hoặc 'BREAK'

// DOM Elements
const timerDisplay = document.getElementById('timer-display');
const modeBadge = document.getElementById('mode-badge');
const volumeIndicator = document.getElementById('volume-indicator');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnReset = document.getElementById('btn-reset');

function formatSeconds(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function initPomodoro() {
  console.log('🍅 Đang nạp stream Lofi Girl...');
  
  await youtube.mount('#lofi-player-slot', {
    videoId: 'jfKfPfyJRdk', // Lofi Girl Livestream
    playerVars: { controls: 1, autoplay: 0 }
  });

  // Đặt âm lượng khởi điểm 100%
  await sremote.setVolume(1);
  updateDisplay();
}

function updateDisplay() {
  timerDisplay.textContent = formatSeconds(timeLeft);
}


function startTimer() {
  if (isRunning) return;
  isRunning = true;
  
  // Tự động phát nhạc nền khi bắt đầu phiên làm việc
  sremote.play();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateDisplay();

    // KIỂM TRA MỐC FADE-OUT ÂM LƯỢNG
    if (timeLeft === 5) {
      console.log('🔉 Bắt đầu hiệu ứng Fade-out âm lượng mượt mà...');
      triggerVolumeFadeOut(5000); // Giảm dần trong 5 giây
    }

    // Khi hết giờ
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      isRunning = false;
      handleSessionCompleted();
    }
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  sremote.pause();
}

function resetTimer() {
  pauseTimer();
  timeLeft = currentMode === 'WORK' ? WORK_TIME : BREAK_TIME;
  sremote.setVolume(1);
  volumeIndicator.textContent = 'Âm lượng: 100%';
  updateDisplay();
}

btnStart.addEventListener('click', startTimer);
btnPause.addEventListener('click', pauseTimer);
btnReset.addEventListener('click', resetTimer);


function triggerVolumeFadeOut(durationMs = 5000) {
  const stepTime = 100; // Mỗi 100ms cập nhật 1 lần
  const totalSteps = durationMs / stepTime;
  let currentStep = 0;

  const fadeInterval = setInterval(async () => {
    currentStep++;
    // Tính tỉ lệ giảm tuyến tính từ 1.0 về 0.0
    const currentVol = Math.max(0, 1 - (currentStep / totalSteps));
    
    await sremote.setVolume(currentVol);
    volumeIndicator.textContent = `Âm lượng: ${Math.round(currentVol * 100)}%`;

    if (currentStep >= totalSteps) {
      clearInterval(fadeInterval);
      console.log('🔇 Fade-out hoàn tất. Nhạc đã êm ái về 0%!');
    }
  }, stepTime);
}


async function handleSessionCompleted() {
  await sremote.pause();

  if (currentMode === 'WORK') {
    alert('🎉 Chúc mừng bạn đã hoàn thành 25 phút tập trung! Hãy nghỉ ngơi 5 phút nhé.');
    currentMode = 'BREAK';
    modeBadge.textContent = '☕ Chế độ Nghỉ ngơi (Break)';
    modeBadge.style.color = '#10b981';
    timeLeft = BREAK_TIME;
  } else {
    alert('⏰ Hết giờ nghỉ! Sẵn sàng cho phiên làm việc mới nào.');
    currentMode = 'WORK';
    modeBadge.textContent = '🎯 Chế độ Tập trung (Focus)';
    modeBadge.style.color = '#38bdf8';
    timeLeft = WORK_TIME;
  }

  // Khôi phục lại âm lượng 100% cho phiên kế tiếp
  await sremote.setVolume(1);
  volumeIndicator.textContent = 'Âm lượng: 100%';
  updateDisplay();
}

// Khởi chạy ứng dụng
initPomodoro();



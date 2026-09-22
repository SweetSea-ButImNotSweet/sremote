import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

if (window.setupDemoTopBar) {
  window.setupDemoTopBar({ appName: 'App 05: Pomodoro Lo-fi Audio Ducking', tutorialPath: 'content/guides/vi/blueprints/05-pomodoro-lofi.md' });
}

const WORK_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

let timeLeft = WORK_TIME;
let timerInterval = null;
let isRunning = false;
let currentMode = 'WORK';

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
  await youtube.mount('#lofi-player-slot', { videoId: 'jfKfPfyJRdk', playerVars: { controls: 1, autoplay: 0 } });

  await sremote.setVolume(1);
  updateDisplay();
}

function updateDisplay() {
  timerDisplay.textContent = formatSeconds(timeLeft);
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  sremote.play();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateDisplay();

    if (timeLeft === 5) {
      triggerVolumeFadeOut(5000);
    }

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
  const stepTime = 100;
  const totalSteps = durationMs / stepTime;
  let currentStep = 0;

  const fadeInterval = setInterval(async () => {
    currentStep++;
    const currentVol = Math.max(0, 1 - currentStep / totalSteps);

    await sremote.setVolume(currentVol);
    volumeIndicator.textContent = `Âm lượng: ${Math.round(currentVol * 100)}%`;

    if (currentStep >= totalSteps) {
      clearInterval(fadeInterval);
    }
  }, stepTime);
}

async function handleSessionCompleted() {
  await sremote.pause();

  if (currentMode === 'WORK') {
    alert('🎉 Chúc mừng bạn đã hoàn thành 25 phút tập trung! Hãy nghỉ ngơi 5 phút nhé.');
    currentMode = 'BREAK';
    modeBadge.textContent = '☕ Chế độ Nghỉ ngơi (Break)';
    modeBadge.style.color = 'var(--color-success)';
    timeLeft = BREAK_TIME;
  } else {
    alert('⏰ Hết giờ nghỉ! Sẵn sàng cho phiên làm việc mới nào.');
    currentMode = 'WORK';
    modeBadge.textContent = '🎯 Chế độ Tập trung (Focus)';
    modeBadge.style.color = 'var(--color-primary)';
    timeLeft = WORK_TIME;
  }

  await sremote.setVolume(1);
  volumeIndicator.textContent = 'Âm lượng: 100%';
  updateDisplay();
}

initPomodoro();

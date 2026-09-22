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



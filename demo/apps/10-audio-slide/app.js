import { sremote } from 'https://cdn.jsdelivr.net/npm/@sremote/sdk/+esm';
import { youtube } from 'https://cdn.jsdelivr.net/npm/@sremote/ready2use/+esm';

// Danh sách các Slide kèm mốc thời gian (Cue points)
const slidesData = [
  {
    id: 1,
    startTime: 0,
    title: "1. Tổng Quan Về Kiến Trúc Phân Tán",
    desc: "Tại sao các hệ thống monolithic truyền thống gặp khó khăn khi mở rộng và cách thức microservices giải quyết bài toán này.",
    icon: "🌐"
  },
  {
    id: 2,
    startTime: 20, // Bắt đầu tại giây 20
    title: "2. Giao Thức Event-Driven Messaging",
    desc: "Sử dụng Message Broker (Kafka / RabbitMQ) để tách rời sự phụ thuộc trực tiếp giữa các dịch vụ độc lập.",
    icon: "⚡"
  },
  {
    id: 3,
    startTime: 50, // Bắt đầu tại giây 50
    title: "3. Database Per Service Pattern",
    desc: "Mỗi dịch vụ sở hữu cơ sở dữ liệu riêng biệt để đảm bảo tính độc lập và khả năng triển khai linh hoạt.",
    icon: "🗄️"
  },
  {
    id: 4,
    startTime: 85, // Bắt đầu tại giây 85
    title: "4. Tổng Kết & Q&A Thảo Luận",
    desc: "Tóm lược các nguyên lý cốt lõi và bắt đầu phần giải đáp câu hỏi của người tham dự.",
    icon: "💡"
  }
];

let currentSlideIndex = 0;

const slideTitleEl = document.getElementById('slide-title');
const slideDescEl = document.getElementById('slide-desc');
const slideGraphicEl = document.getElementById('slide-graphic');
const slideCounterEl = document.getElementById('slide-counter');
const thumbnailsBarEl = document.getElementById('thumbnails-bar');


async function initSlideDeck() {
  renderThumbnails();
  displaySlide(0);

  // Gắn audio stream thuyết minh vào slot
  await youtube.mount('#audio-slot', {
    videoId: 'jfKfPfyJRdk', // Audio stream mẫu
    playerVars: { controls: 1, autoplay: 0 }
  });

  console.log('✅ Bộ trình chiếu đã sẵn sàng!');
  setupTimeTracking();
}

function renderThumbnails() {
  thumbnailsBarEl.innerHTML = '';
  slidesData.forEach((slide, index) => {
    const div = document.createElement('div');
    div.className = `thumb-item ${index === 0 ? 'active' : ''}`;
    div.id = `thumb-${slide.id}`;
    div.innerHTML = `
      <div class="thumb-num">SLIDE ${slide.id}</div>
      <div class="thumb-title">${slide.title}</div>
      <div class="thumb-time">⏱ Bắt đầu: ${slide.startTime}s</div>
    `;

    // Nhấp vào Thumbnail -> Tua âm thanh tới đúng mốc slide đó!
    div.addEventListener('click', async () => {
      console.log(`⏩ Người dùng nhấp vào Slide ${slide.id} -> Tua về ${slide.startTime}s`);
      await sremote.seekTo(slide.startTime);
      await sremote.play();
    });

    thumbnailsBarEl.appendChild(div);
  });
}

function displaySlide(index) {
  currentSlideIndex = index;
  const slide = slidesData[index];

  slideTitleEl.textContent = slide.title;
  slideDescEl.textContent = slide.desc;
  slideGraphicEl.textContent = slide.icon;
  slideCounterEl.textContent = `Slide ${slide.id} / ${slidesData.length}`;

  // Highlight thumbnail tương ứng
  document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('active'));
  const activeThumb = document.getElementById(`thumb-${slide.id}`);
  if (activeThumb) activeThumb.classList.add('active');
}


function setupTimeTracking() {
  sremote.on('timeupdate', ({ currentTime }) => {
    // Tìm slide phù hợp nhất với thời gian hiện tại
    let targetIndex = 0;
    for (let i = slidesData.length - 1; i >= 0; i--) {
      if (currentTime >= slidesData[i].startTime) {
        targetIndex = i;
        break;
      }
    }

    // Nếu phát hiện chuyển sang slide mới -> Cập nhật hiển thị
    if (targetIndex !== currentSlideIndex) {
      console.log(`🔄 Tự động lật sang Slide ${slidesData[targetIndex].id} tại giây ${currentTime.toFixed(1)}s`);
      displaySlide(targetIndex);
    }
  });
}

// Khởi chạy
initSlideDeck();



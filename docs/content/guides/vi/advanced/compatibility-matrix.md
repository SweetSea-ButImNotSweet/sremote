# Bảng Ma trận Tương thích (Compatibility Matrix)

Tài liệu này cung cấp bảng tra cứu chi tiết về khả năng thực thi các lệnh và phản hồi sự kiện trên 22 nền tảng media phổ biến nhất khi tích hợp với SRemote.

---

## 1. Ký hiệu quy ước

- ✅ : **Hỗ trợ đầy đủ**: Hoạt động trơn tru và ổn định.
- ⚠️ : **Hỗ trợ có điều kiện**: Có thể cần lưu ý đặc thù của nền tảng (xem cột Ghi chú).
- ❌ : **Không hỗ trợ**: Nền tảng không cung cấp cơ chế tương ứng.

---

## 2. Bảng ma trận 22 Nền tảng

| Nền tảng | Kênh điều khiển | `play` / `pause` / `toggle` | `seek` / `seekTo` | `volume` / `mute` | Sự kiện thời gian thực (`timeupdate`) | Ghi chú kỹ thuật |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **YouTube** | Adapter (`YT.Player`) | ✅ | ✅ | ✅ | ✅ | Hỗ trợ bắt mốc scrubbing chính xác |
| **Vimeo** | Adapter (`@vimeo/player`) | ✅ | ✅ | ✅ | ✅ | Hỗ trợ cả `buffer` và `ratechange` |
| **SoundCloud** | Adapter (`SC.Widget`) | ✅ | ✅ | ✅ | ✅ | Chuyên biệt cho audio tracks |
| **Dailymotion** | Adapter (Player SDK) | ✅ | ✅ | ✅ | ✅ | Tích hợp sự kiện đệm ngầm |
| **Twitch** | Adapter (Interactive SDK) | ✅ | ⚠️ *(Live)* | ✅ | ⚠️ *(Live)* | Với luồng trực tiếp chỉ hỗ trợ Pause/Play/Volume |
| **Mixcloud** | Adapter (Widget API) | ✅ | ✅ | ✅ | ✅ | Hỗ trợ timeline podcast |
| **Spotify** | Adapter (`EmbedController`) | ✅ | ✅ | ❌ *(SDK limit)* | ✅ | Spotify IFrame cấm can thiệp Volume qua code |
| **Apple MusicKit** | Adapter (MusicKit JS v3) | ✅ | ✅ | ✅ | ✅ | Yêu cầu tài khoản Developer Token |
| **PeerTube** | Adapter (Embed API) | ✅ | ✅ | ✅ | ✅ | Nền tảng video phi tập trung |
| **TikTok** | Adapter (Embed v1) | ✅ | ⚠️ | ✅ | ⚠️ | postMessage protocol 2 chiều |
| **NicoNico** | Adapter (PostMessage) | ✅ | ✅ | ✅ | ✅ | Giao thức truyền tin Nhật Bản |
| **Facebook** | Adapter (Video SDK) | ✅ | ✅ | ✅ | ✅ | Hỗ trợ cả Facebook Reels & Watch |
| **Apple Music (Web)**| Fallback HTML5 / Embed | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Embed player cơ bản |
| **Rumble** | Fallback HTML5 Discovery | ✅ | ✅ | ✅ | ✅ | Điều khiển qua Userscript |
| **Kick** | Fallback HTML5 Discovery | ✅ | ⚠️ *(Live)* | ✅ | ⚠️ *(Live)* | Livestream platform |
| **Streamable** | Fallback HTML5 Discovery | ✅ | ✅ | ✅ | ✅ | Nhận diện thẻ `<video>` |
| **Odysee / LBRY** | Fallback HTML5 Discovery | ✅ | ✅ | ✅ | ✅ | Web3 video streaming |
| **Bandcamp** | Fallback HTML5 Discovery | ✅ | ✅ | ✅ | ✅ | Audio player widget |
| **Twitter / X** | View-only | ❌ | ❌ | ❌ | ❌ | Trả về `adapter: null`, chỉ nhúng hiển thị |
| **Instagram** | View-only | ❌ | ❌ | ❌ | ❌ | Trả về `adapter: null`, chỉ nhúng hiển thị |
| **Threads** | View-only | ❌ | ❌ | ❌ | ❌ | Trả về `adapter: null`, chỉ nhúng hiển thị |
| **Bilibili** | View-only | ❌ | ❌ | ❌ | ❌ | Trả về `adapter: null`, chỉ nhúng hiển thị |

---

## ⏭️ Quay lại
- Trở về [Bắt đầu nhanh trong 5 phút](../quickstart/5-minute-quickstart.md).
- Xem lại [Kiến trúc tổng quan](../concepts/architecture-overview.md).

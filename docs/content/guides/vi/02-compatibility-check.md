# 02. Kiểm tra tính tương thích của dịch vụ

Trước khi bắt tay vào viết mã tích hợp SRemote vào website, bạn cần xác định xem trình phát media (Player) trong `<iframe>` của dịch vụ đích hỗ trợ những phương thức điều khiển nào, các lệnh nào hoạt động và những sự kiện nào có thể phản hồi về trang cha.

---

## 1. Thử nghiệm nhanh bằng trang Live Demo

Cách đơn giản nhất để kiểm tra:
1. Mở trang **[Live Demo](../demo/index.html)** của SRemote.
2. Dán link embed hoặc URL của dịch vụ bạn muốn nhúng vào ô nhập Iframe URL.
3. Bấm **Nạp Iframe** và quan sát:
   - Nếu thanh trạng thái báo `Đã kết nối (instanceId: ...)` → **Tương thích hoàn toàn**.
   - Thử bấm các nút ▶ Play, ⏸ Pause, 🔇 Mute, ⏩ +10s trên thanh điều khiển xem video/audio có phản hồi không.

> [!NOTE]
> Trang Live Demo **không hề viết sẵn code riêng cho từng dịch vụ**, nó chỉ hoạt động hoàn toàn bằng cơ chế tự động quét HTML5 video/audio và MediaSession. Nếu chạy được trên Demo, chắc chắn sẽ chạy được trên website của bạn!

---

## 2. Cách tự soi DevTools kiểm tra dịch vụ lạ

Nếu bạn nhúng một dịch vụ nội bộ hoặc player web lạ:
1. Mở Chrome/Firefox DevTools (F12) → tab **Elements**.
2. Chọn khung context của iframe đích.
3. Chạy lệnh Console:
   ```javascript
   document.querySelector('video, audio')
   ```
4. Nếu kết quả trả về một phần tử `<video>` hoặc `<audio>`, SRemote chắc chắn điều khiển được!

---

## 3. BẢNG 1: Ma trận Khả năng thực thi Lệnh (Commands Matrix)

> **Ký hiệu:**
> - ✅ : Hỗ trợ đầy đủ, hoạt động ổn định.
> - ⚠️ : Có hỗ trợ nhưng có vấn đề cần lưu ý *(xem cột Ghi chú kỹ thuật)*.
> - ❌ : Không hỗ trợ.
> - ➖ : Không hỗ trợ nhưng cũng không cần thiết phải quan tâm.

<div class="matrix-table-wrapper">
<table class="matrix-table">
  <thead>
    <tr>
      <th class="left">Dịch vụ / Nền tảng</th>
      <th class="left">Kênh điều khiển</th>
      <th><code>play</code><br/><code>pause</code><br/><code>toggle</code></th>
      <th><code>seek</code><br/><code>seekTo</code></th>
      <th><code>volume</code><br/><code>mute</code></th>
      <th><code>playbackRate</code></th>
      <th><code>pip</code></th>
      <th><code>stop</code></th>
      <th class="left">Ghi chú kỹ thuật</th>
    </tr>
  </thead>
  <tbody>
    <!-- HTML5 Media thuần -->
    <tr class="platform-start">
      <td rowspan="2" class="platform-title">HTML5 Media thuần<br><small style="font-weight: normal; opacity: 0.7;">(VideoJS, Plyr, native)</small></td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Tự động can thiệp thuộc tính <code>HTMLMediaElement</code></td>
    </tr>
    <tr class="platform-end">
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>MediaSession API không hỗ trợ chỉnh Volume / Tốc độ / PiP</td>
    </tr>
    <!-- Bilibili Embed -->
    <tr class="platform-start">
      <td rowspan="2" class="platform-title">Bilibili Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Nhận diện thẻ <code>&lt;video&gt;</code> trong bpx-player</td>
    </tr>
    <tr class="platform-end">
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Tương thích các phím media chuẩn của trình duyệt</td>
    </tr>
    <!-- YouTube Embed -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">YouTube Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Bắt trực tiếp phần tử <code>video.html5-main-video</code></td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Chỉ điều khiển play, pause, seek, stop</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="ok"></td>
      <td>Bọc qua <code>YT.Player</code> (PiP phụ thuộc cờ iframe)</td>
    </tr>
    <!-- TikTok Embed -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">TikTok Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td>Điều khiển được nhưng UI overlay bị bug / không đồng bộ</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Nhận lệnh qua MediaSession của trình duyệt</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Điều khiển qua TikTok Embed Player API v1 (postMessage)</td>
    </tr>
    <!-- Spotify Web Player -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">Spotify Web Player</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="no"></td>
      <td>Không hỗ trợ HTML5 thuần (mã hóa DRM EME & blob)</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Seek phụ thuộc vào trạng thái buffer của Spotify</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Dùng Spotify Web Playback SDK / Iframe API (không hỗ trợ tốc độ phát)</td>
    </tr>
    <!-- SoundCloud Widget -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">SoundCloud Widget</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Bắt thẻ <code>&lt;audio&gt;</code> nhúng bên trong widget</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Phản hồi tốt các thao tác next/prev/play/pause</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Bọc qua SoundCloud Widget API (<code>SC.Widget</code>)</td>
    </tr>
    <!-- Dailymotion Player -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">Dailymotion Player</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Nhận diện thẻ video tiêu chuẩn trong player</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Đăng ký đầy đủ MediaSession actions (play, pause, seek, stop)</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="ok"></td>
      <td>Bọc qua Dailymotion Player SDK</td>
    </tr>
    <!-- Facebook Video Player -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">Facebook Video</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="warn"></td>
      <td>Thẻ video lồng trong shadow/sandbox của Facebook</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Điều khiển play/pause/seek qua MediaSession</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Tích hợp sâu qua Facebook JS SDK (<code>xfbml.ready</code>)</td>
    </tr>
    <!-- NicoNico Player -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">NicoNico Player</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Tự động nhận diện thẻ video trong NicoNico embed</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Hỗ trợ phím media chuẩn của hệ điều hành</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message (postMessage)</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Giao thức postMessage chính thức của NicoNico (<code>eventName</code> / <code>playerMetadataChange</code>)</td>
    </tr>
    <!-- PeerTube Embed -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">PeerTube Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Tương thích 100% với video HTML5 của PeerTube instance</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td>Đồng bộ MediaSession chuẩn</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Điều khiển 2 chiều qua <code>@peertube/embed-api</code></td>
    </tr>
    <!-- Twitter / X Tweet Embed -->
    <tr class="platform-start">
      <td rowspan="2" class="platform-title">Twitter / X</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Tự động nhận diện video trong tweet rendered</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Khởi tạo qua Twitter Widgets JS SDK (<code>createTweet</code>)</td>
    </tr>
    <!-- HTML5 Discovery Platforms (Rumble, Kick, Streamable, Odysee) -->
    <tr class="platform-start platform-end">
      <td class="platform-title">Rumble / Kick / Streamable / Odysee</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Tự động nhận diện HTML5 Video qua Userscript Discovery (Zero-config)</td>
    </tr>
    <!-- Bandcamp Widget -->
    <tr class="platform-start platform-end">
      <td class="platform-title">Bandcamp Widget</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Tự động nhận diện thẻ <code>&lt;audio&gt;</code> trong widget</td>
    </tr>
  </tbody>
</table>
</div>

---

## 4. BẢNG 2: Ma trận Phản hồi Sự kiện Media (Playback Events Matrix)

<div class="matrix-table-wrapper">
<table class="matrix-table">
  <thead>
    <tr>
      <th class="left">Dịch vụ / Nền tảng</th>
      <th class="left">Kênh điều khiển</th>
      <th><code>'play'</code><br/><code>'pause'</code></th>
      <th><code>'playing'</code><br/><code>'waiting'</code></th>
      <th><code>'seeking'</code><br/><code>'seeked'</code></th>
      <th><code>'ended'</code></th>
      <th><code>'volumechange'</code></th>
      <th><code>'ratechange'</code></th>
      <th class="left">Đặc điểm phản hồi</th>
    </tr>
  </thead>
  <tbody>
    <!-- HTML5 Media thuần -->
    <tr class="platform-start">
      <td rowspan="2" class="platform-title">HTML5 Media thuần</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Lắng nghe trực tiếp sự kiện DOM gốc (Real-time)</td>
    </tr>
    <tr class="platform-end">
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>MediaSession chỉ phản hồi trigger qua action handler</td>
    </tr>
    <!-- Bilibili Embed -->
    <tr class="platform-start">
      <td rowspan="2" class="platform-title">Bilibili Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Phản hồi đầy đủ từ trình phát web Bilibili</td>
    </tr>
    <tr class="platform-end">
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Sự kiện kết thúc có thể bị trễ do quảng cáo/gợi ý</td>
    </tr>
    <!-- YouTube Embed -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">YouTube Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Bắt trực tiếp trên thẻ video nội bộ YouTube</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Phản hồi play/pause theo trạng thái hệ điều hành</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Map qua các hàm callback <code>onStateChange</code> của YouTube</td>
    </tr>
    <!-- TikTok Embed -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">TikTok Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Lắng nghe đầy đủ sự kiện DOM trực tiếp từ thẻ video</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Đồng bộ trạng thái phát qua MediaSession</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td>Lắng nghe sự kiện <code>onStateChange</code> của TikTok Player v1</td>
    </tr>
    <!-- Spotify Web Player -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">Spotify Web Player</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Không hỗ trợ bắt trực tiếp qua DOM HTML5</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Cập nhật Metadata tên bài hát / ca sĩ qua MediaSession</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td>Lắng nghe <code>playback_update</code> trong Spotify Embed SDK</td>
    </tr>
    <!-- SoundCloud Widget -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">SoundCloud Widget</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="na"></td>
      <td class="ok"></td>
      <td>Sự kiện DOM thẻ <code>&lt;audio&gt;</code> kích hoạt tức thì</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Đồng bộ trạng thái phát trên notification bar</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="warn"></td>
      <td class="na"></td>
      <td>Bắt qua <code>SC.Widget.Events.PLAY</code>, <code>FINISH</code>, <code>PLAY_PROGRESS</code></td>
    </tr>
    <!-- Dailymotion Player -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">Dailymotion Player</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Nhận trực tiếp sự kiện media element</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Đăng ký và phản hồi đầy đủ sự kiện qua MediaSession</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Bắt qua event listener của Dailymotion Player API</td>
    </tr>
    <!-- Facebook Video Player -->
    <tr class="platform-start">
      <td rowspan="2" class="platform-title">Facebook Video</td>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Đồng bộ trạng thái phát qua MediaSession</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td>Lắng nghe sự kiện <code>startedPlaying</code>, <code>paused</code>, <code>finishedPlaying</code> từ FB SDK</td>
    </tr>
    <!-- NicoNico Player -->
    <tr class="platform-start">
      <td rowspan="3" class="platform-title">NicoNico Player</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Bắt sự kiện trực tiếp từ thẻ video NicoNico</td>
    </tr>
    <tr>
      <td><code>2. MediaSession</code></td>
      <td class="ok"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td class="warn"></td>
      <td class="no"></td>
      <td class="no"></td>
      <td>Đồng bộ trạng thái phát media session</td>
    </tr>
    <tr class="platform-end">
      <td><code>4. Window Message (postMessage)</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Lắng nghe message <code>loadComplete</code>, <code>playerMetadataChange</code>, <code>statusChange</code></td>
    </tr>
    <!-- PeerTube Embed -->
    <tr class="platform-start">
      <td rowspan="2" class="platform-title">PeerTube Embed</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Lắng nghe trực tiếp mọi sự kiện DOM HTML5</td>
    </tr>
    <tr class="platform-end">
      <td><code>3. Custom Adapter</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Đồng bộ 2 chiều qua <code>@peertube/embed-api</code> events</td>
    </tr>
    <!-- HTML5 Discovery Platforms (Rumble, Kick, Streamable, Odysee) -->
    <tr class="platform-start platform-end">
      <td class="platform-title">Rumble / Kick / Streamable / Odysee</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td>Tự động lắng nghe trực tiếp sự kiện DOM gốc (Real-time)</td>
    </tr>
    <!-- Bandcamp Widget -->
    <tr class="platform-start platform-end">
      <td class="platform-title">Bandcamp Widget</td>
      <td><code>1. HTML5 Hook</code></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="ok"></td>
      <td class="na"></td>
      <td>Bắt trực tiếp sự kiện <code>play</code>, <code>pause</code>, <code>timeupdate</code> từ thẻ audio</td>
    </tr>
  </tbody>
</table>
</div>

---

## ⏭️ Bước tiếp theo
Sau khi kiểm tra tương thích, hãy tiến hành **[03. Cài đặt SRemote Wrapper & Bắt đầu tích hợp](./03-wrapper-integration.md)**.

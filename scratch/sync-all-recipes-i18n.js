import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const recipesDir = path.join(__dirname, '..', 'docs', 'recipes');
const commentsPath = path.join(recipesDir, 'comments-i18n.json');

// Define the comprehensive i18n dictionary for all code comments across recipes
const newCommentsDict = {
  // General & Setup
  cmt_install_ready2use: { vi: '// 🚀 Cài đặt: npm install @sremote/ready2use @sremote/wrapper', en: '// 🚀 Installation: npm install @sremote/ready2use @sremote/wrapper' },
  cmt_install_wrapper: { vi: '// 1. Cài đặt SDK: npm install @sremote/wrapper', en: '// 1. Install SDK: npm install @sremote/wrapper' },
  cmt_mount_auto: { vi: '// Khởi tạo và gắn player tự động trong 1 dòng lệnh', en: '// Auto-initialize and mount player in a single line of code' },
  cmt_control_via_client: { vi: '// Điều khiển qua SRemote Client', en: '// Control media playback via SRemote Client' },
  cmt_listen_realtime: { vi: '// Lắng nghe sự kiện phát thời gian thực', en: '// Listen for real-time playback events' },
  cmt_progress_log: { vi: 'Tiến độ:', en: 'Progress:' },
  cmt_register_adapter: { vi: '// Đăng ký Custom Adapter vào SRemote Client', en: '// Register Custom Adapter into SRemote Client' },
  cmt_register_adapter_wrapper: { vi: '// Đăng ký Custom Adapter vào SRemote Wrapper', en: '// Register Custom Adapter into SRemote Wrapper' },
  cmt_sync_events: { vi: '// Đồng bộ sự kiện phát từ player sang SRemote', en: '// Synchronize player playback events into SRemote' },

  // YouTube
  cmt_init_yt_adapter: { vi: '// Khởi tạo YouTube IFrame API và kết nối Adapter vào SRemote', en: '// Initialize YouTube IFrame API and bind Adapter into SRemote' },

  // Vimeo
  cmt_vimeo_adapter: { vi: '// Tạo SRemote Adapter kết nối Vimeo Player SDK', en: '// Create SRemote Adapter connecting Vimeo Player SDK' },
  cmt_vimeo_sync: { vi: '// Đồng bộ sự kiện phát và tiến độ của Vimeo sang SRemote', en: '// Sync Vimeo playback and progress events with SRemote' },

  // Dailymotion
  cmt_dailymotion_adapter: { vi: '// Tạo SRemote Adapter kết nối Dailymotion Player SDK', en: '// Create SRemote Adapter connecting Dailymotion Player SDK' },
  cmt_dailymotion_sync: { vi: '// Đồng bộ sự kiện phát và tiến độ Dailymotion với SRemote', en: '// Sync Dailymotion playback and progress events with SRemote' },

  // Twitch
  cmt_twitch_adapter: { vi: '// Tạo SRemote Adapter kết nối Twitch Interactive Player SDK', en: '// Create SRemote Adapter connecting Twitch Interactive Player SDK' },

  // SoundCloud
  cmt_soundcloud_adapter: { vi: '// Tạo SRemote Adapter kết nối SoundCloud Widget API', en: '// Create SRemote Adapter connecting SoundCloud Widget API' },
  cmt_soundcloud_sync: { vi: '// Đồng bộ sự kiện SoundCloud với SRemote', en: '// Sync SoundCloud events with SRemote' },

  // Spotify
  cmt_spotify_adapter: { vi: '// Tạo SRemote Adapter kết nối Spotify Embed Controller', en: '// Create SRemote Adapter connecting Spotify Embed Controller' },
  cmt_spotify_sync: { vi: '// Lắng nghe sự kiện phát của Spotify và chuyển tiếp sang SRemote', en: '// Listen to Spotify playback events and forward to SRemote' },

  // Mixcloud
  cmt_mixcloud_adapter: { vi: '// Tạo SRemote Adapter kết nối Mixcloud PlayerWidget', en: '// Create SRemote Adapter connecting Mixcloud PlayerWidget' },

  // TikTok
  cmt_tiktok_adapter: { vi: '// Tạo SRemote Adapter kết nối TikTok Player qua postMessage', en: '// Create SRemote Adapter connecting TikTok Player via postMessage' },
  cmt_tiktok_postmessage: { vi: '// Gửi lệnh postMessage tới TikTok Embed Player', en: '// Send postMessage command to TikTok Embed Player' },
  cmt_tiktok_listen: { vi: '// Lắng nghe sự kiện chính thức từ TikTok player', en: '// Listen for official TikTok player events' },
  cmt_tiktok_state_desc: { vi: '// Trạng thái: 0: kết thúc, 1: đang phát, 2: tạm dừng, 3: đang tải', en: '// Status: 0: ended, 1: playing, 2: paused, 3: buffering' },

  // NicoNico
  cmt_nico_adapter: { vi: '// Tạo SRemote Adapter kết nối NicoNico qua giao thức postMessage 2 chiều', en: '// Create SRemote Adapter connecting NicoNico via 2-way postMessage' },
  cmt_nico_postmessage: { vi: '// Hàm gửi postMessage tới NicoNico iframe', en: '// Helper to send postMessage to NicoNico iframe' },
  cmt_nico_listen: { vi: '// Lắng nghe message từ NicoNico Embed Player', en: '// Listen for messages from NicoNico Embed Player' },

  // Native / Zero Adapter (HTML5, Bilibili, Facebook)
  cmt_native_no_adapter: {
    vi: '// HTML5 video nhúng qua iframe hoạt động trực tiếp 100% không cần code adapter!',
    en: '// HTML5 video in iframe works natively 100% with zero adapter code needed!',
  },
  cmt_bilibili_no_adapter: {
    vi: '// Bilibili KHÔNG CẦN Adapter - Tự động bắt tín hiệu trực tiếp với SRemote',
    en: '// Bilibili DOES NOT need an Adapter - Auto discovery & handshake via SRemote',
  },
  cmt_bilibili_handshake: {
    vi: '// Bắt đầu khám phá và bắt tay (handshake) với player bên trong iframe Bilibili',
    en: '// Start discovery & handshake with media inside Bilibili iframe',
  },
  cmt_html5_connect: { vi: '// Tự động kết nối Native HTML5 Media (Không cần Adapter)', en: '// Automatically connect Native HTML5 Media (Zero-Adapter)' },
  cmt_html5_handshake_send: { vi: '// Gửi gói tin bắt tay (handshake) tới iframe', en: '// Send handshake to iframe' },
  cmt_html5_handshake_listen: { vi: '// Lắng nghe khi bắt tay thành công', en: '// Listen for successful handshake' },
  cmt_html5_track_progress: { vi: '// Theo dõi tiến độ phát video thời gian thực', en: '// Track real-time playback progress' },
  cmt_facebook_test: { vi: '// Facebook Embedded Video (Chế độ Native Test / Không cần Adapter)', en: '// Facebook Embedded Video (No Adapter / Native Test)' },
};

fs.writeFileSync(commentsPath, JSON.stringify(newCommentsDict, null, 2), 'utf8');
console.log('Saved updated comments-i18n.json');

// Exact replacements map per file/pattern
const fileReplacements = [
  // Bilibili
  { pattern: /\/\/\s*2\.\s*Bilibili\s+DOES\s+NOT\s+need\s+an\s+Adapter[^\n]*/gi, replacement: '// [cmt_bilibili_no_adapter]' },
  { pattern: /\/\/\s*Start\s+discovery\s+&\s+handshake\s+with\s+media\s+inside\s+Bilibili\s+iframe/gi, replacement: '// [cmt_bilibili_handshake]' },
  // Dailymotion
  { pattern: /\/\/\s*3\.\s*Initialize\s+Dailymotion\s+Player[^\n]*/gi, replacement: '// [cmt_dailymotion_adapter]' },
  { pattern: /\/\/\s*Sync\s+Dailymotion\s+playback\s+and\s+progress\s+events\s+with\s+SRemote/gi, replacement: '// [cmt_dailymotion_sync]' },
  // Facebook
  { pattern: /\/\/\s*Facebook\s+Embedded\s+Video[^\n]*/gi, replacement: '// [cmt_facebook_test]' },
  // HTML5
  { pattern: /\/\/\s*2\.\s*Automatically\s+connect\s+Native\s+HTML5\s+Media[^\n]*/gi, replacement: '// [cmt_html5_connect]' },
  { pattern: /\/\/\s*Send\s+handshake\s+to\s+iframe/gi, replacement: '// [cmt_html5_handshake_send]' },
  { pattern: /\/\/\s*Listen\s+for\s+successful\s+handshake/gi, replacement: '// [cmt_html5_handshake_listen]' },
  { pattern: /\/\/\s*Track\s+playback\s+progress/gi, replacement: '// [cmt_html5_track_progress]' },
  // Mixcloud
  { pattern: /\/\/\s*3\.\s*Initialize\s+Mixcloud\.PlayerWidget[^\n]*/gi, replacement: '// [cmt_mixcloud_adapter]' },
  // NicoNico
  { pattern: /\/\/\s*2\.\s*Create\s+SRemote\s+Adapter\s+connecting\s+NicoNico[^\n]*/gi, replacement: '// [cmt_nico_adapter]' },
  { pattern: /\/\/\s*Helper\s+to\s+send\s+postMessage\s+to\s+NicoNico\s+iframe/gi, replacement: '// [cmt_nico_postmessage]' },
  { pattern: /\/\/\s*Listen\s+for\s+messages\s+from\s+NicoNico\s+Embed\s+Player/gi, replacement: '// [cmt_nico_listen]' },
  { pattern: /\/\/\s*Register\s+SRemote\s+Adapter/gi, replacement: '// [cmt_register_adapter]' },
  // SoundCloud
  { pattern: /\/\/\s*3\.\s*Initialize\s+SC\.Widget[^\n]*/gi, replacement: '// [cmt_soundcloud_adapter]' },
  { pattern: /\/\/\s*Sync\s+SoundCloud\s+events\s+with\s+SRemote/gi, replacement: '// [cmt_soundcloud_sync]' },
  // Spotify
  { pattern: /\/\/\s*3\.\s*Create\s+Embed\s+Controller[^\n]*/gi, replacement: '// [cmt_spotify_adapter]' },
  { pattern: /\/\/\s*Listen\s+to\s+Spotify\s+playback\s+events\s+and\s+forward\s+to\s+SRemote/gi, replacement: '// [cmt_spotify_sync]' },
  { pattern: /\/\/\s*Sync\s+Spotify\s+playback\s+events\s+with\s+SRemote\s+Wrapper/gi, replacement: '// [cmt_spotify_sync]' },
  // TikTok
  { pattern: /\/\/\s*SRemote\s+Adapter\s+for\s+TikTok\s+Official\s+Embed\s+Player[^\n]*/gi, replacement: '// [cmt_tiktok_adapter]' },
  { pattern: /\/\/\s*Send\s+postMessage\s+command\s+to\s+TikTok\s+Embed\s+Player/gi, replacement: '// [cmt_tiktok_postmessage]' },
  { pattern: /\/\/\s*Register\s+SRemote\s+Custom\s+Adapter(?: vào Wrapper| into Wrapper)?/gi, replacement: '// [cmt_register_adapter]' },
  { pattern: /\/\/\s*Listen\s+for\s+official\s+TikTok\s+player\s+events/gi, replacement: '// [cmt_tiktok_listen]' },
  { pattern: /\/\/\s*0:\s*ended,\s*1:\s*playing,\s*2:\s*paused,\s*3:\s*buffering/gi, replacement: '// [cmt_tiktok_state_desc]' },
  // Twitch
  { pattern: /\/\/\s*3\.\s*Initialize\s+Twitch\.Player[^\n]*/gi, replacement: '// [cmt_twitch_adapter]' },
  // Vimeo
  { pattern: /\/\/\s*3\.\s*Initialize\s+Vimeo\.Player[^\n]*/gi, replacement: '// [cmt_vimeo_adapter]' },
  { pattern: /\/\/\s*Sync\s+Vimeo\s+playback\s+and\s+progress\s+events\s+with\s+SRemote/gi, replacement: '// [cmt_vimeo_sync]' },
];

const dirs = fs
  .readdirSync(recipesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

let updatedFiles = 0;

for (const dir of dirs) {
  const dirPath = path.join(recipesDir, dir);
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(dirPath, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const rep of fileReplacements) {
      content = content.replace(rep.pattern, rep.replacement);
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated i18n in: ${dir}/${file}`);
      updatedFiles++;
    }
  }
}

console.log(`\nUpdated ${updatedFiles} files.`);

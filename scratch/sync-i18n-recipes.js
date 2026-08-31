import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const recipesDir = path.join(__dirname, '..', 'docs', 'recipes');
const commentsPath = path.join(recipesDir, 'comments-i18n.json');

// Read comments dictionary
let commentsDict = {};
try {
  commentsDict = JSON.parse(fs.readFileSync(commentsPath, 'utf8'));
} catch (e) {
  console.error('Error reading comments-i18n.json:', e);
}

console.log('Current keys in comments-i18n.json:', Object.keys(commentsDict));

// List of all platforms and check comments across all files
const dirs = fs.readdirSync(recipesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

console.log('Discovered recipe platforms:', dirs);

// Map of common phrase replacements to [cmt_tag]
const commentReplacements = [
  // Ready2use install
  {
    regex: /\/\/\s*🚀\s*(?:Cài đặt|Installation):\s*npm\s+install\s+@sremote\/ready2use\s+@sremote\/wrapper/gi,
    tag: '// [cmt_install_ready2use]'
  },
  // Wrapper install
  {
    regex: /\/\/\s*(?:1\.\s*)?(?:Cài đặt SDK|Install SDK):\s*npm\s+install\s+@sremote\/wrapper/gi,
    tag: '// [cmt_install_wrapper]'
  },
  // Mount auto
  {
    regex: /\/\/\s*(?:Khởi tạo và gắn player tự động trong 1 dòng lệnh|Auto-initialize and mount player in a single line of code)/gi,
    tag: '// [cmt_mount_auto]'
  },
  // Control via client
  {
    regex: /\/\/\s*(?:Điều khiển qua SRemote Client|Control media playback via SRemote Client)/gi,
    tag: '// [cmt_control_via_client]'
  },
  // Listen realtime
  {
    regex: /\/\/\s*(?:Lắng nghe sự kiện phát thời gian thực|Listen for real-time playback events)/gi,
    tag: '// [cmt_listen_realtime]'
  },
  // Register adapter
  {
    regex: /\/\/\s*(?:Đăng ký Custom Adapter vào SRemote Client|Register (?:adapter directly via window\.sremote|Custom Adapter into SRemote Client))/gi,
    tag: '// [cmt_register_adapter]'
  },
  // Sync events
  {
    regex: /\/\/\s*(?:Đồng bộ sự kiện phát từ player sang SRemote|Synchronize player playback events into SRemote)/gi,
    tag: '// [cmt_sync_events]'
  },
  // YouTube Adapter / Init
  {
    regex: /\/\/\s*(?:3\.\s*)?(?:Khởi tạo YouTube IFrame API và kết nối Adapter vào SRemote|Initialize (?:YT\.Player and bind with SRemote Adapter \(Vanilla JS\)|YouTube IFrame API and bind Adapter into SRemote))/gi,
    tag: '// [cmt_init_yt_adapter]'
  },
  // Nico adapter
  {
    regex: /\/\/\s*(?:Tạo SRemote Adapter kết nối NicoNico qua giao thức postMessage 2 chiều|Create SRemote Adapter connecting NicoNico via 2-way postMessage)/gi,
    tag: '// [cmt_nico_adapter]'
  },
  // TikTok adapter
  {
    regex: /\/\/\s*(?:Tạo SRemote Adapter kết nối TikTok Player qua postMessage|Create SRemote Adapter connecting TikTok Player via postMessage)/gi,
    tag: '// [cmt_tiktok_adapter]'
  },
  // Spotify adapter
  {
    regex: /\/\/\s*(?:Tạo SRemote Adapter kết nối Spotify Embed Controller|Create SRemote Adapter connecting Spotify Embed Controller)/gi,
    tag: '// [cmt_spotify_adapter]'
  },
  // Vimeo adapter
  {
    regex: /\/\/\s*(?:Tạo SRemote Adapter kết nối Vimeo Player SDK|Create SRemote Adapter connecting Vimeo Player SDK)/gi,
    tag: '// [cmt_vimeo_adapter]'
  },
  // SoundCloud adapter
  {
    regex: /\/\/\s*(?:Tạo SRemote Adapter kết nối SoundCloud Widget API|Create SRemote Adapter connecting SoundCloud Widget API)/gi,
    tag: '// [cmt_soundcloud_adapter]'
  },
  // Dailymotion adapter
  {
    regex: /\/\/\s*(?:Tạo SRemote Adapter kết nối Dailymotion Player SDK|Create SRemote Adapter connecting Dailymotion Player SDK)/gi,
    tag: '// [cmt_dailymotion_adapter]'
  },
  // Twitch adapter
  {
    regex: /\/\/\s*(?:Tạo SRemote Adapter kết nối Twitch Interactive Player SDK|Create SRemote Adapter connecting Twitch Interactive Player SDK)/gi,
    tag: '// [cmt_twitch_adapter]'
  },
  // Mixcloud adapter
  {
    regex: /\/\/\s*(?:Tạo SRemote Adapter kết nối Mixcloud PlayerWidget|Create SRemote Adapter connecting Mixcloud PlayerWidget)/gi,
    tag: '// [cmt_mixcloud_adapter]'
  },
  // Native HTML5
  {
    regex: /\/\/\s*(?:HTML5 video nhúng qua iframe hoạt động trực tiếp 100% không cần code adapter!|HTML5 video in iframe works natively 100% with zero adapter code needed!)/gi,
    tag: '// [cmt_native_no_adapter]'
  }
];

let modifiedCount = 0;

for (const dir of dirs) {
  const dirPath = path.join(recipesDir, dir);
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(dirPath, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const rep of commentReplacements) {
      content = content.replace(rep.regex, rep.tag);
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated i18n tags in: ${dir}/${file}`);
      modifiedCount++;
    }
  }
}

console.log(`Total files updated: ${modifiedCount}`);

// Now scan remaining comments in all js files to verify if any non-tagged comments exist
console.log('\n--- SCANNING REMAINING RAW COMMENTS ---');
for (const dir of dirs) {
  const dirPath = path.join(recipesDir, dir);
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(dirPath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') && !trimmed.startsWith('// [cmt_')) {
        console.log(`[Untagged Comment] ${dir}/${file}:${idx + 1} -> ${trimmed}`);
      }
    });
  }
}

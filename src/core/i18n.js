export const I18N = {
  vi: {
    dialogTitle: 'Cho phép điều khiển video?',
    dialogText: 'Trang này muốn điều khiển media trong iframe.',
    rememberChoice: 'Nhớ lựa chọn cho trang này',
    denyBtn: 'Từ chối',
    allowBtn: 'Đồng ý',
    badgeTooltipPrefix: 'Trang ',
    badgeTooltipSuffix: '\nđang điều khiển video này qua ',
    badgeDontShow: 'Đừng hiện lại',
    badgeDontShowTitle: 'Ẩn chỉ báo này cho trang hiện tại',
    badgeCloseTitle: 'Ẩn',
    menuReset: '🔄 Đặt lại quyền cho {domain}',
    menuUnhideBadge: '👁️ Hiện lại tất cả Badge đã ẩn',
    menuClearAll: '🧹 Xóa toàn bộ dữ liệu & quyền',
    menuGenerateKey: '🔑 Tạo & Copy Passkey ({domain})',
    menuDeleteKey: '🗑️ Xóa Passkey ({domain})',
    menuToggleLock: '🔒 Khóa SRemote chủ động ({domain})',
    targetTop: 'trang này (Top)',
    targetIframe: 'iframe này',
    alertResetDone: '[sremote] Đã reset quyền và chỉ báo cho: {origin}\n(Tải lại trang để áp dụng)',
    alertUnhideDone: '[sremote] Đã khôi phục hiển thị tất cả các badge sremote.',
    confirmClearAll: '[sremote] Bạn có chắc muốn xóa toàn bộ quyền và cài đặt của sremote?',
    alertClearDone: '[sremote] Đã dọn dẹp sạch toàn bộ dữ liệu của sremote.',
    alertKeyGenerated:
      '[sremote] Đã tạo & copy Passkey mới cho {domain} vào Clipboard:\n{key}\n\n(Dán key này vào App hoặc gọi sremote.hello({ key }) để xác thực)',
    alertKeyDeleted: '[sremote] Đã xóa Passkey của {domain}.\n(Tải lại trang để áp dụng)',
    alertLockEnabled: '[sremote] Đã kích hoạt Khóa SRemote cho {domain}.\nBất kỳ lệnh hello nào cũng bắt buộc phải có đúng Passkey!',
    alertLockDisabled: '[sremote] Đã mở khóa SRemote cho {domain}.',
  },
  en: {
    dialogTitle: 'Allow media control?',
    dialogText: 'This page wants to control media inside the frame.',
    rememberChoice: 'Remember for this site',
    denyBtn: 'Deny',
    allowBtn: 'Allow',
    badgeTooltipPrefix: 'Page ',
    badgeTooltipSuffix: '\nis controlling this video via ',
    badgeDontShow: "Don't show again",
    badgeDontShowTitle: 'Hide this indicator for the current site',
    badgeCloseTitle: 'Hide',
    menuReset: '🔄 Reset permissions for {target}',
    menuUnhideBadge: '👁️ Unhide all badges',
    menuClearAll: '🧹 Clear all data & permissions',
    menuGenerateKey: '🔑 Generate & Copy Passkey ({domain})',
    menuDeleteKey: '🗑️ Delete Passkey ({domain})',
    menuToggleLock: '🔒 Active Lock SRemote ({domain})',
    targetTop: 'this site (Top)',
    targetIframe: 'this iframe',
    alertResetDone: '[sremote] Reset permissions and badges for: {origin}\n(Reload page to apply)',
    alertUnhideDone: '[sremote] Restored display for all sremote badges.',
    confirmClearAll: '[sremote] Are you sure you want to clear all sremote permissions and settings?',
    alertClearDone: '[sremote] Cleaned up all sremote data.',
    alertKeyGenerated:
      '[sremote] Generated & copied new Passkey for {domain} to Clipboard:\n{key}\n\n(Paste this key in your App or pass to sremote.hello({ key }))',
    alertKeyDeleted: '[sremote] Deleted Passkey for {domain}.\n(Reload page to apply)',
    alertLockEnabled: '[sremote] Enabled SRemote Lock for {domain}.\nAny hello command now strictly requires valid Passkey!',
    alertLockDisabled: '[sremote] Disabled SRemote Lock for {domain}.',
  },
};

export function t(key, params = {}) {
  const navLang = (navigator.language || navigator.userLanguage || 'vi').toLowerCase();
  const lang = navLang.startsWith('vi') ? 'vi' : 'en';
  let text = I18N[lang]?.[key] || I18N.en?.[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return text;
}

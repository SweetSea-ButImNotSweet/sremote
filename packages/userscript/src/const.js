// ============================================================================
// SRemote User Configuration
// Bạn có thể tùy chỉnh các thông số này trực tiếp trong Userscript
// ============================================================================
export const VERSION = '3.0.0';
export const NS = 'sremote:';

export const LOG_LEVEL = 3; // 0: None, 1: Error/Warn, 2: Debug, 3: Full Log
export const ENABLE_DEBUG_API = true;

// Gán vào globalThis để tránh bị Rollup tree-shake/inline mất khi bundle
// và giúp dễ dàng debug hoặc truy cập cấu hình ở runtime
globalThis.SREMOTE_CONFIG = {
  VERSION,
  NS,
  LOG_LEVEL,
  ENABLE_DEBUG_API,
};
// ============================================================================

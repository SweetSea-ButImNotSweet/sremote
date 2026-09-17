import { LOG_LEVELS, getGlobalLogLevelOverride, resolveLogLevel, createLogger, defaultLogger, console_log, console_debug, console_warn, console_error } from '../logger.js';

export const logger = {
  create: createLogger,
  default: defaultLogger,
  LEVELS: LOG_LEVELS,
  resolveLevel: resolveLogLevel,
  getGlobalOverride: getGlobalLogLevelOverride,
  log: console_log,
  debug: console_debug,
  warn: console_warn,
  error: console_error,
};

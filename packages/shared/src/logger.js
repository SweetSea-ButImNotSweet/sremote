/**
 * Standardized Logger for SRemote Monorepo Ecosystem
 *
 * Supports hierarchical log levels:
 *  -1: INHERIT / UNSET (defer to next level or defaults)
 *   0: SILENT (no logs at all)
 *   1: ERROR (only error and warn)
 *   2: INFO (lifecycle, connection, state updates)
 *   3: DEBUG (verbose command arguments, events, ticks)
 */

export const LOG_LEVELS = { INHERIT: -1, SILENT: 0, ERROR: 1, INFO: 2, DEBUG: 3 };

const GLOBAL_LOG_LEVEL_KEY = Symbol.for('__sremote_global_log_level__');

// Auto-initialize global log level once from localStorage if present
if (typeof globalThis !== 'undefined' && globalThis[GLOBAL_LOG_LEVEL_KEY] === undefined) {
  try {
    const saved = globalThis.localStorage?.getItem('sremote:log_level');
    if (saved !== null && saved !== undefined && saved !== '') {
      const parsed = Number(saved);
      if (!Number.isNaN(parsed) && parsed >= -1) {
        globalThis[GLOBAL_LOG_LEVEL_KEY] = parsed;
      }
    }
  } catch {}
}

/**
 * Sets the global log level across all SRemote modules, loggers, and contexts.
 * @param {number|null} newLevel - Log level (0-3), -1 for INHERIT, or null to clear
 */
export function setGlobalLogLevel(newLevel) {
  if (typeof globalThis === 'undefined') return;

  if (typeof newLevel === 'number') {
    globalThis[GLOBAL_LOG_LEVEL_KEY] = newLevel;
    try {
      globalThis.localStorage?.setItem('sremote:log_level', String(newLevel));
    } catch {}
  } else if (newLevel === null) {
    delete globalThis[GLOBAL_LOG_LEVEL_KEY];
    try {
      globalThis.localStorage?.removeItem('sremote:log_level');
    } catch {}
  }

  // Notify any other logger scopes or listeners in current window
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('sremote:loglevel:change', { detail: { level: newLevel } }));
    }
  } catch {}
}

/**
 * Gets the current active global log level override.
 * @returns {number|null}
 */
export function getGlobalLogLevel() {
  if (typeof globalThis !== 'undefined' && typeof globalThis[GLOBAL_LOG_LEVEL_KEY] === 'number') {
    return globalThis[GLOBAL_LOG_LEVEL_KEY];
  }
  return null;
}

/**
 * Resolves effective log level taking overrides into account.
 * @param {number} [localLevel] - Local config level provided by application
 * @param {number} [defaultLevel=LOG_LEVELS.ERROR] - Fallback level
 * @returns {number}
 */
export function resolveLogLevel(localLevel = undefined, defaultLevel = LOG_LEVELS.ERROR) {
  const globalLevel = getGlobalLogLevel();
  if (globalLevel !== null && globalLevel !== LOG_LEVELS.INHERIT) {
    return globalLevel;
  }
  if (typeof localLevel === 'number' && localLevel >= 0) {
    return localLevel;
  }
  return defaultLevel;
}

const PREFIX_COLORS = {
  client: '#38bdf8',
  wrapper: '#38bdf8',
  userscript: '#10b981',
  parent: '#10b981',
  iframe: '#8b5cf6',
  adapter: '#06b6d4',
  command: '#3b82f6',
  action: '#3b82f6',
  mediasession: '#ec4899',
  event: '#10b981',
  lifecycle: '#ef4444',
  signal: '#6366f1',
  dom: '#f59e0b',
  top: '#10b981',
};

/**
 * Creates a scoped logger with automatic level resolution and zero-cost no-op execution when silenced.
 *
 * @param {Object} [options={}]
 * @param {string} [options.prefix='sremote'] - Scoped logger namespace
 * @param {number} [options.level] - Configured local log level
 * @param {() => number} [options.getLevel] - Custom dynamic level getter function
 * @param {number} [options.defaultLevel=LOG_LEVELS.ERROR] - Default level if unset
 * @returns {Object} Logger containing log, debug, warn, error
 */
export function createLogger(options = {}) {
  const { prefix = 'sremote', level: staticLevel, getLevel, defaultLevel = LOG_LEVELS.ERROR } = options;

  let currentLevel = staticLevel;
  let isResolving = false;

  const getEffectiveLevel = () => {
    if (isResolving) {
      return typeof currentLevel === 'number' ? currentLevel : defaultLevel;
    }
    isResolving = true;
    try {
      if (typeof getLevel === 'function') {
        const dynamic = getLevel();
        if (typeof dynamic === 'number' && dynamic >= 0) return resolveLogLevel(dynamic, defaultLevel);
      }
      return resolveLogLevel(currentLevel, defaultLevel);
    } finally {
      isResolving = false;
    }
  };

  const tag = `[SRemote:${prefix}]`;
  const color = PREFIX_COLORS[prefix.toLowerCase()] || '#38bdf8';
  const tagStyle = `color: ${color}; font-weight: bold;`;

  return {
    get level() {
      return getEffectiveLevel();
    },

    setLevel(newLevel) {
      if (typeof newLevel === 'number') {
        currentLevel = newLevel;
      }
    },

    log(...args) {
      if (getEffectiveLevel() >= LOG_LEVELS.INFO) {
        if (typeof args[0] === 'string' && args[0].startsWith('%c')) {
          console.log(...args);
        } else {
          console.log(`%c${tag}`, tagStyle, ...args);
        }
      }
    },

    debug(...args) {
      if (getEffectiveLevel() >= LOG_LEVELS.DEBUG) {
        if (typeof args[0] === 'string' && args[0].startsWith('%c')) {
          console.debug(...args);
        } else {
          console.debug(`%c${tag}`, tagStyle, ...args);
        }
      }
    },

    warn(...args) {
      if (getEffectiveLevel() >= LOG_LEVELS.ERROR) {
        if (typeof args[0] === 'string' && args[0].startsWith('%c')) {
          console.warn(...args);
        } else {
          console.warn(`%c${tag}`, 'color: #f59e0b; font-weight: bold;', ...args);
        }
      }
    },

    error(...args) {
      if (getEffectiveLevel() >= LOG_LEVELS.ERROR) {
        if (typeof args[0] === 'string' && args[0].startsWith('%c')) {
          console.error(...args);
        } else {
          console.error(`%c${tag}`, 'color: #ef4444; font-weight: bold;', ...args);
        }
      }
    },

    scope(scopePrefix) {
      const scopeTag = `[SRemote:${scopePrefix}]`;
      const scopeColor = PREFIX_COLORS[scopePrefix.toLowerCase()] || color;
      const scopeStyle = `color: ${scopeColor}; font-weight: bold;`;
      return {
        log: (...args) => {
          if (getEffectiveLevel() >= LOG_LEVELS.INFO) {
            console.log(`%c${scopeTag}`, scopeStyle, ...args);
          }
        },
        debug: (...args) => {
          if (getEffectiveLevel() >= LOG_LEVELS.DEBUG) {
            console.debug(`%c${scopeTag}`, scopeStyle, ...args);
          }
        },
        warn: (...args) => {
          if (getEffectiveLevel() >= LOG_LEVELS.ERROR) {
            console.warn(`%c${scopeTag}`, 'color: #f59e0b; font-weight: bold;', ...args);
          }
        },
        error: (...args) => {
          if (getEffectiveLevel() >= LOG_LEVELS.ERROR) {
            console.error(`%c${scopeTag}`, 'color: #ef4444; font-weight: bold;', ...args);
          }
        },
      };
    },
  };
}

// Global default logger
export const defaultLogger = createLogger({ prefix: 'core', defaultLevel: LOG_LEVELS.ERROR });
export const console_log = (...args) => defaultLogger.log(...args);
export const console_debug = (...args) => defaultLogger.debug(...args);
export const console_warn = (...args) => defaultLogger.warn(...args);
export const console_error = (...args) => defaultLogger.error(...args);

export const logger = {
  create: createLogger,
  default: defaultLogger,
  LEVELS: LOG_LEVELS,
  resolveLevel: resolveLogLevel,
  log: console_log,
  debug: console_debug,
  warn: console_warn,
  error: console_error,
};

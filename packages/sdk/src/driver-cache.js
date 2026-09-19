/**
 * Platform-Aware JIT Driver Cache
 *
 * Implements an On-Demand (JIT) per-action dispatch table cached per media instance target.
 * Automatically invalidates entries when target elements detach from DOM or when explicitly cleared.
 */
export class DriverCache {
  constructor(options = {}) {
    this.logger = options.logger || null;
    this.cache = new Map();
  }

  /**
   * Generates a stable cache key for a target
   * @param {string|Element|null} targetOrId
   * @returns {string}
   */
  getCacheKey(targetOrId) {
    if (!targetOrId) return '__default_instance__';
    if (typeof targetOrId === 'string') return targetOrId;
    if (typeof targetOrId === 'object' && targetOrId?.id) return targetOrId.id;
    if (typeof targetOrId === 'object' && targetOrId?.getAttribute) {
      return targetOrId.getAttribute('data-sremote-id') || targetOrId.tagName || '__element_target__';
    }
    return String(targetOrId);
  }

  /**
   * Gets or initializes an instance entry
   * @param {string|Element|null} targetOrId
   * @param {Object} metadata - Optional initial metadata
   * @returns {Object} instance entry
   */
  getOrCreateEntry(targetOrId, metadata = {}) {
    const key = this.getCacheKey(targetOrId);
    let entry = this.cache.get(key);

    // Liveness guard: if cached element detached from DOM, invalidate immediately
    if (typeof entry?.element?.isConnected !== 'undefined' && !entry.element.isConnected) {
      if (this.logger?.scope) {
        this.logger.scope('cache').log(`Element detached from DOM, invalidating cache for [${key}]`);
      }
      this.cache.delete(key);
      entry = null;
    }

    if (!entry) {
      entry = {
        key,
        platform: metadata.platform || 'generic',
        element: metadata.element || (typeof targetOrId === 'object' ? targetOrId : null),
        dispatchTable: {}, // JIT action -> driver mapping
        createdAt: Date.now(),
      };
      this.cache.set(key, entry);
    }
    return entry;
  }

  /**
   * Gets cached driver for an action on a target
   * @param {string|Element|null} targetOrId
   * @param {string} action
   * @returns {Object|null} Driver instance or null
   */
  getDriverForAction(targetOrId, action) {
    const key = this.getCacheKey(targetOrId);
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check liveness
    if (typeof entry.element?.isConnected !== 'undefined' && !entry.element.isConnected) {
      this.cache.delete(key);
      return null;
    }

    return entry.dispatchTable[action] || null;
  }

  /**
   * Sets cached driver for an action on a target (JIT On-Demand)
   * @param {string|Element|null} targetOrId
   * @param {string} action
   * @param {Object} driver
   * @param {Object} metadata
   */
  setDriverForAction(targetOrId, action, driver, metadata = {}) {
    const entry = this.getOrCreateEntry(targetOrId, metadata);
    entry.dispatchTable[action] = driver;
    if (metadata.platform) entry.platform = metadata.platform;
    if (metadata.element) entry.element = metadata.element;

    if (this.logger?.scope) {
      this.logger.scope('cache').log(`[JIT Cached] ${entry.key} -> action '${action}' mapped to driver`, { platform: entry.platform });
    }
  }

  /**
   * Invalidates a target's cache entry
   * @param {string|Element|null} targetOrId
   */
  invalidate(targetOrId) {
    const key = this.getCacheKey(targetOrId);
    this.cache.delete(key);
  }

  /**
   * Clears all cache entries
   */
  clear() {
    this.cache.clear();
  }
}

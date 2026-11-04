/**
 * Standardized SRemote event payload builder.
 *
 * @param {string} event - Event name
 * @param {Object} [options={}] - Payload options
 * @returns {Object} Standardized event payload
 */
export function buildEventPayload(event, options = {}) {
  const ev = String(event || '').toLowerCase();
  const {
    instanceId = 'unknown',
    source = 'adapter',
    mediaType = 'adapter',
    state = null,
    isProgrammatic = false,
    ...extra
  } = typeof options === 'object' && options !== null ? options : { value: options };

  return { source, instanceId, mediaType, event: ev, isProgrammatic, ...(state ? { state } : {}), ...extra };
}

// Backward-compatibility aliases
export const buildEventEnvelope = buildEventPayload;
export const createEventPayload = buildEventPayload;

/**
 * Builds a standardized SRemote event payload envelope.
 *
 * @param {string} event - Event name
 * @param {Object} [options={}] - Envelope options
 * @returns {Object} Standardized event envelope
 */
export function buildEventEnvelope(event, options = {}) {
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

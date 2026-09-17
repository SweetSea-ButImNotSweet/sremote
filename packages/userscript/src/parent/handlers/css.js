/**
 * Creates dynamic iframe CSS handlers for parent API.
 */
export function createCssHandlers({ rpcCall }) {
  const setIframeCSS = (css, instanceId, key) => rpcCall('setIframeCSS', { css: String(css || '') }, instanceId, key);
  const getIframeCSS = (instanceId, key) => rpcCall('getIframeCSS', {}, instanceId, key);
  const removeIframeCSS = (instanceId, key) => rpcCall('removeIframeCSS', {}, instanceId, key);

  return { setIframeCSS, getIframeCSS, removeIframeCSS };
}

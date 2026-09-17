/**
 * Standard SRemote API Specification & Schema.
 * Defines all root playback methods, sub-namespaces, action contracts, and argument rules.
 */

export const API_SPEC = Object.freeze({
  rootMethods: {
    play: { action: 'play', type: 'command', args: ['targetOrId', 'key'] },
    pause: { action: 'pause', type: 'command', args: ['targetOrId', 'key'] },
    toggle: { action: 'toggle', type: 'command', args: ['targetOrId', 'key'] },
    stop: { action: 'stop', type: 'command', args: ['targetOrId', 'key'] },
    seek: { action: 'seek', type: 'command_value', args: ['offset', 'targetOrId', 'key'] },
    seekTo: { action: 'currentTime', type: 'command_value', args: ['time', 'targetOrId', 'key'] },
    volume: { action: 'volume', type: 'command_value', args: ['vol', 'targetOrId', 'key'] },
    mute: { action: 'muted', type: 'command_value', args: ['muted', 'targetOrId', 'key'] },
    speed: { action: 'speed', type: 'command_value', args: ['rate', 'targetOrId', 'key'] },
    quality: { action: 'quality', type: 'command_value', args: ['level', 'targetOrId', 'key'] },
    getQualities: { type: 'handler', handler: 'getQualities', args: ['targetOrId', 'key'] },
    subtitle: { action: 'subtitle', type: 'command_value', args: ['track', 'targetOrId', 'key'] },
    getSubtitles: { type: 'handler', handler: 'getSubtitles', args: ['targetOrId', 'key'] },
    shuffle: { action: 'shuffle', type: 'command_value', args: ['enable', 'targetOrId', 'key'] },
    repeat: { action: 'repeat', type: 'command_value', args: ['mode', 'targetOrId', 'key'] },
    next: { action: 'next', type: 'command', args: ['targetOrId', 'key'] },
    previous: { action: 'previous', type: 'command', args: ['targetOrId', 'key'] },
    pip: { type: 'pip', args: ['enable', 'targetOrId', 'key'] },
    load: { action: 'load', type: 'command_value', args: ['source', 'targetOrId', 'key'] },
    status: { type: 'handler', handler: 'getStatus', args: ['targetOrId', 'key'] },
    capabilities: { type: 'handler', handler: 'getCapabilities', args: ['targetOrId', 'key'] },
  },

  namespaces: {
    instances: {
      list: { type: 'handler', handler: 'listInstances', args: ['key'] },
      get: { type: 'handler', handler: 'getStatus', args: ['instanceId', 'key'] },
      capabilities: { type: 'handler', handler: 'getCapabilities', args: ['instanceId', 'key'] },
      getCapabilities: { type: 'handler', handler: 'getCapabilities', args: ['instanceId', 'key'] },
      getIframe: { type: 'handler', handler: 'getIframeElement', args: ['instanceId', 'key'] },
      assign: { type: 'handler', handler: 'assignIframeId', args: ['iframeOrSelector', 'customId'] },
      setMultiMode: { type: 'handler', handler: 'setMultiMode', args: ['mode', 'key'] },
      isMultiMode: { type: 'handler', handler: 'isMultiMode', args: ['key'] },
      setExclusive: { type: 'handler', handler: 'setExclusive', args: ['mode', 'key'] },
      query: { type: 'handler', handler: 'queryInstances', args: ['key'] },
      note: { type: 'handler', handler: 'annotateInstances', args: ['dict', 'key'] },
    },
    adapters: {
      register: { type: 'handler', handler: 'registerAdapter', args: ['adapter', 'instanceId', 'key'] },
      unregister: { type: 'handler', handler: 'unregisterAdapter', args: ['instanceId', 'key'] },
      get: { type: 'handler', handler: 'getCustomAdapter', args: ['instanceId', 'key'] },
    },
    rpc: {
      call: { type: 'handler', handler: 'rpcCall', args: ['action', 'params', 'instanceId', 'key'] },
      postMessage: { type: 'handler', handler: 'postWindowMessage', args: ['message', 'targetOrigin', 'instanceId', 'from', 'key'] },
      onMessage: { type: 'handler', handler: 'onRpcMessage', args: ['handler', 'key'] },
    },
    css: {
      set: { type: 'handler', handler: 'setIframeCSS', args: ['css', 'instanceId', 'key'] },
      get: { type: 'handler', handler: 'getIframeCSS', args: ['instanceId', 'key'] },
      remove: { type: 'handler', handler: 'removeIframeCSS', args: ['instanceId', 'key'] },
    },
  },
});

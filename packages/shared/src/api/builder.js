import { API_SPEC } from './schema.js';

/**
 * Universal SRemote API Builder Factory.
 * Constructs an immutable, frozen SRemote API object from a unified specification and contextual handlers.
 *
 * @param {Object} context
 * @param {(action: string, value?: any, targetInstanceId?: string | null, key?: string | null) => Promise<any>} context.dispatchCommand
 * @param {Object} context.handlers Map of custom handler functions for namespaces and query methods
 * @param {Object} [context.eventsManager] Optional event registration manager ({ on, off, emit })
 * @param {Object} [context.lifecycleHandlers] Optional lifecycle methods ({ hello, lock, bindMetadata })
 * @param {Object} [context.debugApi] Optional debug namespace API
 * @param {Record<string, any>} [context.customExtensions] Optional custom properties/methods to attach
 * @returns {Object} Standard SRemote API Object
 */
export function buildSRemoteApi(context) {
  const { dispatchCommand, handlers = {}, eventsManager = {}, lifecycleHandlers = {}, debugApi = null, customExtensions = {} } = context;

  const api = {};

  // 1. Build Root Playback Methods
  for (const [methodName, spec] of Object.entries(API_SPEC.rootMethods)) {
    if (spec.type === 'command') {
      api[methodName] = (targetOrId, key) => dispatchCommand(spec.action, undefined, targetOrId, key);
    } else if (spec.type === 'command_value') {
      api[methodName] = (val, targetOrId, key) => dispatchCommand(spec.action, val, targetOrId, key);
    } else if (spec.type === 'pip') {
      api[methodName] = (enable, targetOrId, key) => {
        const _instanceId = typeof enable === 'string' ? enable : targetOrId;
        const _enabled = typeof enable === 'boolean' ? enable : undefined;
        return dispatchCommand(_enabled === true ? 'enterpip' : _enabled === false ? 'exitpip' : 'pip', undefined, _instanceId, key);
      };
    } else if (spec.type === 'handler' && handlers[spec.handler]) {
      api[methodName] = handlers[spec.handler];
    }
  }

  // 2. Build Sub-Namespaces
  for (const [nsName, nsSpec] of Object.entries(API_SPEC.namespaces)) {
    const nsObj = {};
    for (const [fnName, fnSpec] of Object.entries(nsSpec)) {
      if (fnSpec.type === 'handler' && handlers[fnSpec.handler]) {
        nsObj[fnName] = handlers[fnSpec.handler];
      }
    }
    api[nsName] = Object.freeze(nsObj);
  }

  // 3. Attach Events & Lifecycle
  if (eventsManager.on) api.on = eventsManager.on;
  if (eventsManager.off) api.off = eventsManager.off;
  if (eventsManager.emit) api.emit = eventsManager.emit;

  if (lifecycleHandlers.hello) api.hello = lifecycleHandlers.hello;
  if (lifecycleHandlers.lock) api.lock = lifecycleHandlers.lock;
  if (lifecycleHandlers.bindMetadata) {
    api.bindMetadata = lifecycleHandlers.bindMetadata;
  } else if (dispatchCommand) {
    api.bindMetadata = (meta, instanceId, key) => dispatchCommand('bindMetadata', meta, instanceId, key);
  }

  // 4. Attach Debug namespace if provided
  if (debugApi) {
    api.debug = debugApi;
  }

  // 5. Attach Custom Extensions
  Object.assign(api, customExtensions);

  return Object.freeze(api);
}

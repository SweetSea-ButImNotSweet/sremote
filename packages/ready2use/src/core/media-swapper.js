/**
 * In-Place Media Swapper for SRemote Ready2Use
 * Coordinates seamless media replacement on a mount point,
 * reusing native APIs when on the same platform, or hot-swapping DOM nodes
 * across platforms while preserving instance ID and remote references.
 */

import { resolveProviderFromUrl } from './url-resolver.js';
import { getProvider } from './provider-registry.js';

/**
 * Creates an in-place media swapper bound to an active mount instance.
 *
 * @param {Object} mountContext
 * @param {HTMLElement} mountContext.container
 * @param {import('./base-provider.js').BaseProvider} mountContext.provider
 * @param {Object} mountContext.currentResult
 * @param {string} mountContext.instanceId
 * @param {any} [mountContext.sremoteClient]
 * @param {Object} [mountContext.commonOptions]
 * @returns {(targetUrlOrOptions: string | Object) => Promise<Object>}
 */
export function createMediaSwapper(mountContext) {
  let isSwapping = false;

  return async function swap(targetUrlOrOptions) {
    if (isSwapping) {
      throw new Error('[SRemote:Ready2Use] A media swap is already in progress');
    }

    isSwapping = true;
    const { container, sremoteClient, instanceId, commonOptions = {} } = mountContext;

    try {
      let targetProviderName = null;
      let targetOptions = {};

      if (typeof targetUrlOrOptions === 'string') {
        const resolved = resolveProviderFromUrl(targetUrlOrOptions);
        if (!resolved) {
          throw new Error(`[SRemote:Ready2Use] Could not resolve provider from URL: '${targetUrlOrOptions}'`);
        }
        targetProviderName = resolved.providerName;
        targetOptions = resolved.options;
      } else if (targetUrlOrOptions && typeof targetUrlOrOptions === 'object') {
        if (targetUrlOrOptions.url) {
          const resolved = resolveProviderFromUrl(targetUrlOrOptions.url, targetUrlOrOptions);
          if (resolved) {
            targetProviderName = resolved.providerName;
            targetOptions = resolved.options;
          }
        }
        if (!targetProviderName) {
          targetProviderName = targetUrlOrOptions.provider || mountContext.currentProvider?.name;
          targetOptions = { ...targetUrlOrOptions };
        }
      }

      if (!targetProviderName) {
        throw new Error('[SRemote:Ready2Use] Target provider or URL is required for swap()');
      }

      const currentProvider = mountContext.currentProvider;
      const currentResult = mountContext.currentResult;
      const isSamePlatform = currentProvider && currentProvider.name === targetProviderName;

      // Strategy 1: Native In-Place Loading (Same platform with native load capability)
      if (isSamePlatform && currentResult?.adapter && typeof currentResult.adapter.load === 'function') {
        const source = targetOptions.videoId || targetOptions.trackUrl || targetOptions.url || targetOptions.id || targetOptions;
        currentResult.adapter.load(source);

        if (targetOptions.startTime && typeof currentResult.adapter.seekTo === 'function') {
          setTimeout(() => {
            try {
              currentResult.adapter.seekTo(targetOptions.startTime);
            } catch {}
          }, 150);
        }

        const payload = { instanceId, provider: targetProviderName, options: targetOptions, inPlace: true };
        sremoteClient?.emit?.('provider:swapped', payload);
        currentResult.adapter?.emit?.('provider:swapped', payload);
        return currentResult;
      }

      // Strategy 2: Hot DOM Swapping (Cross-Platform or non-loadable adapter)
      sremoteClient?.emit?.('provider:loading', { provider: targetProviderName, instanceId, options: targetOptions, swap: true });

      // Cleanly teardown old player without removing the wrapper container
      try {
        if (typeof currentResult?.destroy === 'function') {
          currentResult.destroy();
        }
      } catch {}

      if (container) {
        container.innerHTML = '';
      }

      // Fetch and mount new provider
      const nextProvider = await getProvider(targetProviderName);
      const mergedOptions = { ...commonOptions, ...targetOptions, instanceId, container, register: true, sremote: sremoteClient };

      const newResult = await nextProvider.mount(container, mergedOptions);

      // Update mount context references
      mountContext.currentProvider = nextProvider;
      mountContext.currentResult = newResult;

      const payload = { instanceId, provider: targetProviderName, options: targetOptions, inPlace: false };
      sremoteClient?.emit?.('provider:ready', { provider: targetProviderName, instanceId, capabilities: newResult.capabilities, element: newResult.element, swap: true });
      sremoteClient?.emit?.('provider:swapped', payload);
      newResult.adapter?.emit?.('provider:swapped', payload);

      return newResult;
    } finally {
      isSwapping = false;
    }
  };
}

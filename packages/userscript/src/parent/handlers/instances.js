import { capabilities, state } from '@sremote/shared';

/**
 * Creates instances domain handlers for parent API.
 */
export function createInstancesHandlers({ instanceManager, validateDomainAccess, queryMediaInstancesViaGM, logger }) {
  const { instances, assignedIframeIdMap, iframeToAssignedIdMap, isMultiModeActive, pauseOthersExcept } = instanceManager;

  const assignIframeId = (iframeOrSelector, customId) => {
    if (!customId || typeof customId !== 'string') return false;
    let el = null;
    if (typeof iframeOrSelector === 'string') {
      el = document.querySelector(iframeOrSelector);
    } else if (iframeOrSelector?.nodeType === 1 && iframeOrSelector?.tagName === 'IFRAME') {
      el = iframeOrSelector;
    }
    if (!el) return false;
    const cleanId = customId.trim();
    el.setAttribute('data-sremote-id', cleanId);
    assignedIframeIdMap.set(cleanId, el);
    iframeToAssignedIdMap.set(el, cleanId);
    logger.scope('assignId').log(`Pre-assigned instance ID '${cleanId}' to iframe element`, el);
    return true;
  };

  const getIframeElement = (instanceId, key) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked getIframe()! Valid Passkey is required.');
      return null;
    }
    if (!instanceId) return null;
    const inst = instances.get(instanceId);
    if (inst?.iframeEl?.isConnected) return inst.iframeEl;
    return assignedIframeIdMap.get(instanceId) || null;
  };

  const getStatus = (instanceId, key) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked status()! Valid Passkey is required.');
      return null;
    }
    let targetId = instanceId;
    if (!targetId) {
      targetId = instanceManager.currentActiveInstanceId || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
    }

    if (targetId && instances.has(targetId)) {
      const inst = instances.get(targetId);
      if (inst.isTopMedia && inst.mediaElement) {
        return state.get(inst.mediaElement);
      }
      return inst.state || null;
    }
    return null;
  };

  const getCapabilities = (instanceId, key) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked capabilities()! Valid Passkey is required.');
      return null;
    }
    let targetId = instanceId;
    if (!targetId) {
      targetId = instanceManager.currentActiveInstanceId || (instances.size === 1 ? Array.from(instances.keys())[0] : null);
    }
    if (targetId && instances.has(targetId)) {
      const inst = instances.get(targetId);
      if (inst.isTopMedia && inst.mediaElement) {
        return capabilities.get(inst.mediaElement);
      }
      return (
        inst.capabilities || {
          play: true,
          pause: true,
          toggle: true,
          stop: true,
          seek: true,
          volume: true,
          muted: true,
          speed: true,
          playbackRate: true,
          pip: inst.mediaType === 'video',
          quality: false,
          subtitles: false,
          shuffle: false,
          repeat: true,
          next: false,
          previous: false,
          load: true,
          hasAdapter: false,
          hasNative: Boolean(inst.mediaType === 'video' || inst.mediaType === 'audio'),
          hasMediaSession: false,
        }
      );
    }
    return null;
  };

  const listInstances = key => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked list()! Valid Passkey is required.');
      return [];
    }
    const result = Array.from(instances.entries()).map(([id, info]) => ({
      instanceId: id,
      location: info.location,
      origin: info.origin,
      note: info.note || '',
      mediaType: info.mediaType,
      capabilities: info.capabilities || null,
      state: info.state,
      status: info.status || 'ready',
    }));
    return result;
  };

  const setMultiMode = (mode, key) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked setMultiMode()! Valid Passkey is required.');
      return;
    }
    if (typeof mode === 'boolean' || mode === null) {
      instanceManager.setMultiModeConfig(mode);
    }
  };

  const isMultiMode = key => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked isMultiMode()! Valid Passkey is required.');
      return false;
    }
    return isMultiModeActive();
  };

  const setExclusive = (mode, key) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked setExclusive()! Valid Passkey is required.');
      return;
    }
    instanceManager.setExclusiveMode(mode);
    if (mode && mode !== 'auto' && instances.has(mode)) {
      pauseOthersExcept(mode);
    }
  };

  const annotateInstances = (notesDict, key) => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked note()! Valid Passkey is required.');
      return;
    }
    if (typeof notesDict === 'object' && notesDict) {
      for (const [id, note] of Object.entries(notesDict)) {
        const inst = instances.get(id);
        if (inst) inst.note = String(note);
      }
    }
  };

  const queryInstances = key => {
    if (!validateDomainAccess(key)) {
      logger.scope('auth').error('Blocked query()! Valid Passkey is required.');
      return [];
    }
    return queryMediaInstancesViaGM();
  };

  const getQualities = instanceId => {
    const inst = instanceId ? instances.get(instanceId) : null;
    return inst?.capabilities?.qualities || [];
  };

  const getSubtitles = instanceId => {
    const inst = instanceId ? instances.get(instanceId) : null;
    return inst?.capabilities?.subtitles || [];
  };

  return {
    assignIframeId,
    getIframeElement,
    getStatus,
    getCapabilities,
    listInstances,
    setMultiMode,
    isMultiMode,
    setExclusive,
    annotateInstances,
    queryInstances,
    getQualities,
    getSubtitles,
  };
}

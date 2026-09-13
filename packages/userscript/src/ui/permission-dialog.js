import { Storage } from '../core/storage.js';
import { getPermissionPairStorageKeys, checkOriginPairPermission } from '../core/utils.js';
import { t } from '../core/i18n.js';
import { createModal } from './modal.js';

// Queue management for concurrent permission requests
const pendingQueue = []; // Array of { parentOrigin, iframeOrigin, isTop, callbacks: Function[], dialogHandle }
let activeQueueItem = null;

function processNextInQueue() {
  if (activeQueueItem || pendingQueue.length === 0) return;

  const nextItem = pendingQueue.shift();
  activeQueueItem = nextItem;

  const { parentOrigin, iframeOrigin, isTop, callbacks } = nextItem;

  // Re-check storage in case a previous prompt already resolved this pair
  const perm = checkOriginPairPermission(parentOrigin, iframeOrigin, Storage);
  if (perm.isDenied) {
    activeQueueItem = null;
    callbacks.forEach(cb => cb(false));
    processNextInQueue();
    return;
  }
  if (perm.isAllowed) {
    activeQueueItem = null;
    callbacks.forEach(cb => cb(true));
    processNextInQueue();
    return;
  }

  const { pairAllowKey, pairDenyKey, isPersistable } = getPermissionPairStorageKeys(parentOrigin, iframeOrigin);
  const container = document.createElement('div');

  const rememberLabel = document.createElement('label');
  rememberLabel.className = 'sv-remember';
  if (!isPersistable) rememberLabel.style.display = 'none';

  const chk = document.createElement('input');
  chk.type = 'checkbox';
  const rememberSpan = document.createElement('span');
  rememberSpan.textContent = t('rememberChoice');
  rememberLabel.append(chk, rememberSpan);

  // Handle direct label/span click: preventDefault prevents browser double-toggle conflict
  rememberLabel.addEventListener('click', e => {
    e.stopPropagation();
    if (e.target !== chk) {
      e.preventDefault();
      chk.checked = !chk.checked;
      chk.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  chk.addEventListener('click', e => {
    e.stopPropagation();
  });

  container.append(rememberLabel);

  function handleDecision(result) {
    const remember = isPersistable && chk.checked;
    activeQueueItem = null;

    if (remember && pairAllowKey && pairDenyKey) {
      if (result) {
        Storage.set(pairAllowKey, '1');
        Storage.remove(pairDenyKey);
      } else {
        Storage.set(pairDenyKey, '1');
        Storage.remove(pairAllowKey);
      }
    }

    callbacks.forEach(cb => {
      try {
        cb(result);
      } catch {}
    });

    processNextInQueue();
  }

  const modal = createModal({
    titleText: t('dialogTitle'),
    bodyText: t('dialogText'),
    bodyElement: container,
    isTop,
    hostId: isTop ? 'sremote-top-permission-host' : 'sremote-permission-host',
    buttons: [
      {
        className: 'sv-btn-deny',
        text: t('denyBtn'),
        onClick: (_, { close }) => {
          close(false);
          handleDecision(false);
        },
      },
      {
        className: 'sv-btn-allow',
        text: t('allowBtn'),
        onClick: (_, { close }) => {
          close(true);
          handleDecision(true);
        },
      },
    ],
    onClose: () => {
      if (activeQueueItem === nextItem) {
        activeQueueItem = null;
        callbacks.forEach(cb => {
          try {
            cb(false);
          } catch {}
        });
        processNextInQueue();
      }
    },
  });

  nextItem.modal = modal;
}

export function createPermissionDialog({ origin, iframeOrigin = null, parentOrigin = null, onDecision, isTop = false }) {
  // Support legacy parameter signature: origin could be iframeOrigin or target
  const effectiveIframeOrigin = iframeOrigin || origin;
  const effectiveParentOrigin = parentOrigin || (isTop && typeof location !== 'undefined' ? location.origin : null) || 'unknown_parent';

  // 1. Immediate storage verification
  const perm = checkOriginPairPermission(effectiveParentOrigin, effectiveIframeOrigin, Storage);
  if (perm.isDenied) {
    onDecision?.(false);
    return { close: () => {} };
  }
  if (perm.isAllowed) {
    onDecision?.(true);
    return { close: () => {} };
  }

  // 2. Check if there is already an active dialog for this exact same origin pair
  if (activeQueueItem?.parentOrigin === effectiveParentOrigin && activeQueueItem?.iframeOrigin === effectiveIframeOrigin) {
    if (typeof onDecision === 'function') {
      activeQueueItem.callbacks.push(onDecision);
    }
    return {
      close: () => {
        if (activeQueueItem?.modal) activeQueueItem.modal.close();
      },
    };
  }

  // 3. Check if there is a pending queue item for this exact same origin pair
  const existingPending = pendingQueue.find(item => item.parentOrigin === effectiveParentOrigin && item.iframeOrigin === effectiveIframeOrigin);
  if (existingPending) {
    if (typeof onDecision === 'function') {
      existingPending.callbacks.push(onDecision);
    }
    return {
      close: () => {
        const idx = pendingQueue.indexOf(existingPending);
        if (idx !== -1) pendingQueue.splice(idx, 1);
      },
    };
  }

  // 4. Enqueue new permission request
  const newItem = { parentOrigin: effectiveParentOrigin, iframeOrigin: effectiveIframeOrigin, isTop, callbacks: typeof onDecision === 'function' ? [onDecision] : [], modal: null };

  pendingQueue.push(newItem);
  processNextInQueue();

  return {
    close: () => {
      if (activeQueueItem === newItem) {
        if (newItem.modal) newItem.modal.close();
      } else {
        const idx = pendingQueue.indexOf(newItem);
        if (idx !== -1) pendingQueue.splice(idx, 1);
      }
    },
  };
}

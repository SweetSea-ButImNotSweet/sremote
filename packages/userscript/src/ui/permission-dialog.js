import { Storage } from '../core/storage.js';
import { isPersistableOrigin, getOriginStorageKeys } from '../core/utils.js';
import { t } from '../core/i18n.js';
import { createModal } from './modal.js';

let activePermissionHost = null;

export function createPermissionDialog({ origin, onDecision, isTop = false }) {
  if (activePermissionHost) return;

  const { allowKey, denyKey } = getOriginStorageKeys(origin);
  if (Storage.get(denyKey) === '1') {
    onDecision?.(false);
    return;
  }
  if (Storage.get(allowKey) === '1') {
    onDecision?.(true);
    return;
  }

  const persistable = isPersistableOrigin(origin);
  const container = document.createElement('div');

  const rememberLabel = document.createElement('label');
  rememberLabel.className = 'sv-remember';
  if (!persistable) rememberLabel.style.display = 'none';

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
    const remember = persistable && chk.checked;
    activePermissionHost = null;

    if (remember && allowKey && denyKey) {
      if (result) {
        Storage.set(allowKey, '1');
        Storage.remove(denyKey);
      } else {
        Storage.set(denyKey, '1');
        Storage.remove(allowKey);
      }
    }

    if (isTop) {
      // Notify storage decision token to dismiss any open prompt in child iframes
      Storage.set('sremote:permission_decision', { origin, allowed: result, timestamp: Date.now() });
    }

    onDecision?.(result);
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
      activePermissionHost = null;
    },
  });

  activePermissionHost = modal.host;

  return {
    close: () => {
      modal.close();
      activePermissionHost = null;
    },
  };
}

import { Storage } from '../core/storage.js';
import { isPersistableOrigin, getOriginStorageKeys, createButton } from '../core/utils.js';
import { t } from '../core/i18n.js';
import UI_CSS from './styles.css?raw';

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

  const host = document.createElement('div');
  host.id = isTop ? 'sremote-top-permission-host' : 'sremote-permission-host';
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = UI_CSS;

  const dialog = document.createElement('dialog');
  const box = document.createElement('div');
  box.className = 'sv-box';

  const title = document.createElement('div');
  title.className = 'sv-title';
  title.textContent = t('dialogTitle');

  const text = document.createElement('div');
  text.className = 'sv-text';
  text.textContent = t('dialogText');

  const persistable = isPersistableOrigin(origin);
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

  function closeDialog(result) {
    const remember = persistable && chk.checked;
    try {
      dialog.close();
    } catch {}
    host.remove();
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
      Storage.set('sremote:permission_decision', {
        origin,
        allowed: result,
        timestamp: Date.now(),
      });
    }

    onDecision?.(result);
  }

  const buttons = document.createElement('div');
  buttons.className = 'sv-buttons';
  const btnDeny = createButton({
    className: 'sv-btn sv-btn-deny',
    text: t('denyBtn'),
    onClick: () => closeDialog(false),
  });
  const btnAllow = createButton({
    className: 'sv-btn sv-btn-allow',
    text: t('allowBtn'),
    onClick: () => closeDialog(true),
  });
  buttons.append(btnDeny, btnAllow);

  box.append(title, text, rememberLabel, buttons);
  dialog.append(box);
  shadow.append(style, dialog);
  dialog.addEventListener('cancel', e => {
    e.preventDefault();
  });

  const mountHost = () => {
    const targetMount = document.body || document.documentElement;
    if (targetMount && !host.isConnected) {
      targetMount.appendChild(host);
    }
  };
  mountHost();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountHost, { once: true });
  }

  activePermissionHost = host;
  try {
    dialog.showModal();
  } catch {
    dialog.setAttribute('open', '');
  }

  return {
    close: () => {
      try {
        dialog.close();
      } catch {}
      host.remove();
      activePermissionHost = null;
    },
  };
}

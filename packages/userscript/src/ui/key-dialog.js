import { t } from '../core/i18n.js';
import { createModal } from './modal.js';
import { GM } from '../core/storage.js';

let activeKeyDialogHost = null;

function copyText(text) {
  try {
    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(text, 'text');
      return Promise.resolve();
    }
  } catch {}

  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => {});
  }
  return Promise.resolve();
}

export function showPasskeyDialog({ domain, key }) {
  if (activeKeyDialogHost) {
    try {
      activeKeyDialogHost.remove();
    } catch {}
    activeKeyDialogHost = null;
  }

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '10px';
  container.style.marginBottom = '14px';

  const desc = document.createElement('div');
  desc.className = 'sv-text';
  desc.style.marginBottom = '0';
  desc.textContent = t('keyDialogDesc', { domain });

  const inputRow = document.createElement('div');
  inputRow.style.display = 'flex';
  inputRow.style.gap = '8px';
  inputRow.style.alignItems = 'stretch';

  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.readOnly = true;
  keyInput.value = key;
  keyInput.style.flex = '1';
  keyInput.style.padding = '7px 10px';
  keyInput.style.border = '1px dashed #aeb7c2';
  keyInput.style.borderRadius = '4px';
  keyInput.style.background = 'rgba(0, 0, 0, 0.05)';
  keyInput.style.color = 'inherit';
  keyInput.style.fontFamily = 'monospace, monospace';
  keyInput.style.fontSize = '13px';
  keyInput.style.fontWeight = '700';
  keyInput.style.letterSpacing = '0.5px';
  keyInput.style.outline = 'none';
  keyInput.style.boxSizing = 'border-box';

  keyInput.addEventListener('click', () => {
    keyInput.select();
  });

  const inlineCopyBtn = document.createElement('button');
  inlineCopyBtn.type = 'button';
  inlineCopyBtn.className = 'sv-btn sv-btn-allow';
  inlineCopyBtn.style.padding = '6px 12px';
  inlineCopyBtn.style.whiteSpace = 'nowrap';
  inlineCopyBtn.style.fontSize = '12px';
  inlineCopyBtn.textContent = t('copyKeyBtn');

  const handleCopy = btnElement => {
    copyText(key);
    keyInput.select();
    if (btnElement) {
      const orig = btnElement.textContent;
      btnElement.textContent = `✓ ${t('copiedBtn')}`;
      setTimeout(() => {
        if (btnElement) btnElement.textContent = orig;
      }, 1500);
    }
  };

  inlineCopyBtn.addEventListener('click', () => {
    handleCopy(inlineCopyBtn);
  });

  inputRow.append(keyInput, inlineCopyBtn);

  const hint = document.createElement('div');
  hint.style.fontSize = '11.5px';
  hint.style.color = '#64748b';
  hint.textContent = t('keyDialogHint');

  container.append(desc, inputRow, hint);

  const modal = createModal({
    titleText: t('keyDialogTitle'),
    bodyElement: container,
    isTop: true,
    hostId: 'sremote-key-dialog-host',
    buttons: [
      {
        className: 'sv-btn-deny',
        text: t('closeBtn'),
        onClick: (_, { close }) => {
          close();
        },
      },
    ],
    onClose: () => {
      activeKeyDialogHost = null;
    },
  });

  activeKeyDialogHost = modal.host;

  // Auto copy on open
  copyText(key);

  return modal;
}

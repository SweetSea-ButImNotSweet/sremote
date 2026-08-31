import THEME_CSS from '@sremote/shared/src/css/theme.css?raw';
import MODAL_CSS from '@sremote/shared/src/css/modal.css?raw';
import USERSCRIPT_CSS from './styles.css?raw';
import { createButton } from '../core/utils.js';

const COMBINED_CSS = `${THEME_CSS}\n${MODAL_CSS}\n${USERSCRIPT_CSS}`;

export function createModal({ titleText = 'SRemote', bodyElement = null, bodyText = '', buttons = [], onClose = null, isTop = false, hostId = null }) {
  const host = document.createElement('div');
  host.id = hostId || (isTop ? 'sremote-top-modal-host' : 'sremote-modal-host');
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = COMBINED_CSS;

  const dialog = document.createElement('dialog');
  const box = document.createElement('div');
  box.className = 'sv-box';

  const title = document.createElement('div');
  title.className = 'sv-title';
  title.textContent = titleText;

  box.append(title);

  if (bodyText) {
    const text = document.createElement('div');
    text.className = 'sv-text';
    text.textContent = bodyText;
    box.append(text);
  }

  if (bodyElement) {
    box.append(bodyElement);
  }

  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'sv-buttons';

  function close(result) {
    try {
      dialog.close();
    } catch {}
    host.remove();
    onClose?.(result);
  }

  if (buttons.length > 0) {
    buttons.forEach(btnConfig => {
      const btn = createButton({
        className: `sv-btn ${btnConfig.className || ''}`.trim(),
        text: btnConfig.text,
        onClick: e => {
          if (btnConfig.onClick) {
            btnConfig.onClick(e, { close });
          } else {
            close(btnConfig.value);
          }
        },
      });
      buttonsContainer.append(btn);
    });
    box.append(buttonsContainer);
  }

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

  try {
    dialog.showModal();
  } catch {
    dialog.setAttribute('open', '');
  }

  return { host, dialog, box, close };
}

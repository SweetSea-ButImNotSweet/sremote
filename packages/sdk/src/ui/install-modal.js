import THEME_CSS from '@sremote/shared/src/css/theme.css?raw';
import MODAL_CSS from '@sremote/shared/src/css/modal.css?raw';
import INSTALL_CSS from './install-modal.css?raw';

const COMBINED_INSTALL_CSS = `${THEME_CSS}\n${MODAL_CSS}\n${INSTALL_CSS}`;

function detectBrowser() {
  if (typeof navigator === 'undefined') return 'chrome';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('opr/') || ua.includes('opera/')) return 'opera';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  return 'chrome';
}

const EXTENSION_LINKS = {
  chrome: {
    tampermonkey: 'https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkmingnoiobeogfiigjmhednnj',
    violentmonkey: 'https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag',
  },
  firefox: { tampermonkey: 'https://addons.mozilla.org/firefox/addon/tampermonkey/', violentmonkey: 'https://addons.mozilla.org/firefox/addon/violentmonkey/' },
  edge: {
    tampermonkey: 'https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepgglflondmnje',
    violentmonkey: 'https://microsoftedge.microsoft.com/addons/detail/violentmonkey/eeagobfjfgddacbcigncyclcoaebeent',
  },
  opera: { tampermonkey: 'https://addons.opera.com/extensions/details/tampermonkey-beta/' },
  safari: { tampermonkey: 'https://apps.apple.com/app/tampermonkey/id1482490089' },
};

let activeInstallModal = null;

/**
 * Show a userscript installation guide modal with shadow DOM isolation.
 *
 * @param {Object} [options]
 * @param {string} [options.userscriptUrl] URL to the .user.js file
 * @param {string} [options.title] Modal title
 * @param {string} [options.description] Short explanation
 * @param {boolean} [options.autoDetect] Automatically detect when userscript is activated
 * @param {Function} [options.onClose] Callback when modal is closed
 * @param {Function} [options.onSuccess] Callback when userscript is detected
 * @returns {{ host: HTMLElement, close: () => void }}
 */
export function showInstallModal(options = {}) {
  if (typeof document === 'undefined') {
    return { host: null, close: () => {} };
  }

  // Close existing modal if open
  if (activeInstallModal) {
    activeInstallModal.close();
  }

  const {
    userscriptUrl = 'https://raw.githubusercontent.com/SweetSea-ButImNotSweet/sremote/main/dist/sremote.user.js',
    learnMoreUrl = 'https://github.com/SweetSea-ButImNotSweet/sremote/blob/main/packages/userscript/README.md',
    learnMoreText = 'Tại sao cần cài script này?',
    title = 'Yêu cầu SRemote Userscript',
    description = 'Trang web cần SRemote Userscript để tương tác và điều khiển media trong iframe cross-origin.',
    autoDetect = true,
    onClose = null,
    onSuccess = null,
  } = options;

  const browser = detectBrowser();
  const host = document.createElement('div');
  host.id = 'sremote-install-modal-host';
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = COMBINED_INSTALL_CSS;

  const dialog = document.createElement('dialog');
  const box = document.createElement('div');
  box.className = 'sv-box sv-install-box';

  let isClosed = false;
  let statusBanner = null;
  let success = false;
  let autoCloseTimer = null;

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('sremote:ready', onUserscriptReady);
      window.removeEventListener('sremote:driver:ready', onUserscriptReady);
    }
    try {
      dialog.close();
    } catch {}
    host.remove();
    if (activeInstallModal?.host === host) {
      activeInstallModal = null;
    }
    onClose?.({ success });
  };

  activeInstallModal = { host, close };

  // Header
  const header = document.createElement('div');
  header.className = 'sv-install-header';

  const titleEl = document.createElement('div');
  titleEl.className = 'sv-install-title';
  titleEl.textContent = title;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'sv-install-close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.title = 'Đóng';
  closeBtn.addEventListener('click', e => {
    e.stopPropagation();
    close();
  });

  header.append(titleEl, closeBtn);
  box.append(header);

  // Description & Learn More
  if (description || learnMoreUrl) {
    const descEl = document.createElement('div');
    descEl.className = 'sv-text sv-install-desc';
    if (description) {
      const textSpan = document.createElement('span');
      textSpan.textContent = description;
      descEl.append(textSpan);
    }
    if (learnMoreUrl) {
      const learnMoreLink = document.createElement('a');
      learnMoreLink.className = 'sv-install-learn-more';
      learnMoreLink.href = learnMoreUrl;
      learnMoreLink.target = '_blank';
      learnMoreLink.rel = 'noopener noreferrer';
      learnMoreLink.textContent = ` ${learnMoreText}`;
      descEl.append(learnMoreLink);
    }
    box.append(descEl);
  }

  // Status Banner
  statusBanner = document.createElement('div');
  statusBanner.className = 'sv-status-banner waiting';
  statusBanner.innerHTML = `
    <div class="sv-status-spinner"></div>
    <span>Đang chờ nhận diện Userscript...</span>
  `;
  box.append(statusBanner);

  // 2-Column Horizontal Cards
  const gridContainer = document.createElement('div');
  gridContainer.className = 'sv-install-grid';

  // Card 1: Install Extension
  const card1 = document.createElement('div');
  card1.className = 'sv-install-card';
  const links = EXTENSION_LINKS[browser] || EXTENSION_LINKS.chrome;

  let extLinksHtml = '';
  if (links.tampermonkey) {
    extLinksHtml += `<a class="sv-ext-link sv-ext-recommended" href="${links.tampermonkey}" target="_blank" rel="noopener noreferrer">Tampermonkey</a>`;
  }
  if (links.violentmonkey) {
    extLinksHtml += `<a class="sv-ext-link" href="${links.violentmonkey}" target="_blank" rel="noopener noreferrer">Violentmonkey</a>`;
  }

  card1.innerHTML = `
    <div>
      <div class="sv-install-card-header">
        <div class="sv-install-card-num">1</div>
        <div class="sv-install-card-title">Cài Extension</div>
      </div>
      <div class="sv-install-card-desc" style="margin-top: 6px;">
        Cần tiện ích quản lý userscript cho trình duyệt (${browser}):
      </div>
    </div>
    <div class="sv-install-card-action">
      ${extLinksHtml}
    </div>
  `;
  gridContainer.append(card1);

  // Card 2: Install Userscript
  const card2 = document.createElement('div');
  card2.className = 'sv-install-card';
  card2.innerHTML = `
    <div>
      <div class="sv-install-card-header">
        <div class="sv-install-card-num">2</div>
        <div class="sv-install-card-title">Cài Userscript</div>
      </div>
      <div class="sv-install-card-desc" style="margin-top: 6px;">
        Mở liên kết bên dưới và bấm "Cài đặt / Install":
      </div>
    </div>
    <div class="sv-install-card-action">
      <a class="sv-btn sv-btn-primary sv-script-btn" href="${userscriptUrl}" target="_blank" rel="noopener noreferrer">
        Cài đặt .user.js
      </a>
    </div>
  `;
  gridContainer.append(card2);

  box.append(gridContainer);

  // Footer Buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'sv-buttons';

  const reloadBtn = document.createElement('button');
  reloadBtn.type = 'button';
  reloadBtn.className = 'sv-btn sv-btn-deny';
  reloadBtn.textContent = 'Tải lại trang';
  reloadBtn.addEventListener('click', () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  });

  const doneBtn = document.createElement('button');
  doneBtn.type = 'button';
  doneBtn.className = 'sv-btn';
  doneBtn.textContent = 'Đóng';
  doneBtn.addEventListener('click', () => {
    close();
  });

  buttonsContainer.append(reloadBtn, doneBtn);
  box.append(buttonsContainer);

  dialog.append(box);
  shadow.append(style, dialog);

  dialog.addEventListener('cancel', e => {
    e.preventDefault();
    close();
  });

  dialog.addEventListener('click', e => {
    if (e.target === dialog) {
      close();
    }
  });

  // Mount
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

  function handleDetected() {
    success = true;
    if (statusBanner) {
      statusBanner.className = 'sv-status-banner success';
      statusBanner.innerHTML = `
        <span>✓</span>
        <span>Userscript đã được kích hoạt thành công!</span>
      `;
    }
    onSuccess?.();

    // Auto-close after 1.2s on detection for seamless UX
    if (!autoCloseTimer) {
      autoCloseTimer = setTimeout(() => {
        close();
      }, 1200);
    }
  }

  function onUserscriptReady() {
    handleDetected();
  }

  // Check if driver or userscript is already present
  if (autoDetect && typeof window !== 'undefined') {
    if (window[Symbol.for('__sremote_native_driver__')] || window.sremote?.isSremoteNative) {
      handleDetected();
    } else {
      window.addEventListener('sremote:driver:ready', onUserscriptReady, { once: true });
      window.addEventListener('sremote:ready', onUserscriptReady, { once: true });
    }
  }

  return { host, close };
}

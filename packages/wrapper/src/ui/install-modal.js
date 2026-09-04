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

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    if (typeof window !== 'undefined') {
      window.removeEventListener('sremote:ready', onUserscriptReady);
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
    <span>Chờ nhận diện Userscript...</span>
  `;
  box.append(statusBanner);

  // Steps container
  const stepsContainer = document.createElement('div');
  stepsContainer.className = 'sv-steps';

  // Step 1: Install Extension
  const step1 = document.createElement('div');
  step1.className = 'sv-step';
  const links = EXTENSION_LINKS[browser] || EXTENSION_LINKS.chrome;

  let extLinksHtml = '';
  if (links.tampermonkey) {
    extLinksHtml += `<a class="sv-ext-link sv-ext-recommended" href="${links.tampermonkey}" target="_blank" rel="noopener noreferrer">Tampermonkey (${browser})</a>`;
  }
  if (links.violentmonkey) {
    extLinksHtml += `<a class="sv-ext-link" href="${links.violentmonkey}" target="_blank" rel="noopener noreferrer">Violentmonkey</a>`;
  }

  step1.innerHTML = `
    <div class="sv-step-num">1</div>
    <div class="sv-step-content">
      <div class="sv-step-title">Cài extension Userscript manager</div>
      <div>Chọn một extension phù hợp cho trình duyệt:</div>
      <div class="sv-extensions-list">
        ${extLinksHtml}
      </div>
    </div>
  `;
  stepsContainer.append(step1);

  // Step 2: Click to Install Script
  const step2 = document.createElement('div');
  step2.className = 'sv-step';
  step2.innerHTML = `
    <div class="sv-step-num">2</div>
    <div class="sv-step-content">
      <div class="sv-step-title">Cài đặt script</div>
      <div>Bấm nút bên dưới để mở trang cài đặt script:</div>
      <div class="sv-install-action">
        <a class="sv-btn sv-btn-primary" href="${userscriptUrl}" target="_blank" rel="noopener noreferrer">
          Cài đặt .user.js
        </a>
      </div>
    </div>
  `;
  stepsContainer.append(step2);

  // Step 3: Finish & Reload
  const step3 = document.createElement('div');
  step3.className = 'sv-step';
  step3.innerHTML = `
    <div class="sv-step-num">3</div>
    <div class="sv-step-content">
      <div class="sv-step-title">Xác nhận</div>
      <div>Sau khi bấm Cài đặt trong extension, quay lại trang này hoặc tải lại trang.</div>
    </div>
  `;
  stepsContainer.append(step3);

  box.append(stepsContainer);

  // Footer Buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'sv-buttons';

  const reloadBtn = document.createElement('button');
  reloadBtn.className = 'sv-btn sv-btn-deny';
  reloadBtn.textContent = 'Tải lại trang';
  reloadBtn.addEventListener('click', () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  });

  const doneBtn = document.createElement('button');
  doneBtn.className = 'sv-btn sv-btn-primary';
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
        <span>Userscript đã được kích hoạt.</span>
      `;
    }
    onSuccess?.();
  }

  function onUserscriptReady() {
    handleDetected();
  }

  // Check if userscript is already present
  if (autoDetect && typeof window !== 'undefined') {
    if (window.sremote && !window.sremote.isDummy) {
      handleDetected();
    } else {
      window.addEventListener('sremote:ready', onUserscriptReady, { once: true });
    }
  }

  return { host, close };
}

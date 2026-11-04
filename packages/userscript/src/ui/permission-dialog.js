import { Storage } from '../core/storage.js';
import { checkPermission, normalizeOrigin } from '../core/utils.js';
import { t } from '../core/i18n.js';
import { createModal } from './modal.js';
import { logger } from '../config.js';

// Table Queue management: gom toàn bộ các iframe origin đang chờ
// pendingItems: Map<pairKey, { parentOrigin, iframeOrigin, isTop, callbacks: Function[], rowElement?: HTMLElement }>
const pendingItems = new Map();
let activeDialog = null; // { modal, containerEl, isSingleMode, updateView: Function }
const sessionBlockedParents = new Set();
const sessionAllowedParents = new Set();
const allowedOriginPairsInSession = new Set();
const deniedOriginPairsInSession = new Set();

export function getOriginPairKey(parentOrigin, iframeOrigin) {
  const normParent = normalizeOrigin(parentOrigin) || '*';
  const normIframe = normalizeOrigin(iframeOrigin) || '*';
  return `${normParent}::${normIframe}`;
}

function applyDecision(item, allowed, remember) {
  const { parentOrigin, iframeOrigin, callbacks } = item;
  const permLog = logger.scope('permission');
  const normParent = normalizeOrigin(parentOrigin);
  const normIframe = normalizeOrigin(iframeOrigin);
  const pairKey = getOriginPairKey(parentOrigin, iframeOrigin);

  permLog.log(`applyDecision: allowed=${allowed}, remember=${remember}`, { parentOrigin, iframeOrigin, pairKey });

  // Track in in-memory session scoped to the origin pair
  if (allowed) {
    allowedOriginPairsInSession.add(pairKey);
    deniedOriginPairsInSession.delete(pairKey);
  } else {
    deniedOriginPairsInSession.add(pairKey);
    allowedOriginPairsInSession.delete(pairKey);
  }

  if (remember && normIframe) {
    const decision = allowed ? 1 : 0;
    // Set for this specific parent-iframe pair in persistent GM Dict
    Storage.permissions.set(normParent, normIframe, decision);
    permLog.log(`Persisted permission in Storage.permissions: parent='${normParent}', iframe='${normIframe}', decision=${decision}`);
  }

  callbacks.forEach(cb => {
    try {
      cb(allowed);
    } catch {}
  });
}

function removePendingRow(key) {
  const item = pendingItems.get(key);
  if (item?.rowElement) {
    item.rowElement.remove();
  }
  pendingItems.delete(key);

  // Nếu không còn mục nào đang chờ thì tự đóng hộp thoại
  if (pendingItems.size === 0 && activeDialog) {
    activeDialog.modal.close();
    activeDialog = null;
    return;
  }

  // Cập nhật lại giao diện (chuyển đổi giữa multi và single nếu chỉ còn 1 item)
  if (activeDialog?.updateView) {
    activeDialog.updateView();
  }
}

function renderSingleCard(item) {
  const card = document.createElement('div');
  card.className = 'sv-perm-single-card';

  const icon = document.createElement('div');
  icon.className = 'sv-perm-single-icon';
  icon.innerHTML = '▶';

  const info = document.createElement('div');
  info.className = 'sv-perm-single-info';

  const originEl = document.createElement('div');
  originEl.className = 'sv-perm-single-origin';
  originEl.textContent = item.iframeOrigin;
  originEl.title = item.iframeOrigin;

  const subEl = document.createElement('div');
  subEl.className = 'sv-perm-single-sub';
  subEl.textContent = t('singleFrameDesc');

  info.append(originEl, subEl);
  card.append(icon, info);
  return card;
}

function renderRow(item) {
  const pairKey = getOriginPairKey(item.parentOrigin, item.iframeOrigin);
  const row = document.createElement('div');
  row.className = 'sv-perm-row';

  const domainEl = document.createElement('div');
  domainEl.className = 'sv-perm-domain';
  domainEl.textContent = item.iframeOrigin;
  domainEl.title = item.iframeOrigin;

  const actionsEl = document.createElement('div');
  actionsEl.className = 'sv-row-actions';

  const denyBtn = document.createElement('button');
  denyBtn.type = 'button';
  denyBtn.className = 'sv-row-btn sv-row-btn-deny';
  denyBtn.textContent = t('denyBtn');
  denyBtn.addEventListener('click', () => {
    applyDecision(item, false, false);
    removePendingRow(pairKey);
  });

  const allowBtn = document.createElement('button');
  allowBtn.type = 'button';
  allowBtn.className = 'sv-row-btn sv-row-btn-allow';
  allowBtn.textContent = t('allowBtn');
  allowBtn.addEventListener('click', () => {
    applyDecision(item, true, false);
    removePendingRow(pairKey);
  });

  // Dropdown menu [...]
  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'sv-row-btn sv-row-more-btn';
  moreBtn.textContent = '•••';
  moreBtn.title = 'Tùy chọn';

  let dropdown = null;

  const closeDropdown = () => {
    if (dropdown) {
      dropdown.remove();
      dropdown = null;
      document.removeEventListener('click', closeDropdown);
    }
  };

  moreBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (dropdown) {
      closeDropdown();
      return;
    }

    dropdown = document.createElement('div');
    dropdown.className = 'sv-row-dropdown';

    const alwaysAllowItem = document.createElement('button');
    alwaysAllowItem.type = 'button';
    alwaysAllowItem.className = 'sv-row-dropdown-item sv-item-always-allow';
    alwaysAllowItem.textContent = `✓ ${t('alwaysAllow')}`;
    alwaysAllowItem.addEventListener('click', () => {
      closeDropdown();
      applyDecision(item, true, true);
      removePendingRow(pairKey);
    });

    const alwaysDenyItem = document.createElement('button');
    alwaysDenyItem.type = 'button';
    alwaysDenyItem.className = 'sv-row-dropdown-item sv-item-always-deny';
    alwaysDenyItem.textContent = `✕ ${t('alwaysDeny')}`;
    alwaysDenyItem.addEventListener('click', () => {
      closeDropdown();
      applyDecision(item, false, true);
      removePendingRow(pairKey);
    });

    dropdown.append(alwaysAllowItem, alwaysDenyItem);
    actionsEl.append(dropdown);

    setTimeout(() => {
      document.addEventListener('click', closeDropdown);
    }, 0);
  });

  actionsEl.append(denyBtn, allowBtn, moreBtn);
  row.append(domainEl, actionsEl);

  item.rowElement = row;
  return row;
}

function openOrUpdateDialog(isTop) {
  if (activeDialog) {
    activeDialog.updateView();
    return;
  }

  // Khởi tạo container thân modal
  const container = document.createElement('div');
  let rememberChecked = false;

  const renderContent = () => {
    container.innerHTML = '';
    const items = Array.from(pendingItems.values());

    if (items.length <= 1) {
      // 1 Item: Single Card Clean Layout
      const item = items[0];
      if (item) {
        container.append(renderSingleCard(item));
      }
    } else {
      // Multi-Item: Flat List Layout
      const desc = document.createElement('div');
      desc.className = 'sv-text';
      desc.style.marginBottom = '6px';
      desc.textContent = t('dialogTableDesc');
      container.append(desc);

      const tableContainer = document.createElement('div');
      tableContainer.className = 'sv-perm-table-container';

      items.forEach(it => {
        const row = renderRow(it);
        tableContainer.append(row);
      });

      container.append(tableContainer);
    }

    // Checkbox: Ghi nhớ lựa chọn cho trang này (Minimalist flat checkbox)
    const rememberLabel = document.createElement('label');
    rememberLabel.className = 'sv-remember';
    const rememberInput = document.createElement('input');
    rememberInput.type = 'checkbox';
    rememberInput.checked = rememberChecked;
    rememberInput.addEventListener('change', () => {
      rememberChecked = rememberInput.checked;
    });
    const rememberSpan = document.createElement('span');
    rememberSpan.textContent = t('rememberChoice');
    rememberLabel.append(rememberInput, rememberSpan);
    container.append(rememberLabel);
  };

  renderContent();

  const modal = createModal({
    titleText: t('dialogTitle'),
    bodyElement: container,
    isTop,
    hostId: isTop ? 'sremote-top-permission-host' : 'sremote-permission-host',
    buttons: [
      {
        className: 'sv-btn sv-btn-deny',
        text: () => (pendingItems.size > 1 ? t('denyAllBtn') : t('denyBtn')),
        onClick: (_, { close }) => {
          const items = Array.from(pendingItems.values());
          pendingItems.clear();
          const dlg = activeDialog;
          activeDialog = null;
          try {
            dlg?.modal?.close();
          } catch {}
          close(false);
          items.forEach(it => applyDecision(it, false, rememberChecked));
        },
      },
      {
        className: 'sv-btn sv-btn-allow',
        text: () => (pendingItems.size > 1 ? t('allowAllBtn') : t('allowBtn')),
        onClick: (_, { close }) => {
          const items = Array.from(pendingItems.values());
          pendingItems.clear();
          const dlg = activeDialog;
          activeDialog = null;
          try {
            dlg?.modal?.close();
          } catch {}
          close(true);
          items.forEach(it => applyDecision(it, true, rememberChecked));
        },
      },
    ],
    onClose: () => {
      if (activeDialog) {
        const items = Array.from(pendingItems.values());
        pendingItems.clear();
        activeDialog = null;
        items.forEach(it => applyDecision(it, false, false));
      }
    },
  });

  const updateView = () => {
    renderContent();
    // Cập nhật lại text của 2 nút bấm ở footer nếu số lượng item thay đổi
    const buttons = modal.box?.querySelectorAll('.sv-buttons .sv-btn');
    if (buttons && buttons.length >= 2) {
      buttons[0].textContent = pendingItems.size > 1 ? t('denyAllBtn') : t('denyBtn');
      buttons[1].textContent = pendingItems.size > 1 ? t('allowAllBtn') : t('allowBtn');
    }
  };

  activeDialog = { modal, containerEl: container, updateView };
}

export function createPermissionDialog({ origin, iframeOrigin = null, parentOrigin = null, onDecision, isTop = false }) {
  const effectiveIframeOrigin = iframeOrigin || origin;
  const effectiveParentOrigin = parentOrigin || (isTop && typeof location !== 'undefined' ? location.origin : null) || 'unknown_parent';
  const pairKey = getOriginPairKey(effectiveParentOrigin, effectiveIframeOrigin);

  // 0. Nếu session của trang cha này đã bị chặn: lập tức từ chối; nếu cặp origin này đã được quyết định trong session
  if (sessionBlockedParents.has(effectiveParentOrigin) || deniedOriginPairsInSession.has(pairKey)) {
    onDecision?.(false);
    return { close: () => {} };
  }
  if (sessionAllowedParents.has(effectiveParentOrigin) || allowedOriginPairsInSession.has(pairKey)) {
    onDecision?.(true);
    return { close: () => {} };
  }

  // 1. Immediate storage verification
  const perm = checkPermission(effectiveParentOrigin, effectiveIframeOrigin);
  if (perm.isDenied) {
    onDecision?.(false);
    return { close: () => {} };
  }
  if (perm.isAllowed) {
    onDecision?.(true);
    return { close: () => {} };
  }

  // 2. Nếu đã có trong pendingItems thì gom callback lại
  if (pendingItems.has(pairKey)) {
    const existing = pendingItems.get(pairKey);
    if (typeof onDecision === 'function') {
      existing.callbacks.push(onDecision);
    }
    return { close: () => removePendingRow(pairKey) };
  }

  // 3. Đưa vào bảng chờ
  const newItem = {
    parentOrigin: effectiveParentOrigin,
    iframeOrigin: effectiveIframeOrigin,
    isTop,
    callbacks: typeof onDecision === 'function' ? [onDecision] : [],
    rowElement: null,
  };
  pendingItems.set(pairKey, newItem);

  // 4. Mở hoặc cập nhật giao diện
  openOrUpdateDialog(isTop);

  return { close: () => removePendingRow(pairKey) };
}

import { Storage } from '../core/storage.js';
import { getPermissionPairStorageKeys, checkOriginPairPermission } from '../core/utils.js';
import { t } from '../core/i18n.js';
import { createModal } from './modal.js';

// Table Queue management: gom toàn bộ các iframe origin đang chờ
// pendingItems: Map<iframeOrigin, { parentOrigin, iframeOrigin, isTop, callbacks: Function[], rowElement?: HTMLElement }>
const pendingItems = new Map();
let activeDialog = null; // { modal, tableContainer, rememberCheckbox }
let isSessionBlocked = false;
let isSessionAllowed = false;

function applyDecision(item, allowed, remember) {
  const { parentOrigin, iframeOrigin, callbacks } = item;
  const { pairAllowKey, pairDenyKey, isPersistable } = getPermissionPairStorageKeys(parentOrigin, iframeOrigin);

  if (remember && isPersistable && pairAllowKey && pairDenyKey) {
    if (allowed) {
      Storage.set(pairAllowKey, '1');
      Storage.remove(pairDenyKey);
    } else {
      Storage.set(pairDenyKey, '1');
      Storage.remove(pairAllowKey);
    }
  }

  callbacks.forEach(cb => {
    try {
      cb(allowed);
    } catch {}
  });
}

function removePendingRow(iframeOrigin) {
  const item = pendingItems.get(iframeOrigin);
  if (item?.rowElement) {
    item.rowElement.remove();
  }
  pendingItems.delete(iframeOrigin);

  // Nếu không còn mục nào đang chờ thì tự đóng hộp thoại
  if (pendingItems.size === 0 && activeDialog) {
    activeDialog.modal.close();
    activeDialog = null;
  }
}

function renderRow(item) {
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
    const remember = activeDialog?.rememberCheckbox?.checked ?? false;
    applyDecision(item, false, remember);
    removePendingRow(item.iframeOrigin);
  });

  const allowBtn = document.createElement('button');
  allowBtn.type = 'button';
  allowBtn.className = 'sv-row-btn sv-row-btn-allow';
  allowBtn.textContent = t('allowBtn');
  allowBtn.addEventListener('click', () => {
    const remember = activeDialog?.rememberCheckbox?.checked ?? false;
    applyDecision(item, true, remember);
    removePendingRow(item.iframeOrigin);
  });

  actionsEl.append(denyBtn, allowBtn);
  row.append(domainEl, actionsEl);

  item.rowElement = row;
  return row;
}

function openOrUpdateDialog(isTop) {
  if (activeDialog) {
    // Đã có dialog mở, bổ sung các row chưa được vẽ
    for (const item of pendingItems.values()) {
      if (!item.rowElement) {
        const row = renderRow(item);
        activeDialog.tableContainer.append(row);
      }
    }
    return;
  }

  // Tạo modal mới dạng Bảng
  const container = document.createElement('div');

  const desc = document.createElement('div');
  desc.className = 'sv-text';
  desc.style.marginBottom = '6px';
  desc.textContent = t('dialogTableDesc');
  container.append(desc);

  const tableContainer = document.createElement('div');
  tableContainer.className = 'sv-perm-table-container';

  for (const item of pendingItems.values()) {
    const row = renderRow(item);
    tableContainer.append(row);
  }
  container.append(tableContainer);

  const rememberLabel = document.createElement('label');
  rememberLabel.className = 'sv-remember';
  const rememberCheckbox = document.createElement('input');
  rememberCheckbox.type = 'checkbox';
  const rememberSpan = document.createElement('span');
  rememberSpan.textContent = t('rememberChoice');
  rememberLabel.append(rememberCheckbox, rememberSpan);

  rememberLabel.addEventListener('click', e => {
    e.stopPropagation();
    if (e.target !== rememberCheckbox) {
      e.preventDefault();
      rememberCheckbox.checked = !rememberCheckbox.checked;
      rememberCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  rememberCheckbox.addEventListener('click', e => e.stopPropagation());

  container.append(rememberLabel);

  const modal = createModal({
    titleText: t('dialogTitle'),
    bodyElement: container,
    isTop,
    hostId: isTop ? 'sremote-top-permission-host' : 'sremote-permission-host',
    buttons: [
      {
        className: 'sv-btn sv-btn-allow sv-btn-allow-session',
        text: t('allowSessionBtn'),
        onClick: (_, { close }) => {
          isSessionAllowed = true;
          const items = Array.from(pendingItems.values());
          pendingItems.clear();
          close(true);
          activeDialog = null;
          items.forEach(it => applyDecision(it, true, false));
        },
      },
      {
        className: 'sv-btn sv-btn-allow sv-btn-allow-all',
        text: t('allowAllBtn'),
        onClick: (_, { close }) => {
          const remember = rememberCheckbox.checked;
          const items = Array.from(pendingItems.values());
          pendingItems.clear();
          close(true);
          activeDialog = null;
          items.forEach(it => applyDecision(it, true, remember));
        },
      },
      {
        className: 'sv-btn sv-btn-block-session',
        text: t('blockSessionBtn'),
        onClick: (_, { close }) => {
          close(false);
          setPermissionSessionBlocked(true);
        },
      },
      {
        className: 'sv-btn sv-btn-deny sv-btn-deny-all',
        text: t('denyAllBtn'),
        onClick: (_, { close }) => {
          const remember = rememberCheckbox.checked;
          const items = Array.from(pendingItems.values());
          pendingItems.clear();
          close(false);
          activeDialog = null;
          items.forEach(it => applyDecision(it, false, remember));
        },
      },
    ],
    onClose: () => {
      // Khi bấm Esc, click backdrop hoặc đóng modal mà còn mục chưa duyệt: mặc định Từ chối (Deny) các mục còn lại
      if (activeDialog) {
        const items = Array.from(pendingItems.values());
        pendingItems.clear();
        activeDialog = null;
        items.forEach(it => applyDecision(it, false, false));
      }
    },
  });

  activeDialog = { modal, tableContainer, rememberCheckbox };
}

export function createPermissionDialog({ origin, iframeOrigin = null, parentOrigin = null, onDecision, isTop = false }) {
  const effectiveIframeOrigin = iframeOrigin || origin;
  const effectiveParentOrigin = parentOrigin || (isTop && typeof location !== 'undefined' ? location.origin : null) || 'unknown_parent';

  // 0. Nếu session này đã bị chặn: lập tức từ chối; nếu đã cho phép toàn phiên: lập tức cho phép
  if (isSessionBlocked) {
    onDecision?.(false);
    return { close: () => {} };
  }
  if (isSessionAllowed) {
    onDecision?.(true);
    return { close: () => {} };
  }

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

  // 2. Nếu đã có trong pendingItems thì gom callback lại
  if (pendingItems.has(effectiveIframeOrigin)) {
    const existing = pendingItems.get(effectiveIframeOrigin);
    if (typeof onDecision === 'function') {
      existing.callbacks.push(onDecision);
    }
    return { close: () => removePendingRow(effectiveIframeOrigin) };
  }

  // 3. Đưa vào bảng chờ
  const newItem = {
    parentOrigin: effectiveParentOrigin,
    iframeOrigin: effectiveIframeOrigin,
    isTop,
    callbacks: typeof onDecision === 'function' ? [onDecision] : [],
    rowElement: null,
  };
  pendingItems.set(effectiveIframeOrigin, newItem);

  // 4. Mở hoặc cập nhật giao diện bảng
  openOrUpdateDialog(isTop);

  return { close: () => removePendingRow(effectiveIframeOrigin) };
}

function setPermissionSessionBlocked(blocked = true) {
  isSessionBlocked = blocked;
  if (blocked && activeDialog) {
    const items = Array.from(pendingItems.values());
    pendingItems.clear();
    activeDialog.modal.close();
    activeDialog = null;
    items.forEach(it => applyDecision(it, false, false));
  }
}

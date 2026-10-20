import { Storage } from '../core/storage.js';
import { checkOriginPairPermission, normalizeOrigin } from '../core/utils.js';
import { t } from '../core/i18n.js';
import { createModal } from './modal.js';
import { logger } from '../config.js';

// Table Queue management: gom toàn bộ các iframe origin đang chờ
// pendingItems: Map<pairKey, { parentOrigin, iframeOrigin, isTop, callbacks: Function[], rowElement?: HTMLElement }>
const pendingItems = new Map();
let activeDialog = null; // { modal, tableContainer }
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

  // Cập nhật lại trạng thái hiển thị của batch row nếu danh sách thay đổi
  updateTableBatchRow();

  // Nếu không còn mục nào đang chờ thì tự đóng hộp thoại
  if (pendingItems.size === 0 && activeDialog) {
    activeDialog.modal.close();
    activeDialog = null;
  }
}

let tableBatchRowEl = null;

function renderTableBatchRow() {
  const row = document.createElement('div');
  row.className = 'sv-perm-row sv-perm-footer-row';

  const emptyDomainEl = document.createElement('div');
  emptyDomainEl.className = 'sv-perm-domain';
  emptyDomainEl.textContent = ''; // Không ghi domain theo yêu cầu

  const actionsEl = document.createElement('div');
  actionsEl.className = 'sv-row-actions';

  const denyAllBtn = document.createElement('button');
  denyAllBtn.type = 'button';
  denyAllBtn.className = 'sv-row-btn sv-row-btn-deny';
  denyAllBtn.textContent = t('denyAllBtn');
  denyAllBtn.addEventListener('click', () => {
    const items = Array.from(pendingItems.values());
    pendingItems.clear();
    if (activeDialog) {
      activeDialog.modal.close();
      activeDialog = null;
    }
    items.forEach(it => applyDecision(it, false, false));
  });

  const allowAllBtn = document.createElement('button');
  allowAllBtn.type = 'button';
  allowAllBtn.className = 'sv-row-btn sv-row-btn-allow';
  allowAllBtn.textContent = t('allowAllBtn');
  allowAllBtn.addEventListener('click', () => {
    const items = Array.from(pendingItems.values());
    pendingItems.clear();
    if (activeDialog) {
      activeDialog.modal.close();
      activeDialog = null;
    }
    // FIXME: Mặc định ghi nhớ (remember = true) để tránh việc người dùng bấm Cho phép tất cả mà vẫn bị hỏi lại khi F5. Sẽ xem xét thiết kế lại UX nút này sau.
    items.forEach(it => applyDecision(it, true, true));
  });

  actionsEl.append(denyAllBtn, allowAllBtn);
  row.append(emptyDomainEl, actionsEl);
  return row;
}

function updateTableBatchRow() {
  if (!activeDialog?.tableContainer) return;
  if (pendingItems.size > 1) {
    if (!tableBatchRowEl) {
      tableBatchRowEl = renderTableBatchRow();
      activeDialog.tableContainer.append(tableBatchRowEl);
    } else {
      activeDialog.tableContainer.append(tableBatchRowEl);
    }
  } else if (tableBatchRowEl) {
    tableBatchRowEl.remove();
    tableBatchRowEl = null;
  }
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
  moreBtn.title = 'Tùy chọn mở rộng';

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
    // Đã có dialog mở, bổ sung các row chưa được vẽ
    for (const item of pendingItems.values()) {
      if (!item.rowElement) {
        const row = renderRow(item);
        if (tableBatchRowEl) {
          activeDialog.tableContainer.insertBefore(row, tableBatchRowEl);
        } else {
          activeDialog.tableContainer.append(row);
        }
      }
    }
    updateTableBatchRow();
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

  const modal = createModal({
    titleText: t('dialogTitle'),
    bodyElement: container,
    isTop,
    hostId: isTop ? 'sremote-top-permission-host' : 'sremote-permission-host',
    buttons: [
      {
        className: 'sv-btn sv-btn-always-allow-all',
        text: t('alwaysAllowAllBtn'),
        onClick: (_, { close }) => {
          const items = Array.from(pendingItems.values());
          pendingItems.clear();
          const dlg = activeDialog;
          activeDialog = null;
          tableBatchRowEl = null;
          try {
            dlg?.modal?.close();
          } catch {}
          close(true);
          items.forEach(it => applyDecision(it, true, true));
        },
      },
      {
        className: 'sv-btn sv-btn-allow-session',
        text: t('allowSessionBtn'),
        onClick: (_, { close }) => {
          const items = Array.from(pendingItems.values());
          items.forEach(it => {
            if (it.parentOrigin) sessionAllowedParents.add(it.parentOrigin);
          });
          pendingItems.clear();
          const dlg = activeDialog;
          activeDialog = null;
          tableBatchRowEl = null;
          try {
            dlg?.modal?.close();
          } catch {}
          close(true);
          items.forEach(it => applyDecision(it, true, false));
        },
      },
      {
        className: 'sv-btn sv-btn-block-session',
        text: t('blockSessionBtn'),
        onClick: (_, { close }) => {
          const dlg = activeDialog;
          activeDialog = null;
          tableBatchRowEl = null;
          setPermissionSessionBlocked(true);
          try {
            dlg?.modal?.close();
          } catch {}
          close(false);
        },
      },
      {
        className: 'sv-btn sv-btn-always-deny-all',
        text: t('alwaysDenyAllBtn'),
        onClick: (_, { close }) => {
          const items = Array.from(pendingItems.values());
          pendingItems.clear();
          const dlg = activeDialog;
          activeDialog = null;
          tableBatchRowEl = null;
          try {
            dlg?.modal?.close();
          } catch {}
          close(false);
          items.forEach(it => applyDecision(it, false, true));
        },
      },
    ],
    onClose: () => {
      if (activeDialog) {
        const items = Array.from(pendingItems.values());
        pendingItems.clear();
        activeDialog = null;
        tableBatchRowEl = null;
        items.forEach(it => applyDecision(it, false, false));
      }
    },
  });

  activeDialog = { modal, tableContainer };
  updateTableBatchRow();
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
  const perm = checkOriginPairPermission(effectiveParentOrigin, effectiveIframeOrigin);
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

  // 4. Mở hoặc cập nhật giao diện bảng
  openOrUpdateDialog(isTop);

  return { close: () => removePendingRow(pairKey) };
}

function setPermissionSessionBlocked(blocked = true, parentOrigin = null) {
  const targetParent = parentOrigin || (typeof location !== 'undefined' ? location.origin : '*');
  if (blocked) {
    sessionBlockedParents.add(targetParent);
  } else {
    sessionBlockedParents.delete(targetParent);
  }

  if (blocked && activeDialog) {
    const items = Array.from(pendingItems.values());
    pendingItems.clear();
    activeDialog.modal.close();
    activeDialog = null;
    items.forEach(it => applyDecision(it, false, false));
  }
}

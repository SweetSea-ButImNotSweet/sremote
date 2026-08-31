import { GM, Storage } from '../core/storage.js';
import { getOriginStorageKeys } from '../core/utils.js';
import { t } from '../core/i18n.js';
import { console_warn } from '../config.js';
import { showPasskeyDialog } from '../ui/key-dialog.js';

export function registerMenuCommands() {
  try {
    if (!GM.register) return;
    const origin = location.origin;
    const hostDomain = location.hostname || 'this_domain';
    const domainKeyStorage = `sremote:passkey:${hostDomain}`;
    const domainLockStorage = `sremote:locked:${hostDomain}`;

    // 1. Generate & Copy Passkey for Domain (16-character alphanumeric uppercase in 4x4 block: SR-XXXX-XXXX-XXXX-XXXX)
    GM.register(t('menuGenerateKey', { domain: hostDomain }), () => {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomBlock = len => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const currentKey = `SR-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
      Storage.set(domainKeyStorage, currentKey);

      showPasskeyDialog({ domain: hostDomain, key: currentKey });
    });

    // 2. Delete Passkey for Domain
    GM.register(t('menuDeleteKey', { domain: hostDomain }), () => {
      Storage.remove(domainKeyStorage);
      alert(t('alertKeyDeleted', { domain: hostDomain }));
    });

    // 3. Toggle Active Lock for Domain
    GM.register(t('menuToggleLock', { domain: hostDomain }), () => {
      const isCurrentlyLocked = Storage.get(domainLockStorage) === '1';
      if (isCurrentlyLocked) {
        Storage.remove(domainLockStorage);
        alert(t('alertLockDisabled', { domain: hostDomain }));
      } else {
        Storage.set(domainLockStorage, '1');
        alert(t('alertLockEnabled', { domain: hostDomain }));
      }
    });

    GM.register(t('menuReset', { target: t('targetTop') }), () => {
      const { allowKey, denyKey, hideBadgeKey } = getOriginStorageKeys(origin);
      [allowKey, denyKey, hideBadgeKey].forEach(k => k && Storage.remove(k));
      alert(t('alertResetDone', { origin }));
    });

    GM.register(t('menuUnhideBadge'), () => {
      const keys = Storage.list();
      keys.forEach(k => {
        if (k && (k.startsWith('sremote:hide_badge:') || k === 'sremote:hide_badge')) Storage.remove(k);
      });
      alert(t('alertUnhideDone'));
    });

    GM.register(t('menuClearAll'), () => {
      if (!confirm(t('confirmClearAll'))) return;
      Storage.clearAllsremoteData();
      alert(t('alertClearDone'));
    });
  } catch (e) {
    console_warn('[sremote] Failed to register menu commands:', e);
  }
}

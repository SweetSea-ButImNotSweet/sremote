import { GM, Storage } from '../core/storage.js';
import { normalizeOrigin } from '../core/utils.js';
import { t } from '../core/i18n.js';
import { logger } from '../config.js';
import { showPasskeyDialog } from '../ui/key-dialog.js';

export function registerMenuCommands() {
  try {
    if (!GM.register) return;
    const origin = location.origin;
    const hostDomain = location.hostname || 'this_domain';

    // 1. Generate & Copy Passkey for Domain (16-character alphanumeric uppercase in 4x4 block: SR-XXXX-XXXX-XXXX-XXXX)
    GM.register(t('menuGenerateKey', { domain: hostDomain }), () => {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const randomBlock = len => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const currentKey = `SR-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
      Storage.auth.setPasskey(hostDomain, currentKey);

      showPasskeyDialog({ domain: hostDomain, key: currentKey });
    });

    // 2. Delete Passkey for Domain
    GM.register(t('menuDeleteKey', { domain: hostDomain }), () => {
      Storage.auth.removePasskey(hostDomain);
      alert(t('alertKeyDeleted', { domain: hostDomain }));
    });

    // 3. Toggle Active Lock for Domain
    GM.register(t('menuToggleLock', { domain: hostDomain }), () => {
      const isCurrentlyLocked = Storage.auth.isLocked(hostDomain);
      if (isCurrentlyLocked) {
        Storage.auth.setLocked(hostDomain, false);
        alert(t('alertLockDisabled', { domain: hostDomain }));
      } else {
        Storage.auth.setLocked(hostDomain, true);
        alert(t('alertLockEnabled', { domain: hostDomain }));
      }
    });

    // 4. Reset Permissions for this domain
    GM.register(t('menuReset', { target: t('targetTop') }), () => {
      const normOrigin = normalizeOrigin(origin);
      Storage.permissions.remove(normOrigin);
      Storage.preferences.setBadgeHidden(normOrigin, false);

      alert(t('alertResetDone', { origin }));
    });

    // 5. Unhide all Badges
    GM.register(t('menuUnhideBadge'), () => {
      Storage.preferences.unhideAllBadges();
      alert(t('alertUnhideDone'));
    });

    // 6. Clear All
    GM.register(t('menuClearAll'), () => {
      if (!confirm(t('confirmClearAll'))) return;
      Storage.clearAll();
      alert(t('alertClearDone'));
    });
  } catch (e) {
    logger.warn('[sremote] Failed to register menu commands:', e);
  }
}

import { Storage } from '../core/storage.js';
import { getOriginStorageKeys, createButton } from '../core/utils.js';
import { t } from '../core/i18n.js';
import THEME_CSS from '@sremote/shared/src/css/theme.css?raw';
import USERSCRIPT_CSS from './styles.css?raw';

const BADGE_CSS = `${THEME_CSS}\n${USERSCRIPT_CSS}`;

let indicatorHost = null;

export function showConnectedIndicator(origin, primaryAuthorizedOrigin) {
  const targetOrigin = origin || primaryAuthorizedOrigin || 'unknown_parent';
  const { hideBadgeKey } = getOriginStorageKeys(targetOrigin);
  if (Storage.get(hideBadgeKey) === '1') return;
  if (indicatorHost && indicatorHost.isConnected) return;

  indicatorHost = document.createElement('div');
  indicatorHost.id = 'sremote-indicator-host';
  const shadow = indicatorHost.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = BADGE_CSS;

  const wrapper = document.createElement('div');
  wrapper.className = 'sv-badge-wrapper';

  const dotBtn = createButton({
    className: 'sv-dot-btn',
    text: '✕',
    title: t('badgeCloseTitle'),
    onClick: () => {
      indicatorHost?.remove();
      indicatorHost = null;
    },
  });

  const label = document.createElement('span');
  label.className = 'sv-label';
  label.textContent = 'sremote';

  const actions = document.createElement('div');
  actions.className = 'sv-actions';
  const btnDontShow = createButton({
    className: 'sv-action-btn',
    text: t('badgeDontShow'),
    title: t('badgeDontShowTitle'),
    onClick: () => {
      Storage.set(hideBadgeKey, '1');
      indicatorHost?.remove();
      indicatorHost = null;
    },
  });
  actions.append(btnDontShow);

  const tooltip = document.createElement('div');
  tooltip.className = 'sv-tooltip';
  const tooltipInner = document.createElement('div');
  tooltipInner.className = 'sv-tooltip-inner';
  tooltipInner.textContent = `${t('badgeTooltipPrefix')}${targetOrigin}${t('badgeTooltipSuffix')}sremote`;
  tooltip.append(tooltipInner);

  wrapper.append(dotBtn, label, actions, tooltip);
  shadow.append(style, wrapper);

  const mount = () => {
    const target = document.body || document.documentElement;
    if (target && !indicatorHost.isConnected) target.appendChild(indicatorHost);
  };
  mount();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  }
}

export function hideConnectedIndicator() {
  if (indicatorHost) {
    indicatorHost.remove();
    indicatorHost = null;
  }
}

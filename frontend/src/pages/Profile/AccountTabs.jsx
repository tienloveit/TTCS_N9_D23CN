import { useRef } from 'react';
import { GiftIcon, KeyIcon, UserIcon } from '../../components/Common/CinemaIcons';
import { tabKeyTarget } from './accountTabsModel';

const ICONS = { promos: GiftIcon, info: UserIcon, password: KeyIcon };

/**
 * Tablist theo mẫu ARIA, roving tabindex. Dọc trên desktop, ngang trên màn hẹp,
 * nên nhận cả mũi tên trái/phải và lên/xuống. Mũi tên đổi tab ngay vì cả ba ngăn đã render sẵn.
 */
export default function AccountTabs({ tabs, active, onSelect, promoCount }) {
  const refs = useRef([]);

  function handleKeyDown(event, index) {
    const target = tabKeyTarget(index, event.key, tabs.length);
    if (target == null) return;
    event.preventDefault();
    refs.current[target]?.focus();
    onSelect(tabs[target].id);
  }

  return (
    <div className="ac-tabs" id="ac-tabs" role="tablist" aria-label="Mục tài khoản">
      {tabs.map((tab, index) => {
        const Icon = ICONS[tab.id];
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role="tab"
            id={`ac-tab-${tab.id}`}
            className="ac-tab"
            aria-selected={selected}
            aria-controls={`ac-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <Icon size={18} className="ac-tab__icon" />
            <span>{tab.label}</span>
            {tab.id === 'promos' && promoCount > 0 && (
              <span className="ac-tab__count">
                <span className="sr-only">, </span>{promoCount}<span className="sr-only"> mã</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import Button from '../../components/Common/Button';
import {
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  GiftIcon,
  RefreshIcon,
  SearchIcon,
  TimerIcon,
} from '../../components/Common/CinemaIcons';
import AccountState, { PromotionSkeleton } from './AccountState';
import {
  countPromotionScopes,
  describeExpiry,
  filterPromotions,
  PROMO_PREVIEW_COUNT,
  promotionConditions,
  remainingUses,
  sortPromotions,
} from './promotionView';

const SCOPES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'tier', label: 'Theo hạng' },
  { id: 'branch', label: 'Theo rạp' },
];
const FILTER_MIN = 4;
const SEARCH_MIN = 7;
const COPIED_MS = 2000;

function expiryNote(expiry) {
  if (expiry.kind === 'today') return expiry.label;
  if (expiry.kind === 'soon') return `Còn ${expiry.daysLeft} ngày`;
  return null;
}

export default function PromotionList({ promotions, state, onRetry }) {
  const [scope, setScope] = useState('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(null);
  const [message, setMessage] = useState('');
  // Mốc so hạn dùng: lấy một lần khi mở trang, đủ cho nhãn "Còn n ngày".
  const [now] = useState(() => new Date());
  const copyTimer = useRef(null);
  const focusExtra = useRef(false);
  const listRef = useRef(null);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  useEffect(() => {
    if (!expanded || !focusExtra.current) return;
    focusExtra.current = false;
    listRef.current?.querySelectorAll('.ac-promo__code')[PROMO_PREVIEW_COUNT]?.focus();
  }, [expanded]);

  const total = promotions.length;
  const counts = countPromotionScopes(promotions);
  const visibleAll = sortPromotions(filterPromotions(promotions, { scope, query }));
  const visible = expanded ? visibleAll : visibleAll.slice(0, PROMO_PREVIEW_COUNT);
  const hidden = visibleAll.length - visible.length;

  function changeScope(next) {
    setScope(next);
    setExpanded(false);
  }

  function changeQuery(next) {
    setQuery(next);
    setExpanded(false);
  }

  function clearFilters() {
    setScope('all');
    setQuery('');
    setExpanded(false);
  }

  function showMore() {
    focusExtra.current = true;
    setExpanded(true);
  }

  async function copyCode(code, codeElement) {
    clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setMessage(`Đã sao chép mã ${code}.`);
      copyTimer.current = setTimeout(() => setCopied(null), COPIED_MS);
    } catch {
      setCopied(null);
      setMessage(`Không sao chép được. Chọn mã ${code} rồi sao chép thủ công.`);
      if (codeElement) window.getSelection?.()?.selectAllChildren(codeElement);
    }
  }

  let content;
  if (state === 'loading') {
    content = <PromotionSkeleton />;
  } else if (state === 'error') {
    content = (
      <AccountState
        error
        title="Không tải được ưu đãi"
        detail="Kiểm tra kết nối mạng rồi bấm Thử lại. Bạn vẫn nhập được mã lúc thanh toán."
      >
        <Button variant="primary" icon={<RefreshIcon size={16} />} onClick={onRetry}>Thử lại</Button>
      </AccountState>
    );
  } else if (total === 0) {
    content = (
      <AccountState
        icon={<GiftIcon size={24} />}
        title="Bạn chưa có mã ưu đãi nào"
        detail="Mã mới và mã theo hạng sẽ hiện ở đây."
      >
        <Button variant="primary" icon={<CalendarIcon size={16} />} to="/branches">Xem lịch chiếu</Button>
      </AccountState>
    );
  } else if (visibleAll.length === 0) {
    const scopeLabel = SCOPES.find((item) => item.id === scope)?.label;
    const parts = [];
    if (scope !== 'all') parts.push(`"${scopeLabel}"`);
    if (query.trim()) parts.push(`từ khóa "${query.trim()}"`);
    content = (
      <AccountState
        icon={<SearchIcon size={24} />}
        title="Không có mã nào khớp"
        detail={`Đang lọc ${parts.join(' và ')}.`}
      >
        <Button variant="primary" onClick={clearFilters}>Xóa bộ lọc</Button>
      </AccountState>
    );
  } else {
    content = (
      <>
        <ul className="ac-promos__list" ref={listRef}>
          {visible.map((promotion) => {
            const key = promotion.id ?? promotion.code;
            const codeId = `ac-promo-code-${key}`;
            const expiry = describeExpiry(promotion.endDate, now);
            const note = expiryNote(expiry);
            const uses = remainingUses(promotion);
            const conditions = promotionConditions(promotion);
            const isCopied = copied === promotion.code;
            return (
              <li className="ac-promo" key={key}>
                <h3 className="ac-promo__code" id={codeId} tabIndex={-1}>{promotion.code}</h3>
                <p className="ac-promo__value">Giảm {promotion.discountPercent}%</p>
                <div className="ac-promo__body">
                  {promotion.description && (
                    <p className="ac-promo__desc" title={promotion.description}>{promotion.description}</p>
                  )}
                  {conditions.length > 0 && (
                    <ul className="ac-promo__terms" aria-label="Điều kiện">
                      {conditions.map((condition) => <li key={condition.key}>{condition.text}</li>)}
                    </ul>
                  )}
                  <p className="ac-promo__meta">
                    {expiry.kind !== 'today' && <span>{expiry.label}</span>}
                    {note && (
                      <span className="ac-promo__soon">
                        <TimerIcon size={14} />{note}
                      </span>
                    )}
                    {uses != null && uses > 0 && <span>Còn {uses} lượt</span>}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="ac-promo__copy"
                  icon={isCopied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                  aria-label={isCopied ? `Đã sao chép mã ${promotion.code}` : `Sao chép mã ${promotion.code}`}
                  onClick={() => copyCode(promotion.code, document.getElementById(codeId))}
                >
                  {isCopied ? 'Đã sao chép' : 'Sao chép mã'}
                </Button>
              </li>
            );
          })}
        </ul>
        {hidden > 0 && (
          <div className="ac-promos__more">
            <Button variant="secondary" onClick={showMore}>Xem thêm {hidden} ưu đãi</Button>
          </div>
        )}
      </>
    );
  }

  return (
    <section className="ac-section" aria-labelledby="ac-promos-title">
      <div className="ac-section__head">
        <h2 id="ac-promos-title" className="ac-section__title" tabIndex={-1}>Ưu đãi của bạn</h2>
        {state === 'ready' && total > 0 && <span className="ac-section__count">{total} mã</span>}
      </div>
      <p className="ac-section__lead">Mã được kiểm tra lại khi bạn nhập lúc thanh toán.</p>

      {state === 'ready' && total >= FILTER_MIN && (
        <div className="ac-promos__tools">
          <div className="ac-filter" role="group" aria-label="Lọc ưu đãi">
            {SCOPES.map((item) => (
              <button
                key={item.id}
                type="button"
                className="ac-filter__button"
                aria-pressed={scope === item.id}
                disabled={counts[item.id] === 0}
                onClick={() => changeScope(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {total >= SEARCH_MIN && (
            <label className="ac-search">
              <span className="sr-only">Tìm ưu đãi theo mã, mô tả hoặc rạp</span>
              <SearchIcon size={16} />
              <input
                className="ac-search__input"
                type="search"
                value={query}
                placeholder="Tìm mã, mô tả, rạp"
                onChange={(event) => changeQuery(event.target.value)}
              />
            </label>
          )}
        </div>
      )}

      {content}
      <p className={message ? 'ac-promos__message' : 'sr-only'} role="status">{message}</p>
    </section>
  );
}

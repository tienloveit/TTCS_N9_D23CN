import { useEffect, useRef, useState } from 'react';
import { SearchIcon, XIcon } from '../Common/CinemaIcons';
import OpsButton from './OpsButton';
import { SEARCH_DEBOUNCE_MS } from '../../utils/opsFilters';

export default function FilterBar({
  search = '', onSearchChange, searchLabel = 'Tìm kiếm', searchPlaceholder, filtered, onReset,
  resultLabel, children, className = '', ...props
}) {
  const [draft, setDraft] = useState(search);
  const [previousSearch, setPreviousSearch] = useState(search);
  if (search !== previousSearch) {
    setPreviousSearch(search);
    setDraft(search);
  }
  const timer = useRef(null);
  const input = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), [search]);
  function changeSearch(value) {
    setDraft(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearchChange(value), SEARCH_DEBOUNCE_MS);
  }
  return (
    <div className={'o-filter ' + className} {...props}>
      {onSearchChange && <div className="o-filter__search">
        <SearchIcon size={17} />
        <input ref={input} className="o-input" type="text" aria-label={searchLabel}
          placeholder={searchPlaceholder || searchLabel} value={draft} onChange={(event) => changeSearch(event.target.value)} />
        {draft && <OpsButton variant="ghost" size="sm" aria-label="Xóa từ khóa" icon={<XIcon size={14} />}
          onClick={() => { changeSearch(''); input.current?.focus(); }} />}
      </div>}
      {children}
      {(filtered || draft) && onReset && <OpsButton variant="ghost" onClick={() => {
        clearTimeout(timer.current);
        setDraft('');
        onReset();
      }}>Xóa bộ lọc</OpsButton>}
      <span aria-live="polite" className="o-filter__count">{resultLabel}</span>
    </div>
  );
}

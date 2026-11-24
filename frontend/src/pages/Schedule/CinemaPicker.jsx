import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../components/Common/Button';
import { SearchIcon, XIcon } from '../../components/Common/CinemaIcons';
import useModalDialog from '../../components/Common/useModalDialog';
import { normalizeSearch } from '../../utils/searchText';

const cityOf = (branch) => (branch.city || 'Khác').trim();

/** Nhóm rạp theo thành phố: thành phố của rạp đang xem đứng đầu, còn lại theo tên. */
function groupByCity(branches, currentCity) {
  const groups = new Map();
  for (const branch of branches) {
    const city = cityOf(branch);
    if (!groups.has(city)) groups.set(city, []);
    groups.get(city).push(branch);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    if (a === currentCity) return -1;
    if (b === currentCity) return 1;
    return a.localeCompare(b, 'vi');
  });
}

/**
 * Hộp thoại "Chọn rạp". Danh sách là nhóm radio nên phím mũi tên đổi lựa chọn;
 * bấm chuột, Enter hoặc phím cách thì áp dụng rạp và đóng hộp thoại.
 */
export default function CinemaPicker({ branches, currentId, onSelect, onClose }) {
  const dialog = useModalDialog(true, onClose);
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [choice, setChoice] = useState(String(currentId));
  // Phím mũi tên cũng phát sự kiện click trên radio, nên chỉ áp dụng ngay khi click bắt đầu bằng con trỏ.
  const pointerRef = useRef(false);
  const current = branches.find((branch) => String(branch.branchId) === String(currentId));
  const needle = normalizeSearch(query);
  const matches = needle
    ? branches.filter((branch) => [branch.name, branch.address, branch.city, branch.branchCode]
      .some((value) => normalizeSearch(value).includes(needle)))
    : branches;
  const groups = groupByCity(matches, current ? cityOf(current) : null);

  function apply(id) {
    if (String(id) !== String(currentId)) onSelect(id);
    onClose();
  }

  return createPortal(
    <div className="sc-picker" {...dialog.overlayProps}>
      <div className="sc-picker__panel" {...dialog.contentProps}>
        <div className="sc-picker__head">
          <h2 id={dialog.titleId} className="sc-picker__title">Chọn rạp</h2>
          <button type="button" className="sc-picker__close" aria-label="Đóng hộp thoại chọn rạp" onClick={onClose}>
            <XIcon size={20} />
          </button>
        </div>
        <div className="sc-search sc-picker__search">
          <SearchIcon size={16} />
          <label className="sr-only" htmlFor={searchId}>Tìm rạp theo tên, địa chỉ hoặc thành phố</label>
          <input
            id={searchId}
            className="sc-search__input"
            type="search"
            autoComplete="off"
            placeholder="Tìm tên rạp, địa chỉ…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" className="sc-search__clear" aria-label="Xóa tìm kiếm rạp" onClick={() => setQuery('')}>
              <XIcon size={16} />
            </button>
          )}
        </div>

        <div className="sc-picker__list">
          {groups.length === 0 ? (
            <div className="sc-picker__empty" role="status">
              <p>Không có rạp nào khớp với "{query.trim()}".</p>
              <Button variant="secondary" size="sm" onClick={() => setQuery('')}>Xóa tìm kiếm</Button>
            </div>
          ) : (
            groups.map(([city, items]) => (
              <fieldset className="sc-picker__group" key={city}>
                <legend className="sc-picker__city">{city}</legend>
                {items.map((branch) => {
                  const id = String(branch.branchId);
                  const isCurrent = id === String(currentId);
                  return (
                    <label className="sc-option" key={id} onPointerDown={() => { pointerRef.current = true; }}>
                      <input
                        className="sc-option__radio"
                        type="radio"
                        name="sc-branch"
                        value={id}
                        checked={choice === id}
                        onChange={() => setChoice(id)}
                        onClick={() => {
                          if (!pointerRef.current) return;
                          pointerRef.current = false;
                          apply(id);
                        }}
                        onKeyDown={(event) => {
                          pointerRef.current = false;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            apply(id);
                          }
                        }}
                      />
                      <span className="sc-option__text">
                        <span className="sc-option__name">{branch.name}</span>
                        {branch.address && <span className="sc-option__address">{branch.address}</span>}
                      </span>
                      {isCurrent && <span className="sc-option__tag">Đang xem</span>}
                    </label>
                  );
                })}
              </fieldset>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

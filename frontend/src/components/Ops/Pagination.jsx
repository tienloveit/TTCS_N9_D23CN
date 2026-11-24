import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../Common/CinemaIcons';
import OpsButton from './OpsButton';

const format = new Intl.NumberFormat('vi-VN');
function JumpToPage({ page, count, onPageChange }) {
  const [draft, setDraft] = useState(String(page + 1));
  return (
    <form className="o-pagination__jump" onSubmit={(event) => {
      event.preventDefault();
      const target = Number(draft);
      if (Number.isInteger(target) && target >= 1 && target <= count) onPageChange(target - 1);
    }}>
      <label>Đến trang <input type="number" min={1} max={count} required className="o-input" value={draft}
        onChange={(event) => setDraft(event.target.value)} /></label>
      <OpsButton type="submit" size="sm">Đi</OpsButton>
    </form>
  );
}

export default function Pagination({ page, pageSize, totalItems, onPageChange, noun = 'kết quả', className = '', ...props }) {
  const count = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems ? page * pageSize + 1 : 0;
  const end = Math.min((page + 1) * pageSize, totalItems);
  return (
    <nav className={'o-pagination ' + className} aria-label="Phân trang" {...props}>
      <span>Hiển thị {format.format(start)}–{format.format(end)} trong {format.format(totalItems)} {noun}</span>
      <div className="o-actions">
        <OpsButton size="sm" icon={<ChevronLeftIcon size={16} />} disabled={page <= 0} onClick={() => onPageChange(page - 1)}>Trước</OpsButton>
        <span aria-current="page">Trang {format.format(page + 1)} / {format.format(count)}</span>
        <OpsButton size="sm" icon={<ChevronRightIcon size={16} />} disabled={page + 1 >= count} onClick={() => onPageChange(page + 1)}>Sau</OpsButton>
        {count > 1 && <JumpToPage key={page} page={page} count={count} onPageChange={onPageChange} />}
      </div>
    </nav>
  );
}

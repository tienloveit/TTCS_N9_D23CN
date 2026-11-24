import { SearchIcon, XIcon } from '../../components/Common/CinemaIcons';
import { DAYPARTS } from './scheduleModel';

const VIEWS = [
  { id: 'movie', label: 'Theo phim' },
  { id: 'time', label: 'Theo giờ' },
];

/** Chế độ xem, buổi trong ngày và ô tìm phim. Lọc trên dữ liệu đã tải, không gọi API. */
export default function ScheduleToolbar({ view, onViewChange, daypart, counts, onDaypartChange, query, onQueryChange, showSearch }) {
  return (
    <div className="sc-tools">
      <div className="sc-toggle" role="group" aria-label="Cách xem lịch chiếu">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="sc-toggle__button"
            aria-pressed={view === item.id}
            onClick={() => onViewChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="sc-parts" role="group" aria-label="Lọc theo buổi">
        {DAYPARTS.map((part) => {
          const count = counts?.[part.id] ?? 0;
          const showCount = part.id !== 'all' && counts;
          return (
            <button
              key={part.id}
              type="button"
              className="sc-part"
              aria-pressed={daypart === part.id}
              disabled={part.id !== 'all' && (!counts || count === 0)}
              onClick={() => onDaypartChange(part.id)}
            >
              {/* Tên truy cập = chữ nhìn thấy + phần giải thích: "Tối 7 suất, từ 17:00 đến 21:59". */}
              {part.label}
              {/* Khoảng trắng không hiển thị trong flex nhưng giữ "Tối 7" tách nhau trong tên truy cập. */}
              {showCount && ' '}
              {showCount && <span className="sc-part__count">{count}</span>}
              {showCount && <span className="sr-only"> suất, {part.range}</span>}
              {part.id === 'all' && counts && <span className="sr-only">, {count} suất</span>}
            </button>
          );
        })}
      </div>

      {showSearch && (
        <div className="sc-search sc-tools__search">
          <SearchIcon size={16} />
          <input
            className="sc-search__input"
            type="search"
            autoComplete="off"
            aria-label="Tìm phim trong lịch chiếu"
            placeholder="Tìm phim…"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query && (
            <button type="button" className="sc-search__clear" aria-label="Xóa tìm kiếm phim" onClick={() => onQueryChange('')}>
              <XIcon size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

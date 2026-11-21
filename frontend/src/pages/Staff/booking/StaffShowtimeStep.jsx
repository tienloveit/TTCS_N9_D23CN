import { formatScreening } from '../../../utils/cinemaFormats';
import { parseLocalDateTime } from '../../../utils/cinemaTime';
import Button from '../../../components/Common/Button';
import SafeImage from '../../../components/Common/SafeImage';
import { SearchIcon } from '../../../components/Common/CinemaIcons';
import { StaffChips } from '../StaffUI';
import useNow from '../useNow';
import { formatStartsIn, formatTime, seatFill, TIME_FILTERS } from './staffBookingUtils';

// Quầy được bán tới 15 phút sau giờ chiếu (BookingCheckoutService.STAFF_SALE_GRACE_MINUTES).
const STAFF_SALE_GRACE_MS = 15 * 60 * 1000;

function FillBar({ fill }) {
  if (!fill) return null;
  return (
    <span className={`counter-fill counter-fill--${fill.tone}`} aria-hidden="true">
      <span style={{ width: `${fill.percent}%` }} />
    </span>
  );
}

/** Trạng thái hiển thị của một suất trên nút chọn suất. */
function slotState(showtime, available, now) {
  const { availableSeats, totalSeats } = showtime;
  const fill = seatFill(availableSeats, totalSeats);
  const start = parseLocalDateTime(showtime.startTime);
  const started = Boolean(start) && start.getTime() <= now;
  if (!available) return { closed: true, fill, note: started ? 'Ngừng bán' : 'Đã đóng' };
  if (fill?.tone === 'full') return { closed: true, fill, note: 'Hết ghế' };
  if (!fill) return { closed: false, fill, note: started ? 'Đã chiếu' : 'Đang mở bán', started };
  if (started) return { closed: false, fill, note: `Đã chiếu · còn ${availableSeats}`, started };
  if (fill.tone === 'low') return { closed: false, fill, note: `Sắp hết · ${availableSeats}/${totalSeats}` };
  return { closed: false, fill, note: `Còn ${availableSeats}/${totalSeats}` };
}

/** Suất sắp bắt đầu: bấm một lần là sang sơ đồ ghế. */
function SoonCard({ showtime, now, onSelect }) {
  const start = parseLocalDateTime(showtime.startTime);
  const started = Boolean(start) && start.getTime() <= now;
  const fill = seatFill(showtime.availableSeats, showtime.totalSeats);
  const room = [
    showtime.roomName || 'Phòng chiếu',
    formatScreening(showtime.screeningFormat, showtime.roomTechnology),
    started && start ? `bán đến ${formatTime(new Date(start.getTime() + STAFF_SALE_GRACE_MS))}` : null,
  ].filter(Boolean).join(' · ');
  return (
    <button type="button" className={'counter-soon' + (started ? ' counter-soon--late' : '')} onClick={() => onSelect(showtime, true)}>
      <span className="counter-soon-head">
        <strong>{formatTime(showtime.startTime)}</strong>
        {start && <span>{formatStartsIn(start.getTime(), now)}</span>}
      </span>
      <strong className="counter-soon-movie">{showtime.movieName}</strong>
      <small>{room}</small>
      {fill && (
        <span className="counter-soon-seats">
          <FillBar fill={fill} />
          <small className={`counter-seats-note counter-seats-note--${fill.tone}`}>
            {fill.tone === 'low' ? 'Sắp hết · ' : 'Còn '}{showtime.availableSeats} ghế
          </small>
        </span>
      )}
    </button>
  );
}

/** Bước 1: lọc và chọn suất chiếu. Bấm một lần vào suất là sang sơ đồ ghế. */
export default function StaffShowtimeStep({
  branchFilter,
  branchOptions,
  clearFilters,
  dateFilter,
  filteredShowtimes,
  handleBranchFilterChange,
  handleSelectShowtime,
  hasActiveFilters,
  isShowtimeAvailable,
  movieGroups,
  quickDates,
  searchQuery,
  setDateFilter,
  setSearchQuery,
  setStatusFilter,
  setTimeFilter,
  showBranchFilter,
  showtimeId,
  soonShowtimes,
  statusFilter,
  timeFilter,
}) {
  const now = useNow(30_000);
  const activeDate = quickDates.find((day) => day.key === dateFilter);
  const scheduleTitle = !activeDate ? 'Lịch chiếu'
    : activeDate.label === 'Hôm nay' ? 'Lịch chiếu hôm nay' : `Lịch chiếu ${activeDate.label.toLowerCase()} ${activeDate.display}`;

  return (
    <>
      <section className="counter-card counter-filters" aria-label="Lọc lịch chiếu">
        <div className="counter-dates" role="group" aria-label="Ngày chiếu">
          {quickDates.map((day) => (
            <button key={day.key} type="button" aria-pressed={dateFilter === day.key} onClick={() => setDateFilter(day.key)}>
              <span>{day.label}</span>
              <strong>{day.display}</strong>
            </button>
          ))}
        </div>
        <div className="counter-filter-row">
          <div className="counter-search">
            <SearchIcon size={17} aria-hidden="true" />
            <input
              type="search"
              className="input"
              aria-label="Tìm phim hoặc phòng chiếu"
              placeholder="Tìm phim hoặc phòng chiếu"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <StaffChips label="Khung giờ chiếu" options={TIME_FILTERS} value={timeFilter} onChange={setTimeFilter} />
          {showBranchFilter && (
            <select className="input counter-branch" aria-label="Chi nhánh" value={branchFilter} onChange={handleBranchFilterChange}>
              <option value="ALL">Tất cả chi nhánh</option>
              {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          )}
          <label className="counter-check">
            <input
              type="checkbox"
              checked={statusFilter === 'AVAILABLE'}
              onChange={(event) => setStatusFilter(event.target.checked ? 'AVAILABLE' : 'ALL')}
            />
            Chỉ suất còn bán
          </label>
        </div>
      </section>

      {soonShowtimes.length > 0 && (
        <section className="counter-section" aria-labelledby="counter-soon-title">
          <div className="counter-section-head">
            <h2 id="counter-soon-title">Sắp bắt đầu</h2>
            <span>Bấm để mở sơ đồ ghế</span>
          </div>
          <div className="counter-soon-grid">
            {soonShowtimes.map((showtime) => (
              <SoonCard key={showtime.showtimeId} showtime={showtime} now={now} onSelect={handleSelectShowtime} />
            ))}
          </div>
        </section>
      )}

      <section className="counter-section" aria-labelledby="counter-schedule-title">
        <div className="counter-section-head">
          <h2 id="counter-schedule-title">{scheduleTitle}</h2>
          <span role="status">{movieGroups.length} phim · {filteredShowtimes.length} suất</span>
        </div>

        {movieGroups.length === 0 ? (
          <div className="counter-card counter-empty" role="status">
            <p>Không có suất chiếu phù hợp với bộ lọc hiện tại.</p>
            {hasActiveFilters && <Button onClick={clearFilters}>Xóa bộ lọc</Button>}
          </div>
        ) : (
          <div className="counter-movies">
            {movieGroups.map((movie) => (
              <article key={movie.movieKey} className="counter-card counter-movie">
                <SafeImage src={movie.thumbnailUrl} alt={movie.movieName} className="counter-movie-poster" />
                <div className="counter-movie-body">
                  <div className="counter-movie-head">
                    <h3>{movie.movieName}</h3>
                    {movie.ageRating && <span className="counter-age">{movie.ageRating}</span>}
                    <span className="counter-movie-meta">
                      {[movie.duration && `${movie.duration} phút`, movie.language].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  {movie.branches.map((branch) => (
                    <div key={branch.branchName} className="counter-branch-group">
                      {movie.branches.length > 1 && <p className="counter-branch-label">{branch.branchName}</p>}
                      <div className="counter-slots">
                        {branch.items.map((showtime) => {
                          const state = slotState(showtime, isShowtimeAvailable(showtime), now);
                          const selected = String(showtime.showtimeId) === String(showtimeId);
                          const format = formatScreening(showtime.screeningFormat, showtime.roomTechnology);
                          const room = showtime.roomName || 'Phòng chiếu';
                          return (
                            <button
                              key={showtime.showtimeId}
                              type="button"
                              disabled={state.closed}
                              aria-pressed={selected}
                              aria-label={`Suất ${formatTime(showtime.startTime)}, ${room}, ${format}, ${state.note}`}
                              className={[
                                'counter-slot',
                                state.fill?.tone === 'low' && 'counter-slot--low',
                                state.started && 'counter-slot--late',
                              ].filter(Boolean).join(' ')}
                              onClick={() => handleSelectShowtime(showtime, true)}
                            >
                              <span className="counter-slot-top">
                                <strong>{formatTime(showtime.startTime)}</strong>
                                <small>{format}</small>
                              </span>
                              <small className="counter-slot-room">{room}</small>
                              {!state.closed && <FillBar fill={state.fill} />}
                              <small className={'counter-slot-note' + (state.fill ? ` counter-seats-note--${state.started ? 'low' : state.fill.tone}` : '')}>
                                {state.note}
                              </small>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

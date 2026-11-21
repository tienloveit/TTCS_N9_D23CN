import { formatScreening } from '../../../utils/cinemaFormats';
import { formatDayMonth, parseLocalDateTime } from '../../../utils/cinemaTime';
import Button from '../../../components/Common/Button';
import SafeImage from '../../../components/Common/SafeImage';
import { ClockIcon, SearchIcon, SlidersIcon } from '../../../components/Common/CinemaIcons';
import { StaffChips } from '../StaffUI';
import { formatTime, TIME_FILTERS } from './staffBookingUtils';

/** Bước 1: lọc và chọn suất chiếu. */
export default function StaffShowtimeStep({
  branchFilter,
  branchOptions,
  clearFilters,
  dateFilter,
  detailFilterCount,
  filteredShowtimes,
  handleBranchFilterChange,
  handleSelectShowtime,
  hasActiveFilters,
  isShowtimeAvailable,
  movieGroups,
  quickDates,
  roomTypeFilter,
  roomTypeOptions,
  searchQuery,
  setDateFilter,
  setRoomTypeFilter,
  setSearchQuery,
  setStatusFilter,
  setTimeFilter,
  showtimeId,
  statusFilter,
  timeFilter,
}) {
  return (
    <>
      <div className="pos-filter-card">
        <div className="staff-section-line">
          <h2>Lịch chiếu</h2>
          <span role="status">{filteredShowtimes.length} suất chiếu</span>
        </div>
        {/* Quick Date Strip */}
        <div className="pos-date-ribbon">
          <button
            type="button"
            aria-pressed={!dateFilter}
            className={`pos-date-chip ${dateFilter === '' ? 'pos-date-chip--active' : ''}`}
            onClick={() => setDateFilter('')}
          >
            <span>Tất cả</span>
            <strong>Mọi ngày</strong>
          </button>
          {quickDates.map((d) => (
            <button
              key={d.key}
              type="button"
              aria-pressed={dateFilter === d.key}
              className={`pos-date-chip ${
                dateFilter === d.key ? 'pos-date-chip--active' : ''
              }`}
              onClick={() => setDateFilter(d.key === dateFilter ? '' : d.key)}
            >
              <span>{d.label}</span>
              <strong>{d.display}</strong>
            </button>
          ))}
        </div>

        {/* Search & Dropdown Filters */}
        <div className="pos-search-box">
          <SearchIcon aria-hidden="true" />
          <input
            type="search"
            className="input"
            aria-label="Tìm phim, phòng chiếu hoặc rạp"
            placeholder="Tìm nhanh tên phim, phòng chiếu, rạp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <details className="pos-more-filters">
          <summary><SlidersIcon size={16} /> Bộ lọc lịch chiếu{detailFilterCount > 0 && ` (${detailFilterCount})`}</summary>
          <div className="pos-filter-row">
            <input
              type="date"
              className="pos-filter-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Ngày chiếu"
            />

            <select
              className="pos-filter-select"
              aria-label="Chi nhánh"
              value={branchFilter}
              onChange={handleBranchFilterChange}
            >
              <option value="ALL">Tất cả chi nhánh</option>
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              className="pos-filter-select"
              aria-label="Định dạng chiếu"
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value)}
            >
              <option value="ALL">Mọi định dạng phòng</option>
              {roomTypeOptions.map((rt) => (
                <option key={rt} value={rt}>
                  Phòng {rt}
                </option>
              ))}
            </select>

            {hasActiveFilters && <Button size="sm" onClick={clearFilters}>Đặt lại</Button>}
          </div>

          <div className="pos-time-pills">
            <StaffChips label="Khung giờ chiếu" options={TIME_FILTERS} value={timeFilter} onChange={setTimeFilter} />
            <label className="pos-open-only">
              <input
                type="checkbox"
                checked={statusFilter === 'AVAILABLE'}
                onChange={(e) => setStatusFilter(e.target.checked ? 'AVAILABLE' : 'ALL')}
              />
              Chỉ hiện suất còn mở bán
            </label>
          </div>
        </details>
      </div>

      {movieGroups.length === 0 ? (
        <div className="card pos-empty" role="status">
          <p>Không tìm thấy suất chiếu phù hợp với bộ lọc hiện tại.</p>
          {hasActiveFilters && <Button onClick={clearFilters}>Xóa toàn bộ bộ lọc</Button>}
        </div>
      ) : (
        <div className="pos-movie-list">
          {movieGroups.map((movie) => {
            const hasSelectedInMovie = movie.branches.some((b) =>
              b.items.some((s) => String(s.showtimeId) === String(showtimeId))
            );

            return (
              <div
                key={movie.movieKey}
                className={`pos-movie-card ${
                  hasSelectedInMovie ? 'pos-movie-card--selected' : ''
                }`}
              >
                <SafeImage
                  src={movie.thumbnailUrl}
                  alt={movie.movieName}
                  className="pos-movie-poster"
                />

                <div className="pos-movie-body">
                  <div className="pos-movie-header">
                    <div>
                      <h2 className="pos-movie-title">{movie.movieName}</h2>
                      <div className="pos-movie-badges">
                        <span className="pos-meta-tag pos-meta-tag--age">
                          {movie.ageRating}
                        </span>
                        <span className="pos-meta-tag pos-meta-tag--format">
                          {movie.language}
                        </span>
                        {movie.duration && (
                          <span className="pos-meta-tag">
                            <ClockIcon size={12} aria-hidden="true" /> {movie.duration} phút
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {movie.branches.map((branch) => (
                    <div key={branch.branchName} className="pos-branch-group">
                      <div className="pos-branch-label">{branch.branchName}</div>
                      <div className="pos-slot-grid">
                        {branch.items.map((st) => {
                          const available = isShowtimeAvailable(st);
                          const selected = String(st.showtimeId) === String(showtimeId);
                          const availSeats = st.availableSeats;
                          const totalSeats = st.totalSeats;
                          const hasSeatCount =
                            availSeats != null && totalSeats != null && totalSeats > 0;
                          const isLow = hasSeatCount && availSeats > 0 && availSeats <= 15;
                          const isFull = hasSeatCount && availSeats === 0;
                          const startAt = parseLocalDateTime(st.startTime);
                          const started = Boolean(startAt) && startAt <= new Date();

                          return (
                            <button
                              key={st.showtimeId}
                              type="button"
                              disabled={!available || isFull}
                              aria-pressed={selected}
                              onClick={() => handleSelectShowtime(st, false)}
                              onDoubleClick={() => handleSelectShowtime(st, true)}
                              className={`pos-slot-btn ${
                                selected ? 'pos-slot-btn--selected' : ''
                              }`}
                              title="Nhấp để chọn suất, nhấp đúp để chuyển thẳng sang sơ đồ ghế"
                            >
                              <div className="pos-slot-top">
                                <span className="pos-slot-time">
                                  {formatTime(st.startTime)}
                                </span>
                                {st.roomTechnology && (
                                  <span className="pos-slot-type">{formatScreening(st.screeningFormat, st.roomTechnology)}</span>
                                )}
                              </div>
                              <div className="pos-slot-room">
                                {st.roomName || 'Phòng chiếu'}
                              </div>
                              {!dateFilter && st.startTime && <span className="pos-slot-date">
                                {formatDayMonth(st.startTime)}
                              </span>}
                              {started && <span className="pos-slot-date">Đã bắt đầu</span>}
                              {!available && !isFull ? (
                                !started && <div className="pos-slot-date">Ngừng bán</div>
                              ) : hasSeatCount ? (
                                <div
                                  className={`pos-slot-seats ${
                                    isFull
                                      ? 'pos-slot-seats--full'
                                      : isLow
                                      ? 'pos-slot-seats--low'
                                      : ''
                                  }`}
                                >
                                  {isFull
                                    ? 'Hết ghế'
                                    : `${isLow ? 'Sắp hết · ' : ''}${availSeats}/${totalSeats} ghế`}
                                </div>
                              ) : (
                                <div className="pos-slot-seats">
                                  {available ? 'Đang mở bán' : 'Đã đóng'}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

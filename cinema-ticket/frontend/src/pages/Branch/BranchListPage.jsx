import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { branchApi, showtimeApi } from '../../api';
import SafeImage from '../../components/Common/SafeImage';
import {
  ArrowRightIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  ExternalLinkIcon,
  FilmIcon,
  GlobeIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  TicketIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';
import {
  buildUpcomingDays,
  formatRoomType,
  formatTime,
  getAgeBadgeTone,
  parseLocalDateTime,
} from './branchUtils';
import './BranchPages.css';

export default function BranchListPage() {
  const navigate = useNavigate();
  const days = useMemo(() => buildUpcomingDays(7), []);

  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [branchSearch, setBranchSearch] = useState('');

  const [selectedDate, setSelectedDate] = useState(() => days[0]?.iso || '');
  const [movieSearch, setMovieSearch] = useState('');
  const [movieShowtimes, setMovieShowtimes] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Tải danh sách rạp đang hoạt động
  useEffect(() => {
    let ignore = false;
    const fetchBranches = async () => {
      setLoadingBranches(true);
      try {
        const res = await branchApi.getAll();
        const list = (res.data?.result || []).filter(
          (b) => !b.status || b.status === 'ACTIVE'
        );
        if (!ignore) {
          setBranches(list);
          if (list.length > 0) {
            setSelectedBranchId((prev) => prev ?? list[0].branchId);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách rạp', err);
      } finally {
        if (!ignore) setLoadingBranches(false);
      }
    };
    fetchBranches();
    return () => {
      ignore = true;
    };
  }, []);

  // Danh sách thành phố có rạp
  const cities = useMemo(() => {
    const map = new Map();
    branches.forEach((b) => {
      const city = (b.city || 'Khác').trim();
      map.set(city, (map.get(city) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [branches]);

  // Lọc danh sách rạp theo thành phố + từ khóa
  const filteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    return branches.filter((b) => {
      const cityName = (b.city || 'Khác').trim();
      if (selectedCity !== 'ALL' && cityName !== selectedCity) return false;
      if (!q) return true;
      return (
        b.name?.toLowerCase().includes(q) ||
        b.address?.toLowerCase().includes(q) ||
        b.city?.toLowerCase().includes(q) ||
        b.branchCode?.toLowerCase().includes(q)
      );
    });
  }, [branches, selectedCity, branchSearch]);

  // Tự động chọn rạp đầu tiên trong danh sách lọc nếu rạp đang chọn không còn nằm trong kết quả
  useEffect(() => {
    if (filteredBranches.length === 0) return;
    const exists = filteredBranches.some(
      (b) => String(b.branchId) === String(selectedBranchId)
    );
    if (!exists) {
      setSelectedBranchId(filteredBranches[0].branchId);
    }
  }, [filteredBranches, selectedBranchId]);

  const activeBranch = useMemo(
    () =>
      branches.find((b) => String(b.branchId) === String(selectedBranchId)) ||
      null,
    [branches, selectedBranchId]
  );

  // Tải lịch chiếu của rạp đang chọn + ngày đang chọn
  useEffect(() => {
    if (!selectedBranchId || !selectedDate) {
      setMovieShowtimes([]);
      return undefined;
    }
    let ignore = false;
    const fetchSchedule = async () => {
      setLoadingSchedule(true);
      try {
        const res = await showtimeApi.getByBranch(selectedBranchId, selectedDate);
        if (!ignore) {
          setMovieShowtimes(res.data?.result || []);
        }
      } catch (err) {
        console.error('Lỗi khi tải lịch chiếu theo rạp', err);
        if (!ignore) setMovieShowtimes([]);
      } finally {
        if (!ignore) setLoadingSchedule(false);
      }
    };
    fetchSchedule();
    return () => {
      ignore = true;
    };
  }, [selectedBranchId, selectedDate]);

  const activeDayMeta = useMemo(
    () => days.find((d) => d.iso === selectedDate) || days[0],
    [days, selectedDate]
  );

  const visibleMovieGroups = useMemo(() => {
    const q = movieSearch.trim().toLowerCase();
    if (!q) return movieShowtimes;
    return movieShowtimes.filter((m) =>
      m.movieName?.toLowerCase().includes(q)
    );
  }, [movieShowtimes, movieSearch]);

  const totalShowtimeCount = useMemo(
    () =>
      visibleMovieGroups.reduce(
        (sum, m) => sum + (m.showtimes?.length || 0),
        0
      ),
    [visibleMovieGroups]
  );

  const getMapUrl = (branch) => {
    if (!branch) return 'https://www.google.com/maps';
    const query = [branch.name, branch.address, branch.city]
      .filter(Boolean)
      .join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  if (loadingBranches) {
    return (
      <div className="page br-page">
        <div className="container br-wrap">
          <div className="br-header-skeleton">
            <div className="br-sk br-sk-title" />
            <div className="br-sk br-sk-sub" />
          </div>
          <div className="br-hub">
            <div className="br-sidebar">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="br-sk br-sk-branch-item" />
              ))}
            </div>
            <div className="br-main">
              <div className="br-sk br-sk-banner" />
              <div className="br-sk br-sk-dates" />
              <div className="br-sk br-sk-movie" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page br-page">
      <div className="container br-wrap">
        {/* ==================== PAGE HEADER ==================== */}
        <header className="br-hero">
          <div className="br-hero-text">
            <span className="br-eyebrow">Hệ thống rạp MoviePTIT</span>
            <h1 className="br-title">Rạp chiếu & Lịch chiếu</h1>
            <p className="br-subtitle">
              Chọn cụm rạp gần bạn để tra cứu suất chiếu trực tiếp và đặt ghế ngay trong vài giây.
            </p>
          </div>

          <div className="br-hero-stats">
            <div className="br-stat-pill">
              <strong>{branches.length}</strong>
              <span>Cụm rạp</span>
            </div>
            <div className="br-stat-pill">
              <strong>{cities.length}</strong>
              <span>Tỉnh / Thành phố</span>
            </div>
          </div>
        </header>

        {/* ==================== CITY FILTER BAR ==================== */}
        {cities.length > 1 && (
          <div className="br-city-bar" role="tablist" aria-label="Lọc theo khu vực">
            <button
              type="button"
              role="tab"
              aria-selected={selectedCity === 'ALL'}
              className={`br-city-pill ${selectedCity === 'ALL' ? 'is-active' : ''}`}
              onClick={() => setSelectedCity('ALL')}
            >
              Tất cả khu vực
              <span className="br-city-count">{branches.length}</span>
            </button>
            {cities.map((c) => (
              <button
                key={c.name}
                type="button"
                role="tab"
                aria-selected={selectedCity === c.name}
                className={`br-city-pill ${selectedCity === c.name ? 'is-active' : ''}`}
                onClick={() => setSelectedCity(c.name)}
              >
                {c.name}
                <span className="br-city-count">{c.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* ==================== MASTER - DETAIL CINEMA HUB ==================== */}
        {branches.length === 0 ? (
          <div className="br-empty-box">
            <BuildingIcon size={36} className="br-empty-icon" />
            <h3>Chưa có cụm rạp nào hoạt động</h3>
            <p>Hệ thống đang cập nhật danh sách rạp chiếu. Vui lòng quay lại sau.</p>
          </div>
        ) : (
          <div className="br-hub">
            {/* ---------- LEFT SIDEBAR: DANH SÁCH RẠP ---------- */}
            <aside className="br-sidebar" aria-label="Danh sách cụm rạp">
              <div className="br-sidebar-head">
                <div className="br-search-box">
                  <SearchIcon size={16} className="br-search-icon" />
                  <input
                    type="text"
                    className="br-search-input"
                    placeholder="Tìm tên rạp, quận, địa chỉ..."
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                  />
                  {branchSearch && (
                    <button
                      type="button"
                      className="br-search-clear"
                      onClick={() => setBranchSearch('')}
                      aria-label="Xoá tìm kiếm"
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="br-branch-list">
                {filteredBranches.length === 0 ? (
                  <div className="br-sidebar-empty">
                    <p>Không tìm thấy rạp phù hợp với "{branchSearch}".</p>
                    <button
                      type="button"
                      className="br-reset-link"
                      onClick={() => {
                        setBranchSearch('');
                        setSelectedCity('ALL');
                      }}
                    >
                      Đặt lại bộ lọc
                    </button>
                  </div>
                ) : (
                  filteredBranches.map((branch) => {
                    const isSelected =
                      String(branch.branchId) === String(selectedBranchId);
                    return (
                      <button
                        key={branch.branchId}
                        type="button"
                        className={`br-branch-item ${isSelected ? 'is-active' : ''}`}
                        onClick={() => setSelectedBranchId(branch.branchId)}
                      >
                        <div className="br-branch-item-top">
                          <span className="br-branch-name">{branch.name}</span>
                          {branch.city && (
                            <span className="br-branch-city-tag">{branch.city}</span>
                          )}
                        </div>
                        {branch.address && (
                          <p className="br-branch-addr">
                            <MapPinIcon size={13} className="br-branch-addr-icon" />
                            <span>{branch.address}</span>
                          </p>
                        )}
                        <div className="br-branch-item-foot">
                          {branch.phone ? (
                            <span className="br-branch-phone">
                              <PhoneIcon size={12} />
                              {branch.phone}
                            </span>
                          ) : (
                            <span className="br-branch-phone">MoviePTIT Cinema</span>
                          )}
                          <ChevronRightIcon size={16} className="br-branch-chevron" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* ---------- RIGHT MAIN PANEL: THÔNG TIN RẠP & LỊCH CHIẾU ---------- */}
            <main className="br-main">
              {activeBranch ? (
                <>
                  {/* Spotlight Card của rạp đang chọn */}
                  <section className="br-spotlight">
                    <div className="br-spotlight-info">
                      <div className="br-spotlight-badges">
                        <span className="br-status-dot-badge">
                          <span className="br-live-dot" />
                          Đang mở cửa
                        </span>
                        {activeBranch.branchCode && (
                          <span className="br-code-badge">{activeBranch.branchCode}</span>
                        )}
                        {activeBranch.city && (
                          <span className="br-city-badge">{activeBranch.city}</span>
                        )}
                      </div>

                      <h2 className="br-spotlight-name">{activeBranch.name}</h2>

                      <div className="br-spotlight-meta">
                        {activeBranch.address && (
                          <div className="br-spotlight-meta-row">
                            <MapPinIcon size={16} className="br-meta-icon" />
                            <span>
                              {activeBranch.address}
                              {activeBranch.city ? `, ${activeBranch.city}` : ''}
                            </span>
                          </div>
                        )}
                        {activeBranch.phone && (
                          <div className="br-spotlight-meta-row">
                            <PhoneIcon size={16} className="br-meta-icon" />
                            <a href={`tel:${activeBranch.phone}`} className="br-phone-link">
                              {activeBranch.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="br-spotlight-actions">
                      <a
                        href={getMapUrl(activeBranch)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="br-btn br-btn--outline"
                      >
                        <ExternalLinkIcon size={15} />
                        Chỉ đường
                      </a>
                      <Link
                        to={`/branch/${activeBranch.branchId}`}
                        className="br-btn br-btn--primary"
                      >
                        Trang riêng của rạp
                        <ArrowRightIcon size={15} />
                      </Link>
                    </div>
                  </section>

                  {/* Thanh chọn ngày 7 ngày tới + lọc phim */}
                  <section className="br-schedule-bar">
                    <div className="br-date-strip" role="tablist" aria-label="Chọn ngày xem phim">
                      {days.map((d) => {
                        const isActive = d.iso === selectedDate;
                        return (
                          <button
                            key={d.iso}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            className={`br-date-pill ${isActive ? 'is-active' : ''}`}
                            onClick={() => setSelectedDate(d.iso)}
                          >
                            <span className="br-date-top">{d.relativeLabel}</span>
                            <strong className="br-date-num">
                              {d.dayNum}/{d.monthNum}
                            </strong>
                          </button>
                        );
                      })}
                    </div>

                    <div className="br-schedule-Subbar">
                      <div className="br-schedule-summary">
                        <CalendarIcon size={15} />
                        <span>{activeDayMeta?.fullLabel}</span>
                        {!loadingSchedule && (
                          <span className="br-schedule-counter">
                            · <strong>{visibleMovieGroups.length}</strong> phim ·{' '}
                            <strong>{totalShowtimeCount}</strong> suất chiếu
                          </span>
                        )}
                      </div>

                      {movieShowtimes.length > 1 && (
                        <div className="br-movie-filter">
                          <SearchIcon size={14} className="br-movie-filter-icon" />
                          <input
                            type="text"
                            placeholder="Lọc nhanh tên phim..."
                            value={movieSearch}
                            onChange={(e) => setMovieSearch(e.target.value)}
                          />
                          {movieSearch && (
                            <button
                              type="button"
                              onClick={() => setMovieSearch('')}
                              aria-label="Xoá lọc phim"
                            >
                              <XIcon size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Danh sách phim và suất chiếu */}
                  {loadingSchedule ? (
                    <div className="br-movie-list">
                      {[0, 1].map((idx) => (
                        <div key={idx} className="br-sk br-sk-movie" />
                      ))}
                    </div>
                  ) : visibleMovieGroups.length === 0 ? (
                    <div className="br-empty-schedule">
                      <FilmIcon size={32} className="br-empty-icon" />
                      <h3>
                        {movieSearch
                          ? `Không có phim nào khớp "${movieSearch}"`
                          : 'Chưa có suất chiếu cho ngày này'}
                      </h3>
                      <p>
                        {movieSearch
                          ? 'Thử từ khoá khác hoặc xoá bộ lọc tên phim.'
                          : 'Hãy thử chọn một ngày chiếu khác trên thanh lịch hoặc đổi sang cụm rạp lân cận.'}
                      </p>
                      {movieSearch ? (
                        <button
                          type="button"
                          className="br-btn br-btn--outline"
                          onClick={() => setMovieSearch('')}
                        >
                          Hiển thị tất cả phim
                        </button>
                      ) : (
                        <Link to="/movies" className="br-btn br-btn--outline">
                          Khám phá danh sách phim
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="br-movie-list">
                      {visibleMovieGroups.map((movieGroup) => (
                        <MovieScheduleCard
                          key={movieGroup.movieId}
                          movieGroup={movieGroup}
                          onSelectMovie={() => navigate(`/movie/${movieGroup.movieId}`)}
                          onSelectShowtime={(showtimeId) =>
                            navigate(`/showtime/${showtimeId}/seats`)
                          }
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

export function MovieScheduleCard({ movieGroup, onSelectMovie, onSelectShowtime }) {
  // Gom nhóm suất chiếu theo định dạng phòng (2D, 3D, IMAX...) và sắp xếp theo giờ chiếu
  const groupedByFormat = useMemo(() => {
    const map = new Map();
    const sorted = [...(movieGroup.showtimes || [])].sort((a, b) => {
      const ta = parseLocalDateTime(a.startTime)?.getTime() || 0;
      const tb = parseLocalDateTime(b.startTime)?.getTime() || 0;
      return ta - tb;
    });

    sorted.forEach((st) => {
      const key = st.roomType || '2D';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(st);
    });

    return Array.from(map.entries());
  }, [movieGroup.showtimes]);

  const ageTone = getAgeBadgeTone(movieGroup.ageRating);

  return (
    <article className="br-movie-card">
      <div
        className="br-movie-poster-wrap"
        onClick={onSelectMovie}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onSelectMovie();
        }}
      >
        <SafeImage
          src={movieGroup.thumbnailUrl}
          alt={movieGroup.movieName}
          className="br-movie-poster"
        />
      </div>

      <div className="br-movie-body">
        <div className="br-movie-head">
          <div className="br-movie-title-row">
            {movieGroup.ageRating && (
              <span className={`br-age-badge br-age--${ageTone}`}>
                {movieGroup.ageRating}
              </span>
            )}
            <h3 className="br-movie-title" onClick={onSelectMovie}>
              {movieGroup.movieName}
            </h3>
          </div>

          <div className="br-movie-meta">
            {movieGroup.durationMinutes && (
              <span className="br-meta-chip">
                <ClockIcon size={14} />
                {movieGroup.durationMinutes} phút
              </span>
            )}
            {movieGroup.language && (
              <span className="br-meta-chip">
                <GlobeIcon size={14} />
                {movieGroup.language}
              </span>
            )}
          </div>
        </div>

        <div className="br-format-groups">
          {groupedByFormat.map(([roomType, sts]) => (
            <div key={roomType} className="br-format-row">
              <div className="br-format-label">{formatRoomType(roomType)}</div>
              <div className="br-slot-grid">
                {sts.map((st) => {
                  const total = Number(st.totalSeats || 0);
                  const avail = Number(st.availableSeats ?? total);
                  const isSoldOut = total > 0 && avail <= 0;
                  const isLowSeats = !isSoldOut && total > 0 && avail <= 12;

                  return (
                    <button
                      key={st.showtimeId}
                      type="button"
                      disabled={isSoldOut}
                      className={`br-slot-btn ${isSoldOut ? 'is-soldout' : ''} ${
                        isLowSeats ? 'is-low' : ''
                      }`}
                      onClick={() => onSelectShowtime(st.showtimeId)}
                    >
                      <div className="br-slot-time">
                        <strong>{formatTime(st.startTime)}</strong>
                        {st.endTime && (
                          <span className="br-slot-endtime">~ {formatTime(st.endTime)}</span>
                        )}
                      </div>
                      <div className="br-slot-sub">
                        <span className="br-slot-room">{st.roomName || 'Phòng chiếu'}</span>
                        {total > 0 && (
                          <span className="br-slot-seats">
                            <TicketIcon size={11} />
                            {isSoldOut ? 'Hết ghế' : `Còn ${avail}/${total}`}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

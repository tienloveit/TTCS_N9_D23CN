import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { branchApi, showtimeApi } from '../../api';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ExternalLinkIcon,
  FilmIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';
import { MovieScheduleCard } from './BranchListPage';
import { buildUpcomingDays } from './branchUtils';
import './BranchPages.css';

export default function BranchDetailPage() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const days = useMemo(() => buildUpcomingDays(7), []);

  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState(null);
  const [loadingBranch, setLoadingBranch] = useState(true);

  const [selectedDate, setSelectedDate] = useState(() => days[0]?.iso || '');
  const [movieSearch, setMovieSearch] = useState('');
  const [movieShowtimes, setMovieShowtimes] = useState([]);
  const [loadingShowtimes, setLoadingShowtimes] = useState(true);

  // Dùng branchApi.getAll() (public endpoint) thay vì getById (vốn bị giới hạn ADMIN/MANAGER ở backend)
  useEffect(() => {
    let ignore = false;
    const fetchBranchData = async () => {
      setLoadingBranch(true);
      try {
        const res = await branchApi.getAll();
        const list = (res.data?.result || []).filter(
          (b) => !b.status || b.status === 'ACTIVE'
        );
        if (!ignore) {
          setBranches(list);
          const found =
            list.find((b) => String(b.branchId) === String(branchId)) || null;
          setBranch(found);
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin rạp', err);
      } finally {
        if (!ignore) setLoadingBranch(false);
      }
    };
    fetchBranchData();
    return () => {
      ignore = true;
    };
  }, [branchId]);

  useEffect(() => {
    let ignore = false;
    const fetchShowtimes = async () => {
      setLoadingShowtimes(true);
      try {
        const res = await showtimeApi.getByBranch(branchId, selectedDate);
        if (!ignore) {
          setMovieShowtimes(res.data?.result || []);
        }
      } catch (err) {
        console.error('Lỗi khi tải suất chiếu', err);
        if (!ignore) setMovieShowtimes([]);
      } finally {
        if (!ignore) setLoadingShowtimes(false);
      }
    };
    fetchShowtimes();
    return () => {
      ignore = true;
    };
  }, [branchId, selectedDate]);

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

  const getMapUrl = (b) => {
    if (!b) return 'https://www.google.com/maps';
    const query = [b.name, b.address, b.city].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  return (
    <div className="page br-page">
      <div className="container br-wrap">
        {/* Thanh điều hướng quay lại + đổi nhanh cụm rạp */}
        <div className="br-detail-topbar">
          <Link to="/branches" className="br-back-link">
            <ArrowLeftIcon size={16} />
            Hệ thống rạp MoviePTIT
          </Link>

          {branches.length > 1 && (
            <div className="br-quick-switcher">
              <span>Đổi rạp nhanh:</span>
              <div className="br-quick-switcher-pills">
                {branches.map((b) => {
                  const isCurrent = String(b.branchId) === String(branchId);
                  return (
                    <button
                      key={b.branchId}
                      type="button"
                      className={`br-switch-pill ${isCurrent ? 'is-active' : ''}`}
                      onClick={() => navigate(`/branch/${b.branchId}`)}
                    >
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Spotlight Banner của Rạp */}
        <section className="br-spotlight br-spotlight--detail">
          <div className="br-spotlight-info">
            <div className="br-spotlight-badges">
              <span className="br-status-dot-badge">
                <span className="br-live-dot" />
                Đang mở cửa
              </span>
              {branch?.branchCode && (
                <span className="br-code-badge">{branch.branchCode}</span>
              )}
              {branch?.city && (
                <span className="br-city-badge">{branch.city}</span>
              )}
            </div>

            <h1 className="br-spotlight-name">
              {loadingBranch
                ? 'Đang tải thông tin rạp...'
                : branch?.name || `Cụm rạp #${branchId}`}
            </h1>

            <div className="br-spotlight-meta">
              {branch?.address && (
                <div className="br-spotlight-meta-row">
                  <MapPinIcon size={16} className="br-meta-icon" />
                  <span>
                    {branch.address}
                    {branch.city ? `, ${branch.city}` : ''}
                  </span>
                </div>
              )}
              {branch?.phone && (
                <div className="br-spotlight-meta-row">
                  <PhoneIcon size={16} className="br-meta-icon" />
                  <a href={`tel:${branch.phone}`} className="br-phone-link">
                    {branch.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {branch && (
            <div className="br-spotlight-actions">
              <a
                href={getMapUrl(branch)}
                target="_blank"
                rel="noopener noreferrer"
                className="br-btn br-btn--outline"
              >
                <ExternalLinkIcon size={15} />
                Mở Google Maps
              </a>
            </div>
          )}
        </section>

        {/* Thanh chọn ngày 7 ngày tới */}
        <section className="br-schedule-bar">
          <div className="br-date-strip" role="tablist" aria-label="Chọn ngày chiếu">
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
              {!loadingShowtimes && (
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

        {/* Danh sách suất chiếu */}
        {loadingShowtimes ? (
          <div className="br-movie-list">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="br-sk br-sk-movie" />
            ))}
          </div>
        ) : visibleMovieGroups.length === 0 ? (
          <div className="br-empty-schedule">
            <FilmIcon size={32} className="br-empty-icon" />
            <h3>
              {movieSearch
                ? `Không có phim nào khớp "${movieSearch}"`
                : 'Không có suất chiếu nào cho ngày này'}
            </h3>
            <p>
              {movieSearch
                ? 'Hãy thử xoá từ khoá lọc hoặc chọn ngày chiếu khác.'
                : 'Bạn có thể chọn một ngày khác trên thanh lịch hoặc xem các cụm rạp khác của MoviePTIT.'}
            </p>
            <div className="br-empty-actions">
              {movieSearch && (
                <button
                  type="button"
                  className="br-btn br-btn--outline"
                  onClick={() => setMovieSearch('')}
                >
                  Xoá bộ lọc phim
                </button>
              )}
              <Link to="/branches" className="br-btn br-btn--primary">
                Xem tất cả cụm rạp
              </Link>
            </div>
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
      </div>
    </div>
  );
}

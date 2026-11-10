import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { movieApi, genreApi } from '../../api';
import SafeImage from '../../components/Common/SafeImage';
import { SkeletonBox } from '../../components/Common/Skeleton';
import EmptyState from '../../components/Common/EmptyState';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  FilmIcon,
  SearchIcon,
  SparkIcon,
  StarIcon,
  TicketIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';

const MotionDiv = motion.div;

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả phim', icon: FilmIcon },
  { key: 'NOW_SHOWING', label: 'Đang chiếu', icon: SparkIcon },
  { key: 'UPCOMING', label: 'Sắp chiếu', icon: CalendarIcon },
];

export default function MovieListPage() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters - read initial status from URL
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('movieName') || '');
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [ageFilter, setAgeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('DEFAULT');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'ALL');

  // Sync filters when URL query params change (e.g. navbar search or dropdown navigation)
  useEffect(() => {
    const urlStatus = searchParams.get('status') || 'ALL';
    const urlSearch = searchParams.get('movieName') || '';

    setStatusFilter(urlStatus);
    setSearchTerm(urlSearch);
    setCurrentPage(1);
  }, [searchParams]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [movieRes, genreRes] = await Promise.allSettled([
          movieApi.getAll(),
          genreApi.getAll()
        ]);

        if (movieRes.status === 'fulfilled') {
          setMovies(movieRes.value.data.result || []);
        }
        if (genreRes.status === 'fulfilled') {
          setGenres(genreRes.value.data.result || []);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách phim', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleStatusChange = (nextStatus) => {
    setStatusFilter(nextStatus);
    setCurrentPage(1);
    const nextParams = new URLSearchParams(searchParams);
    if (nextStatus === 'ALL') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', nextStatus);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleGenreSelect = (genreVal) => {
    setSelectedGenre(genreVal);
    setCurrentPage(1);
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedGenre('ALL');
    setAgeFilter('ALL');
    setSortBy('DEFAULT');
    handleStatusChange('ALL');
  };

  // Filter + Sort Logic
  const filteredMovies = useMemo(() => {
    const list = movies.filter((movie) => {
      const matchSearch = movie.movieName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchGenre =
        selectedGenre === 'ALL'
          ? true
          : movie.genres?.some(
              (g) =>
                String(g.id) === String(selectedGenre) ||
                String(g.genreId) === String(selectedGenre) ||
                g.name === selectedGenre
            );
      const matchStatus = statusFilter === 'ALL' ? true : movie.status === statusFilter;
      const matchAge = ageFilter === 'ALL' ? true : movie.ageRating === ageFilter;

      return matchSearch && matchGenre && matchStatus && matchAge;
    });

    if (sortBy === 'RATING') {
      return [...list].sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
    }
    if (sortBy === 'NEWEST') {
      return [...list].sort(
        (a, b) => new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime()
      );
    }
    if (sortBy === 'DURATION') {
      return [...list].sort((a, b) => Number(b.durationMinutes || 0) - Number(a.durationMinutes || 0));
    }
    return list;
  }, [movies, searchTerm, selectedGenre, statusFilter, ageFilter, sortBy]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
  const paginatedMovies = filteredMovies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="page" style={{ paddingTop: '80px' }}>
        <div className="container">
          <SkeletonBox height="40px" width="300px" className="mb-4" />
          <SkeletonBox height="20px" width="450px" className="mb-8" />
          <SkeletonBox height="100px" borderRadius="12px" className="mb-8" />
          <div className="movie-grid">
            <SkeletonBox count={8} height="400px" borderRadius="12px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header" style={{ marginBottom: 24 }}>
          <h1 className="page-title page-title-with-icon">
            {statusFilter === 'NOW_SHOWING' ? (
              <SparkIcon className="page-title-icon" />
            ) : statusFilter === 'UPCOMING' ? (
              <CalendarIcon className="page-title-icon" />
            ) : (
              <FilmIcon className="page-title-icon" />
            )}
            {statusFilter === 'NOW_SHOWING'
              ? 'Phim đang chiếu'
              : statusFilter === 'UPCOMING'
                ? 'Phim sắp chiếu'
                : 'Danh sách phim'}
          </h1>
          <p className="page-subtitle">
            Khám phá toàn bộ phim điện ảnh tại MoviePTIT ({filteredMovies.length} phim)
          </p>
        </div>

        {/* ================= FILTER & SORT TOOLBAR ================= */}
        <div className="ml-toolbar">
          <div className="ml-toolbar-top">
            <div className="ml-status-tabs" role="tablist" aria-label="Trạng thái chiếu">
              {STATUS_TABS.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`ml-status-tab ${isActive ? 'is-active' : ''}`}
                    onClick={() => handleStatusChange(tab.key)}
                  >
                    <IconComponent size={15} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="ml-controls-row">
              <div className="ml-search-box">
                <SearchIcon size={16} className="ml-search-icon" />
                <input
                  type="text"
                  aria-label="Tìm kiếm phim theo tên"
                  placeholder="Tìm tên phim..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="home-inline-search-clear"
                    aria-label="Xoá từ khoá"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                  >
                    <XIcon size={12} />
                  </button>
                )}
              </div>

              <select
                className="ml-select"
                aria-label="Lọc theo phân loại độ tuổi"
                value={ageFilter}
                onChange={(e) => {
                  setAgeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">Mọi độ tuổi</option>
                <option value="P">P - Phổ biến</option>
                <option value="T13">T13 - Từ 13 tuổi</option>
                <option value="T16">T16 - Từ 16 tuổi</option>
                <option value="T18">T18 - Từ 18 tuổi</option>
              </select>

              <select
                className="ml-select"
                aria-label="Sắp xếp danh sách phim"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="DEFAULT">Sắp xếp: Mặc định</option>
                <option value="RATING">Đánh giá cao nhất</option>
                <option value="NEWEST">Mới khởi chiếu</option>
                <option value="DURATION">Thời lượng dài nhất</option>
              </select>
            </div>
          </div>

          {genres.length > 0 && (
            <div className="ml-genre-pills" role="group" aria-label="Lọc theo thể loại">
              <button
                type="button"
                className={`ml-genre-pill ${selectedGenre === 'ALL' ? 'is-active' : ''}`}
                onClick={() => handleGenreSelect('ALL')}
              >
                Tất cả thể loại
              </button>
              {genres.map((g) => {
                const val = g.name || g.genreId;
                const isActive = String(selectedGenre) === String(val);
                return (
                  <button
                    key={g.genreId || g.id || g.name}
                    type="button"
                    className={`ml-genre-pill ${isActive ? 'is-active' : ''}`}
                    onClick={() => handleGenreSelect(val)}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= GRID ================= */}
        {filteredMovies.length === 0 ? (
          <EmptyState
            title="Không tìm thấy phim phù hợp"
            message="Không có bộ phim nào khớp với bộ lọc hiện tại. Hãy thử đặt lại bộ lọc hoặc đổi từ khoá khác."
            buttonText="Đặt lại bộ lọc"
            onAction={resetAllFilters}
          />
        ) : (
          <>
            <div className="movie-grid">
              {paginatedMovies.map((movie) => (
                <MotionDiv
                  key={movie.movieId}
                  className="card movie-card"
                  onClick={() => navigate(`/movie/${movie.movieId}`)}
                  whileHover={{ y: -3, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="movie-poster-wrap">
                    <SafeImage
                      className="movie-poster"
                      src={movie.thumbnailUrl}
                      alt={movie.movieName}
                    />
                    {movie.status === 'UPCOMING' && (
                      <div className="movie-upcoming-badge">Sắp chiếu</div>
                    )}
                    <div className="movie-overlay">
                      <button type="button" className="btn btn-primary btn-sm">
                        <TicketIcon size={15} /> Chi tiết & Đặt vé
                      </button>
                    </div>
                  </div>
                  <div className="movie-info">
                    <h3 className="movie-title" title={movie.movieName}>{movie.movieName}</h3>
                    {movie.directorName && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                        Đạo diễn: {movie.directorName}
                      </div>
                    )}
                    <div className="movie-meta">
                      {movie.durationMinutes && (
                        <span>
                          <ClockIcon className="inline-icon" />
                          {movie.durationMinutes}p
                        </span>
                      )}
                      {movie.ageRating && <span className="movie-badge">{movie.ageRating}</span>}
                    </div>
                    <div className="movie-card-rating">
                      <StarIcon size={14} style={{ color: 'var(--gold)', fill: 'var(--gold)' }} />
                      {movie.ratingCount > 0
                        ? `${Number(movie.averageRating || 0).toFixed(1)} (${movie.ratingCount})`
                        : 'Chưa có đánh giá'}
                    </div>
                    {movie.releaseDate && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                        <CalendarIcon className="inline-icon" />
                        {formatDate(movie.releaseDate)}
                      </div>
                    )}
                  </div>
                </MotionDiv>
              ))}
            </div>

            {/* ================= PAGINATION ================= */}
            {totalPages > 1 && (
              <div className="ml-pagination">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  aria-label="Trang trước"
                >
                  <ChevronLeftIcon size={16} /> Trước
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setCurrentPage(i + 1)}
                    style={{ width: 40, padding: 0 }}
                    aria-label={`Trang ${i + 1}`}
                    aria-current={currentPage === i + 1 ? 'page' : undefined}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  aria-label="Trang sau"
                >
                  Sau <ChevronRightIcon size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

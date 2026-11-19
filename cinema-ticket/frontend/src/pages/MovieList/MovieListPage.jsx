import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { movieApi, genreApi } from '../../api';
import MovieCard, { CatalogEmpty } from '../../components/MovieCard/MovieCard';
import { SkeletonBox } from '../../components/Common/Skeleton';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilmIcon,
  SearchIcon,
  SparkIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';

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
    if (searchTerm.trim()) nextParams.set('movieName', searchTerm.trim());
    else nextParams.delete('movieName');
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
    setStatusFilter('ALL');
    setCurrentPage(1);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('status');
    nextParams.delete('movieName');
    setSearchParams(nextParams, { replace: true });
  };

  // Filter + Sort Logic
  const filteredMovies = useMemo(() => {
    const list = movies.filter((movie) => {
      const matchSearch = movie.movieName?.toLocaleLowerCase('vi').includes(searchTerm.trim().toLocaleLowerCase('vi'));
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

  if (loading) {
    return (
      <div className="page catalog-page">
        <div className="container catalog-container">
          <SkeletonBox height="40px" width="min(300px, 100%)" className="mb-4" />
          <SkeletonBox height="20px" width="min(450px, 100%)" className="mb-8" />
          <SkeletonBox height="100px" borderRadius="12px" className="mb-8" />
          <div className="catalog-grid">
            <SkeletonBox count={8} height="clamp(270px, 36vw, 410px)" borderRadius="12px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page catalog-page">
      <div className="container catalog-container">
        <div className="catalog-list-header">
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
            {filteredMovies.length} phim
          </p>
        </div>

        {/* ================= FILTER & SORT TOOLBAR ================= */}
        <div className="ml-toolbar">
          <div className="ml-toolbar-top">
            <div className="ml-status-tabs" role="group" aria-label="Trạng thái chiếu">
              {STATUS_TABS.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={isActive}
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
                  type="search"
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
                      const nextParams = new URLSearchParams(searchParams);
                      nextParams.delete('movieName');
                      setSearchParams(nextParams, { replace: true });
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
                aria-pressed={selectedGenre === 'ALL'}
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
                    aria-pressed={isActive}
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
          <CatalogEmpty
            title="Không tìm thấy phim phù hợp"
            message="Không có bộ phim nào khớp với bộ lọc hiện tại. Hãy thử đặt lại bộ lọc hoặc đổi từ khoá khác."
            action="Đặt lại bộ lọc"
            onAction={resetAllFilters}
          />
        ) : (
          <>
            <div className="catalog-grid">
              {paginatedMovies.map((movie) => <MovieCard key={movie.movieId} movie={movie} />)}
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

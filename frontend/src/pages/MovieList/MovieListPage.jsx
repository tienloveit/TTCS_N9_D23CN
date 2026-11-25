import { useState, useEffect } from 'react';
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
import { AGE_RATINGS } from '../../utils/ageRatings';
import { buildCatalogQuery } from '../../utils/movieCatalog';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả phim', icon: FilmIcon },
  { key: 'NOW_SHOWING', label: 'Đang chiếu', icon: SparkIcon },
  { key: 'UPCOMING', label: 'Sắp chiếu', icon: CalendarIcon },
];

const SEARCH_DEBOUNCE_MS = 300;

export default function MovieListPage() {
  // Một trang phim từ backend: { data, page, size, totalElements, totalPages }.
  const [catalog, setCatalog] = useState(null);
  const [genres, setGenres] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters - read initial status from URL
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('movieName') || '');
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [ageFilter, setAgeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('DEFAULT');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Sync filters when URL query params change (e.g. navbar search or dropdown navigation).
  // Điều chỉnh state ngay trong lúc render thay cho effect, tránh render thừa.
  const [syncedParams, setSyncedParams] = useState(searchParams);
  if (searchParams !== syncedParams) {
    setSyncedParams(searchParams);
    setStatusFilter(searchParams.get('status') || 'ALL');
    setSearchTerm(searchParams.get('movieName') || '');
    setCurrentPage(1);
  }

  const [reloadKey, setReloadKey] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  // Kết quả của lần tải gần nhất: { key, error }. So key với yêu cầu hiện tại để biết đang tải.
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let active = true;
    genreApi
      .getAll()
      .then((res) => active && setGenres(res.data.result || []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const query = buildCatalogQuery({
    search: debouncedSearch,
    status: statusFilter,
    genre: selectedGenre,
    age: ageFilter,
    sort: sortBy,
    page: currentPage,
    size: itemsPerPage,
  });
  const queryKey = JSON.stringify(query);
  const requestKey = `${queryKey}#${reloadKey}`;

  useEffect(() => {
    let active = true;
    movieApi
      .getCatalog(JSON.parse(queryKey))
      .then((res) => {
        if (!active) return;
        setCatalog(res.data.result || null);
        setLoaded({ key: requestKey, error: false });
      })
      .catch(() => {
        // Không có dữ liệu phim thì không thể nói là "không khớp bộ lọc".
        if (active) setLoaded({ key: requestKey, error: true });
      });
    return () => {
      active = false;
    };
    // requestKey gồm queryKey và reloadKey: đổi bộ lọc hoặc bấm Thử lại đều tải lại.
  }, [queryKey, requestKey]);

  const loading = loaded === null;
  const loadError = loaded?.key === requestKey && loaded.error;
  const fetching = loaded !== null && loaded.key !== requestKey;

  const retryLoad = () => setReloadKey((key) => key + 1);

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

  // Lọc, sắp xếp và phân trang đều do backend làm (GET /movie/catalog).
  const paginatedMovies = catalog?.data || [];
  const totalMovies = catalog?.totalElements || 0;
  const totalPages = catalog?.totalPages || 0;

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
          {!loadError && (
            <p className="page-subtitle">
              {totalMovies} phim
            </p>
          )}
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
                {AGE_RATINGS.map((rating) => <option key={rating.code} value={rating.code}>{rating.option}</option>)}
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
                const val = String(g.id ?? g.genreId);
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
        {loadError ? (
          <div role="alert">
            <CatalogEmpty
              title="Không tải được danh sách phim"
              message="Đã có lỗi khi kết nối tới hệ thống. Vui lòng thử lại sau ít phút."
              action="Thử lại"
              onAction={retryLoad}
            />
          </div>
        ) : paginatedMovies.length === 0 && !fetching ? (
          <CatalogEmpty
            title="Không tìm thấy phim phù hợp"
            message="Không có bộ phim nào khớp với bộ lọc hiện tại. Hãy thử đặt lại bộ lọc hoặc đổi từ khoá khác."
            action="Đặt lại bộ lọc"
            onAction={resetAllFilters}
          />
        ) : (
          <>
            <div className="catalog-grid" aria-busy={fetching}>
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

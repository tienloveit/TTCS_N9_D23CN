import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { movieApi, genreApi } from '../../api';
import SafeImage from '../../components/Common/SafeImage';
import { SkeletonBox } from '../../components/Common/Skeleton';
import EmptyState from '../../components/Common/EmptyState';

export default function MovieListPage() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  // Filters - read initial status from URL
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('ALL'); // 'ALL' or genreId
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
        console.error("Lỗi khi tải danh sách phim", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handler for filters
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset page on filter
  };

  const handleGenreChange = (e) => {
    setSelectedGenre(e.target.value);
    setCurrentPage(1);
  };

  // Filter Logic
  const filteredMovies = movies.filter((movie) => {
    // 1. Search text
    const matchSearch = movie.movieName?.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Genre
    const matchGenre = selectedGenre === 'ALL'
      ? true
      : movie.genres?.some(g => g.id === selectedGenre || g.genreId === selectedGenre || g.name === selectedGenre);
    // Note: adjust the some() condition depending exactly on what GenreResponse returns

    // 3. Status
    const matchStatus = statusFilter === 'ALL'
      ? true
      : movie.status === statusFilter;

    return matchSearch && matchGenre && matchStatus;
  });

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
          <h1 className="page-title">
            {statusFilter === 'NOW_SHOWING' ? '🔥 Phim đang chiếu'
              : statusFilter === 'UPCOMING' ? '📅 Phim sắp chiếu'
                : '🎬 Danh sách phim'}
          </h1>
          <p className="page-subtitle">Khám phá toàn bộ phim tại CinemaHub</p>
        </div>

        {/* ================= FILTERS ================= */}
        <div style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 32,
          padding: '24px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)'
        }}>
          {/* Search */}
          <div style={{ flex: '1 1 250px' }}>
            <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>Tìm kiếm</label>
            <input
              type="text"
              className="input"
              placeholder="Nhập tên phim..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          {/* Genre */}
          {genres.length > 0 && (
            <div style={{ flex: '1 1 150px' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>Thể loại</label>
              <select className="input" value={selectedGenre} onChange={handleGenreChange}>
                <option value="ALL">Tất cả thể loại</option>
                {genres.map(g => (
                  <option key={g.genreId || g.id} value={g.name || g.genreId}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ================= GRID ================= */}
        {filteredMovies.length === 0 ? (
          <EmptyState 
            title="Không tìm thấy phim"
            message="Rất tiếc, không có bộ phim nào khớp với tìm kiếm của bạn. Hãy thử đổi từ khoá hoặc xem các thể loại khác."
            buttonText="Xem tất cả phim"
            buttonLink="/movies"
          />
        ) : (
          <>
            <div className="movie-grid">
              {paginatedMovies.map((movie) => (
                <motion.div
                  key={movie.movieId}
                  className="card movie-card"
                  onClick={() => navigate(`/movie/${movie.movieId}`)}
                  whileHover={{ y: -8, scale: 1.02 }}
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
                      <button className="btn btn-primary btn-sm">Chi tiết</button>
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
                      {movie.durationMinutes && <span>🕐 {movie.durationMinutes}p</span>}
                      {movie.ageRating && <span className="movie-badge">{movie.ageRating}</span>}
                    </div>
                    <div className="movie-card-rating">
                      <span>★</span>
                      {movie.ratingCount > 0
                        ? `${Number(movie.averageRating || 0).toFixed(1)} (${movie.ratingCount})`
                        : 'Chưa có đánh giá'}
                    </div>
                    {movie.releaseDate && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                        📅 {formatDate(movie.releaseDate)}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ================= PAGINATION ================= */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                marginTop: 40
              }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  &laquo; Trước
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setCurrentPage(i + 1)}
                    style={{ width: 40, padding: 0 }}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Sau &raquo;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

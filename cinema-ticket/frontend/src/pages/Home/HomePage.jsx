import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { movieApi } from '../../api';
import SafeImage from '../../components/Common/SafeImage';
import { SkeletonBox } from '../../components/Common/Skeleton';
import EmptyState from '../../components/Common/EmptyState';
import {
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  GlobeIcon,
  SearchIcon,
  SparkIcon,
  TicketIcon,
} from '../../components/Common/CinemaIcons';

export default function HomePage() {
  const [nowShowing, setNowShowing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bannerIndex, setBannerIndex] = useState(0);
  const navigate = useNavigate();
  const bannerTimer = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nowRes, upRes] = await Promise.allSettled([
          movieApi.getNowShowing(),
          movieApi.getUpcoming(),
        ]);
        if (nowRes.status === 'fulfilled') setNowShowing(nowRes.value.data.result || []);
        if (upRes.status === 'fulfilled') setUpcoming(upRes.value.data.result || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-slide banner
  const bannerMovies = nowShowing.length > 0 ? nowShowing.slice(0, 5) : [];
  useEffect(() => {
    if (bannerMovies.length <= 1) return;
    bannerTimer.current = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % bannerMovies.length);
    }, 5000);
    return () => clearInterval(bannerTimer.current);
  }, [bannerMovies.length]);

  // Search filter
  const filteredNowShowing = nowShowing.filter((f) =>
    f.movieName?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUpcoming = upcoming.filter((f) =>
    f.movieName?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="page" style={{ padding: 0 }}>
        <div className="container" style={{ paddingTop: '80px' }}>
          <SkeletonBox height="450px" borderRadius="16px" className="mb-8" />
          <div className="movie-grid" style={{ marginTop: '32px' }}>
            <SkeletonBox count={4} height="400px" borderRadius="12px" />
          </div>
        </div>
      </div>
    );
  }

  const currentBanner = bannerMovies[bannerIndex];
  const quickBookingSteps = ['Chọn Phim', 'Chọn Rạp', 'Chọn Ngày', 'Chọn Suất'];

  return (
    <div className="page" style={{ padding: 0 }}>
      {/* ==================== HERO BANNER ==================== */}
      {currentBanner && (
        <div className="hero-banner" onClick={() => navigate(`/movie/${currentBanner.movieId}`)}>
          <div className="hero-backdrop">
            <SafeImage
              src={currentBanner.thumbnailUrl}
              alt=""
              className="hero-backdrop-img"
              fallback=""
            />
            <div className="hero-gradient" />
          </div>

          <div className="hero-content container">
            <div className="hero-info">
              <div className="hero-badges">
                {currentBanner.ageRating && (
                  <span className="movie-badge">{currentBanner.ageRating}</span>
                )}
                {currentBanner.durationMinutes && (
                  <span className="hero-meta-tag">
                    <ClockIcon className="inline-icon" />
                    {currentBanner.durationMinutes} phút
                  </span>
                )}
                {currentBanner.language && (
                  <span className="hero-meta-tag">
                    <GlobeIcon className="inline-icon" />
                    {currentBanner.language}
                  </span>
                )}
              </div>
              <h1 className="hero-title">{currentBanner.movieName}</h1>
              <p className="hero-desc">
                {currentBanner.description?.substring(0, 180)}
                {currentBanner.description?.length > 180 ? '...' : ''}
              </p>
              <div className="hero-actions">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/movie/${currentBanner.movieId}`);
                  }}
                >
                  <TicketIcon className="btn-icon" />
                  Đặt vé ngay
                </button>
              </div>
            </div>

            <div className="hero-poster">
              <SafeImage
                src={currentBanner.thumbnailUrl}
                alt={currentBanner.movieName}
              />
            </div>
          </div>

          {/* Dots Indicator */}
          {bannerMovies.length > 1 && (
            <div className="hero-dots">
              {bannerMovies.map((_, i) => (
                <button
                  key={i}
                  className={`hero-dot ${i === bannerIndex ? 'hero-dot--active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setBannerIndex(i);
                    clearInterval(bannerTimer.current);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className={`quick-booking-shell container ${currentBanner ? '' : 'quick-booking-shell--standalone'}`}>
        <div className="quick-booking-card" role="group" aria-label="Mua vé nhanh">
          {quickBookingSteps.map((step, index) => (
            <button
              key={step}
              type="button"
              className="quick-booking-step"
              onClick={() => navigate('/movies?status=NOW_SHOWING')}
            >
              <span className="quick-booking-label">
                <span className="quick-booking-index">{index + 1}</span>
                <span>{step}</span>
              </span>
              <ChevronDownIcon className="quick-booking-chevron" />
            </button>
          ))}
          <button
            type="button"
            className="quick-booking-submit"
            onClick={() => navigate('/movies?status=NOW_SHOWING')}
          >
            Mua vé nhanh
          </button>
        </div>
      </div>

      {/* ==================== SEARCH ==================== */}
      <div className="container" style={{ marginTop: 32 }}>
        <div className="search-bar">
          <SearchIcon className="search-icon" />
          <input
            className="search-input"
            type="text"
            placeholder="Tìm kiếm phim theo tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </div>

      {/* ==================== PHIM ĐANG CHIẾU ==================== */}
      <section className="container section">
        <div className="section-header">
          <h2 className="section-title">
            <SparkIcon className="section-icon" />
            Phim đang chiếu
          </h2>
          <span className="section-count">{filteredNowShowing.length} phim</span>
        </div>

        {filteredNowShowing.length === 0 ? (
          <EmptyState 
            title="Không tìm thấy phim"
            message={search ? `Không tìm thấy kết quả nào cho "${search}".` : "Hiện tại chưa có phim nào đang chiếu."}
            buttonText="Xem tất cả phim"
          />
        ) : (
          <div className="movie-grid">
            {filteredNowShowing.map((movie) => (
              <motion.div
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
                  <div className="movie-overlay">
                    <button className="btn btn-primary btn-sm">Đặt vé</button>
                  </div>
                </div>
                <div className="movie-info">
                  <h3 className="movie-title">{movie.movieName}</h3>
                  <div className="movie-meta">
                    {movie.durationMinutes && (
                      <span>
                        <ClockIcon className="inline-icon" />
                        {movie.durationMinutes}p
                      </span>
                    )}
                    {movie.ageRating && <span className="movie-badge">{movie.ageRating}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ==================== PHIM SẮP CHIẾU ==================== */}
      {filteredUpcoming.length > 0 && (
        <section className="container section">
          <div className="section-header">
            <h2 className="section-title">
              <CalendarIcon className="section-icon" />
              Phim sắp chiếu
            </h2>
            <span className="section-count">{filteredUpcoming.length} phim</span>
          </div>

          <div className="movie-grid">
            {filteredUpcoming.map((movie) => (
              <motion.div
                key={movie.movieId}
                className="card movie-card movie-card--upcoming"
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
                  <div className="movie-upcoming-badge">Sắp chiếu</div>
                </div>
                <div className="movie-info">
                  <h3 className="movie-title">{movie.movieName}</h3>
                  <div className="movie-meta">
                    {movie.releaseDate && (
                      <span>
                        <CalendarIcon className="inline-icon" />
                        {formatDate(movie.releaseDate)}
                      </span>
                    )}
                    {movie.ageRating && <span className="movie-badge">{movie.ageRating}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

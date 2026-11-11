import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { movieApi } from '../../api';
import SafeImage from '../../components/Common/SafeImage';
import { SkeletonBox } from '../../components/Common/Skeleton';
import EmptyState from '../../components/Common/EmptyState';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  FilmIcon,
  GlobeIcon,
  PlayIcon,
  SearchIcon,
  SparkIcon,
  StarIcon,
  TicketIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';

const HERO_SLIDE_INTERVAL_MS = 5000;

export default function HomePage() {
  const [nowShowing, setNowShowing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFeedTab, setActiveFeedTab] = useState('ALL');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerDirection, setBannerDirection] = useState(1);
  const [bannerPaused, setBannerPaused] = useState(false);
  const navigate = useNavigate();

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
    if (bannerMovies.length <= 1 || bannerPaused) return undefined;

    const timer = window.setTimeout(() => {
      setBannerDirection(1);
      setBannerIndex((prev) => (prev + 1) % bannerMovies.length);
    }, HERO_SLIDE_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [bannerIndex, bannerMovies.length, bannerPaused]);

  useEffect(() => {
    if (bannerMovies.length === 0) return;
    setBannerIndex((prev) => prev % bannerMovies.length);
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

  const showBannerAt = (index, direction) => {
    if (bannerMovies.length <= 1) return;
    setBannerDirection(direction);
    setBannerIndex((index + bannerMovies.length) % bannerMovies.length);
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
  const previousBanner =
    bannerMovies.length > 1
      ? bannerMovies[(bannerIndex - 1 + bannerMovies.length) % bannerMovies.length]
      : null;
  const nextBanner =
    bannerMovies.length > 1 ? bannerMovies[(bannerIndex + 1) % bannerMovies.length] : null;

  return (
    <div className="page" style={{ padding: 0 }}>
      {/* ==================== HERO BANNER ==================== */}
      {currentBanner && (
        <div
          className={`hero-carousel ${bannerDirection >= 0 ? 'hero-carousel--next' : 'hero-carousel--prev'
            }`}
          onMouseEnter={() => setBannerPaused(true)}
          onMouseLeave={() => setBannerPaused(false)}
          onFocus={() => setBannerPaused(true)}
          onBlur={() => setBannerPaused(false)}
        >
          {previousBanner && (
            <button
              key={`hero-prev-${previousBanner.movieId}`}
              type="button"
              className="hero-side-card hero-side-card--prev"
              onClick={() => showBannerAt(bannerIndex - 1, -1)}
              aria-label="Chuyen sang phim truoc"
            >
              <SafeImage
                src={previousBanner.thumbnailUrl}
                alt={previousBanner.movieName}
                className="hero-side-img"
              />
              <span className="hero-side-shade" />
              <span className="hero-side-control">
                <ChevronLeftIcon />
              </span>
              <span className="hero-side-title">{previousBanner.movieName}</span>
            </button>
          )}

          <div
            key={`hero-main-${currentBanner.movieId}`}
            className="hero-banner"
            onClick={() => navigate(`/movie/${currentBanner.movieId}`)}
          >
            <div key={`backdrop-${currentBanner.movieId}`} className="hero-backdrop">
              <SafeImage
                src={currentBanner.thumbnailUrl}
                alt=""
                className="hero-backdrop-img"
                fallback=""
              />
              <div className="hero-gradient" />
            </div>

            <div key={`content-${currentBanner.movieId}`} className="hero-content">
              <div className="hero-info">
                <div className="hero-kicker">MoviePTIT Special</div>
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
                  {currentBanner.description?.substring(0, 150)}
                  {currentBanner.description?.length > 150 ? '...' : ''}
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

              <div className="hero-visual" aria-hidden="true">
                <SafeImage
                  src={currentBanner.thumbnailUrl}
                  alt=""
                  className="hero-poster hero-poster--back"
                />
                <SafeImage
                  src={currentBanner.thumbnailUrl}
                  alt=""
                  className="hero-poster hero-poster--main"
                />
              </div>
            </div>

            {bannerMovies.length > 1 && (
              <>
                <button
                  type="button"
                  className="hero-nav hero-nav--prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    showBannerAt(bannerIndex - 1, -1);
                  }}
                  aria-label="Chuyen sang phim truoc"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  className="hero-nav hero-nav--next"
                  onClick={(e) => {
                    e.stopPropagation();
                    showBannerAt(bannerIndex + 1, 1);
                  }}
                  aria-label="Chuyen sang phim tiep theo"
                >
                  <ChevronRightIcon />
                </button>

                <div className="hero-dots">
                  {bannerMovies.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Chuyen den phim ${i + 1}`}
                      className={`hero-dot ${i === bannerIndex ? 'hero-dot--active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (i !== bannerIndex) {
                          setBannerDirection(i > bannerIndex ? 1 : -1);
                        }
                        setBannerIndex(i);
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {nextBanner && (
            <button
              key={`hero-next-${nextBanner.movieId}`}
              type="button"
              className="hero-side-card hero-side-card--next"
              onClick={() => showBannerAt(bannerIndex + 1, 1)}
              aria-label="Chuyen sang phim tiep theo"
            >
              <SafeImage
                src={nextBanner.thumbnailUrl}
                alt={nextBanner.movieName}
                className="hero-side-img"
              />
              <span className="hero-side-shade" />
              <span className="hero-side-control">
                <ChevronRightIcon />
              </span>
              <span className="hero-side-title">{nextBanner.movieName}</span>
            </button>
          )}
        </div>
      )}

      {/* ==================== DISCOVERY BAR ==================== */}
      <div className="container">
        <div className="home-discovery-bar">
          <div className="home-tab-pills" role="tablist" aria-label="Lọc danh mục phim">
            <button
              type="button"
              role="tab"
              aria-selected={activeFeedTab === 'ALL'}
              className={`home-tab-pill ${activeFeedTab === 'ALL' ? 'is-active' : ''}`}
              onClick={() => setActiveFeedTab('ALL')}
            >
              <FilmIcon size={16} />
              Tất cả
              <span className="home-tab-count">{filteredNowShowing.length + filteredUpcoming.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFeedTab === 'NOW_SHOWING'}
              className={`home-tab-pill ${activeFeedTab === 'NOW_SHOWING' ? 'is-active' : ''}`}
              onClick={() => setActiveFeedTab('NOW_SHOWING')}
            >
              <SparkIcon size={16} />
              Đang chiếu
              <span className="home-tab-count">{filteredNowShowing.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFeedTab === 'UPCOMING'}
              className={`home-tab-pill ${activeFeedTab === 'UPCOMING' ? 'is-active' : ''}`}
              onClick={() => setActiveFeedTab('UPCOMING')}
            >
              <CalendarIcon size={16} />
              Sắp chiếu
              <span className="home-tab-count">{filteredUpcoming.length}</span>
            </button>
          </div>

          <div className="home-inline-search">
            <SearchIcon size={16} className="home-inline-search-icon" />
            <input
              type="text"
              aria-label="Lọc nhanh tên phim"
              placeholder="Lọc nhanh tên phim..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="home-inline-search-clear"
                aria-label="Xoá từ khoá lọc"
                onClick={() => setSearch('')}
              >
                <XIcon size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ==================== PHIM ĐANG CHIẾU ==================== */}
      {(activeFeedTab === 'ALL' || activeFeedTab === 'NOW_SHOWING') && (
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
              message={search ? `Không tìm thấy kết quả nào cho "${search}".` : 'Hiện tại chưa có phim nào đang chiếu.'}
              buttonText="Xem tất cả phim"
            />
          ) : (
            <div className="movie-grid">
              {filteredNowShowing.map((movie) => (
                <Motion.div
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
                      <button type="button" className="btn btn-primary btn-sm">
                        <TicketIcon size={15} /> Đặt vé
                      </button>
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
                    {movie.ratingCount > 0 && (
                      <div className="movie-card-rating">
                        <StarIcon size={14} style={{ color: 'var(--gold)', fill: 'var(--gold)' }} />
                        {Number(movie.averageRating || 0).toFixed(1)} ({movie.ratingCount})
                      </div>
                    )}
                  </div>
                </Motion.div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ==================== PHIM SẮP CHIẾU ==================== */}
      {(activeFeedTab === 'ALL' || activeFeedTab === 'UPCOMING') && (
        filteredUpcoming.length > 0 || activeFeedTab === 'UPCOMING' ? (
          <section className="container section">
            <div className="section-header">
              <h2 className="section-title">
                <CalendarIcon className="section-icon" />
                Phim sắp chiếu
              </h2>
              <span className="section-count">{filteredUpcoming.length} phim</span>
            </div>

            {filteredUpcoming.length === 0 ? (
              <EmptyState
                title="Chưa có phim sắp chiếu"
                message={search ? `Không tìm thấy phim sắp chiếu nào cho "${search}".` : 'Hiện tại chưa có phim sắp chiếu.'}
                buttonText="Xem phim đang chiếu"
                onAction={() => setActiveFeedTab('NOW_SHOWING')}
              />
            ) : (
              <div className="movie-grid">
                {filteredUpcoming.map((movie) => (
                  <Motion.div
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
                      <div className="movie-overlay">
                        <button type="button" className="btn btn-secondary btn-sm">
                          <PlayIcon size={14} /> Chi tiết
                        </button>
                      </div>
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
                  </Motion.div>
                ))}
              </div>
            )}
          </section>
        ) : null
      )}
    </div>
  );
}

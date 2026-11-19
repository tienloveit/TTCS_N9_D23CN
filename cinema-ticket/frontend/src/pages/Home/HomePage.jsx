import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { movieApi } from '../../api';
import MovieCard, { CatalogEmpty } from '../../components/MovieCard/MovieCard';
import SafeImage from '../../components/Common/SafeImage';
import { SkeletonBox } from '../../components/Common/Skeleton';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  FilmIcon,
  SearchIcon,
  SparkIcon,
  TicketIcon,
} from '../../components/Common/CinemaIcons';

const HERO_SLIDE_INTERVAL_MS = 6500;
const FEED_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'NOW_SHOWING', label: 'Đang chiếu' },
  { key: 'UPCOMING', label: 'Sắp chiếu' },
];

export default function HomePage() {
  const [nowShowing, setNowShowing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFeedTab, setActiveFeedTab] = useState('ALL');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerHovered, setBannerHovered] = useState(false);
  const [bannerFocused, setBannerFocused] = useState(false);
  const [autoSlide, setAutoSlide] = useState(true);
  const prefersReducedMotion = useReducedMotion();
  const searchField = useRef(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([movieApi.getNowShowing(), movieApi.getUpcoming()]).then(([now, next]) => {
      if (cancelled) return;
      if (now.status === 'fulfilled') setNowShowing(now.value.data.result || []);
      if (next.status === 'fulfilled') setUpcoming(next.value.data.result || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const bannerMovies = nowShowing.slice(0, 5);
  const currentBanner = bannerMovies[bannerIndex];
  useEffect(() => {
    if (bannerMovies.length <= 1 || !autoSlide || bannerHovered || bannerFocused || prefersReducedMotion) return;
    const timer = window.setTimeout(() => {
      setBannerIndex((index) => (index + 1) % bannerMovies.length);
    }, HERO_SLIDE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [bannerIndex, bannerMovies.length, autoSlide, bannerHovered, bannerFocused, prefersReducedMotion]);

  const query = search.trim().toLocaleLowerCase('vi');
  const filteredNow = nowShowing.filter((movie) => movie.movieName?.toLocaleLowerCase('vi').includes(query));
  const filteredUpcoming = upcoming.filter((movie) => movie.movieName?.toLocaleLowerCase('vi').includes(query));
  const visibleGroups = [
    { key: 'NOW_SHOWING', label: 'Phim đang chiếu', movies: filteredNow },
    { key: 'UPCOMING', label: 'Phim sắp chiếu', movies: filteredUpcoming },
  ].filter((group) => activeFeedTab === group.key || (activeFeedTab === 'ALL' && group.movies.length));
  const moveBanner = (offset) => setBannerIndex((index) => (index + offset + bannerMovies.length) % bannerMovies.length);

  if (loading) {
    return (
      <div className="page catalog-page">
        <div className="container catalog-container" aria-busy="true">
          <SkeletonBox height="clamp(360px, 40vw, 510px)" borderRadius="24px" />
          <div className="catalog-grid catalog-loading-grid">
            <SkeletonBox count={4} height="clamp(270px, 36vw, 410px)" borderRadius="16px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page catalog-page">
      <div className="container catalog-container">
        {currentBanner && (
          <section className="catalog-hero" aria-labelledby="catalog-hero-title"
            onMouseEnter={() => setBannerHovered(true)} onMouseLeave={() => setBannerHovered(false)}
            onFocus={() => setBannerFocused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setBannerFocused(false);
            }}>
            <div className="catalog-hero-backdrop">
              <SafeImage key={'backdrop-' + currentBanner.movieId} className="catalog-hero-image"
                src={currentBanner.bannerUrl || currentBanner.thumbnailUrl}
                fallback={currentBanner.bannerUrl ? currentBanner.thumbnailUrl : undefined} alt="" />
            </div>
            <div className="catalog-hero-shade" />
            <div className="catalog-hero-content">
              <div className="catalog-hero-copy">
                <span className="catalog-status catalog-status--now"><SparkIcon size={14} /> Đang chiếu</span>
                <h1 id="catalog-hero-title">{currentBanner.movieName}</h1>
                <div className="catalog-hero-meta">
                  {currentBanner.ageRating && <span>{currentBanner.ageRating}</span>}
                  {currentBanner.durationMinutes > 0 && <span><ClockIcon size={16} /> {currentBanner.durationMinutes} phút</span>}
                  {currentBanner.language && <span>{currentBanner.language}</span>}
                </div>
                {currentBanner.description && <p>{currentBanner.description}</p>}
                <div className="catalog-hero-actions">
                  <Link className="catalog-button catalog-button--primary" to={'/movie/' + currentBanner.movieId + '#movie-schedule'}>
                    <TicketIcon size={19} /> Đặt vé ngay
                  </Link>
                  <Link className="catalog-button catalog-button--light" to={'/movie/' + currentBanner.movieId}>Xem chi tiết</Link>
                </div>
              </div>
              <SafeImage key={'poster-' + currentBanner.movieId} className="catalog-hero-poster"
                src={currentBanner.thumbnailUrl} alt="" />
            </div>
            {bannerMovies.length > 1 && (
              <div className="catalog-hero-controls" aria-label="Điều khiển phim nổi bật">
                <button type="button" aria-label="Phim trước" onClick={() => moveBanner(-1)}><ChevronLeftIcon size={20} /></button>
                <div className="catalog-hero-dots">
                  {bannerMovies.map((movie, index) => (
                    <button type="button" key={movie.movieId} aria-label={'Hiển thị ' + movie.movieName}
                      aria-current={index === bannerIndex ? 'true' : undefined} onClick={() => setBannerIndex(index)} />
                  ))}
                </div>
                <button type="button" aria-label="Phim tiếp theo" onClick={() => moveBanner(1)}><ChevronRightIcon size={20} /></button>
                {!prefersReducedMotion && (
                  <button type="button" className="catalog-hero-toggle" onClick={() => setAutoSlide((enabled) => !enabled)}>
                    {autoSlide ? 'Tạm dừng' : 'Phát tiếp'}
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        <section className="catalog-feed" aria-labelledby="catalog-feed-title">
          <header className="catalog-feed-header">
            {currentBanner ? <h2 id="catalog-feed-title">Khám phá phim</h2> : <h1 id="catalog-feed-title">Khám phá phim</h1>}
            <Link to="/movies" className="catalog-text-link">Xem tất cả phim <ChevronRightIcon size={17} /></Link>
          </header>
          <div className="catalog-discovery">
            <div className="catalog-filter-tabs" role="group" aria-label="Trạng thái chiếu">
              {FEED_TABS.map(({ key, label }) => (
                <button key={key} type="button" aria-pressed={activeFeedTab === key} onClick={() => setActiveFeedTab(key)}>{label}</button>
              ))}
            </div>
            <label className="catalog-filter-search">
              <SearchIcon size={17} />
              <input ref={searchField} type="search" aria-label="Lọc nhanh tên phim" placeholder="Lọc nhanh tên phim" value={search}
                onChange={(event) => setSearch(event.target.value)} />
            </label>
          </div>
          {visibleGroups.length === 0 && (
            <CatalogEmpty title={query ? 'Không tìm thấy phim' : 'Chưa có phim'}
              message={query ? 'Thử tìm bằng tên phim khác.' : 'Danh sách phim sẽ được cập nhật khi có lịch chiếu.'}
              action={query ? 'Xóa từ khóa' : 'Xem danh sách phim'}
              onAction={query ? () => { setSearch(''); searchField.current?.focus(); } : undefined} />
          )}
          {visibleGroups.map(({ key, label, movies }) => (
            <section key={key} className="catalog-group" aria-labelledby={'catalog-group-' + key}>
              <header className="catalog-group-header">
                <h3 id={'catalog-group-' + key}>{key === 'NOW_SHOWING' ? <FilmIcon size={20} /> : <CalendarIcon size={20} />}{label}</h3>
                <span>{movies.length} phim</span>
              </header>
              {movies.length ? (
                <div className="catalog-grid">
                  {movies.map((movie) => <MovieCard key={movie.movieId} movie={movie} status={key} />)}
                </div>
              ) : (
                <CatalogEmpty title="Chưa có phim phù hợp" message="Thử đổi từ khóa hoặc trạng thái chiếu."
                  action="Xem tất cả" onAction={() => { setSearch(''); setActiveFeedTab('ALL'); }} />
              )}
            </section>
          ))}
        </section>
      </div>
    </div>
  );
}

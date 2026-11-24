import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import useLogout from '../../context/useLogout';
import { ROLE_HOME_PATHS } from '../../context/roleHomePaths';
import { useState, useRef, useEffect } from 'react';
import { movieApi } from '../../api';
import SafeImage from '../Common/SafeImage';
import '../MovieCard/MovieBrowse.css';
import {
  CalendarIcon,
  DashboardIcon,
  FilmIcon,
  LogoutIcon,
  MenuIcon,
  MoviePTITLogoIcon,
  SearchIcon,
  SparkIcon,
  TicketIcon,
  UserIcon,
  XIcon,
} from '../Common/CinemaIcons';

const WORKSPACE_LABELS = { ADMIN: 'Khu quản trị', MANAGER: 'Khu quản lý', STAFF: 'Khu nhân viên' };

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const { logout, pending } = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [highlighted, setHighlighted] = useState(-1);
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const searchInput = useRef(null);
  const query = searchQuery.trim();
  const searchOpen = showSearch && query.length >= 2;
  const searchResults = suggestions?.query === query ? suggestions.movies : [];
  const searchPath = '/movies?movieName=' + encodeURIComponent(query);
  const status = new URLSearchParams(location.search).get('status');
  const workspaceLabel = WORKSPACE_LABELS[user?.role];
  const accountLabel = user ? `Tài khoản ${user.username}` : undefined;

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    setHighlighted(-1);
    setShowSearch(value.trim().length >= 2);
  };

  // Close search suggestions when clicking outside.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await movieApi.getAll({ movieName: query });
        if (cancelled) return;
        const keyword = query.toLocaleLowerCase('vi');
        const movies = (res.data.result || [])
          .filter((movie) => movie.movieName?.toLocaleLowerCase('vi').includes(keyword))
          .slice(0, 5);
        setSuggestions({ query, movies });
      } catch {
        if (!cancelled) setSuggestions({ query, movies: [], error: true });
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query]);

  // Close menus on route change
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSearch(false);
      setMobileMenuOpen(false);
      setSearchQuery('');
      setHighlighted(-1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const scheduleActive = ['/branches', '/branch'].some((path) => isActive(path));
  const closeDrawer = () => setMobileMenuOpen(false);

  const handleSearchKeyDown = (event) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') {
      setShowSearch(false);
      setHighlighted(-1);
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && searchResults.length) {
      event.preventDefault();
      setShowSearch(true);
      setHighlighted((index) => {
        if (!searchOpen || index < 0) return event.key === 'ArrowDown' ? 0 : searchResults.length - 1;
        const offset = event.key === 'ArrowDown' ? 1 : -1;
        return (index + offset + searchResults.length) % searchResults.length;
      });
    } else if (event.key === 'Enter' && query) {
      event.preventDefault();
      const selected = searchOpen && searchResults[highlighted];
      setShowSearch(false);
      setHighlighted(-1);
      navigate(selected ? '/movie/' + selected.movieId : searchPath);
    }
  };

  return (
    <nav className="navbar cinema-navbar" aria-label="Điều hướng chính">
      <div className="navbar-inner">
        <NavLink to="/" end className="navbar-logo" aria-label="MoviePTIT · Trang chủ">
          <MoviePTITLogoIcon className="nav-svg-icon" />
          <span>MoviePTIT</span>
        </NavLink>

        <div className="navbar-search-wrapper" ref={searchRef}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setShowSearch(false);
              setHighlighted(-1);
            }
          }}>
          <div className="navbar-search-input-group">
            <SearchIcon className="navbar-search-icon" />
            <input ref={searchInput} type="text" role="combobox" autoComplete="off" placeholder="Tìm tên phim"
              aria-label="Tìm kiếm phim" aria-autocomplete="list" aria-expanded={searchOpen}
              aria-controls={searchOpen ? 'navbar-movie-suggestions' : undefined}
              aria-activedescendant={searchOpen && searchResults[highlighted] ? 'navbar-movie-' + searchResults[highlighted].movieId : undefined}
              value={searchQuery} onChange={handleSearchChange} onKeyDown={handleSearchKeyDown}
              onFocus={() => { setMobileMenuOpen(false); setShowSearch(query.length >= 2); }} />
            {searchQuery && (
              <button type="button" className="navbar-search-clear" aria-label="Xóa từ khóa tìm kiếm"
                onClick={() => { setSearchQuery(''); setShowSearch(false); setHighlighted(-1); searchInput.current?.focus(); }}>
                <XIcon size={15} />
              </button>
            )}
          </div>
          {searchOpen && (
            <div className="navbar-search-dropdown">
              <div className="cinema-search-heading">Gợi ý phim</div>
              {searchResults.length === 0 && (
                <p className="search-empty-state" role="status">
                  {suggestions?.query !== query ? 'Đang tìm phim…'
                    : suggestions.error ? 'Chưa tải được gợi ý.' : 'Không tìm thấy phim phù hợp.'}
                </p>
              )}
              <div id="navbar-movie-suggestions" role="listbox" aria-label="Gợi ý phim">
                {searchResults.map((movie, index) => (
                  <div key={movie.movieId} id={'navbar-movie-' + movie.movieId} role="option"
                    aria-selected={highlighted === index} className="search-result-item"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => { setShowSearch(false); setHighlighted(-1); navigate('/movie/' + movie.movieId); }}>
                    <SafeImage src={movie.thumbnailUrl} alt="" className="search-result-image" />
                    <div className="search-result-info">
                      <p className="search-result-name">{movie.movieName}</p>
                      <p className="search-result-meta">
                        {[
                          movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : movie.status === 'UPCOMING' ? 'Sắp chiếu' : '',
                          movie.durationMinutes > 0 ? movie.durationMinutes + ' phút' : '',
                          movie.ageRating,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to={searchPath} className="search-view-all" onClick={() => setShowSearch(false)}>Xem tất cả kết quả</Link>
            </div>
          )}
        </div>

        <button
          type="button"
          className="navbar-mobile-toggle"
          aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          aria-expanded={mobileMenuOpen}
          onClick={() => { setShowSearch(false); setMobileMenuOpen((open) => !open); }}
        >
          {mobileMenuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
        </button>

        <div className="navbar-links">
          <NavLink to="/" end className="navbar-link">Trang chủ</NavLink>
          <Link to="/branches" aria-current={scheduleActive ? 'page' : undefined} className={`navbar-link ${scheduleActive ? 'navbar-link--active' : ''}`}>
            Lịch chiếu
          </Link>

          {isAuthenticated ? (
            <>
              <NavLink to="/my-bookings" className="navbar-link">Vé của tôi</NavLink>
              {workspaceLabel && (
                <Link to={ROLE_HOME_PATHS[user.role]} className="navbar-link">
                  <DashboardIcon size={16} aria-hidden="true" />{workspaceLabel}
                </Link>
              )}
              <NavLink to="/profile" className="navbar-link navbar-account" aria-label={accountLabel} title={user.username}>
                <UserIcon className="navbar-user-icon" aria-hidden="true" />
                <span>{user.username}</span>
              </NavLink>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary navbar-register">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="navbar-mobile-drawer">
          <NavLink to="/" end onClick={() => setMobileMenuOpen(false)}>Trang chủ</NavLink>
          <Link to="/branches" aria-current={scheduleActive ? 'page' : undefined} onClick={() => setMobileMenuOpen(false)}>
            <CalendarIcon size={16} /> Lịch chiếu
          </Link>
          <Link to="/movies?status=NOW_SHOWING" aria-current={isActive('/movies') && status === 'NOW_SHOWING' ? 'page' : undefined} onClick={() => setMobileMenuOpen(false)}>
            <SparkIcon size={16} /> Phim đang chiếu
          </Link>
          <Link to="/movies?status=UPCOMING" aria-current={isActive('/movies') && status === 'UPCOMING' ? 'page' : undefined} onClick={() => setMobileMenuOpen(false)}>
            <CalendarIcon size={16} /> Phim sắp chiếu
          </Link>
          <Link to="/movies" aria-current={isActive('/movies') && !status ? 'page' : undefined} onClick={() => setMobileMenuOpen(false)}>
            <FilmIcon size={16} /> Tất cả phim
          </Link>
          <div className="navbar-drawer-group" role="group" aria-label="Tài khoản">
            {isAuthenticated ? (
              <>
                <NavLink to="/profile" className="navbar-account" aria-label={accountLabel} title={user.username} onClick={closeDrawer}>
                  <UserIcon className="navbar-user-icon" aria-hidden="true" />
                  <span>{user.username}</span>
                </NavLink>
                <NavLink to="/my-bookings" onClick={closeDrawer}>
                  <TicketIcon size={16} /> Vé của tôi
                </NavLink>
                {workspaceLabel && (
                  <Link to={ROLE_HOME_PATHS[user.role]} onClick={closeDrawer}>
                    <DashboardIcon size={16} aria-hidden="true" />{workspaceLabel}
                  </Link>
                )}
                <button type="button" className="navbar-drawer-logout" onClick={logout} disabled={pending}>
                  <LogoutIcon size={16} aria-hidden="true" />{pending ? 'Đang đăng xuất…' : 'Đăng xuất'}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeDrawer}>
                  <UserIcon size={16} /> Đăng nhập
                </Link>
                <Link to="/register" className="navbar-drawer-register" onClick={closeDrawer}>
                  <SparkIcon size={16} /> Đăng ký tài khoản
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

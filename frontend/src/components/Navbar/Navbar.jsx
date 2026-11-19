import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useState, useRef, useEffect } from 'react';
import { movieApi } from '../../api';
import SafeImage from '../Common/SafeImage';
import '../MovieCard/MovieBrowse.css';
import {
  BuildingIcon,
  CalendarIcon,
  ChevronDownIcon,
  FilmIcon,
  KeyIcon,
  LogoutIcon,
  MenuIcon,
  MoviePTITLogoIcon,
  SearchIcon,
  SparkIcon,
  TicketIcon,
  UserIcon,
  XIcon,
} from '../Common/CinemaIcons';

export default function Navbar() {
  const { user, logout, isAuthenticated, isAdmin, isManager, isStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [highlighted, setHighlighted] = useState(-1);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const searchInput = useRef(null);
  const userMenuRef = useRef(null);
  const query = searchQuery.trim();
  const searchOpen = showSearch && query.length >= 2;
  const searchResults = suggestions?.query === query ? suggestions.movies : [];
  const searchPath = '/movies?movieName=' + encodeURIComponent(query);
  const moviesActive = /^\/movies?(\/|$)/.test(location.pathname);
  const status = new URLSearchParams(location.search).get('status');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchQuery(value);
    setHighlighted(-1);
    setShowSearch(value.trim().length >= 2);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowScheduleMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
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
      setShowScheduleMenu(false);
      setShowSearch(false);
      setShowUserMenu(false);
      setMobileMenuOpen(false);
      setSearchQuery('');
      setHighlighted(-1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const goToProfileSection = (hash) => {
    setShowUserMenu(false);
    setMobileMenuOpen(false);
    navigate(`/profile${hash}`);
  };

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
          <div className="navbar-dropdown" ref={dropdownRef}>
            <button
              type="button"
              aria-expanded={showScheduleMenu}
              aria-current={moviesActive ? 'true' : undefined}
              className={`navbar-link-btn ${moviesActive ? 'navbar-link--active' : ''}`}
              onClick={() => setShowScheduleMenu((open) => !open)}
            >
              Lịch chiếu
              <ChevronDownIcon size={14} className={`navbar-chevron ${showScheduleMenu ? 'navbar-chevron--open' : ''}`} />
            </button>
            {showScheduleMenu && (
              <div className="navbar-dropdown-menu">
                <Link to="/movies?status=NOW_SHOWING" className="navbar-dropdown-item" aria-current={isActive('/movies') && status === 'NOW_SHOWING' ? 'page' : undefined} onClick={() => setShowScheduleMenu(false)}>
                  <SparkIcon className="navbar-dropdown-icon" />
                  Phim đang chiếu
                </Link>
                <Link to="/movies?status=UPCOMING" className="navbar-dropdown-item" aria-current={isActive('/movies') && status === 'UPCOMING' ? 'page' : undefined} onClick={() => setShowScheduleMenu(false)}>
                  <CalendarIcon className="navbar-dropdown-icon" />
                  Phim sắp chiếu
                </Link>
                <Link to="/movies" className="navbar-dropdown-item" aria-current={isActive('/movies') && !status ? 'page' : undefined} onClick={() => setShowScheduleMenu(false)}>
                  <FilmIcon className="navbar-dropdown-icon" />
                  Tất cả phim
                </Link>
              </div>
            )}
          </div>

          <Link to="/branches" aria-current={isActive('/branches') || isActive('/branch') ? 'page' : undefined} className={`navbar-link ${isActive('/branches') || isActive('/branch') ? 'navbar-link--active' : ''}`}>
            Rạp chiếu
          </Link>

          {isAuthenticated && (
            <NavLink to="/my-bookings" className={`navbar-link ${isActive('/my-bookings') ? 'navbar-link--active' : ''}`}>
              Vé của tôi
            </NavLink>
          )}

          {isAuthenticated ? (
            <div className="navbar-user">
              <div className="navbar-user-menu" ref={userMenuRef}>
                <button
                  type="button"
                  aria-expanded={showUserMenu}
                  className={`navbar-user-name navbar-user-trigger ${isActive('/profile') ? 'navbar-link--active' : ''}`}
                  onClick={() => setShowUserMenu((open) => !open)}
                >
                  <UserIcon className="navbar-user-icon" />
                  <span>{user?.username}</span>
                </button>
                {showUserMenu && (
                  <div className="navbar-user-dropdown">
                    <button type="button" className="navbar-user-dropdown-item" onClick={() => goToProfileSection('#info')}>
                      <UserIcon className="navbar-dropdown-icon" />
                      Thông tin cá nhân
                    </button>
                    <button type="button" className="navbar-user-dropdown-item" onClick={() => goToProfileSection('#password')}>
                      <KeyIcon className="navbar-dropdown-icon" />
                      Đổi mật khẩu
                    </button>
                    <div className="navbar-user-dropdown-divider"></div>
                    <button type="button" className="navbar-user-dropdown-item navbar-user-dropdown-logout" onClick={handleLogout}>
                      <LogoutIcon className="navbar-dropdown-icon" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
              {(isAdmin || isManager) && (
                <Link to={isManager ? '/manager' : '/admin'} className="navbar-link" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  Admin
                </Link>
              )}
              {isStaff && (
                <Link to="/staff" className="navbar-link" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  Staff
                </Link>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" style={{ color: 'var(--text-secondary)' }}>Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="navbar-mobile-drawer">
          <NavLink to="/" end onClick={() => setMobileMenuOpen(false)}>Trang chủ</NavLink>
          <Link to="/movies?status=NOW_SHOWING" aria-current={isActive('/movies') && status === 'NOW_SHOWING' ? 'page' : undefined} onClick={() => setMobileMenuOpen(false)}>
            <SparkIcon size={16} /> Phim đang chiếu
          </Link>
          <Link to="/movies?status=UPCOMING" aria-current={isActive('/movies') && status === 'UPCOMING' ? 'page' : undefined} onClick={() => setMobileMenuOpen(false)}>
            <CalendarIcon size={16} /> Phim sắp chiếu
          </Link>
          <Link to="/movies" aria-current={isActive('/movies') && !status ? 'page' : undefined} onClick={() => setMobileMenuOpen(false)}>
            <FilmIcon size={16} /> Tất cả phim
          </Link>
          <Link to="/branches" aria-current={isActive('/branches') || isActive('/branch') ? 'page' : undefined} onClick={() => setMobileMenuOpen(false)}>
            <BuildingIcon size={16} /> Rạp chiếu & Lịch chiếu
          </Link>
          {isAuthenticated ? (
            <>
              <NavLink to="/my-bookings" onClick={() => setMobileMenuOpen(false)}>
                <TicketIcon size={16} /> Vé của tôi
              </NavLink>
              <button type="button" onClick={() => goToProfileSection('#info')}>
                <UserIcon size={16} /> Thông tin cá nhân ({user?.username})
              </button>
              <button type="button" onClick={() => goToProfileSection('#password')}>
                <KeyIcon size={16} /> Đổi mật khẩu
              </button>
              <button type="button" onClick={handleLogout} style={{ color: '#dc2626' }}>
                <LogoutIcon size={16} /> Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login">
                <UserIcon size={16} /> Đăng nhập
              </Link>
              <Link to="/register" style={{ color: 'var(--accent)' }}>
                <SparkIcon size={16} /> Đăng ký tài khoản
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

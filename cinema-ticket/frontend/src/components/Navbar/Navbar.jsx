import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useState, useRef, useEffect } from 'react';
import { movieApi } from '../../api';
import SafeImage from '../Common/SafeImage';
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
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowSearch(false);
    }
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

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearching(false);
      return undefined;
    }

    setSearching(true);
    setShowSearch(true);

    const timer = setTimeout(async () => {
      try {
        const res = await movieApi.getAll({ movieName: searchQuery });
        const q = searchQuery.trim().toLowerCase();
        const movies = (res.data.result || [])
          .filter((m) => m.movieName?.toLowerCase().includes(q))
          .slice(0, 5);
        setSearchResults(movies);
        setShowSearch(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close menus on route change
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowScheduleMenu(false);
      setShowSearch(false);
      setShowUserMenu(false);
      setMobileMenuOpen(false);
      setSearchQuery('');
    }, 0);

    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');
  const goToProfileSection = (hash) => {
    setShowUserMenu(false);
    setMobileMenuOpen(false);
    navigate(`/profile${hash}`);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowSearch(false);
      navigate(`/movies?movieName=${encodeURIComponent(searchQuery.trim())}`);
    } else if (e.key === 'Escape') {
      setShowSearch(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          <MoviePTITLogoIcon className="nav-svg-icon" />
          <span>MoviePTIT</span>
        </Link>

        {/* Global Search */}
        <div className="navbar-search-wrapper" ref={searchRef}>
          <div className="navbar-search-input-group">
            <SearchIcon className="navbar-search-icon" />
            <input
              type="text"
              placeholder="Tìm phim..."
              aria-label="Tìm kiếm phim"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => searchQuery.trim().length >= 2 && setShowSearch(true)}
            />
            {searchQuery && (
              <button
                type="button"
                className="navbar-search-clear"
                aria-label="Xoá từ khoá tìm kiếm"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearch(false);
                }}
              >
                <XIcon size={13} />
              </button>
            )}
          </div>

          {showSearch && searchQuery.trim().length >= 2 && (
            <div className="navbar-search-dropdown" role="listbox" aria-label="Kết quả tìm kiếm">
              {searching ? (
                <div className="search-empty-state">Đang tìm phim...</div>
              ) : searchResults.length === 0 ? (
                <div className="search-empty-state">
                  Không tìm thấy phim phù hợp với "{searchQuery}"
                </div>
              ) : (
                <>
                  {searchResults.map((movie) => (
                    <div
                      key={movie.movieId}
                      role="option"
                      tabIndex={0}
                      className="search-result-item"
                      onClick={() => navigate(`/movie/${movie.movieId}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') navigate(`/movie/${movie.movieId}`);
                      }}
                    >
                      <SafeImage
                        src={movie.thumbnailUrl}
                        alt={movie.movieName}
                        className="search-result-image"
                      />
                      <div className="search-result-info">
                        <p className="search-result-name">{movie.movieName}</p>
                        <p className="search-result-meta">
                          {movie.durationMinutes} phút | {movie.ageRating}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link
                    to={`/movies?movieName=${encodeURIComponent(searchQuery.trim())}`}
                    className="search-view-all"
                  >
                    Xem tất cả kết quả cho "{searchQuery}"
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="navbar-mobile-toggle"
          aria-label={mobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
        </button>

        <div className="navbar-links">
          <div className="navbar-dropdown" ref={dropdownRef}>
            <button
              type="button"
              aria-expanded={showScheduleMenu}
              className={`navbar-link-btn ${isActive('/movies') ? 'navbar-link--active' : ''}`}
              onClick={() => setShowScheduleMenu(!showScheduleMenu)}
            >
              Lịch chiếu
              <ChevronDownIcon size={14} className={`navbar-chevron ${showScheduleMenu ? 'navbar-chevron--open' : ''}`} />
            </button>
            {showScheduleMenu && (
              <div className="navbar-dropdown-menu">
                <Link to="/movies?status=NOW_SHOWING" className="navbar-dropdown-item">
                  <SparkIcon className="navbar-dropdown-icon" />
                  Phim đang chiếu
                </Link>
                <Link to="/movies?status=UPCOMING" className="navbar-dropdown-item">
                  <CalendarIcon className="navbar-dropdown-icon" />
                  Phim sắp chiếu
                </Link>
                <Link to="/movies" className="navbar-dropdown-item">
                  <FilmIcon className="navbar-dropdown-icon" />
                  Tất cả phim
                </Link>
              </div>
            )}
          </div>

          <Link to="/branches" className={`navbar-link ${isActive('/branches') || isActive('/branch') ? 'navbar-link--active' : ''}`}>
            Rạp chiếu
          </Link>

          {isAuthenticated && (
            <Link to="/my-bookings" className={`navbar-link ${isActive('/my-bookings') ? 'navbar-link--active' : ''}`}>
              Vé của tôi
            </Link>
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
          <Link to="/movies?status=NOW_SHOWING">
            <SparkIcon size={16} /> Phim đang chiếu
          </Link>
          <Link to="/movies?status=UPCOMING">
            <CalendarIcon size={16} /> Phim sắp chiếu
          </Link>
          <Link to="/movies">
            <FilmIcon size={16} /> Tất cả phim
          </Link>
          <Link to="/branches">
            <BuildingIcon size={16} /> Rạp chiếu & Lịch chiếu
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/my-bookings">
                <TicketIcon size={16} /> Vé của tôi
              </Link>
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

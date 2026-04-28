import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { movieApi } from '../../api';
import SafeImage from '../Common/SafeImage';

export default function Navbar() {
  const { user, logout, isAuthenticated, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await movieApi.getAll({ movieName: searchQuery });
        const movies = (res.data.result || []).slice(0, 5); // Show top 5
        setSearchResults(movies);
        setShowSearch(true);
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close menus on route change
  useEffect(() => {
    setShowScheduleMenu(false);
    setShowSearch(false);
    setSearchQuery('');
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">
          🎬 <span>CinemaHub</span>
        </Link>

        {/* Global Search */}
        <div className="navbar-search-wrapper" ref={searchRef}>
          <div className="navbar-search-input-group">
            <span className="navbar-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm phim..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setShowSearch(true)}
            />
          </div>
          
          {showSearch && searchResults.length > 0 && (
            <div className="navbar-search-dropdown">
              {searchResults.map(movie => (
                <div 
                  key={movie.movieId} 
                  className="search-result-item"
                  onClick={() => navigate(`/movie/${movie.movieId}`)}
                >
                  <SafeImage 
                    src={movie.thumbnailUrl} 
                    alt={movie.movieName} 
                    className="search-result-image"
                  />
                  <div className="search-result-info">
                    <p className="search-result-name">{movie.movieName}</p>
                    <p className="search-result-meta">{movie.durationMinutes} phút | {movie.ageRating}</p>
                  </div>
                </div>
              ))}
              <Link to={`/movies?movieName=${searchQuery}`} className="search-view-all">
                Xem tất cả kết quả cho "{searchQuery}"
              </Link>
            </div>
          )}
        </div>

        <div className="navbar-links">
          <div className="navbar-dropdown" ref={dropdownRef}>
            <button
              className={`navbar-link-btn ${isActive('/movies') ? 'navbar-link--active' : ''}`}
              onClick={() => setShowScheduleMenu(!showScheduleMenu)}
            >
              Lịch chiếu
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`navbar-chevron ${showScheduleMenu ? 'navbar-chevron--open' : ''}`}>
                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {showScheduleMenu && (
              <div className="navbar-dropdown-menu">
                <Link to="/movies?status=NOW_SHOWING" className="navbar-dropdown-item">
                  <span className="navbar-dropdown-icon">🔥</span>
                  Phim đang chiếu
                </Link>
                <Link to="/movies?status=UPCOMING" className="navbar-dropdown-item">
                  <span className="navbar-dropdown-icon">📅</span>
                  Phim sắp chiếu
                </Link>
                <Link to="/movies" className="navbar-dropdown-item">
                  <span className="navbar-dropdown-icon">🎞️</span>
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
               <Link to="/profile" className={`navbar-user-name ${isActive('/profile') ? 'navbar-link--active' : ''}`} style={{ textDecoration: 'none' }}>
                 👤 {user?.username}
               </Link>
               {isAdmin && (
                 <Link to="/admin" className="navbar-link" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                   Quan tri
                 </Link>
               )}
               {(isStaff || isAdmin) && (
                 <Link to="/staff" className="navbar-link" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                   {isStaff ? 'Nhan vien' : 'Quay ve'}
                 </Link>
               )}
               <button className="btn-ghost" onClick={handleLogout} style={{ padding: '6px 12px' }}>Đăng xuất</button>
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
    </nav>
  );
}

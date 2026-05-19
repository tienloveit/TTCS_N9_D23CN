import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useState, useEffect } from 'react';
import { MoviePTITLogoIcon } from '../../components/Common/CinemaIcons';
import './Admin.css';

/* ── SVG Icon Components ── */
const Icons = {
  Movie: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" /><line x1="17" y1="17" x2="22" y2="17" />
    </svg>
  ),
  Dashboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Building: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="9" y1="22" x2="9" y2="16" /><line x1="15" y1="22" x2="15" y2="16" />
      <line x1="9" y1="6" x2="9" y2="6.01" /><line x1="15" y1="6" x2="15" y2="6.01" />
      <line x1="9" y1="10" x2="9" y2="10.01" /><line x1="15" y1="10" x2="15" y2="10.01" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Ticket: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
    </svg>
  ),
  Scan: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Food: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  ),
  Gift: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  ),
  Menu: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  ExternalLink: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  Logo: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
};

/* ── Route title mapping ── */
const TITLE_MAP = {
  '/admin': 'Dashboard',
  '/admin/movies': 'Quản lý Phim',
  '/admin/showtimes': 'Quản lý Suất chiếu',
  '/admin/branches': 'Quản lý Rạp & Phòng',
  '/admin/users': 'Quản lý Người dùng',
  '/admin/bookings': 'Quản lý Đơn đặt vé',
  '/admin/foods': 'Quản lý Bắp & Nước',
  '/admin/promotions': 'Quản lý Khuyến mãi',
};

/* ── Navigation definition ── */
const NAV_SECTIONS = [
  {
    label: 'Tổng quan',
    items: [
      { path: '/admin', label: 'Dashboard', Icon: Icons.Dashboard, end: true },
    ],
  },
  {
    label: 'Quản lý',
    items: [
      { path: '/admin/movies', label: 'Phim', Icon: Icons.Movie },
      { path: '/admin/showtimes', label: 'Suất chiếu', Icon: Icons.Calendar },
      { path: '/admin/branches', label: 'Rạp & Phòng', Icon: Icons.Building },
      { path: '/admin/bookings', label: 'Đơn đặt vé', Icon: Icons.Ticket },
      { path: '/admin/foods', label: 'Bắp & Nước', Icon: Icons.Food },
      { path: '/admin/promotions', label: 'Khuyến mãi', Icon: Icons.Gift },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { path: '/admin/users', label: 'Người dùng', Icon: Icons.Users },
    ],
  },
];

/* ── AdminLayout Component ── */
const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSidebarOpen(false);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const pageTitle = TITLE_MAP[location.pathname] || 'Quản trị';
  const initials = (user?.username || 'A').charAt(0).toUpperCase();
  const basePath = user?.role === 'MANAGER' ? '/manager' : '/admin';
  const managerPaths = [
    '/admin',
    '/admin/movies',
    '/admin/showtimes',
    '/admin/branches',
    '/admin/bookings',
    '/admin/users',
    '/admin/foods',
    '/admin/promotions',
  ];
  const visibleSections = NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => user?.role === 'ADMIN' || managerPaths.includes(item.path)
      ),
    }))
    .filter((section) => section.items.length > 0);
  const displayRoleLabel =
    user?.role === 'MANAGER' ? 'Manager' : 'Admin';

  return (
    <div className="admin-layout">
      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
        {/* Logo */}
        <div className="admin-sidebar-header">
          <NavLink to={basePath} className="admin-logo">
            <div className="admin-logo-icon">
              <MoviePTITLogoIcon />
            </div>
            <div className="admin-logo-text">
              <strong>MoviePTIT</strong>
              <small>Admin Panel</small>
            </div>
          </NavLink>
        </div>

        {/* Nav Items */}
        <nav className="admin-nav">
          {visibleSections.map((section) => (
            <div key={section.label}>
              <div className="admin-nav-label">{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path.replace('/admin', basePath)}
                  end={item.end}
                  className={({ isActive }) =>
                    `admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`
                  }
                >
                  <span className="nav-icon"><item.Icon /></span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer — User info + Logout */}
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar">{initials}</div>
            <div className="admin-sidebar-user-info">
              <strong>{user?.username || 'Admin'}</strong>
              <span>{displayRoleLabel}</span>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <Icons.Logout />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />

      {/* ── Main Content ── */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-left">
            <button
              className="admin-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <Icons.Menu />
            </button>
            <h2 className="admin-header-title">{pageTitle}</h2>
          </div>

          <div className="admin-header-right">
            <a href="/" className="admin-header-link" target="_blank" rel="noopener noreferrer">
              <Icons.ExternalLink />
              Xem trang chủ
            </a>

            <div className="admin-header-divider" />

            <div className="admin-header-user">
              <div className="admin-header-user-text">
                <strong>{user?.username || 'Admin'}</strong>
                <span>{displayRoleLabel}</span>
              </div>
              <div className="admin-header-avatar">{initials}</div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <section className="admin-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default AdminLayout;

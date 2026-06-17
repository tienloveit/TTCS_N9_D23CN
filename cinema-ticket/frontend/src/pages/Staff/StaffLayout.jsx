import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { MoviePTITLogoIcon } from '../../components/Common/CinemaIcons';
import '../Admin/Admin.css';

const Icons = {
  Ticket: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
    </svg>
  ),
  Dashboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
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
  List: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
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

const TITLE_MAP = {
  '/staff': 'Tổng quan ca làm',
  '/staff/dashboard': 'Tổng quan ca làm',
  '/staff/schedules': 'Lịch trực của tôi',
  '/staff/booking': 'Đặt vé tại quầy',
  '/staff/check-in': 'Check-in vé',
  '/staff/bookings': 'Đơn đặt vé',
  '/staff/notifications': 'Thông báo',
};

const NAV_SECTIONS = [
  {
    label: 'Nghiệp vụ',
    items: [
      { path: '/staff/dashboard', label: 'Tổng quan ca', Icon: Icons.Dashboard },
      { path: '/staff/schedules', label: 'Lịch trực', Icon: Icons.Calendar },
      { path: '/staff/booking', label: 'Đặt vé tại quầy', Icon: Icons.Ticket },
      { path: '/staff/check-in', label: 'Check-in', Icon: Icons.Scan },
      { path: '/staff/bookings', label: 'Đơn đặt vé', Icon: Icons.List },
      { path: '/staff/notifications', label: 'Thông báo', Icon: Icons.Bell },
    ],
  },
];

export default function StaffLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const pageTitle = TITLE_MAP[location.pathname] || 'Nhân viên';
  const initials = (user?.username || 'S').charAt(0).toUpperCase();
  const roleLabel = isAdmin ? 'Admin' : 'Staff';

  return (
    <div className="admin-layout staff-layout">
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar-header">
          <NavLink to="/staff" className="admin-logo">
            <div className="admin-logo-icon">
              <MoviePTITLogoIcon />
            </div>
            <div className="admin-logo-text">
              <strong>MoviePTIT</strong>
              <small>Staff Portal</small>
            </div>
          </NavLink>
        </div>

        <nav className="admin-nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="admin-nav-label">{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
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

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar">{initials}</div>
            <div className="admin-sidebar-user-info">
              <strong>{user?.username || 'Staff'}</strong>
              <span>{roleLabel}</span>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <Icons.Logout />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />

      <main className="admin-main">
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
            {isAdmin && (
              <NavLink to="/admin" className="admin-header-link">
                Admin panel
              </NavLink>
            )}
            <a href="/" className="admin-header-link" target="_blank" rel="noopener noreferrer">
              <Icons.ExternalLink />
              Xem trang chủ
            </a>

            <div className="admin-header-divider" />

            <div className="admin-header-user">
              <div className="admin-header-user-text">
                <strong>{user?.username || 'Staff'}</strong>
                <span>{roleLabel}</span>
              </div>
              <div className="admin-header-avatar">{initials}</div>
            </div>
          </div>
        </header>

        <section className="admin-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

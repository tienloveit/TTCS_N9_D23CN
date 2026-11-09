import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import {
  BellIcon,
  CalendarIcon,
  DashboardIcon,
  ExternalLinkIcon,
  ListIcon,
  LogoutIcon,
  MenuIcon,
  MoviePTITLogoIcon,
  ScanIcon,
  TicketIcon,
} from '../../components/Common/CinemaIcons';
import '../Admin/Admin.css';

const Icons = {
  Ticket: TicketIcon,
  Dashboard: DashboardIcon,
  Scan: ScanIcon,
  List: ListIcon,
  Calendar: CalendarIcon,
  Bell: BellIcon,
  Logout: LogoutIcon,
  Menu: MenuIcon,
  ExternalLink: ExternalLinkIcon,
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

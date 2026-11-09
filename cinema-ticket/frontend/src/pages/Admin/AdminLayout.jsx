import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useState, useEffect } from 'react';
import {
  BellIcon,
  BoxIcon,
  BuildingIcon,
  CalendarIcon,
  DashboardIcon,
  ExternalLinkIcon,
  FilmIcon,
  GiftIcon,
  LogoutIcon,
  MenuIcon,
  MoviePTITLogoIcon,
  PopcornIcon,
  ReportIcon,
  RotateCcwIcon,
  ScanIcon,
  SettingsIcon,
  ShieldIcon,
  TicketIcon,
  UsersIcon,
} from '../../components/Common/CinemaIcons';
import './Admin.css';

/* ── Lucide Icon Components ── */
const Icons = {
  Movie: FilmIcon,
  Dashboard: DashboardIcon,
  Calendar: CalendarIcon,
  Building: BuildingIcon,
  Users: UsersIcon,
  Ticket: TicketIcon,
  Scan: ScanIcon,
  Logout: LogoutIcon,
  Food: PopcornIcon,
  Gift: GiftIcon,
  Report: ReportIcon,
  Shield: ShieldIcon,
  Bell: BellIcon,
  Settings: SettingsIcon,
  Box: BoxIcon,
  Refund: RotateCcwIcon,
  Menu: MenuIcon,
  ExternalLink: ExternalLinkIcon,
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
  '/admin/operations': 'Báo cáo vận hành',
  '/admin/refunds': 'Xử lý hoàn tiền',
  '/admin/inventory': 'Nhập xuất kho',
  '/admin/revenue': 'Doanh thu chi tiết',
  '/admin/notifications': 'Thông báo',
  '/admin/audit-logs': 'Nhật ký hệ thống',
  '/admin/settings': 'Cấu hình hệ thống',
  '/manager': 'Dashboard',
  '/manager/showtimes': 'Quản lý Suất chiếu',
  '/manager/branches': 'Quản lý Rạp & Phòng',
  '/manager/users': 'Quản lý Nhân viên',
  '/manager/bookings': 'Quản lý Đơn đặt vé',
  '/manager/foods': 'Quản lý Bắp & Nước',
  '/manager/promotions': 'Quản lý Khuyến mãi',
  '/manager/operations': 'Báo cáo vận hành',
  '/manager/refunds': 'Xử lý hoàn tiền',
  '/manager/inventory': 'Nhập xuất kho',
  '/manager/revenue': 'Doanh thu chi tiết',
  '/manager/notifications': 'Thông báo',
  '/manager/audit-logs': 'Nhật ký hệ thống',
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
      { path: '/admin/inventory', label: 'Nhập xuất kho', Icon: Icons.Box },
      { path: '/admin/promotions', label: 'Khuyến mãi', Icon: Icons.Gift },
      { path: '/admin/operations', label: 'Báo cáo vận hành', Icon: Icons.Report },
      { path: '/admin/revenue', label: 'Doanh thu chi tiết', Icon: Icons.Report },
      { path: '/admin/refunds', label: 'Hoàn tiền', Icon: Icons.Ticket },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      { path: '/admin/users', label: 'Người dùng', Icon: Icons.Users },
      { path: '/admin/notifications', label: 'Thông báo', Icon: Icons.Bell },
      { path: '/admin/audit-logs', label: 'Nhật ký hệ thống', Icon: Icons.Shield },
      { path: '/admin/settings', label: 'Cấu hình', Icon: Icons.Settings },
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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const pageTitle = TITLE_MAP[location.pathname] || 'Quản trị';
  const initials = (user?.username || 'A').charAt(0).toUpperCase();
  const basePath = user?.role === 'MANAGER' ? '/manager' : '/admin';
  const managerPaths = [
    '/admin',
    '/admin/showtimes',
    '/admin/branches',
    '/admin/bookings',
    '/admin/users',
    '/admin/foods',
    '/admin/inventory',
    '/admin/promotions',
    '/admin/operations',
    '/admin/revenue',
    '/admin/refunds',
    '/admin/notifications',
    '/admin/audit-logs',
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

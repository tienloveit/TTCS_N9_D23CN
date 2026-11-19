import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { notificationApi } from '../../api';
import {
  BellIcon, BuildingIcon, ChevronDownIcon, DashboardIcon, ExternalLinkIcon, ListIcon,
  LogoutIcon, MenuIcon, MoviePTITLogoIcon, ScanIcon, TicketIcon, XIcon,
} from '../../components/Common/CinemaIcons';
import '../Admin/Admin.css';
import './StaffPortal.css';
import './StaffWorkspaces.css';

const NAV_SECTIONS = [
  { label: 'Ca làm việc', items: [
    ['/staff/dashboard', 'Tổng quan', DashboardIcon],
    ['/staff/notifications', 'Thông báo', BellIcon],
  ] },
  { label: 'Nghiệp vụ', items: [
    ['/staff/booking', 'Bán vé tại quầy', TicketIcon],
    ['/staff/check-in', 'Soát vé vào rạp', ScanIcon],
    ['/staff/bookings', 'Tra cứu đơn vé', ListIcon],
  ] },
];

function StaffNavigation({ onNavigate }) {
  return (
    <nav className="staff-nav" aria-label="Điều hướng nhân viên">
      {NAV_SECTIONS.map(({ label, items }) => (
        <div className="staff-nav-group" key={label}>
          <p>{label}</p>
          {items.map(([path, title, icon]) => {
            const Icon = icon;
            return (
              <NavLink key={path} to={path} onClick={onNavigate}>
                <Icon size={19} aria-hidden="true" />{title}
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function StaffBrand({ onNavigate }) {
  return (
    <NavLink to="/staff/dashboard" className="staff-brand" onClick={onNavigate}>
      <span className="staff-brand-logo"><MoviePTITLogoIcon /></span>
      <span><strong>MoviePTIT</strong><small>Cổng nhân viên</small></span>
    </NavLink>
  );
}

export default function StaffLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unreadCount, setUnreadCount] = useState(null);
  const drawer = useRef(null);
  const account = useRef(null);
  const notificationsPath = '/staff/notifications';

  useEffect(() => {
    if (pathname === notificationsPath) return;
    let active = true;
    notificationApi.getUnreadCount().then(({ data }) => {
      if (active) setUnreadCount(data.result ?? null);
    }).catch(() => {});
    return () => { active = false; };
  }, [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 961px)');
    const closeOnDesktop = (event) => {
      if (event.matches) drawer.current?.close();
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    const closeAccount = (event) => {
      if (!account.current?.open) return;
      if (event.type === 'keydown') {
        if (event.key !== 'Escape') return;
        account.current.querySelector('summary')?.focus();
      } else if (account.current.contains(event.target)) return;
      account.current.open = false;
    };
    document.addEventListener('pointerdown', closeAccount);
    document.addEventListener('keydown', closeAccount);
    return () => {
      document.removeEventListener('pointerdown', closeAccount);
      document.removeEventListener('keydown', closeAccount);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const pageTitle = NAV_SECTIONS.flatMap(({ items }) => items).find(([path]) => path === pathname)?.[1] || 'Tổng quan';
  const username = user?.username || 'Nhân viên';

  return (
    <div className="staff-portal">
      <a href="#staff-content" className="staff-skip-link">Đến nội dung chính</a>
      <aside className="staff-sidebar"><StaffBrand /><StaffNavigation /></aside>
      <dialog ref={drawer} id="staff-navigation" className="staff-nav-drawer" aria-label="Điều hướng nhân viên"
        onClick={(event) => { if (event.target === event.currentTarget) drawer.current.close(); }}>
        <div className="staff-nav-drawer-head">
          <StaffBrand onNavigate={() => drawer.current.close()} />
          <button type="button" className="staff-icon-button" aria-label="Đóng điều hướng"
            onClick={() => drawer.current.close()}><XIcon size={20} /></button>
        </div>
        <StaffNavigation onNavigate={() => drawer.current.close()} />
      </dialog>
      <div className="staff-main">
        <header className="staff-topbar">
          <div className="staff-breadcrumb">
            <button type="button" className="staff-icon-button staff-menu-button" aria-label="Mở điều hướng"
              aria-haspopup="dialog" aria-controls="staff-navigation" onClick={() => drawer.current.showModal()}>
              <MenuIcon size={21} />
            </button>
            <span className="staff-crumb-root">Vận hành rạp</span>
            <span className="staff-crumb-root" aria-hidden="true">/</span>
            <strong>{pageTitle}</strong>
          </div>
          <div className="staff-topbar-actions">
            {user?.branchId != null && !isAdmin && (
              <span className="staff-branch"><BuildingIcon size={16} /> Chi nhánh #{user.branchId}</span>
            )}
            <NavLink to={notificationsPath} className="staff-icon-button staff-bell"
              aria-label={unreadCount ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}>
              <BellIcon size={20} />
              {unreadCount > 0 && <span aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </NavLink>
            <details className="staff-account" ref={account}>
              <summary aria-label={`Tài khoản ${username}`}>
                <span className="staff-avatar" aria-hidden="true">{username.charAt(0).toUpperCase()}</span>
                <span className="staff-account-name"><strong>{username}</strong><small>{isAdmin ? 'Quản trị viên' : 'Nhân viên'}</small></span>
                <ChevronDownIcon size={15} aria-hidden="true" />
              </summary>
              <div className="staff-account-links">
                {isAdmin && <NavLink to="/admin"><DashboardIcon size={17} /> Quản trị</NavLink>}
                <a href="/" target="_blank" rel="noopener noreferrer"><ExternalLinkIcon size={17} /> Xem trang chủ</a>
                <button type="button" onClick={handleLogout}><LogoutIcon size={17} /> Đăng xuất</button>
              </div>
            </details>
          </div>
        </header>
        <main className="staff-content" id="staff-content" tabIndex={-1}>
          <Outlet context={{ setUnreadCount }} />
        </main>
      </div>
    </div>
  );
}

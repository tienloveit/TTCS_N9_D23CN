import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { notificationApi, branchApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import useNow from '../../utils/useNow';
import { ShowTime } from './text';
import { formatShowDate } from '../../utils/cinemaTime';
import * as icons from '../Common/CinemaIcons';
import { opsNavigation } from './opsNav';
import './ops.css';

const areaNames = { staff: 'Quầy vé', admin: 'Quản trị', manager: 'Quản lý chi nhánh' };
const roles = { ADMIN: 'Quản trị viên', MANAGER: 'Quản lý', STAFF: 'Nhân viên' };
const branchNames = new Map();

function Navigation({ area, isAdmin, unread, close }) {
  const cross = isAdmin && (area === 'staff' ? ['/admin', 'Về trang quản trị'] : ['/staff', 'Mở quầy vé']);
  return <nav className="o-nav" aria-label={'Điều hướng ' + areaNames[area]}>
    <div className="o-nav__brand"><icons.MoviePTITLogoIcon /><div className="o-nav__label"><strong>MoviePTIT</strong><small>{areaNames[area]}</small></div></div>
    {opsNavigation(area).map(group => <div className="o-nav__group" key={group.label}>
      <p className="o-nav__heading">{group.label}</p>
      {group.items.map(({ path, label, icon }) => {
        const Icon = icons[icon + 'Icon'];
        return <NavLink end key={path} to={path} title={label} aria-label={icon === 'Bell' && unread > 0 ? label + ', ' + unread + ' chưa đọc' : label} className="o-nav__link" onClick={close}>
          <Icon size={18} /><span className="o-nav__label">{label}</span>
          {icon === 'Bell' && unread > 0 && <span className="o-shell__count o-nav__count">{unread}</span>}
        </NavLink>;
      })}
    </div>)}
    {cross && <div className="o-nav__cross"><NavLink className="o-nav__link" to={cross[0]} title={cross[1]} aria-label={cross[1]} onClick={close}><icons.ExternalLinkIcon size={18}/><span className="o-nav__label">{cross[1]}</span></NavLink></div>}
  </nav>;
}

export default function OpsShell({ area, density }) {
  const {user, logout} = useAuth();
  const {pathname} = useLocation();
  const navigate = useNavigate();
  const drawer = useRef(null);
  const account = useRef(null);
  const main = useRef(null);
  const [unread, setUnreadCount] = useState(0);
  const [branch, setBranch] = useState(null);
  const now = useNow(30_000);
  const branchId = user?.branchId;
  const isAdmin = user?.role === 'ADMIN';
  const name = user?.username || roles[user?.role];
  const notifications = '/' + area + '/notifications';

  useEffect(() => {
    if (branchId == null || isAdmin || branchNames.has(branchId)) return;
    let active = true;
    // GET /branch/{id} chỉ mở cho ADMIN và MANAGER; danh sách /branch công khai nên STAFF cũng đọc được.
    branchApi.getAll().then(({data}) => {
      const found = (data.result || []).find(item => String(item.branchId) === String(branchId));
      if (active && found?.name) {
        branchNames.set(branchId, found.name);
        setBranch({ id: branchId, name: found.name });
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [branchId, isAdmin]);

  useEffect(() => {
    let active = true;
    if (pathname !== notifications) {
      notificationApi.getUnreadCount().then(({data}) => {
        if (active) setUnreadCount(data.result ?? 0);
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [pathname, notifications]);

  useEffect(() => {
    const node = main.current;
    const focusTitle = () => {
      const heading = node.querySelector('h1');
      if (heading) { heading.tabIndex = -1; heading.focus({preventScroll:true}); }
      return Boolean(heading);
    };
    if (focusTitle()) return;
    const observer = new MutationObserver(() => { if (focusTitle()) observer.disconnect(); });
    observer.observe(node, {childList:true, subtree:true});
    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)');
    const closeDrawer = () => { if (wide.matches && drawer.current?.open) drawer.current.close(); };
    const closeAccount = event => {
      const menu = account.current;
      if (!menu?.open) return;
      if (event.type === 'keydown') {
        if (event.key !== 'Escape') return;
        menu.querySelector('summary').focus();
      } else if (menu.contains(event.target)) return;
      menu.open = false;
    };
    wide.addEventListener('change', closeDrawer);
    document.addEventListener('keydown', closeAccount);
    document.addEventListener('pointerdown', closeAccount);
    return () => {
      wide.removeEventListener('change', closeDrawer);
      document.removeEventListener('keydown', closeAccount);
      document.removeEventListener('pointerdown', closeAccount);
    };
  }, []);

  const branchName = branch?.id === branchId ? branch?.name : branchNames.get(branchId);
  const scope = isAdmin ? 'Toàn hệ thống' : branchName || (branchId != null ? 'Chi nhánh #' + branchId : 'Chưa được gán chi nhánh');
  const navigation = { area, isAdmin, unread };
  return <div className="ops o-shell" data-density={density}>
    <a className="o-skip" href="#o-main">Đến nội dung chính</a>
    <aside className="o-shell__side"><Navigation {...navigation}/></aside>
    <dialog className="o-nav-dialog" id="o-navigation" ref={drawer} aria-label="Điều hướng" onClick={event => {
      if (event.target === drawer.current) drawer.current.close();
    }}>
      <button type="button" className="o-nav-dialog__close" aria-label="Đóng điều hướng" onClick={() => drawer.current.close()}><icons.XIcon/></button>
      <Navigation {...navigation} close={() => drawer.current.close()}/>
    </dialog>
    <div className="o-shell__body">
      <header className="o-shell__top">
        <button type="button" className="o-shell__toggle" aria-label="Mở điều hướng" aria-controls="o-navigation" aria-haspopup="dialog" onClick={() => drawer.current.showModal()}><icons.MenuIcon/></button>
        <strong className="o-scope"><icons.BuildingIcon size={18}/>{scope}</strong>
        <div className="o-shell__tools">
          <div className="o-shell__clock"><strong><ShowTime value={new Date(now)} /></strong><small>{formatShowDate(new Date(now)).replace(/\/\d{4}$/, '')}</small></div>
          <NavLink className="o-shell__bell" to={notifications} aria-label={'Thông báo, ' + unread + ' chưa đọc'}><icons.BellIcon/>{unread > 0 && <span className="o-shell__count">{unread}</span>}</NavLink>
          <details ref={account} className="o-account">
            <summary aria-label={'Tài khoản ' + name}><span className="o-account__avatar">{name?.charAt(0).toUpperCase()}</span><span className="o-account__name">{name}<small>{roles[user?.role]}</small></span><icons.ChevronDownIcon size={14}/></summary>
            <div className="o-account__menu"><a className="o-nav__link" href="/movies" target="_blank" rel="noreferrer"><icons.ExternalLinkIcon size={16}/>Mở trang khách</a><button className="o-nav__link" type="button" onClick={async () => { await logout(); navigate('/login'); }}><icons.LogoutIcon size={16}/>Đăng xuất</button></div>
          </details>
        </div>
      </header>
      <main ref={main} tabIndex={-1} className="o-shell__main" id="o-main"><Outlet context={{setUnreadCount}}/></main>
    </div>
  </div>;
}

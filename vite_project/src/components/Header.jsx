import './Header.css'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

const navItems = [
  { id: 'home', label: 'Trang Chủ', path: '/' },
  { id: 'movie', label: 'Phim', path: '/movies', subItems: ['Đang chiếu', 'Sắp chiếu', 'Phim IMAX'] },
  { id: 'shop', label: 'Star Shop', path: '/shop' },
  { id: 'content', label: 'Góc Điện Ảnh', path: '/content' },
  { id: 'event', label: 'Sự Kiện', path: '/event' },
  { id: 'cinema', label: 'Rạp/Giá Vé', path: '/cinema' }
]

function Header({ user, onAuthClick, onLogout }) {
  const [openDropdown, setOpenDropdown] = useState(null)

  return (
    <header className="galaxy-header">
      <div className="galaxy-header__left">
        <Link to="/" className="galaxy-header__logo">
          Galaxy Cinema
        </Link>
        <Link to="/booking" className="galaxy-header__buy-btn">
          ★ Mua Vé
        </Link>
      </div>

      <nav className="galaxy-nav" aria-label="Điều hướng chính">
        {navItems.map((item) => (
          <div key={item.id} className="galaxy-nav__item">
            <NavLink
              to={item.path}
              className={({ isActive }) => `galaxy-nav__link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => item.subItems && setOpenDropdown(item.id)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              {item.label}
            </NavLink>
            {item.subItems && openDropdown === item.id && (
              <div className="galaxy-dropdown" onMouseLeave={() => setOpenDropdown(null)}>
                {item.subItems.map((sub) => (
                  <Link key={sub} to="/movies" className="galaxy-dropdown__item">
                    {sub}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="galaxy-header__right">
        <div className="galaxy-search">
          <input type="search" placeholder="Tìm phim..." aria-label="Tìm phim" />
          <span className="galaxy-search__icon">🔍</span>
        </div>
        {user ? (
          <div className="galaxy-header__user">
            <span className="galaxy-header__user-name">👤 {user.name}</span>
            <button className="galaxy-header__logout" onClick={onLogout}>Đăng Xuất</button>
          </div>
        ) : (
          <button className="galaxy-header__login" onClick={onAuthClick}>Đăng Nhập</button>
        )}
        <Link to="/content" className="galaxy-header__reward">👑 THAM GIA G STAR</Link>
      </div>
    </header>
  )
}

export default Header


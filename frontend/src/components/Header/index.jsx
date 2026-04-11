import React from 'react'
import './Header.css'
import { Link } from 'react-router-dom'

const Header = () => {
    return (
        <header className="header-container">

            <div className="header-left">
                <Link to="/">
                    <svg width="150" height="50" viewBox="0 0 150 50">
                        <path d="M40 15 C55 5, 75 25, 40 35 C20 40, 5 25, 40 15 Z" fill="none" stroke="#f26b38" strokeWidth="4" />
                        <path d="M40 18 C50 12, 60 22, 40 30 C28 35, 18 25, 40 18 Z" fill="none" stroke="#0072bc" strokeWidth="3" />
                        <text x="75" y="32" fontSize="18" fontWeight="bold" fill="#0072bc">
                            Galaxy<tspan fill="#f26b38">Cinema</tspan>
                        </text>
                    </svg>
                </Link>
            </div>

            <div className="header-center">

                <Link to="/dat-ve">
                    <button className="btn-buy-ticket">
                        Mua Vé
                    </button>
                </Link>

                <nav className="header-nav">
                    <Link to="/phim" className="nav-item">Phim <ChevronDownIcon /></Link>
                    <Link to="/star-shop" className="nav-item">Star Shop <ChevronDownIcon /></Link>
                    <Link to="/goc-dien-anh" className="nav-item">Góc Điện Ảnh <ChevronDownIcon /></Link>
                    <Link to="/su-kien" className="nav-item">Sự Kiện <ChevronDownIcon /></Link>
                    <Link to="/rap-gia-ve" className="nav-item">Rạp/Giá Vé <ChevronDownIcon /></Link>
                </nav>
            </div>

            <div className="header-right">

                <div className="search-icon">
                    🔍
                </div>

                <Link to="/login" className="login-link">Đăng Nhập</Link>

                <div className="gstar-join">
                    <div className="gstar-text">
                        <span className="gstar-join-title">THAM GIA</span>
                        <span className="gstar-brand">G STAR</span>
                    </div>
                </div>

            </div>

        </header>
    )
}

const ChevronDownIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24">
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
)

export default Header
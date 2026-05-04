import { Link } from 'react-router-dom';
import { MailIcon, MapPinIcon, MoviePTITLogoIcon, PhoneIcon } from '../Common/CinemaIcons';

const Footer = () => {
  return (
    <footer className="footer-professional">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-col footer-col--brand">
            <Link to="/" className="footer-logo">
              <MoviePTITLogoIcon className="footer-logo-icon" />
              MoviePTIT
            </Link>
            <p className="footer-tagline">
              Trải nghiệm điện ảnh đỉnh cao với công nghệ chiếu phim hiện đại nhất Việt Nam.
            </p>
            <div className="social-links">
              <a href="#" className="social-link" title="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" className="social-link" title="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" className="social-link" title="Youtube">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.42 5.58a2.78 2.78 0 0 0 1.94 2c1.71.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.89 23 12 23 12s0-3.89-.42-5.58z"/><polyline points="9.75 15.02 15.5 11.98 9.75 8.95 9.75 15.02"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4 className="footer-title">Khám phá</h4>
            <ul className="footer-links">
              <li><Link to="/movies?status=NOW_SHOWING">Phim đang chiếu</Link></li>
              <li><Link to="/movies?status=UPCOMING">Phim sắp chiếu</Link></li>
              <li><Link to="/branches">Danh sách rạp</Link></li>
              <li><Link to="/promotion">Ưu đãi</Link></li>
            </ul>
          </div>

          {/* Policy */}
          <div className="footer-col">
            <h4 className="footer-title">Chính sách</h4>
            <ul className="footer-links">
              <li><Link to="/terms">Điều khoản sử dụng</Link></li>
              <li><Link to="/privacy">Chính sách bảo mật</Link></li>
              <li><Link to="/refund">Chính sách hoàn tiền</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer-col">
            <h4 className="footer-title">Liên hệ</h4>
            <ul className="footer-contact">
              <li>
                <MapPinIcon className="footer-contact-icon" />
                <span>123 Đường ABC, Quận 1, TP. HCM</span>
              </li>
              <li>
                <PhoneIcon className="footer-contact-icon" />
                <span>Hotline: 1900 xxxx</span>
              </li>
              <li>
                <MailIcon className="footer-contact-icon" />
                <span>Email: hotro@movieptit.vn</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Partners & Bottom */}
        <div className="footer-bottom">
          <div className="partners">
            <span className="partners-label">Đối tác thanh toán:</span>
            <div className="partner-logos">
              <span className="partner-logo partner-vnpay">VNPAY</span>
              <span className="partner-logo partner-momo">MOMO</span>
              <span className="partner-logo partner-visa">VISA</span>
              <span className="partner-logo partner-mastercard">Mastercard</span>
            </div>
          </div>
          <p className="copyright">
            © 2026 MoviePTIT. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

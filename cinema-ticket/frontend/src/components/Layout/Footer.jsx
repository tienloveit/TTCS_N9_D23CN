import { Link } from 'react-router-dom';
import { GlobeIcon, MailIcon, MapPinIcon, MessageIcon, MoviePTITLogoIcon, PhoneIcon, FilmIcon } from '../Common/CinemaIcons';

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
              <a href="#" className="social-link" title="Website">
                <GlobeIcon size={18} />
              </a>
              <a href="#" className="social-link" title="Cộng đồng">
                <MessageIcon size={18} />
              </a>
              <a href="#" className="social-link" title="Kênh Video">
                <FilmIcon size={18} />
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

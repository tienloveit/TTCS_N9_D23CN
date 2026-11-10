import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FilmIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  MessageIcon,
  MoviePTITLogoIcon,
  PhoneIcon,
  ShieldIcon,
  XIcon,
} from '../Common/CinemaIcons';

const POLICY_CONTENT = {
  terms: {
    title: 'Điều khoản sử dụng MoviePTIT',
    items: [
      'Vé đã thanh toán thành công được cấp mã QR định danh duy nhất cho từng đơn đặt vé.',
      'Khán giả vui lòng có mặt trước giờ chiếu ít nhất 15 phút để xuất trình mã QR tại quầy kiểm soát vé.',
      'Phim có phân loại độ tuổi (P, T13, T16, T18): rạp có quyền từ chối phục vụ nếu khán giả không đáp ứng quy định độ tuổi.',
    ],
  },
  privacy: {
    title: 'Chính sách bảo mật thông tin',
    items: [
      'Thông tin cá nhân (họ tên, email, số điện thoại) chỉ được sử dụng để gửi vé điện tử, thông báo lịch chiếu và tích điểm hạng thành viên.',
      'Giao dịch thanh toán trực tuyến được mã hoá và xử lý trực tiếp qua cổng thanh toán VNPay chuẩn bảo mật quốc tế.',
      'MoviePTIT cam kết không chia sẻ dữ liệu khách hàng cho bên thứ ba vì mục đích thương mại.',
    ],
  },
  refund: {
    title: 'Chính sách huỷ & hoàn tiền vé',
    items: [
      'Đơn đặt vé đang chờ thanh toán sẽ giữ ghế tối đa 06 phút trước khi tự động giải phóng ghế.',
      'Vé đã thanh toán có thể gửi yêu cầu hoàn tiền trong mục "Vé của tôi" trước giờ khởi chiếu theo quy định của rạp.',
      'Yêu cầu hoàn tiền hợp lệ sẽ được nhân viên/quản lý rạp xét duyệt và phản hồi trạng thái trực tiếp trên hệ thống.',
    ],
  },
};

const Footer = () => {
  const [activePolicy, setActivePolicy] = useState(null);
  const policyData = activePolicy ? POLICY_CONTENT[activePolicy] : null;

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
              <Link to="/" className="social-link" title="Trang chủ MoviePTIT" aria-label="Trang chủ MoviePTIT">
                <GlobeIcon size={18} />
              </Link>
              <Link to="/branches" className="social-link" title="Hệ thống rạp" aria-label="Hệ thống rạp">
                <MessageIcon size={18} />
              </Link>
              <Link to="/movies" className="social-link" title="Danh sách phim" aria-label="Danh sách phim">
                <FilmIcon size={18} />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4 className="footer-title">Khám phá</h4>
            <ul className="footer-links">
              <li><Link to="/movies?status=NOW_SHOWING">Phim đang chiếu</Link></li>
              <li><Link to="/movies?status=UPCOMING">Phim sắp chiếu</Link></li>
              <li><Link to="/branches">Danh sách rạp</Link></li>
              <li><Link to="/profile#promos">Ưu đãi thành viên</Link></li>
            </ul>
          </div>

          {/* Policy */}
          <div className="footer-col">
            <h4 className="footer-title">Chính sách</h4>
            <ul className="footer-links">
              <li>
                <button type="button" className="footer-link-btn" onClick={() => setActivePolicy('terms')}>
                  Điều khoản sử dụng
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => setActivePolicy('privacy')}>
                  Chính sách bảo mật
                </button>
              </li>
              <li>
                <button type="button" className="footer-link-btn" onClick={() => setActivePolicy('refund')}>
                  Chính sách hoàn tiền
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer-col">
            <h4 className="footer-title">Liên hệ</h4>
            <ul className="footer-contact">
              <li>
                <MapPinIcon className="footer-contact-icon" />
                <span>Km10 Đường Nguyễn Trãi, Quận Hà Đông, Hà Nội</span>
              </li>
              <li>
                <PhoneIcon className="footer-contact-icon" />
                <span>Hotline: 1900 6017</span>
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

      {policyData && (
        <div className="modal-overlay" onClick={() => setActivePolicy(null)} role="dialog" aria-modal="true" aria-label={policyData.title}>
          <div
            className="card"
            style={{ maxWidth: 520, width: '92%', padding: '28px 30px', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.15rem', fontWeight: 800 }}>
                <ShieldIcon size={20} style={{ color: 'var(--blue)' }} />
                {policyData.title}
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Đóng hộp thoại"
                onClick={() => setActivePolicy(null)}
                style={{ padding: 6 }}
              >
                <XIcon size={18} />
              </button>
            </div>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 10, color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              {policyData.items.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
            <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setActivePolicy(null)}>
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;

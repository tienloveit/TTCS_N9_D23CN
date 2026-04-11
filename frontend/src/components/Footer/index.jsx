import React from 'react';
import './Footer.css';
import {
    FaFacebookF, FaYoutube, FaTiktok, FaInstagram, FaTwitter,
    FaMapMarkerAlt, FaPhoneAlt, FaEnvelope
} from 'react-icons/fa';
import { BiCameraMovie, BiTransfer } from 'react-icons/bi';
import { MdSupportAgent, MdOutlineLocalOffer } from 'react-icons/md';

const Footer = () => {
    return (
        <footer className="cinema-footer">
            {/* Top Benefits Bar */}
            <div className="footer-benefits">
                <div className="container benefits-container">
                    <div className="benefit-item">
                        <BiCameraMovie className="benefit-icon" />
                        <div className="benefit-text">
                            <h4>Đặt vé nhanh chóng</h4>
                            <p>Mua vé xem phim chỉ trong 1 phút</p>
                        </div>
                    </div>
                    <div className="benefit-item">
                        <BiTransfer className="benefit-icon" />
                        <div className="benefit-text">
                            <h4>Hủy vé dễ dàng</h4>
                            <p>Hoàn tiền trước 2h chiếu</p>
                        </div>
                    </div>
                    <div className="benefit-item">
                        <MdSupportAgent className="benefit-icon" />
                        <div className="benefit-text">
                            <h4>Hỗ trợ 24/7</h4>
                            <p>Hỗ trợ khách hàng mọi lúc</p>
                        </div>
                    </div>
                    <div className="benefit-item">
                        <MdOutlineLocalOffer className="benefit-icon" />
                        <div className="benefit-text">
                            <h4>Deal hot bùng nổ</h4>
                            <p>Flash sale vé sập sàn</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Footer Content */}
            <div className="footer-main">
                <div className="container footer-grid">
                    {/* Column 1: Company Info */}
                    <div className="footer-col company-info">
                        <h2 className="footer-logo">CINE<span>FLEX</span></h2>
                        <h5>CÔNG TY TNHH GIẢI TRÍ CINEFLEX</h5>
                        <p className="company-desc">
                            Thương hiệu uy tín và chất lượng, cam kết mang đến những trải nghiệm điện ảnh tuyệt vời nhất.
                        </p>
                        <p className="tax-id">Mã số thuế: 12345678999</p>

                        <ul className="contact-list">
                            <li>
                                <FaMapMarkerAlt className="contact-icon" />
                                <div>
                                    <strong>Địa chỉ</strong>
                                    <p>120 Yên Lãng,Đống Đa, Tp.Hà Nội</p>
                                </div>
                            </li>
                            <li className="contact-inline">
                                <div>
                                    <FaPhoneAlt className="contact-icon" />
                                    <strong>Hotline</strong>
                                    <p>03636363636</p>
                                </div>
                                <div>
                                    <FaEnvelope className="contact-icon" />
                                    <strong>Email</strong>
                                    <p>support@cineflex.com</p>
                                </div>
                            </li>
                        </ul>

                        <div className="social-links">
                            <h4>Mạng xã hội</h4>
                            <div className="social-icons">
                                <a href="#" className="social-fb"><FaFacebookF /></a>
                                <a href="#" className="social-yt"><FaYoutube /></a>
                                <a href="#" className="social-tk"><FaTiktok /></a>
                                <a href="#" className="social-ig"><FaInstagram /></a>
                                <a href="#" className="social-tw"><FaTwitter /></a>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: About */}
                    <div className="footer-col">
                        <h3>Về CineFlex</h3>
                        <ul className="footer-links">
                            <li><a href="#">Giới thiệu</a></li>
                            <li><a href="#">Hệ thống rạp chiếu</a></li>
                            <li><a href="#">Thông tin liên hệ</a></li>
                            <li><a href="#">Các điều khoản và điều kiện</a></li>
                            <li><a href="#">Hỗ trợ và giải đáp thắc mắc</a></li>
                            <li><a href="#">Hợp tác cùng chúng tôi</a></li>
                            <li><a href="#">Tuyển dụng</a></li>
                        </ul>
                    </div>

                    {/* Column 3: Support */}
                    <div className="footer-col">
                        <h3>Hỗ trợ khách hàng</h3>
                        <ul className="footer-links">
                            <li><a href="#">Chính sách đặt vé trực tuyến</a></li>
                            <li><a href="#">Quy định tại rạp chiếu</a></li>
                            <li><a href="#">Chính sách bảo mật</a></li>
                            <li><a href="#">Tra cứu giao dịch</a></li>
                        </ul>

                        <div className="hotline-box mt-4">
                            <h3>Tổng đài hỗ trợ</h3>
                            <ul className="footer-links">
                                <li>Gọi đặt vé: <strong>0900999000</strong> (8h-20h)</li>
                                <li>Góp ý/Khiếu nại: <strong>0900999000</strong> (8h-20h)</li>
                            </ul>
                        </div>
                    </div>

                    {/* Column 4: Newsletter & Payments */}
                    <div className="footer-col">
                        <h3>Đăng ký nhận ưu đãi</h3>
                        <p className="newsletter-desc">Đăng ký để nhận thông tin ưu đãi sớm nhất.</p>
                        <form className="newsletter-form">
                            <input type="email" placeholder="Email của bạn..." required />
                            <button type="submit">
                                &#10140;
                            </button>
                        </form>

                        <div className="payment-methods mt-4">
                            <h3>PHƯƠNG THỨC THANH TOÁN</h3>
                            <div className="payment-icons">
                                <div className="pay-icon visa">VISA</div>
                                <div className="pay-icon master">MC</div>
                                <div className="pay-icon zalo">ZaloPay</div>
                                <div className="pay-icon momo">MoMo</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Bottom Bar */}
            <div className="footer-bottom">
                <div className="container">
                    <p>&copy; 2026 CineFlex. Tất cả các quyền được bảo lưu.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

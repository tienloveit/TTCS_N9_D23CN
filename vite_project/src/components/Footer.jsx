import './Footer.css'

function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="footer__content">
        <div>
          <h3>Liên hệ</h3>
          <p>Email: support@galaxycinema.vn</p>
          <p>Địa chỉ: 123 Đại lộ Ngôi sao, Q.1, TP.HCM</p>
          <p>Điện thoại: 1900-1234</p>
        </div>
        <div>
          <h3>Kết nối</h3>
          <p>Facebook: /galaxycinema.vn</p>
          <p>Instagram: @galaxycinema.vn</p>
          <p>Zalo: 0123 456 789</p>
        </div>
      </div>
      <p className="footer__copy">© 2026 Galaxy Cinema. Bản quyền thuộc về Galaxy Cinema.</p>
    </footer>
  )
}

export default Footer

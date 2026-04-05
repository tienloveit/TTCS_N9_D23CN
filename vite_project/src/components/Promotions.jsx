import './Promotions.css'

function Promotions() {
  const promos = [
    {
      id: 1,
      title: 'Combo Xem Phim Vui Vẻ',
      desc: '2 vé + 1 bắp + 2 nước',
      price: '199.000₫',
      old: '330.000₫',
      icon: '🍿',
      badge: 'Tiết kiệm 40%'
    },
    {
      id: 2,
      title: 'Thẻ Thành Viên Galaxy',
      desc: 'Tích lũy điểm, nhận ưu đãi',
      price: 'Miễn phí',
      icon: '💳',
      badge: 'Mới'
    },
    {
      id: 3,
      title: 'Giảm 20% Thu Tuyệt',
      desc: 'Thanh toán bằng Momo, ZaloPay',
      price: 'Tối đa 50K',
      icon: '💸',
      badge: 'Hot'
    },
    {
      id: 4,
      title: 'Vé Xem Đôi Lẻ',
      desc: 'Giá ưu đãi 99.000₫ / vé',
      price: '99.000₫',
      icon: '🎬',
      badge: 'Flash'
    }
  ]

  return (
    <section className="promotions" id="promotions">
      <div className="promotions-header">
        <h2>Khuyến Mãi Đặc Biệt</h2>
        <p>Những ưu đãi tuyệt vời chỉ có tại Galaxy Cinema</p>
      </div>
      <div className="promo-grid">
        {promos.map((promo) => (
          <article key={promo.id} className="promo-card">
            <div className="promo-badge">{promo.badge}</div>
            <div className="promo-icon">{promo.icon}</div>
            <h3>{promo.title}</h3>
            <p className="promo-desc">{promo.desc}</p>
            {promo.old && <p className="promo-old">{promo.old}</p>}
            <p className="promo-price">{promo.price}</p>
            <button className="promo-btn">Xem Chi Tiết</button>
          </article>
        ))}
      </div>
    </section>
  )
}

export default Promotions

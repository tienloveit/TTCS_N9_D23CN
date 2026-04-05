import './News.css'

function News() {
  const items = [
    { id: 1, title: 'Galaxy Cinema ra mắt phòng IMAX mới tại TP.HCM', date: '2026-03-20' },
    { id: 2, title: 'Giải đấu xem phim truyện 48h cùng Galaxy', date: '2026-03-27' },
    { id: 3, title: 'Nhận ngay ưu đãi Tết 2026 khi đặt vé online', date: '2026-04-01' }
  ]

  return (
    <section className="news" id="news">
      <h2>Tin tức</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <p className="news-date">{item.date}</p>
            <p className="news-title">{item.title}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default News

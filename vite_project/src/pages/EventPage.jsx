import './PageStyles.css'

const events = [
  { id: 1, title: 'Đêm chiếu sớm bom tấn', date: '25/05/2026', description: 'Ưu đãi đặc biệt cho vé sớm.' },
  { id: 2, title: 'Lễ hội phim châu Á', date: '02/06/2026', description: 'Rạp hát tràn ngập những bộ phim đình đám.' },
  { id: 3, title: 'Ngày hội thành viên G STAR', date: '10/06/2026', description: 'Quà tặng và giá vé ưu đãi dành cho thành viên.' }
]

function EventPage() {
  return (
    <main className="container page-content">
      <section className="page-hero">
        <h2>Sự Kiện</h2>
        <p>Thông tin sự kiện và ưu đãi mới nhất tại Galaxy Cinema.</p>
      </section>

      <div className="event-grid">
        {events.map((event) => (
          <article key={event.id} className="event-card">
            <h3>{event.title}</h3>
            <span>{event.date}</span>
            <p>{event.description}</p>
          </article>
        ))}
      </div>
    </main>
  )
}

export default EventPage

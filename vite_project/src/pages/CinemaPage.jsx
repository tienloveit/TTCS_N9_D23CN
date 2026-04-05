import './PageStyles.css'

const cinemas = [
  {
    id: 'nguyen-du',
    name: 'Galaxy Nguyễn Du',
    address: '116 Nguyễn Du, Q.1, TP.HCM',
    rooms: ['IMAX 2D', '4DX']
  },
  {
    id: 'quang-trung',
    name: 'Galaxy Quang Trung',
    address: '225 Quang Trung, Gò Vấp, TP.HCM',
    rooms: ['VIP 2D', '2D']
  },
  {
    id: 'center',
    name: 'Galaxy Center',
    address: '706 Lũy Bán Bích, Tân Phú, TP.HCM',
    rooms: ['IMAX 2D', '3D']
  }
]

function CinemaPage() {
  return (
    <main className="container page-content">
      <section className="page-hero">
        <h2>Rạp / Giá Vé</h2>
        <p>Khám phá hệ thống rạp Galaxy và giá vé ưu đãi từng phòng chiếu.</p>
      </section>

      <div className="cinema-grid">
        {cinemas.map((cinema) => (
          <article key={cinema.id} className="cinema-card">
            <h3>{cinema.name}</h3>
            <p>{cinema.address}</p>
            <div className="cinema-rooms">
              {cinema.rooms.map((room) => (
                <span key={room} className="cinema-room">{room}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}

export default CinemaPage

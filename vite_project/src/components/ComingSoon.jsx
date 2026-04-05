import './ComingSoon.css'

function ComingSoon({ items }) {
  return (
    <section className="coming-soon" id="coming-soon">
      <h2>Sắp chiếu</h2>
      <div className="coming-grid">
        {items.map((movie) => (
          <article key={movie.id} className="coming-card">
            <img src={movie.poster} alt={movie.title} />
            <div>
              <h3>{movie.title}</h3>
              <p>{movie.genre}</p>
              <p><strong>Ngày công chiếu:</strong> {movie.date}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default ComingSoon

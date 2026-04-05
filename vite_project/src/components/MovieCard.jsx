import './MovieCard.css'

function MovieCard({ movie, onBook, onDetail }) {
  const renderStars = (rating) => {
    const fullStars = Math.floor(rating / 2)
    const hasHalf = rating % 2 >= 1
    let stars = '★'.repeat(fullStars)
    if (hasHalf) stars += '☆'
    return stars
  }

  return (
    <article
      className="movie-card"
      aria-label={movie.title}
      role="button"
      tabIndex={0}
      onClick={() => onDetail(movie)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onDetail(movie)
        }
      }}
    >
      <div className="movie-card__image-wrapper">
        <img
          className="movie-card__poster"
          src={movie.poster}
          alt={movie.title}
          onError={(event) => {
            event.currentTarget.src = 'https://via.placeholder.com/360x500.png?text=Poster'
          }}
        />
        <div className="movie-card__overlay">
          <div className="movie-card__overlay-actions">
            <button
              className="movie-card__btn movie-card__btn--primary"
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onBook(movie)
              }}
            >
              <span className="movie-card__btn-icon">🎫</span>
              <span>Mua vé</span>
            </button>
            <button
              className="movie-card__btn movie-card__btn--secondary"
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                if (movie.trailerUrl) {
                  window.open(movie.trailerUrl, '_blank')
                } else {
                  alert('Trailer chưa có sẵn cho phim này.')
                }
              }}
            >
              <span className="movie-card__btn-icon">▶</span>
              <span>Trailer</span>
            </button>
          </div>
        </div>
        {movie.ageRating && <span className="movie-card__age-badge">{movie.ageRating}</span>}
      </div>
      <div className="movie-card__info">
        <h3>{movie.title}</h3>
        <div className="movie-card__rating">
          <span className="movie-card__stars">{renderStars(movie.rating)}</span>
          <span className="movie-card__score">{movie.rating}</span>
        </div>
        <div className="movie-card__actions">
          <button
            className="movie-card__detail-btn"
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onDetail(movie)
            }}
          >
            Xem chi tiết
          </button>
        </div>
      </div>
    </article>
  )
}

export default MovieCard

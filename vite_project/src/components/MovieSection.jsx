import MovieCard from './MovieCard'
import './MovieSection.css'

function MovieSection({ title, movies, onBook, onDetail }) {
  return (
    <section className="movie-section" id="now-showing">
      <h2>{title}</h2>
      <div className="movie-grid">
        {movies.length > 0 ? (
          movies.map((movie) => (
            <MovieCard
              onBook={onBook}
              onDetail={onDetail}
              key={movie.id}
              movie={movie}
            />
          ))
        ) : (
          <p className="movie-empty">Không tìm thấy phim.</p>
        )}
      </div>
    </section>
  )
}

export default MovieSection

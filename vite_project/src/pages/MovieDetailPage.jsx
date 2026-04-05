import { Link, useNavigate, useParams } from 'react-router-dom'
import { getMovieById } from '../data/movies'
import './MovieDetailPage.css'

function MovieDetailPage() {
  const { movieId } = useParams()
  const movie = getMovieById(movieId)
  const navigate = useNavigate()

  if (!movie) {
    return (
      <main className="container page-not-found">
        <h2>Phim không tìm thấy</h2>
        <p>Không có thông tin phim với mã {movieId}.</p>
        <Link to="/movies" className="movie-detail-back">
          Quay lại danh sách phim
        </Link>
      </main>
    )
  }

  return (
    <main className="container movie-detail-page">
      <div className="movie-detail-card">
        <div className="movie-detail-poster">
          <img src={movie.poster} alt={movie.title} />
        </div>
        <div className="movie-detail-info">
          <span className="movie-detail-category">Chi tiết phim</span>
          <h2>{movie.title}</h2>
          <div className="movie-detail-meta">
            <span>{movie.genre}</span>
            <span>{movie.format}</span>
            <span>{movie.ageRating}</span>
          </div>
          <p className="movie-detail-description">{movie.description}</p>
          <div className="movie-detail-specs">
            <div>
              <strong>Điểm:</strong> {movie.rating}
            </div>
            <div>
              <strong>Ngày chiếu:</strong> {movie.date}
            </div>
            <div>
              <strong>Thời lượng:</strong> {movie.duration} phút
            </div>
          </div>
          <div className="movie-detail-actions">
            <button className="btn btn-primary" onClick={() => navigate(`/booking/${movie.id}`)}>
              Đặt vé ngay
            </button>
            <Link to="/movies" className="btn btn-secondary">
              Quay lại phim
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default MovieDetailPage

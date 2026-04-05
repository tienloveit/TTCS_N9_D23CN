import { useNavigate } from 'react-router-dom'
import MovieFilters from '../components/MovieFilters'
import MovieSection from '../components/MovieSection'
import { movieData } from '../data/movies'

function MoviesPage() {
  const navigate = useNavigate()

  const handleBook = (movie) => navigate(`/booking/${movie.id}`)
  const handleDetail = (movie) => navigate(`/movie/${movie.id}`)

  return (
    <main className="container">
      <section className="page-hero">
        <h2>Phim đang chiếu</h2>
        <p>Xem danh sách phim hiện tại với lựa chọn định dạng, rạp và suất chiếu.</p>
      </section>

      <MovieFilters activeFilter="now-showing" onFilterChange={() => {}} />
      <MovieSection title="Bảng phim" movies={movieData} onBook={handleBook} onDetail={handleDetail} />
    </main>
  )
}

export default MoviesPage

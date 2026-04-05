import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getMovieById, movieData } from '../data/movies'
import './BookingPage.css'

const seatRows = ['A', 'B', 'C', 'D']
const seatCols = [1, 2, 3, 4, 5, 6]
const cities = ['TP Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'An Giang', 'Bà Rịa - Vũng Tàu', 'Bến Tre', 'Cà Mau']
const cinemas = ['Galaxy Nguyễn Du', 'Galaxy Quang Trung', 'Galaxy Center', 'Galaxy Tân Bình']
const steps = ['Chọn phim / Rạp / Suất', 'Chọn ghế', 'Chọn thực ăn', 'Thanh toán']

function BookingPage() {
  const { movieId } = useParams()
  const navigate = useNavigate()
  const [selectedCity, setSelectedCity] = useState('TP Hồ Chí Minh')
  const [selectedCinema, setSelectedCinema] = useState('Galaxy Nguyễn Du')
  const [selectedMovieId, setSelectedMovieId] = useState(movieId ? Number(movieId) : null)
  const [selectedShowtime, setSelectedShowtime] = useState('')
  const [selectedSeats, setSelectedSeats] = useState([])

  const movie = useMemo(
    () => (movieId ? getMovieById(movieId) : selectedMovieId ? getMovieById(selectedMovieId) : null),
    [movieId, selectedMovieId],
  )

  useEffect(() => {
    if (movie?.showtimes?.length) {
      setSelectedShowtime(movie.showtimes[0])
    }
  }, [movie])

  const seatOptions = useMemo(
    () => seatRows.flatMap((row) => seatCols.map((col) => `${row}${col}`)),
    [],
  )

  if (movieId && !movie) {
    return (
      <main className="container page-not-found">
        <h2>Phim không tìm thấy</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/booking')}>
          Quay lại đặt vé
        </button>
      </main>
    )
  }

  const toggleSeat = (seat) => {
    setSelectedSeats((prev) =>
      prev.includes(seat) ? prev.filter((item) => item !== seat) : [...prev, seat],
    )
  }

  const totalPrice = selectedSeats.length * 120

  return (
    <main className="container booking-page">
      <div className="booking-page__header">
        <div className="booking-page__steps">
          {steps.map((step, index) => (
            <div key={step} className={`booking-step ${index === 0 ? 'active' : ''}`}>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="booking-page__body">
        <div className="booking-page__main">
          <section className="booking-panel">
            <div className="panel-title">
              <h3>Chọn vị trí</h3>
            </div>
            <div className="location-grid">
              {cities.map((city) => (
                <button
                  key={city}
                  type="button"
                  className={`location-chip ${selectedCity === city ? 'selected' : ''}`}
                  onClick={() => setSelectedCity(city)}
                >
                  {city}
                </button>
              ))}
            </div>
            <div className="cinema-grid">
              {cinemas.map((cinema) => (
                <button
                  key={cinema}
                  type="button"
                  className={`cinema-chip ${selectedCinema === cinema ? 'selected' : ''}`}
                  onClick={() => setSelectedCinema(cinema)}
                >
                  {cinema}
                </button>
              ))}
            </div>
          </section>

          <section className="booking-panel">
            <div className="panel-title">
              <h3>Chọn phim</h3>
            </div>
            <div className="movie-select-grid">
              {movieData.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`movie-select-card ${selectedMovieId === item.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMovieId(item.id)}
                >
                  <img src={item.poster} alt={item.title} />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.genre}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="booking-panel">
            <div className="panel-title">
              <h3>Chọn suất</h3>
            </div>
            {movie ? (
              <div className="showtime-grid">
                {movie.showtimes.map((showtime) => (
                  <button
                    key={showtime}
                    type="button"
                    className={`showtime-chip ${selectedShowtime === showtime ? 'selected' : ''}`}
                    onClick={() => setSelectedShowtime(showtime)}
                  >
                    {showtime}
                  </button>
                ))}
              </div>
            ) : (
              <p className="booking-hint">Chọn phim để xem suất chiếu khả dụng.</p>
            )}
          </section>
        </div>

        <aside className="booking-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-card__visual">
              {movie ? (
                <img src={movie.poster} alt={movie.title} />
              ) : (
                <div className="sidebar-placeholder">Chưa chọn phim</div>
              )}
            </div>
            <div className="sidebar-card__content">
              <h3>{movie ? movie.title : 'Chọn phim của bạn'}</h3>
              <p>{movie ? `${movie.genre} • ${movie.format}` : 'Chọn một phim để xem chi tiết nhanh.'}</p>
              {movie && <p>{movie.ageRating} • {movie.duration} phút</p>}
              <div className="sidebar-summary">
                <div>
                  <span>Rạp</span>
                  <strong>{selectedCinema}</strong>
                </div>
                <div>
                  <span>Suất</span>
                  <strong>{selectedShowtime || '-'}</strong>
                </div>
                <div>
                  <span>Ghế</span>
                  <strong>{selectedSeats.length} ghế</strong>
                </div>
              </div>
              <div className="sidebar-total">
                <span>Tổng cộng</span>
                <strong>{totalPrice.toLocaleString()} ₫</strong>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!movie || !selectedShowtime || selectedSeats.length === 0}
                onClick={() => alert('Tiếp tục sang thanh toán')}
              >
                Tiếp tục
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(movie ? `/movie/${movie.id}` : '/movies')}
              >
                {movie ? 'Xem chi tiết phim' : 'Xem danh sách phim'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

export default BookingPage

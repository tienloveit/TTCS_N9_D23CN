import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import InteractiveHero from '../components/InteractiveHero'
import Promotions from '../components/Promotions'
import About from '../components/About'
import Footer from '../components/Footer'
import './HomePage.css'

const movieData = [
  {
    id: 1,
    title: 'Phi Vụ Cuối Cùng',
    genre: 'Hành động, Gangster',
    rating: 8.6,
    showtimes: ['13:00', '16:30', '19:00', '21:30'],
    poster: 'https://images.unsplash.com/photo-1499084732479-de2c02d45fcc?auto=format&fit=crop&w=700&q=80'
  },
  {
    id: 2,
    title: 'Super Mario Thiên Hà',
    genre: 'Hoạt hình, Gia đình',
    rating: 7.8,
    showtimes: ['10:30', '13:00', '15:30', '18:00'],
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=700&q=80'
  },
  {
    id: 3,
    title: 'Song Hỷ Lầm Nguy',
    genre: 'Tình cảm, Hài',
    rating: 8.7,
    showtimes: ['14:00', '17:00', '19:45', '22:00'],
    poster: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=700&q=80'
  },
  {
    id: 4,
    title: 'Hẹn Em Ngày Nhật Thực',
    genre: 'Tình cảm, Kịch',
    rating: 8.7,
    showtimes: ['12:30', '15:30', '18:30', '21:00'],
    poster: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=700&q=80'
  },
  {
    id: 5,
    title: 'Ánh Dương Của Mẹ',
    genre: 'Gia đình, Cảm động',
    rating: 7.8,
    showtimes: ['11:00', '13:30', '16:00', '18:30'],
    poster: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80'
  },
  {
    id: 6,
    title: 'Mặt Nạ Da Người',
    genre: 'Kinh dị',
    rating: 7.8,
    showtimes: ['19:00', '21:45'],
    poster: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80'
  },
  {
    id: 7,
    title: 'Project Y: Gái Ngoan Đổi Đời',
    genre: 'Hồi hộp',
    rating: 7.8,
    showtimes: ['13:30', '16:30', '19:30', '22:00'],
    poster: 'https://images.unsplash.com/photo-1490367532201-b9bc1dc483f6?auto=format&fit=crop&w=700&q=80'
  },
  {
    id: 8,
    title: 'Tứ Hổ Đại Náo',
    genre: 'Hành động, Hài',
    rating: 8.2,
    showtimes: ['14:30', '17:00', '19:30', '22:15'],
    poster: 'https://images.unsplash.com/photo-1512600654606-5a2c16b26474?auto=format&fit=crop&w=700&q=80'
  }
]

const comingSoonData = [
  { id: 5, title: 'Ngôi sao băng giá', date: '2026-04-25', genre: 'Phiêu lưu', poster: 'https://images.unsplash.com/photo-1464703243779-dda0d97eeced?auto=format&fit=crop&w=700&q=80' },
  { id: 6, title: 'Chiến binh Sao Hỏa', date: '2026-05-03', genre: 'Hành động', poster: 'https://images.unsplash.com/photo-1518481615624-2c81f10c8dbb?auto=format&fit=crop&w=700&q=80' },
  { id: 7, title: 'Cuộc chiến thiên hà', date: '2026-05-10', genre: 'Khoa học viễn tưởng', poster: 'https://images.unsplash.com/photo-1511715281219-7af17b0cdeac?auto=format&fit=crop&w=700&q=80' }
]

const reviewItems = [
  { id: 1, title: '[Review] Hẹn Em Ngày Nhật Thực', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80', likes: 84, views: 532 },
  { id: 2, title: '[Review] Quỷ Nhập Tràng 2: Gấp Đôi Kinh Dị!', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=700&q=80', likes: 110, views: 1024 },
  { id: 3, title: 'Tài: Mai Tài Phến Sẽ Trở Thành Ngôi Sao Hành Động Mới', image: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=700&q=80', likes: 66, views: 771 }
]

function HomePage() {
  const navigate = useNavigate()
  const [movieTab, setMovieTab] = useState('now-showing')

  const homeTabMovies = useMemo(() => {
    switch (movieTab) {
      case 'coming-soon':
        return comingSoonData
      case 'imax':
        return movieData.filter((movie) => movie.format.toLowerCase().includes('imax'))
      case 'nationwide':
        return movieData
      default:
        return movieData
    }
  }, [movieTab])

  const handleBook = (movie) => {
    navigate(`/booking/${movie.id}`)
  }

  return (
    <div className="homepage">
      <InteractiveHero />

      <main className="container homepage-container">
        <section className="movie-home-bottom">
          <div className="movie-home-header">
            <span className="movie-home-label">PHIM</span>
            <div className="movie-home-tabs">
              {[
                { id: 'now-showing', label: 'Đang chiếu' },
                { id: 'coming-soon', label: 'Sắp chiếu' },
                { id: 'imax', label: 'Phim IMAX' },
                { id: 'nationwide', label: 'Toàn quốc' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`movie-home-tab ${movieTab === tab.id ? 'active' : ''}`}
                  onClick={() => setMovieTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="movie-home-grid">
            {homeTabMovies.map((movie) => (
              <article key={movie.id} className="movie-home-card">
                <div className="movie-home-card-media">
                  <img src={movie.poster} alt={movie.title} />
                  <div className="movie-home-card-overlay">
                    <button
                      type="button"
                      className="movie-home-card-overlay-btn movie-home-book-button"
                      onClick={() => handleBook(movie)}
                    >
                      <span>🎫</span>
                      Mua vé
                    </button>
                    <button
                      type="button"
                      className="movie-home-card-overlay-btn movie-home-trailer-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        if (movie.trailerUrl) {
                          window.open(movie.trailerUrl, '_blank')
                        } else {
                          alert('Trailer chưa có sẵn cho phim này.')
                        }
                      }}
                    >
                      <span>▶</span>
                      Trailer
                    </button>
                  </div>
                </div>
                <div className="movie-home-card-body">
                  <h3>{movie.title}</h3>
                  <div className="movie-home-card-footer">
                    <p>{movie.genre}</p>
                    <span className="movie-home-rating">{movie.rating}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="movie-home-more">
            <button className="movie-home-more-button">Xem thêm</button>
          </div>
        </section>

        <section className="homepage-review">
          <div className="homepage-section-header">
            <span className="section-label">GÓC ĐIỆN ẢNH</span>
            <div className="section-tabs">
              <button className="section-tab active">Bình luận phim</button>
              <button className="section-tab">Blog điện ảnh</button>
            </div>
          </div>

          <div className="review-layout">
            <article className="review-feature">
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80" alt="Review featured" />
              <div className="review-feature-content">
                <span className="review-feature-tag">Bình luận phim</span>
                <h3>[Review] Anh Dương Của Mẹ - Khúc ca cảm xúc của màn ảnh Việt</h3>
                <p>Khám phá góc nhìn sâu sắc về bộ phim đình đám, từ diễn xuất đến thông điệp gia đình đầy ấm áp.</p>
              </div>
            </article>

            <div className="review-list">
              {reviewItems.map((item) => (
                <article key={item.id} className="review-item">
                  <img src={item.image} alt={item.title} />
                  <div className="review-item-body">
                    <h4>{item.title}</h4>
                    <div className="review-meta">
                      <span>👍 {item.likes}</span>
                      <span>👀 {item.views}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <Promotions />
        <About />
      </main>

      <Footer />
    </div>
  )
}

export default HomePage

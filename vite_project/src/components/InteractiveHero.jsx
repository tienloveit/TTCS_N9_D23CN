import './Hero.css'
import { useState } from 'react'

function InteractiveHero() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [selectedMovie, setSelectedMovie] = useState('Chọn Phim')
  const [selectedCinema, setSelectedCinema] = useState('Chọn Rạp')
  const [selectedDate, setSelectedDate] = useState('Chọn Ngày')
  const [selectedTime, setSelectedTime] = useState('Chọn Suất')

  const slides = [
    {
      title: 'Galaxy Nguyễn Du',
      subtitle: 'Tặng Bắp + Refill + Vé xem phim',
      image: 'https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=1920&q=80'
    },
    {
      title: 'Sự kiện phim bom tấn',
      subtitle: 'Ưu đãi đặc biệt cho thành viên G STAR',
      image: 'https://images.unsplash.com/photo-1499084732479-de2c02d45fcc?auto=format&fit=crop&w=1920&q=80'
    }
  ]

  const movieOptions = ['Vùng Đất Luân Hồi', 'Project Y: Gái Ngoan Đổi Đời', 'Hẹn Em Ngày Nhật Thực', 'Kung Fu Quải Chưởng']
  const cinemaOptions = ['Galaxy Nguyễn Du', 'Galaxy Quang Trung', 'Galaxy Center']
  const dateOptions = ['Hôm nay', 'Ngày mai', '28/05/2026', '29/05/2026']
  const timeOptions = ['13:00', '15:30', '18:30', '21:00']

  return (
    <section className="galaxy-hero" id="home">
      <div
        className="galaxy-hero__slide"
        style={{ backgroundImage: `url(${slides[currentSlide].image})` }}
      >
        <div className="galaxy-hero__overlay" />
        <div className="galaxy-hero__content">
          <div className="galaxy-hero__top-line">Galaxy Cinema</div>
          <h1>{slides[currentSlide].title}</h1>
          <p>{slides[currentSlide].subtitle}</p>
        </div>

        <div className="galaxy-hero__promos">
          <div className="galaxy-hero__promo-card">
            <span>TĂNG BẮP</span>
            <strong>Tùy vị</strong>
          </div>
          <div className="galaxy-hero__promo-card">
            <span>TĂNG REFILL</span>
            <strong>Bắp nước</strong>
          </div>
          <div className="galaxy-hero__promo-card">
            <span>TĂNG VÉ</span>
            <strong>Xem phim</strong>
          </div>
        </div>

        <div className="galaxy-hero__booking-bar">
          <div className="hero-step hero-step--select">
            <span className="hero-step__number">1</span>
            <select value={selectedMovie} onChange={(e) => setSelectedMovie(e.target.value)}>
              <option disabled>Chọn Phim</option>
              {movieOptions.map((movie) => (
                <option key={movie} value={movie}>{movie}</option>
              ))}
            </select>
          </div>
          <div className="hero-step hero-step--select">
            <span className="hero-step__number">2</span>
            <select value={selectedCinema} onChange={(e) => setSelectedCinema(e.target.value)}>
              <option disabled>Chọn Rạp</option>
              {cinemaOptions.map((cinema) => (
                <option key={cinema} value={cinema}>{cinema}</option>
              ))}
            </select>
          </div>
          <div className="hero-step hero-step--select">
            <span className="hero-step__number">3</span>
            <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
              <option disabled>Chọn Ngày</option>
              {dateOptions.map((date) => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>
          <div className="hero-step hero-step--select">
            <span className="hero-step__number">4</span>
            <select value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}>
              <option disabled>Chọn Suất</option>
              {timeOptions.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
          <button className="hero-step__button">Mua vé nhanh</button>
        </div>

        <button
          className="galaxy-hero__arrow galaxy-hero__arrow--left"
          onClick={() => setCurrentSlide((currentSlide - 1 + slides.length) % slides.length)}
          aria-label="Previous slide"
        >
          ❮
        </button>
        <button
          className="galaxy-hero__arrow galaxy-hero__arrow--right"
          onClick={() => setCurrentSlide((currentSlide + 1) % slides.length)}
          aria-label="Next slide"
        >
          ❯
        </button>
      </div>
    </section>
  )
}

export default InteractiveHero

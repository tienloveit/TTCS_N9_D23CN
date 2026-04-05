import './BookingSteps.css'

function BookingSteps() {
  const steps = [
    { number: 1, label: 'Chọn Phim' },
    { number: 2, label: 'Chọn Rạp' },
    { number: 3, label: 'Chọn Ngày' },
    { number: 4, label: 'Chọn Suất' }
  ]

  return (
    <section className="booking-steps">
      <div className="booking-steps__container">
        {steps.map((step, index) => (
          <div key={step.number} className="booking-steps__item">
            <div className="booking-steps__circle">{step.number}</div>
            <div className="booking-steps__label">{step.label}</div>
            {index < steps.length - 1 && <div className="booking-steps__line"></div>}
          </div>
        ))}
        <button className="booking-steps__btn">Mua vé nhanh</button>
      </div>
    </section>
  )
}

export default BookingSteps

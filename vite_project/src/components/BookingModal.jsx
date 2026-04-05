import SeatMap from './SeatMap'
import './BookingModal.css'

function BookingModal({
  movie,
  cinemas,
  selectedCinema,
  selectedRoom,
  selectedShowtime,
  selectedSeats,
  onCinemaChange,
  onRoomChange,
  onShowtimeChange,
  onToggleSeat,
  onClose,
  onConfirm,
  seatPrice
}) {
  const cinema = cinemas.find((c) => c.id === selectedCinema)
  const room = cinema?.rooms.find((r) => r.id === selectedRoom)
  const showtimes = room?.showtimes || []

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Đặt vé">
      <div className="modal-card">
        <button className="modal-close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
        <h3>Đặt vé: {movie.title}</h3>
        <p>{movie.genre} • {movie.duration} phút • {movie.format} • {movie.audio}</p>

        <div className="booking-info">
          <label>
            Rạp
            <select value={selectedCinema} onChange={(e) => onCinemaChange(e.target.value)}>
              {cinemas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label>
            Phòng
            <select value={selectedRoom} onChange={(e) => onRoomChange(e.target.value)}>
              {cinema?.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>

          <label>
            Suất chiếu
            <select value={selectedShowtime} onChange={(e) => onShowtimeChange(e.target.value)}>
              {showtimes.map((time) => <option key={time} value={time}>{time}</option>)}
            </select>
          </label>

          <p className="seat-summary">
            Ghế đã chọn: {selectedSeats.length === 0 ? 'Chưa chọn' : selectedSeats.join(', ')}
          </p>
          <p className="seat-summary">
            Tổng tiền: {selectedSeats.length * seatPrice}.000₫
          </p>
        </div>

        <SeatMap reservedSeats={movie.reservedSeats} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} />

        <button className="btn btn--confirm" onClick={() => onConfirm()}>
          Xác nhận đặt vé
        </button>
      </div>
    </div>
  )
}

export default BookingModal

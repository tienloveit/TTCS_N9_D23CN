import './SeatMap.css'

function SeatMap({ reservedSeats = [], selectedSeats = [], onToggleSeat }) {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
  const columns = Array.from({ length: 12 }, (_, i) => i + 1)

  const isReserved = (seat) => reservedSeats.includes(seat)
  const isSelected = (seat) => selectedSeats.includes(seat)

  return (
    <div className="seatmap">
      <div className="seatmap-grid">
        {rows.map((row) => (
          <div key={row} className="seatmap-row">
            <span className="seat-label">{row}</span>
            {columns.map((col) => {
              const seatId = `${row}${col}`
              const booked = isReserved(seatId)
              const selected = isSelected(seatId)
              return (
                <button
                  key={seatId}
                  className={`seat ${booked ? 'booked' : selected ? 'selected' : 'available'}`}
                  disabled={booked}
                  onClick={() => onToggleSeat(seatId)}
                  aria-label={`Ghế ${seatId} ${booked ? 'đã đặt' : selected ? 'đã chọn' : 'còn trống'}`}
                >
                  {col}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <div className="seatmap-legend">
        <span><span className="legend-dot available"></span>Còn trống</span>
        <span><span className="legend-dot selected"></span>Đã chọn</span>
        <span><span className="legend-dot booked"></span>Đã bán</span>
      </div>
    </div>
  )
}

export default SeatMap

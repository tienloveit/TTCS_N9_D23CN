import { StaffState } from '../StaffUI';
import { ClockIcon } from '../../../components/Common/CinemaIcons';
import { formatCurrency, formatTime } from './staffBookingUtils';

/** Bước 2: sơ đồ ghế của suất đã chọn. */
export default function StaffSeatStep({
  getSeatClass,
  loadingTickets,
  seatMapStats,
  selectedSeats,
  setCurrentStep,
  setLoadingTickets,
  setSelectedFoods,
  setSelectedSeats,
  setShowtimeId,
  setTicketAttempt,
  setTicketError,
  showtimeId,
  siblingShowtimes,
  sortedRows,
  ticketError,
  toggleSeat,
}) {
  return (
    <>
      {siblingShowtimes.length > 1 && (
        <div className="showtime-switcher" style={{ marginBottom: 0 }}>
          <div className="showtime-switcher-label">
            <ClockIcon className="inline-icon" />
            Đổi giờ chiếu cùng ngày:
          </div>
          <div className="showtime-switcher-list">
            {siblingShowtimes.map((st) => (
              <button
                key={st.showtimeId}
                type="button"
                className={`showtime-switcher-btn ${
                  String(st.showtimeId) === String(showtimeId)
                    ? 'showtime-switcher-btn--active'
                    : ''
                }`}
                onClick={() => {
                  if (String(st.showtimeId) !== String(showtimeId)) {
                    setSelectedSeats([]);
                    setSelectedFoods({});
                    setShowtimeId(String(st.showtimeId));
                    setCurrentStep('SEATS');
                  }
                }}
              >
                {formatTime(st.startTime)} ({st.roomName})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pos-seat-card">
        <div className="pos-seat-toolbar">
          <div className="pos-seat-stats">
            <span className="pos-seat-stat-pill">
              Trống:{' '}
              <strong style={{ color: 'var(--seat-available)' }}>
                {seatMapStats.available}
              </strong>
            </span>
            <span className="pos-seat-stat-pill">
              Đang chọn:{' '}
              <strong style={{ color: 'var(--seat-selected)' }}>
                {selectedSeats.length}
              </strong>
            </span>
            <span className="pos-seat-stat-pill">
              Đang giữ:{' '}
              <strong style={{ color: 'var(--seat-holding)' }}>
                {seatMapStats.holding}
              </strong>
            </span>
            <span className="pos-seat-stat-pill">
              Đã bán:{' '}
              <strong style={{ color: 'var(--seat-booked)' }}>
                {seatMapStats.booked}
              </strong>
            </span>
          </div>

          {selectedSeats.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              onClick={() => setSelectedSeats([])}
            >
              Bỏ chọn tất cả ({selectedSeats.length})
            </button>
          )}
        </div>

        {ticketError ? (
          <StaffState title={ticketError} error onRetry={() => {
            setTicketError('');
            setLoadingTickets(true);
            setTicketAttempt((attempt) => attempt + 1);
          }} />
        ) : loadingTickets ? (
          <div className="loading">
            <div className="spinner" />
          </div>
        ) : (
          <>
            <div className="pos-screen-stage">
              <div className="pos-screen-arc" />
              <span className="pos-screen-label">Màn hình chiếu</span>
            </div>

            <p className="pos-seat-scroll-hint">Vuốt ngang để xem các ghế còn lại.</p>
            <div className="seat-map-wrapper" role="region" aria-label="Sơ đồ ghế" tabIndex={0}>
              <div className="seat-map" style={{ padding: '12px 16px 24px' }}>
                {sortedRows.map(([row, seats]) => (
                  <div key={row} className="seat-row">
                    <span className="seat-row-label">{row}</span>
                    {seats.map((ticket) => {
                      const status = ticket.displayStatus || ticket.ticketStatus;
                      const isAvailable = status === 'AVAILABLE';
                      const isSelected = selectedSeats.includes(ticket.seatId);
                      return (
                        <button
                          key={ticket.id || ticket.seatId}
                          type="button"
                          disabled={!isAvailable}
                          aria-pressed={isSelected}
                          aria-label={'Ghế ' + ticket.seatCode}
                          className={getSeatClass(ticket)}
                          onClick={() => toggleSeat(ticket)}
                          title={`${ticket.seatCode}${ticket.seatType ? ` (${ticket.seatType})` : ''} • ${formatCurrency(ticket.price)} (${
                            ticket.displayStatus || ticket.ticketStatus
                          })`}
                        >
                          {ticket.seatNumber || ''}
                        </button>
                      );
                    })}
                    <span className="seat-row-label">{row}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="seat-legend">
              <div className="seat-legend-item">
                <div
                  className="seat-legend-dot"
                  style={{
                    background: 'rgba(16,185,129,0.15)',
                    borderColor: 'var(--seat-available)',
                  }}
                />
                Ghế thường
              </div>
              <div className="seat-legend-item">
                <div className="seat-legend-dot seat-legend-dot--vip" />
                Ghế VIP
              </div>
              <div className="seat-legend-item">
                <div className="seat-legend-dot seat-legend-dot--couple" />
                Ghế đôi
              </div>
              <div className="seat-legend-item">
                <div
                  className="seat-legend-dot"
                  style={{
                    background: 'rgba(59,130,246,0.3)',
                    borderColor: 'var(--seat-selected)',
                  }}
                />
                Đang chọn
              </div>
              <div className="seat-legend-item">
                <div
                  className="seat-legend-dot"
                  style={{
                    background: 'rgba(245,158,11,0.15)',
                    borderColor: 'var(--seat-holding)',
                  }}
                />
                Khách khác đang giữ
              </div>
              <div className="seat-legend-item">
                <div
                  className="seat-legend-dot"
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    borderColor: 'var(--seat-booked)',
                  }}
                />
                Đã đặt
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

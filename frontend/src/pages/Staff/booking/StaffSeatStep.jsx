import Button from '../../../components/Common/Button';
import { ClockIcon } from '../../../components/Common/CinemaIcons';
import { StaffState } from '../StaffUI';
import { formatCurrency, formatTime } from './staffBookingUtils';

const SEAT_TYPE = { STANDARD: 'ghế thường', VIP: 'ghế VIP', COUPLE: 'ghế đôi' };
const SEAT_STATUS = { AVAILABLE: 'trống', HOLDING: 'đang được giữ', BOOKED: 'đã bán' };
const LEGEND = [
  ['', 'Ghế thường'],
  ['vip', 'Ghế VIP'],
  ['couple', 'Ghế đôi'],
  ['selected', 'Đang chọn'],
  ['holding', 'Khách khác đang giữ'],
  ['booked', 'Đã đặt'],
];

const seatLabel = (ticket, status) => [
  'Ghế ' + ticket.seatCode,
  SEAT_TYPE[ticket.seatType],
  formatCurrency(ticket.price),
  SEAT_STATUS[status] || status,
].filter(Boolean).join(', ');

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
  const stats = [
    ['available', 'Trống', seatMapStats.available],
    ['selected', 'Đang chọn', selectedSeats.length],
    ['holding', 'Đang giữ', seatMapStats.holding],
    ['booked', 'Đã bán', seatMapStats.booked],
  ];

  return (
    <>
      {siblingShowtimes.length > 1 && (
        <div className="showtime-switcher pos-showtime-switcher">
          <div className="showtime-switcher-label">
            <ClockIcon className="inline-icon" aria-hidden="true" />
            Đổi giờ chiếu cùng ngày:
          </div>
          <div className="showtime-switcher-list">
            {siblingShowtimes.map((st) => {
              const active = String(st.showtimeId) === String(showtimeId);
              return (
                <button
                  key={st.showtimeId}
                  type="button"
                  aria-pressed={active}
                  className={`showtime-switcher-btn ${active ? 'showtime-switcher-btn--active' : ''}`}
                  onClick={() => {
                    if (active) return;
                    setSelectedSeats([]);
                    setSelectedFoods({});
                    setShowtimeId(String(st.showtimeId));
                    setCurrentStep('SEATS');
                  }}
                >
                  {formatTime(st.startTime)} ({st.roomName})
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="pos-seat-card">
        <div className="pos-seat-toolbar">
          <div className="pos-seat-stats">
            {stats.map(([key, label, value]) => (
              <span key={key} className={`pos-seat-stat-pill pos-seat-stat-pill--${key}`}>
                {label}: <strong>{value}</strong>
              </span>
            ))}
          </div>

          {selectedSeats.length > 0 && (
            <Button size="sm" onClick={() => setSelectedSeats([])}>
              Bỏ chọn tất cả ({selectedSeats.length})
            </Button>
          )}
        </div>

        {ticketError ? (
          <StaffState title={ticketError} error onRetry={() => {
            setTicketError('');
            setLoadingTickets(true);
            setTicketAttempt((attempt) => attempt + 1);
          }} />
        ) : loadingTickets ? (
          <div className="loading" role="status" aria-label="Đang tải sơ đồ ghế">
            <div className="spinner" />
          </div>
        ) : (
          <>
            <div className="pos-screen-stage" aria-hidden="true">
              <div className="pos-screen-arc" />
              <span className="pos-screen-label">Màn hình chiếu</span>
            </div>

            <p className="pos-seat-scroll-hint">Vuốt ngang để xem các ghế còn lại.</p>
            <div className="seat-map-wrapper" role="region" aria-label="Sơ đồ ghế" tabIndex={0}>
              <div className="seat-map pos-seat-map">
                {sortedRows.map(([row, seats]) => (
                  <div key={row} className="seat-row">
                    <span className="seat-row-label" aria-hidden="true">{row}</span>
                    {seats.map((ticket) => {
                      const status = ticket.displayStatus || ticket.ticketStatus;
                      const label = seatLabel(ticket, status);
                      return (
                        <button
                          key={ticket.id || ticket.seatId}
                          type="button"
                          disabled={status !== 'AVAILABLE'}
                          aria-pressed={selectedSeats.includes(ticket.seatId)}
                          aria-label={label}
                          title={label}
                          className={getSeatClass(ticket)}
                          onClick={() => toggleSeat(ticket)}
                        >
                          {ticket.seatNumber || ''}
                        </button>
                      );
                    })}
                    <span className="seat-row-label" aria-hidden="true">{row}</span>
                  </div>
                ))}
              </div>
            </div>

            <ul className="seat-legend" aria-label="Chú thích sơ đồ ghế">
              {LEGEND.map(([tone, label]) => (
                <li key={label} className="seat-legend-item">
                  <span className={'seat-legend-dot' + (tone ? ` seat-legend-dot--${tone}` : '')} aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

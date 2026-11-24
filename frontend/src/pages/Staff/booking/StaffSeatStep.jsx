import { OpsButton, StateBlock } from '../../../components/Ops';
import { formatScreening } from '../../../utils/cinemaFormats';
import { parseLocalDateTime } from '../../../utils/cinemaTime';
import useNow from '../../../utils/useNow';
import StaffAddonsStep from './StaffAddonsStep';
import { formatCurrency, formatStartsIn, formatTime } from './staffBookingUtils';

const SEAT_TYPE = { STANDARD: 'ghế thường', VIP: 'ghế VIP', COUPLE: 'ghế đôi' };
const SEAT_STATUS = { AVAILABLE: 'trống', HOLDING: 'khách khác đang giữ', BOOKED: 'đã bán' };
const TIER_LEGEND = [
  ['STANDARD', '', 'Thường'],
  ['VIP', 'vip', 'VIP'],
  ['COUPLE', 'couple', 'Ghế đôi'],
];
const STATE_LEGEND = [
  ['selected', 'Đang chọn'],
  ['holding', 'Khách khác đang giữ'],
  ['booked', 'Đã bán'],
];

const seatLabel = (ticket, status, selected) => [
  'Ghế ' + ticket.seatCode,
  SEAT_TYPE[ticket.seatType],
  formatCurrency(ticket.price),
  selected ? 'đang chọn' : SEAT_STATUS[status] || status,
].filter(Boolean).join(', ');

/** Bước 2: sơ đồ ghế và bắp nước của suất đã chọn, chuyển qua lại bằng hai tab. */
export default function StaffSeatStep({
  addonsProps,
  getSeatClass,
  loadingTickets,
  onChangeShowtime,
  onQuickPick,
  onRetryTickets,
  onSwitchShowtime,
  quickCount,
  seatMapStats,
  seatPrices,
  seatTab,
  selectedSeats,
  selectedShowtime,
  setQuickCount,
  setSelectedSeats,
  showtimeId,
  siblingShowtimes,
  sortedRows,
  ticketError,
  toggleSeat,
}) {
  const now = useNow(30_000);
  const start = parseLocalDateTime(selectedShowtime?.startTime);
  const details = selectedShowtime && [
    selectedShowtime.roomName || 'Phòng chiếu',
    formatScreening(selectedShowtime.screeningFormat, selectedShowtime.roomTechnology),
    selectedShowtime.ageRating,
    start && formatStartsIn(start.getTime(), now).replace(/^còn/, 'Bắt đầu sau'),
  ].filter(Boolean);
  const maxQuick = Math.max(1, seatMapStats.available);

  return (
    <>
      <section className="o-counter-card o-counter-showtime-bar" aria-label="Suất đang bán">
        <div className="o-counter-showtime-info">
          <strong>{selectedShowtime?.movieName || 'Suất chiếu'}</strong>
          {details && <ul className="o-seat-details">{details.map(detail => <li key={detail}>{detail}</li>)}</ul>}
        </div>
        {siblingShowtimes.length > 1 && (
          <div className="o-counter-times" role="group" aria-label="Đổi giờ cùng phim, cùng ngày">
            <span>Đổi giờ</span>
            {siblingShowtimes.map((showtime) => {
              const active = String(showtime.showtimeId) === String(showtimeId);
              return (
                <button key={showtime.showtimeId} type="button" aria-pressed={active}
                  onClick={() => { if (!active) onSwitchShowtime(showtime); }}>
                  {formatTime(showtime.startTime)}
                </button>
              );
            })}
          </div>
        )}
        <button type="button" className="o-counter-link-button" onClick={onChangeShowtime}>Đổi suất khác</button>
      </section>

      {seatTab === 'food' ? <StaffAddonsStep {...addonsProps} /> : (
        <section className="o-counter-card o-counter-seat-card" aria-label="Sơ đồ ghế">
          <div className="o-counter-seat-toolbar">
            <div className="o-counter-seat-stats">
              <span>Trống <strong>{seatMapStats.available - selectedSeats.length}</strong></span>
              <span className="o-counter-stat--selected">Đang chọn <strong>{selectedSeats.length}</strong></span>
              <span className="o-counter-stat--holding">Đang giữ <strong>{seatMapStats.holding}</strong></span>
              <span>Đã bán <strong>{seatMapStats.booked}</strong></span>
            </div>
            <div className="o-counter-quick" role="group" aria-label="Chọn nhanh ghế liền nhau">
              <span>Chọn nhanh</span>
              <button type="button" aria-label="Giảm số ghế chọn nhanh" disabled={quickCount <= 1}
                onClick={() => setQuickCount(Math.max(1, quickCount - 1))}>−</button>
              <output aria-live="polite">{quickCount}</output>
              <button type="button" aria-label="Tăng số ghế chọn nhanh" disabled={quickCount >= maxQuick}
                onClick={() => setQuickCount(Math.min(maxQuick, quickCount + 1))}>+</button>
              <button type="button" className="o-counter-quick-apply" disabled={loadingTickets || Boolean(ticketError)}
                onClick={onQuickPick}>Gợi ý ghế liền nhau</button>
            </div>
            {selectedSeats.length > 0 && (
              <OpsButton size="sm" variant="ghost" onClick={() => setSelectedSeats([])}>Bỏ chọn tất cả</OpsButton>
            )}
          </div>

          {ticketError ? (
            <StateBlock title={ticketError} state="error" onRetry={onRetryTickets} />
          ) : loadingTickets ? (
            <StateBlock state="loading" title="Đang tải sơ đồ ghế" />
          ) : (
            <>
              <div className="o-counter-screen" aria-hidden="true"><span /><small>Màn hình</small></div>
              <div className="o-counter-seatmap" role="region" aria-label="Các hàng ghế" tabIndex={0}>
                <div className="o-counter-seatmap-rows">
                  {sortedRows.map(([row, seats]) => (
                    <div key={row} className="o-counter-seat-row">
                      <span className="o-counter-row-label" aria-hidden="true">{row}</span>
                      {seats.map((ticket) => {
                        const status = ticket.displayStatus || ticket.ticketStatus;
                        const selected = selectedSeats.includes(ticket.seatId);
                        const label = seatLabel(ticket, status, selected);
                        return (
                          <button
                            key={ticket.id || ticket.seatId}
                            type="button"
                            disabled={status !== 'AVAILABLE'}
                            aria-pressed={selected}
                            aria-label={label}
                            title={label}
                            className={getSeatClass(ticket) + (ticket.seatType === 'COUPLE' ? ' o-counter-seat--couple' : '')}
                            onClick={() => toggleSeat(ticket)}
                          >
                            {ticket.seatNumber || ''}
                          </button>
                        );
                      })}
                      <span className="o-counter-row-label" aria-hidden="true">{row}</span>
                    </div>
                  ))}
                </div>
              </div>

              <ul className="o-counter-legend" aria-label="Chú thích sơ đồ ghế">
                {TIER_LEGEND.filter(([type]) => seatPrices[type] != null).map(([type, tone, label]) => (
                  <li key={type}>
                    <span className={'seat-legend-dot' + (tone ? ` seat-legend-dot--${tone}` : '')} aria-hidden="true" />
                    {label} {formatCurrency(seatPrices[type])}
                  </li>
                ))}
                {STATE_LEGEND.map(([tone, label]) => (
                  <li key={tone}>
                    <span className={`seat-legend-dot seat-legend-dot--${tone}`} aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </>
  );
}

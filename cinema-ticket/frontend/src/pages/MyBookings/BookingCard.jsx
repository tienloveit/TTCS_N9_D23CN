import SafeImage from '../../components/Common/SafeImage';
import { QrCodeIcon } from '../../components/Common/CinemaIcons';
import {
  PHASE_META,
  formatCountdown,
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatShowDate,
  formatTime,
  getBookingPhase,
  getRefundDeadline,
  getShowEnd,
  getShowStart,
  isFullyCheckedIn,
  parseLocalDateTime,
} from './bookingFormat';

const getSeats = (booking) => {
  if (booking.seatCodes?.length) return booking.seatCodes;
  return (booking.tickets || []).map((t) => t.seatCode).filter(Boolean);
};

function StubHint({ phase, booking, now }) {
  const start = getShowStart(booking);
  const checkedIn = isFullyCheckedIn(booking);

  if (phase === 'pending') {
    const expiresAt = parseLocalDateTime(booking.expiresAt);
    if (!expiresAt) return <p className="mt-stub-hint">Chưa thanh toán</p>;
    const left = expiresAt.getTime() - now;
    return left > 0 ? (
      <p className="mt-stub-hint mt-text--amber">
        Giữ ghế còn <strong className="mt-mono">{formatCountdown(left)}</strong>
      </p>
    ) : (
      <p className="mt-stub-hint mt-text--red">Đã hết thời gian giữ ghế</p>
    );
  }

  if (phase === 'upcoming') {
    if (checkedIn) return <p className="mt-stub-hint mt-text--green">Đã check-in</p>;
    if (start && start.getTime() > now) {
      return <p className="mt-stub-hint">Chiếu sau <strong>{formatDuration(start.getTime() - now)}</strong></p>;
    }
    return <p className="mt-stub-hint mt-text--green">Đang chiếu</p>;
  }

  const text = {
    watched: checkedIn ? 'Vé đã được sử dụng' : 'Suất chiếu đã kết thúc',
    refund_requested: 'Đang chờ rạp duyệt',
    refunded: `Đã hoàn ${formatCurrency(booking.refundAmount || booking.totalAmount)}`,
    cancelled: 'Đơn đã huỷ',
    expired: 'Quá hạn thanh toán',
  }[phase];

  return text ? <p className="mt-stub-hint">{text}</p> : null;
}

function BookingNote({ booking, now, onRequestRefund }) {
  const notes = [];

  if (booking.status === 'COMPLETED' && booking.refundProcessedAt) {
    notes.push(
      <div key="rejected" className="mt-note mt-note--red">
        <span>
          <strong>Yêu cầu hoàn tiền bị từ chối.</strong>
          {booking.refundProcessNote && ` ${booking.refundProcessNote}`}
        </span>
      </div>
    );
  }

  const deadline = getRefundDeadline(booking);
  const refundLeft = deadline ? deadline.getTime() - now : 0;
  if (booking.status === 'COMPLETED' && refundLeft > 0) {
    notes.push(
      <div key="refundable" className="mt-note">
        <span>Có thể yêu cầu hoàn tiền trong {formatDuration(refundLeft)} nữa.</span>
        <button type="button" className="mt-link-btn" onClick={() => onRequestRefund(booking)}>
          Yêu cầu hoàn tiền
        </button>
      </div>
    );
  }

  if (booking.status === 'REFUND_REQUESTED') {
    notes.push(
      <div key="requested" className="mt-note mt-note--orange">
        <span>
          <strong>Đã gửi yêu cầu hoàn tiền.</strong>
          {booking.refundReason && <> Lý do: “{booking.refundReason}”</>}
        </span>
      </div>
    );
  }

  if (booking.status === 'REFUNDED') {
    notes.push(
      <div key="refunded" className="mt-note mt-note--violet">
        <span>
          <strong>Đã hoàn {formatCurrency(booking.refundAmount || booking.totalAmount)}</strong>
          {booking.refundedAt && ` lúc ${formatDateTime(booking.refundedAt)}`}.
          {booking.refundProcessNote && ` Ghi chú: ${booking.refundProcessNote}`}
        </span>
      </div>
    );
  }

  return notes.length ? <div className="mt-notes">{notes}</div> : null;
}

export default function BookingCard({ booking, now, onOpenTicket, onPay, onCancel, onRequestRefund }) {
  const phase = getBookingPhase(booking, now);
  const meta = PHASE_META[phase] || PHASE_META.other;
  const seats = getSeats(booking);
  const foods = booking.foods || [];
  const end = getShowEnd(booking);
  const discount = Number(booking.discountAmount || 0);
  const isVoid = phase === 'cancelled' || phase === 'expired';

  return (
    <article className={`mt-card mt-card--${phase}`}>
      <div className="mt-poster-col">
        <SafeImage
          src={booking.movieThumbnailUrl}
          alt={booking.movieName || 'Poster phim'}
          className="mt-poster"
        />
      </div>

      <div className="mt-body">
        <div className="mt-body-top">
          <span className={`mt-badge mt-tone--${meta.tone}`}>
            <span className="mt-dot" aria-hidden="true" />
            {meta.label}
          </span>
          {booking.bookingCode && <span className="mt-code">{booking.bookingCode}</span>}
        </div>

        <h3 className="mt-title">{booking.movieName || 'Phim chưa xác định'}</h3>

        <dl className="mt-meta">
          <div>
            <dt>Suất chiếu</dt>
            <dd>
              <strong>{formatTime(booking.showtimeStart)}</strong>
              {booking.showtimeEnd && end && <span className="mt-muted"> – {formatTime(booking.showtimeEnd)}</span>}
              <span className="mt-sep">·</span>
              {formatShowDate(booking.showtimeStart)}
            </dd>
          </div>
          <div>
            <dt>Rạp</dt>
            <dd>
              {booking.branchName || 'MoviePTIT'}
              {booking.roomName && (
                <>
                  <span className="mt-sep">·</span>
                  {booking.roomName}
                </>
              )}
            </dd>
          </div>
          <div className="mt-meta-wide">
            <dt>Ghế{seats.length > 0 && ` (${seats.length})`}</dt>
            <dd className="mt-seats">
              {seats.length > 0
                ? seats.map((seat, index) => (
                  <span className="mt-seat" key={`${seat}-${index}`}>{seat}</span>
                ))
                : '—'}
            </dd>
          </div>
          {foods.length > 0 && (
            <div className="mt-meta-wide">
              <dt>Bắp nước</dt>
              <dd className="mt-foods">
                {foods.map((food) => `${food.quantity}× ${food.foodName}`).join(', ')}
              </dd>
            </div>
          )}
        </dl>

        <BookingNote booking={booking} now={now} onRequestRefund={onRequestRefund} />
      </div>

      <aside className="mt-stub">
        <div className="mt-stub-price">
          <span className="mt-stub-label">Tổng thanh toán</span>
          <span className={`mt-stub-amount ${isVoid ? 'is-void' : ''}`}>
            {formatCurrency(booking.totalAmount)}
          </span>
          {discount > 0 && <span className="mt-stub-discount">Đã giảm {formatCurrency(discount)}</span>}
        </div>

        <StubHint phase={phase} booking={booking} now={now} />

        {(phase === 'pending' || phase === 'upcoming' || phase === 'watched') && (
          <div className="mt-stub-actions">
            {phase === 'pending' && (
              <>
                <button type="button" className="mt-btn mt-btn--primary" onClick={() => onPay(booking)}>
                  Thanh toán
                </button>
                <button type="button" className="mt-btn mt-btn--quiet" onClick={() => onCancel(booking)}>
                  Huỷ đơn
                </button>
              </>
            )}
            {phase === 'upcoming' && (
              <button type="button" className="mt-btn mt-btn--primary" onClick={() => onOpenTicket(booking)}>
                <QrCodeIcon size={16} />
                Xem vé
              </button>
            )}
            {phase === 'watched' && (
              <button type="button" className="mt-btn mt-btn--outline" onClick={() => onOpenTicket(booking)}>
                Xem lại vé
              </button>
            )}
          </div>
        )}
      </aside>
    </article>
  );
}


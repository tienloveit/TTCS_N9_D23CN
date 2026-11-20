import SafeImage from '../../components/Common/SafeImage';
import {
  AlertCircleIcon,
  ArmchairIcon,
  CalendarIcon,
  ClockIcon,
  CreditCardIcon,
  MapPinIcon,
  PopcornIcon,
  QrCodeIcon,
  TicketIcon,
} from '../../components/Common/CinemaIcons';
import {
  PHASE_META,
  canPayBooking,
  formatCountdown,
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatShowDate,
  formatTime,
  getRefundDeadline,
  getShowStart,
  parseLocalDateTime,
} from './bookingFormat';

const REFUND_PROGRESS = {
  PROCESSING: 'Đang xử lý hoàn tiền',
  UNKNOWN: 'Đang đối soát hoàn tiền',
  FAILED: 'Hoàn tiền chưa thành công',
};

function StubHint({ phase, booking, now, refundLeft }) {
  if (phase === 'pending') {
    const expiresAt = parseLocalDateTime(booking.expiresAt);
    if (!expiresAt) return null;
    const left = expiresAt.getTime() - now;
    return (
      <p className="mt-stub-hint mt-text--amber">
        <ClockIcon size={15} />
        {left > 0 ? <>Giữ ghế còn <strong className="mt-mono">{formatCountdown(left)}</strong></> : 'Đã hết giờ giữ ghế'}
      </p>
    );
  }

  if (refundLeft >= 0) {
    return <p className="mt-stub-hint">Hạn yêu cầu hoàn tiền còn {formatDuration(refundLeft)}</p>;
  }

  if (phase === 'upcoming') {
    return <p className="mt-stub-hint"><ClockIcon size={15} />Chiếu sau {formatDuration(getShowStart(booking).getTime() - now)}</p>;
  }

  return null;
}

function BookingNote({ booking, changeNotice, onDismissChange }) {
  const schedule = changeNotice?.schedule;
  const total = changeNotice?.total;
  const refundProgress = REFUND_PROGRESS[booking.refundGatewayStatus];

  return (
    <>
      {(schedule || total) && (
        <div className="mt-note mt-note--update">
          <div className="mt-note-heading">
            <AlertCircleIcon size={19} />
            <div>
              <strong>Đơn có thông tin cập nhật</strong>
              <p>So với thông tin đã xem trước đó trên tab này.</p>
            </div>
            <button type="button" className="mt-btn mt-btn--outline" onClick={() => onDismissChange(booking)}>Đã xem</button>
          </div>
          <dl className="mt-change-list">
            {schedule && (
              <div>
                <dt>Suất chiếu</dt>
                <dd><span>Trước: {schedule.before}</span><strong>Hiện tại: {schedule.after}</strong></dd>
              </div>
            )}
            {total && (
              <div>
                <dt>Tổng tiền đơn</dt>
                <dd><span>Trước: {formatCurrency(total.before)}</span><strong>Hiện tại: {formatCurrency(total.after)}</strong></dd>
              </div>
            )}
          </dl>
        </div>
      )}
      {booking.status === 'COMPLETED' && booking.refundProcessedAt && (
        <div className="mt-note mt-note--red">
          <strong>Yêu cầu hoàn tiền bị từ chối.</strong>
          {booking.refundProcessNote && <p>{booking.refundProcessNote}</p>}
        </div>
      )}
      {booking.status === 'REFUND_REQUESTED' && (booking.refundReason || (refundProgress && booking.refundGatewayMessage)) && (
        <div className="mt-note">
          {refundProgress && booking.refundGatewayMessage && <p>{booking.refundGatewayMessage}</p>}
          {booking.refundReason && <p>Lý do yêu cầu: {booking.refundReason}</p>}
        </div>
      )}
      {booking.status === 'REFUNDED' && (
        <div className="mt-note mt-note--violet">
          <strong>Đã hoàn {formatCurrency(booking.refundAmount ?? booking.totalAmount)}</strong>
          {booking.refundedAt && <p>Hoàn tiền lúc {formatDateTime(booking.refundedAt)}</p>}
          {booking.refundProcessNote && <p>{booking.refundProcessNote}</p>}
        </div>
      )}
    </>
  );
}

export default function BookingCard({
  booking, phase, now, featured, changeNotice, onDismissChange, onOpenTicket, onPay, onCancel, onRequestRefund,
}) {
  const meta = PHASE_META[phase];
  const tickets = booking.tickets || [];
  const seats = booking.seatCodes?.length ? booking.seatCodes : tickets.map((ticket) => ticket.seatCode).filter(Boolean);
  const foods = booking.foods || [];
  const discount = Number(booking.discountAmount || 0);
  const checkedInCount = tickets.filter((ticket) => ticket.checkedInAt).length;
  const canPay = canPayBooking(booking, now);
  const expiresAt = parseLocalDateTime(booking.expiresAt);
  const holdExpired = phase === 'pending' && expiresAt && expiresAt.getTime() <= now;
  const deadline = getRefundDeadline(booking);
  const refundLeft = deadline ? deadline.getTime() - now : -1;
  const showPass = ['upcoming', 'in_progress', 'watched', 'checked_in', 'paid'].includes(phase);
  const passUsed = phase === 'watched' || phase === 'checked_in';
  const isVoid = phase === 'cancelled' || phase === 'expired';
  const badgeLabel = (phase === 'refund_requested' && REFUND_PROGRESS[booking.refundGatewayStatus])
    || (holdExpired && 'Hết giờ giữ ghế') || meta.label;
  const Title = featured ? 'h2' : 'h3';

  return (
    <article className={`mt-card${featured ? ' mt-card--featured' : ''}`}>
      <div className="mt-card-main">
        <SafeImage
          key={booking.movieThumbnailUrl}
          src={booking.movieThumbnailUrl}
          fallback="/assets/img/empty-cinema.png"
          alt=""
          className="mt-poster"
        />
        <div className="mt-card-title">
          <div className="mt-card-labels">
            {featured ? (
              <span className="mt-next-label"><TicketIcon size={16} />Suất chiếu kế tiếp</span>
            ) : (
              <span className={`mt-badge mt-tone--${holdExpired ? 'neutral' : meta.tone}`}>{badgeLabel}</span>
            )}
          </div>
          <Title className="mt-title">{booking.movieName || 'Phim chưa xác định'}</Title>
          {booking.showtimeStart && (
            <p className="mt-showtime">
              <CalendarIcon size={17} />
              <strong>{formatTime(booking.showtimeStart)}{booking.showtimeEnd && ` – ${formatTime(booking.showtimeEnd)}`}</strong>
              <span>{formatShowDate(booking.showtimeStart)}</span>
            </p>
          )}
        </div>
        <dl className="mt-meta">
          <div className="mt-meta-row">
            <dt><MapPinIcon size={17} />Rạp</dt>
            <dd>{[booking.branchName, booking.roomName].filter(Boolean).join(' · ') || '—'}</dd>
          </div>
          <div className="mt-meta-row">
            <dt><ArmchairIcon size={17} />Ghế</dt>
            <dd className="mt-seats">
              {seats.length > 0 ? seats.map((seat, index) => (
                <span className="mt-seat" key={`${seat}-${index}`}>{seat}</span>
              )) : '—'}
              {checkedInCount > 0 && checkedInCount < tickets.length && (
                <span className="mt-checkin-count">Đã check-in {checkedInCount}/{tickets.length} ghế</span>
              )}
            </dd>
          </div>
          {foods.length > 0 && (
            <div className="mt-meta-row">
              <dt><PopcornIcon size={17} />Bắp nước</dt>
              <dd>{foods.map((food) => `${food.quantity}× ${food.foodName}`).join(', ')}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-stub">
        {booking.bookingCode && <span className="mt-code">Mã đơn <b>{booking.bookingCode}</b></span>}
        <div className="mt-stub-price">
          <span className="mt-stub-label">{booking.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Tổng tiền đơn'}</span>
          <strong className={`mt-stub-amount ${isVoid ? 'is-void' : ''}`}>{formatCurrency(booking.totalAmount)}</strong>
          {discount > 0 && <span className="mt-stub-discount">Đã giảm {formatCurrency(discount)}</span>}
        </div>
        <StubHint phase={phase} booking={booking} now={now} refundLeft={refundLeft} />
        {(phase === 'pending' || showPass || refundLeft >= 0) && (
          <div className="mt-stub-actions">
            {phase === 'pending' && (
              <>
                <button type="button" className="mt-btn mt-btn--primary" onClick={() => onPay(booking)} disabled={!canPay}>
                  <CreditCardIcon size={17} /> Thanh toán
                </button>
                <button type="button" className="mt-btn mt-btn--outline" onClick={() => onCancel(booking)}>Hủy đơn</button>
              </>
            )}
            {showPass && (
              <button type="button" className={`mt-btn mt-btn--${passUsed ? 'outline' : 'primary'}`} onClick={() => onOpenTicket(booking)}>
                <QrCodeIcon size={17} />{passUsed ? 'Xem lại vé' : 'Xem vé QR'}
              </button>
            )}
            {refundLeft >= 0 && (
              <button type="button" className="mt-btn mt-btn--outline" onClick={() => onRequestRefund(booking)}>Yêu cầu hoàn tiền</button>
            )}
          </div>
        )}
      </div>
      <BookingNote booking={booking} changeNotice={changeNotice} onDismissChange={onDismissChange} />
    </article>
  );
}

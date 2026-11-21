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
        <ClockIcon size={15} aria-hidden="true" />
        {left > 0
          ? <>Thanh toán trong <strong className="mt-mono">{formatCountdown(left)}</strong> để giữ ghế</>
          : 'Đã hết giờ giữ ghế'}
      </p>
    );
  }

  // Giờ chiếu là thông tin khách cần nhất; hạn hoàn tiền là phụ, ghi mốc giờ cụ thể thay vì đếm ngược.
  return (
    <>
      {phase === 'upcoming' && (
        <p className="mt-stub-hint">
          <ClockIcon size={15} aria-hidden="true" />Chiếu sau {formatDuration(getShowStart(booking).getTime() - now)}
        </p>
      )}
      {refundLeft >= 0 && (
        <p className="mt-stub-hint mt-stub-hint--muted">
          Được yêu cầu hoàn tiền đến {formatDateTime(booking.refundDeadline)}
        </p>
      )}
    </>
  );
}

// Nhãn số tiền theo tình trạng thanh toán thật của đơn.
const PAYMENT_LABEL = {
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã thanh toán',
  PENDING: 'Cần thanh toán',
  CANCELLED: 'Không thu tiền',
  EXPIRED: 'Không thu tiền',
};

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
              <strong>Đơn này vừa thay đổi</strong>
              <p>So với lần trước bạn mở trang này.</p>
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
          <strong>Yêu cầu hoàn tiền bị từ chối. Vé vẫn dùng được bình thường.</strong>
          {booking.refundProcessNote && <p>Phản hồi của rạp: {booking.refundProcessNote}</p>}
        </div>
      )}
      {booking.status === 'REFUND_REQUESTED' && (
        <div className="mt-note">
          <p>
            <strong>
              {refundProgress
                ? `${refundProgress}: ${formatCurrency(booking.refundAmount ?? booking.totalAmount)}.`
                : `Rạp đang xem xét yêu cầu hoàn ${formatCurrency(booking.refundAmount ?? booking.totalAmount)}.`}
            </strong>{' '}
            Kết quả sẽ được cập nhật tại đây.
          </p>
          {refundProgress && booking.refundGatewayMessage && <p>{booking.refundGatewayMessage}</p>}
          {booking.refundReason && <p>Lý do bạn gửi: {booking.refundReason}</p>}
        </div>
      )}
      {booking.status === 'REFUNDED' && (
        <div className="mt-note mt-note--violet">
          <strong>Đã hoàn {formatCurrency(booking.refundAmount ?? booking.totalAmount)}</strong>
          {booking.refundedAt && <p>Hoàn tiền lúc {formatDateTime(booking.refundedAt)}. Ghế đã được trả lại cho rạp.</p>}
          {booking.refundProcessNote && <p>Ghi chú của rạp: {booking.refundProcessNote}</p>}
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
              )) : <span className="mt-muted">{isVoid ? 'Ghế đã được trả lại' : '—'}</span>}
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
          <span className="mt-stub-label">{PAYMENT_LABEL[booking.paymentStatus] || 'Tổng tiền đơn'}</span>
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

// Thời gian theo giờ rạp nằm trong utils/cinemaTime.js; re-export để giữ API cũ.
import { parseLocalDateTime } from '../../utils/cinemaTime.js';

export {
  parseLocalDateTime,
  formatShowDate,
  formatTime,
  formatDateTime,
  formatCountdown,
} from '../../utils/cinemaTime.js';

export const formatCurrency = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')} đ`;

/** "2 ngày 3 giờ" | "5 giờ 12 phút" | "8 phút" */
export const formatDuration = (ms) => {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days} ngày ${hours} giờ` : `${days} ngày`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${Math.max(minutes, 1)} phút`;
};


const FALLBACK_SHOW_LENGTH_MS = 3 * 60 * 60 * 1000;

export const getShowStart = (booking) => parseLocalDateTime(booking.showtimeStart);

export const getShowEnd = (booking) => {
  const end = parseLocalDateTime(booking.showtimeEnd);
  if (end) return end;
  const start = getShowStart(booking);
  return start ? new Date(start.getTime() + FALLBACK_SHOW_LENGTH_MS) : null;
};

/** The server computes this deadline using the current refund policy. */
export const getRefundDeadline = (booking) => {
  if (booking.status !== 'COMPLETED') return null;
  return parseLocalDateTime(booking.refundDeadline);
};

export const isFullyCheckedIn = (booking) => {
  const tickets = booking.tickets || [];
  return tickets.length > 0 && tickets.every((t) => t.checkedInAt);
};

export const canPayBooking = (booking, now) =>
  booking.status === 'PENDING' &&
  booking.paymentStatus === 'PENDING' &&
  (parseLocalDateTime(booking.expiresAt)?.getTime() ?? 0) > now;

export const getBookingPhase = (booking, now) => {
  switch (booking.status) {
    case 'PENDING':
      return 'pending';
    case 'COMPLETED': {
      if (booking.paymentStatus && booking.paymentStatus !== 'PAID') return 'other';
      if (isFullyCheckedIn(booking)) return 'checked_in';
      const start = getShowStart(booking);
      const end = getShowEnd(booking);
      if (end && end.getTime() <= now) return 'watched';
      if (start) return start.getTime() > now ? 'upcoming' : 'in_progress';
      return 'paid';
    }
    case 'CANCELLED':
      return 'cancelled';
    case 'EXPIRED':
      return 'expired';
    case 'REFUND_REQUESTED':
      return 'refund_requested';
    case 'REFUNDED':
      return 'refunded';
    default:
      return 'other';
  }
};

export const PHASE_META = {
  upcoming: { label: 'Sắp chiếu', tone: 'green' },
  in_progress: { label: 'Đang chiếu', tone: 'blue' },
  paid: { label: 'Đã thanh toán', tone: 'blue' },
  checked_in: { label: 'Đã check-in', tone: 'neutral' },
  pending: { label: 'Chờ thanh toán', tone: 'amber' },
  watched: { label: 'Đã chiếu', tone: 'neutral' },
  refund_requested: { label: 'Chờ duyệt hoàn tiền', tone: 'orange' },
  refunded: { label: 'Đã hoàn tiền', tone: 'violet' },
  cancelled: { label: 'Đã hủy', tone: 'red' },
  expired: { label: 'Hết hạn thanh toán', tone: 'neutral' },
  other: { label: 'Không xác định', tone: 'neutral' },
};


/**
 * Helpers dùng chung cho trang "Vé của tôi".
 * Backend trả LocalDateTime không có timezone (vd: "2026-04-14T16:30:00"),
 * nên parse thủ công để tránh lệch múi giờ.
 */
export const parseLocalDateTime = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) {
    const [y, m, d, h = 0, mi = 0, s = 0] = value;
    return new Date(y, m - 1, d, h, mi, s);
  }
  const [datePart, timePart] = String(value).split('T');
  if (!datePart) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 0, minute = 0, second = 0] = (timePart || '00:00')
    .split(':')
    .map((part) => Math.floor(Number(part)) || 0);
  const date = new Date(year, month - 1, day, hour, minute, second);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pad = (n) => String(n).padStart(2, '0');
const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const formatShowDate = (value) => {
  const d = parseLocalDateTime(value);
  if (!d) return '—';
  return `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export const formatTime = (value) => {
  const d = parseLocalDateTime(value);
  if (!d) return '—';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatDateTime = (value) => {
  const d = parseLocalDateTime(value);
  if (!d) return '—';
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

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

/** "08:21" */
export const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
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

/**
 * Trạng thái hiển thị của đơn, tách COMPLETED thành "sắp chiếu" / "đã chiếu".
 */
export const getBookingPhase = (booking, now) => {
  switch (booking.status) {
    case 'PENDING':
      return 'pending';
    case 'COMPLETED': {
      const end = getShowEnd(booking);
      return end && end.getTime() < now ? 'watched' : 'upcoming';
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
  pending: { label: 'Chờ thanh toán', tone: 'amber' },
  watched: { label: 'Đã chiếu', tone: 'neutral' },
  refund_requested: { label: 'Chờ hoàn tiền', tone: 'orange' },
  refunded: { label: 'Đã hoàn tiền', tone: 'violet' },
  cancelled: { label: 'Đã huỷ', tone: 'red' },
  expired: { label: 'Hết hạn', tone: 'neutral' },
  other: { label: 'Không xác định', tone: 'neutral' },
};


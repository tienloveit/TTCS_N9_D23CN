// Nhãn và tone dùng chung cho trạng thái đơn đặt vé (booking.status).
// Tone theo bộ của <Badge>: neutral | success | warning | danger | info | brand.
// Trạng thái thanh toán (payment status) và giai đoạn suất chiếu mang nghĩa khác, không gộp vào đây.
export const BOOKING_STATUS_META = {
  PENDING: { label: 'Chờ thanh toán', tone: 'warning' },
  COMPLETED: { label: 'Hoàn tất', tone: 'success' },
  REFUND_REQUESTED: { label: 'Yêu cầu hoàn tiền', tone: 'warning' },
  REFUNDED: { label: 'Đã hoàn tiền', tone: 'info' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
  EXPIRED: { label: 'Hết hạn', tone: 'neutral' },
};

export const bookingStatusTone = (status) => BOOKING_STATUS_META[status]?.tone || 'neutral';

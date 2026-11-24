export const PAYMENT_STATUS_META = {
  PENDING: { label: 'Chờ thanh toán', tone: 'warning' },
  PAID: { label: 'Đã thanh toán', tone: 'success' },
  REFUNDED: { label: 'Đã hoàn tiền', tone: 'info' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
  FAILED: { label: 'Thất bại', tone: 'danger' },
  NO_TRANSACTION: { label: 'Chưa có giao dịch', tone: 'neutral' },
};

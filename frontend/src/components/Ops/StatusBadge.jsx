import { BOOKING_STATUS_META } from '../../utils/bookingStatus';
import { PAYMENT_STATUS_META } from '../../utils/paymentStatus';
import { SHOWTIME_STATUS_META } from '../../utils/showtimeStatus';

const statuses = { booking: BOOKING_STATUS_META, payment: PAYMENT_STATUS_META, showtime: SHOWTIME_STATUS_META };

export default function StatusBadge({ kind, value, tone, children, className = '', ...props }) {
  const status = statuses[kind]?.[value ?? (kind === 'payment' ? 'NO_TRANSACTION' : '')];
  return (
    <span className={'o-badge ' + className} data-tone={status?.tone ?? tone ?? 'neutral'} {...props}>
      {status?.label ?? children ?? (value || 'Chưa xác định')}
    </span>
  );
}

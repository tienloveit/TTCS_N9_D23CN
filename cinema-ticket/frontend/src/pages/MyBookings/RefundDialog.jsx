import { useState } from 'react';
import { DialogShell } from './Dialogs';
import { formatCurrency, formatShowDate, formatTime } from './bookingFormat';

const QUICK_REASONS = [
  'Bận việc đột xuất',
  'Đặt nhầm suất chiếu',
  'Đặt nhầm ghế',
  'Muốn đổi sang ngày khác',
];

export default function RefundDialog({ booking, submitting, onSubmit, onClose }) {
  const [reason, setReason] = useState('');
  const seats = booking.seatCodes?.join(', ') || '—';
  const trimmed = reason.trim();

  return (
    <DialogShell onClose={submitting ? () => {} : onClose} labelledBy="mt-refund-title">
      <h3 id="mt-refund-title" className="mt-dialog-title">Yêu cầu hoàn tiền</h3>
      <p className="mt-dialog-text">
        Rạp sẽ xem xét yêu cầu của bạn. Khi được duyệt, bạn được hoàn toàn bộ số tiền đã thanh toán
        và ghế sẽ được mở bán lại.
      </p>

      <div className="mt-refund-summary">
        <div className="mt-refund-movie">
          <strong>{booking.movieName}</strong>
          <span>
            {formatTime(booking.showtimeStart)} · {formatShowDate(booking.showtimeStart)} · Ghế {seats}
          </span>
        </div>
        <div className="mt-refund-amount">
          <span>Số tiền hoàn</span>
          <strong>{formatCurrency(booking.totalAmount)}</strong>
        </div>
      </div>

      <label className="mt-field">
        <span className="mt-field-label">Lý do hoàn tiền</span>
        <div className="mt-chips">
          {QUICK_REASONS.map((item) => (
            <button
              key={item}
              type="button"
              className={`mt-chip ${trimmed === item ? 'is-active' : ''}`}
              onClick={() => setReason(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <textarea
          className="mt-textarea"
          rows={3}
          maxLength={500}
          placeholder="Hoặc nhập lý do của bạn..."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>

      <div className="mt-dialog-actions">
        <button type="button" className="mt-btn mt-btn--outline" onClick={onClose} disabled={submitting}>
          Để sau
        </button>
        <button
          type="button"
          className="mt-btn mt-btn--primary"
          onClick={() => onSubmit(trimmed)}
          disabled={submitting || !trimmed}
        >
          {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </button>
      </div>
    </DialogShell>
  );
}


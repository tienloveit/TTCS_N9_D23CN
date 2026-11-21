import { useState } from 'react';
import { DialogShell } from './Dialogs';
import { formatCurrency, formatDateTime, formatShowDate, formatTime } from './bookingFormat';

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
    <DialogShell onClose={submitting ? () => {} : onClose} showClose={!submitting} labelledBy="mt-refund-title">
      <h3 id="mt-refund-title" className="mt-dialog-title">Yêu cầu hoàn tiền</h3>
      <p className="mt-dialog-text">
        Rạp sẽ xem xét yêu cầu của bạn. Khi được duyệt, bạn được hoàn toàn bộ số tiền đã thanh toán
        (gồm vé và bắp nước) qua phương thức bạn đã dùng để thanh toán, và ghế sẽ được mở bán lại.
        Sau khi gửi, vé không dùng để vào rạp được nữa trừ khi yêu cầu bị từ chối.
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
      {booking.refundDeadline && (
        <p className="mt-dialog-text">Hạn gửi yêu cầu: {formatDateTime(booking.refundDeadline)}.</p>
      )}

      <div className="mt-field">
        <label className="mt-field-label" htmlFor="mt-refund-reason">Lý do hoàn tiền</label>
        <div className="mt-chips" role="group" aria-label="Lý do gợi ý">
          {QUICK_REASONS.map((item) => (
            <button
              key={item}
              type="button"
              className={`mt-chip ${trimmed === item ? 'is-active' : ''}`}
              aria-pressed={trimmed === item}
              disabled={submitting}
              onClick={() => setReason(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <textarea
          className="mt-textarea"
          id="mt-refund-reason"
          rows={3}
          maxLength={500}
          placeholder="Chọn một lý do ở trên hoặc tự nhập"
          value={reason}
          disabled={submitting}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>

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
          {submitting ? 'Đang gửi...' : 'Gửi yêu cầu hoàn tiền'}
        </button>
      </div>
    </DialogShell>
  );
}


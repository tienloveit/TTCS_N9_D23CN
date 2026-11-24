import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Code, Money, OpsButton } from '../../../components/Ops';
import {
  ExternalLinkIcon,
  RefreshIcon,
  TimerIcon,
  XIcon,
} from '../../../components/Common/CinemaIcons';
import { formatCountdown, formatTime, parseLocalDateTime } from '../../../utils/cinemaTime';

/**
 * Đơn VNPay tại quầy đang chờ khách thanh toán. Màn quầy giữ nguyên trong lúc chờ: khách quét QR
 * bằng điện thoại hoặc nhân viên mở cổng VNPay ở tab mới; trang cha tự kiểm tra trạng thái đơn.
 */
export default function StaffVnpayPanel({ sale, busy, onCancel, onOpenGateway, onRetryLink, onBack }) {
  const { booking, paymentUrl, status, message } = sale;
  const expiresAt = parseLocalDateTime(booking.expiresAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== 'WAITING') return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [status]);

  const remaining = expiresAt ? expiresAt.getTime() - now : null;
  const seats = (booking.seatCodes || []).filter(Boolean).join(', ');

  if (status === 'FAILED') {
    return (
      <section className="o-staff-sale-complete" aria-live="polite">
        <h2>Giao dịch VNPay không hoàn tất</h2>
        <p>Mã đơn <Code>{booking.bookingCode || '#' + booking.bookingId}</Code></p>
        <p className="o-staff-vnpay-message">{message}</p>
        <div className="o-staff-sale-actions">
          <OpsButton variant="primary" onClick={onBack}>Quay lại đơn hàng</OpsButton>
        </div>
      </section>
    );
  }

  return (
    <section className="o-staff-sale-complete" aria-live="polite">
      <h2>Chờ khách thanh toán VNPay</h2>
      <p>Mã đơn <Code>{booking.bookingCode || '#' + booking.bookingId}</Code></p>
      <div className="o-staff-vnpay-body">
        <div className="o-staff-vnpay-qr">
          {paymentUrl ? (
            <>
              <QRCodeSVG value={paymentUrl} size={208} level="M" marginSize={2} title="Mã QR thanh toán VNPay" />
              <small>Khách quét bằng điện thoại để thanh toán</small>
            </>
          ) : (
            <div className="o-staff-vnpay-qr-missing">
              <p>Chưa tạo được liên kết thanh toán.</p>
              <OpsButton size="sm" icon={<RefreshIcon size={15} />} onClick={onRetryLink} disabled={busy}>
                Tạo lại liên kết
              </OpsButton>
            </div>
          )}
        </div>

        <div className="o-staff-vnpay-info">
          <dl>
            <div><dt>Phim</dt><dd>{booking.movieName || '—'}</dd></div>
            <div><dt>Suất chiếu</dt><dd>{formatTime(booking.showtimeStart) || '—'}{booking.roomName ? `, ${booking.roomName}` : ''}</dd></div>
            {seats && <div><dt>Ghế</dt><dd>{seats}</dd></div>}
            <div><dt>Số tiền</dt><dd><Money value={booking.totalAmount} /></dd></div>
          </dl>
          {expiresAt && (
            <p className="o-staff-vnpay-timer" data-urgent={remaining < 60_000 || undefined}>
              <TimerIcon size={16} />
              {remaining > 0
                ? <>Giữ ghế đến {formatTime(booking.expiresAt)} (còn {formatCountdown(remaining)})</>
                : <>Đã hết thời gian giữ ghế, đang chờ hệ thống xác nhận…</>}
            </p>
          )}
          <p className="o-staff-vnpay-status" role="status">
            Đang chờ VNPay xác nhận. Màn hình tự chuyển sang xuất vé khi khách thanh toán xong.
          </p>
          <div className="o-staff-sale-actions">
            <OpsButton variant="ghost-danger" icon={<XIcon size={16} />} onClick={onCancel} disabled={busy}>
              Hủy giao dịch
            </OpsButton>
            <OpsButton variant="primary" icon={<ExternalLinkIcon size={16} />} onClick={onOpenGateway}
              disabled={!paymentUrl || busy}>
              Mở cổng VNPay trên máy này
            </OpsButton>
          </div>
        </div>
      </div>
    </section>
  );
}

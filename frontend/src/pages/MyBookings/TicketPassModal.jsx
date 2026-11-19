import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { toast } from 'react-toastify';
import { DownloadIcon, MoviePTITLogoIcon } from '../../components/Common/CinemaIcons';
import { DialogShell } from './Dialogs';
import {
  formatShowDate,
  formatTime,
  getShowEnd,
  isFullyCheckedIn,
} from './bookingFormat';

export default function TicketPassModal({ booking, now, onClose }) {
  const passRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const seats = booking.seatCodes?.length
    ? booking.seatCodes
    : (booking.tickets || []).map((t) => t.seatCode).filter(Boolean);
  const foods = booking.foods || [];
  const end = getShowEnd(booking);
  const isPast = end && end.getTime() < now;
  const checkedIn = isFullyCheckedIn(booking);
  const qrValue = booking.bookingCode || String(booking.bookingId);

  const handleDownload = async () => {
    if (!passRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(passRef.current, { cacheBust: true, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `MoviePTIT-${booking.bookingCode || booking.bookingId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Lỗi khi tải vé:', err);
      toast.error('Không thể tải ảnh vé, vui lòng thử lại.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DialogShell onClose={onClose} className="mt-dialog--pass" labelledBy="mt-pass-title">
      <div className="mt-pass-shadow">
        <div className="mt-pass" ref={passRef}>
          <header className="mt-pass-head">
            <span className="mt-pass-brand">
              <MoviePTITLogoIcon className="mt-pass-logo" />
              MoviePTIT
            </span>
            <span className="mt-pass-kind">Vé xem phim</span>
          </header>

          <section className="mt-pass-body">
            <h2 id="mt-pass-title" className="mt-pass-title">{booking.movieName}</h2>
            <p className="mt-pass-branch">{booking.branchName || 'MoviePTIT'}</p>

            <div className="mt-pass-grid">
              <div>
                <span>Ngày</span>
                <strong>{formatShowDate(booking.showtimeStart)}</strong>
              </div>
              <div>
                <span>Giờ chiếu</span>
                <strong>
                  {formatTime(booking.showtimeStart)}
                  {booking.showtimeEnd && <small> – {formatTime(booking.showtimeEnd)}</small>}
                </strong>
              </div>
              <div>
                <span>Phòng</span>
                <strong>{booking.roomName || '—'}</strong>
              </div>
              <div className="mt-pass-grid-wide">
                <span>Ghế</span>
                <strong className="mt-pass-seats">{seats.length ? seats.join('  ') : '—'}</strong>
              </div>
              {foods.length > 0 && (
                <div className="mt-pass-grid-wide">
                  <span>Bắp nước</span>
                  <strong className="mt-pass-foods">
                    {foods.map((f) => `${f.quantity}× ${f.foodName}`).join(', ')}
                  </strong>
                </div>
              )}
            </div>
          </section>

          <div className="mt-pass-cut" aria-hidden="true" />

          <section className="mt-pass-qr">
            <div className={`mt-pass-qr-box ${isPast ? 'is-dim' : ''}`}>
              <QRCodeSVG value={qrValue} size={164} level="M" />
            </div>
            <div className="mt-pass-code">{booking.bookingCode}</div>
            <p className="mt-pass-hint">
              {checkedIn
                ? 'Vé đã được check-in tại rạp.'
                : isPast
                  ? 'Suất chiếu đã kết thúc.'
                  : 'Đưa mã này cho nhân viên soát vé tại cửa phòng chiếu.'}
            </p>
          </section>
        </div>
      </div>

      <div className="mt-pass-actions">
        <button type="button" className="mt-btn mt-btn--light" onClick={handleDownload} disabled={downloading}>
          <DownloadIcon size={16} />
          {downloading ? 'Đang tạo ảnh...' : 'Tải ảnh vé'}
        </button>
        <button type="button" className="mt-btn mt-btn--ghost-light" onClick={onClose}>
          Đóng
        </button>
      </div>
    </DialogShell>
  );
}


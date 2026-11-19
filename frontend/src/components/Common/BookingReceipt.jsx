import SafeImage from './SafeImage';
import { TicketIcon } from './CinemaIcons';
import './BookingReceipt.css';

const formatCurrency = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')}đ`;

export default function BookingReceipt({
  movieName, posterUrl, subtitle, branchName, roomName, showtime,
  seats = [], seatLines = [], seatTotal, foods = [], subtotal,
  discount = 0, promotionCode, seatAction, children, className = '',
}) {
  const foodQuantity = foods.reduce((sum, food) => sum + Number(food.quantity), 0);
  const foodTotal = foods.reduce((sum, food) => sum + Number(food.subtotal), 0);

  return (
    <aside className={`pos-receipt booking-receipt ${className}`} aria-label="Phiếu thanh toán">
      <div className="pos-receipt-banner">
        <div className="pos-receipt-banner-title">
          <TicketIcon size={18} />
          <span>Phiếu thanh toán</span>
        </div>
      </div>

      <div className="pos-receipt-movie">
        {posterUrl && <SafeImage key={posterUrl} src={posterUrl} alt={movieName} className="pos-receipt-poster" />}
        <div className="pos-receipt-movie-info">
          <h3>{movieName || 'Đang tải thông tin phim...'}</h3>
          <div className="pos-receipt-meta">
            {subtitle && <span>{subtitle}</span>}
            {branchName && <span>Rạp: <strong>{branchName}</strong></span>}
            {roomName && <span>Phòng: <strong>{roomName}</strong></span>}
            {showtime && <span>Suất: <strong className="booking-receipt-showtime">{showtime}</strong></span>}
          </div>
        </div>
      </div>

      <div className="pos-receipt-section">
        <div className="pos-receipt-section-head">
          <span>Ghế đã chọn ({seats.length})</span>
          {seatTotal != null && seats.length > 0 && <span>{formatCurrency(seatTotal)}</span>}
        </div>
        {seats.length === 0 ? <div className="pos-receipt-empty">Chưa chọn ghế nào</div> : (
          <>
            <div className="pos-seat-chips">
              {seats.map((seat, index) => <span key={`${seat}-${index}`} className="pos-seat-chip">{seat}</span>)}
            </div>
            {seatLines.map((line) => (
              <div key={line.id} className="pos-receipt-line">
                <span className="pos-receipt-line-name">{line.label}</span>
                <span className="pos-receipt-line-price">{formatCurrency(line.amount)}</span>
              </div>
            ))}
            {seatAction}
          </>
        )}
      </div>

      <div className="pos-receipt-section">
        <div className="pos-receipt-section-head">
          <span>Bắp nước kèm ({foodQuantity})</span>
          {foodTotal > 0 && <span>{formatCurrency(foodTotal)}</span>}
        </div>
        {foods.length === 0 ? <div className="pos-receipt-empty">Không có đồ ăn kèm</div> : foods.map((food) => (
          <div key={food.id} className="pos-receipt-line">
            <span className="pos-receipt-line-name">{food.quantity}x {food.name}</span>
            <span className="pos-receipt-line-price">{formatCurrency(food.subtotal)}</span>
          </div>
        ))}
      </div>

      <div className="pos-receipt-summary">
        <div className="pos-receipt-line">
          <span className="pos-receipt-line-name">Tạm tính</span>
          <strong className="pos-receipt-line-price">{formatCurrency(subtotal)}</strong>
        </div>
        {discount > 0 && (
          <div className="pos-receipt-line booking-receipt-discount">
            <span>Mã giảm giá{promotionCode ? ` (${promotionCode})` : ''}</span>
            <strong>-{formatCurrency(discount)}</strong>
          </div>
        )}
        <div className="pos-receipt-total-row">
          <span>Tổng thanh toán</span>
          <strong>{formatCurrency(Number(subtotal) - Number(discount))}</strong>
        </div>
      </div>
      <div className="pos-receipt-actions">{children}</div>
    </aside>
  );
}

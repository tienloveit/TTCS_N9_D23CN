import { formatScreening } from '../../../utils/cinemaFormats';
import Button from '../../../components/Common/Button';
import SafeImage from '../../../components/Common/SafeImage';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  TicketIcon,
  XIcon,
} from '../../../components/Common/CinemaIcons';
import { formatCurrency, formatTime, formatDate } from './staffBookingUtils';

/** Nút điều hướng ở chân phiếu: giữ class cũ để bố cục hai cột không đổi. */
function StepButton({ primary = false, back = false, children, ...props }) {
  return (
    <Button variant={primary ? 'primary' : 'secondary'} className="seat-sidebar-btn" {...props}>
      {back && <ArrowLeftIcon size={16} aria-hidden="true" />}
      <span>{children}</span>
      {primary && !back && <ArrowRightIcon size={16} aria-hidden="true" />}
    </Button>
  );
}

/** Hóa đơn tạm tính và nút điều hướng các bước ở cột phải màn bán vé. */
export default function StaffReceiptSidebar({
  canContinueSeats,
  canContinueSelection,
  continueFromSeats,
  continueFromSelection,
  continueToCheckout,
  currentStep,
  finalPrice,
  foodQuantity,
  foodTotal,
  foods,
  handleResetOrder,
  handleSubmit,
  paymentMethod,
  posterUrl,
  promoCode,
  promoDiscount,
  seatGroups,
  seatTotal,
  selectedFoodItems,
  selectedSeatTickets,
  selectedSeats,
  selectedShowtime,
  setCurrentStep,
  showtimeId,
  submitting,
  toggleSeat,
}) {
  return (
    <aside className="pos-receipt" aria-label="Phiếu bán vé">
      <div className="pos-receipt-banner">
        <div className="pos-receipt-banner-title">
          <TicketIcon size={18} aria-hidden="true" />
          <span>Phiếu bán vé</span>
        </div>
        {(showtimeId || selectedSeats.length > 0 || foodQuantity > 0) && (
          <button type="button" className="pos-receipt-reset" disabled={submitting} onClick={handleResetOrder}>
            Xóa giỏ
          </button>
        )}
      </div>

      <div className="pos-receipt-details" tabIndex={0} role="region" aria-label="Chi tiết giỏ hàng">
        <div className="pos-receipt-movie">
          {selectedShowtime && (
            <SafeImage src={posterUrl} alt={selectedShowtime.movieName} className="pos-receipt-poster" />
          )}
          <div className="pos-receipt-movie-info">
            <h3>{selectedShowtime ? selectedShowtime.movieName : 'Chưa chọn suất chiếu'}</h3>
            {selectedShowtime ? (
              <div className="pos-receipt-meta">
                <span>Rạp: <strong>{selectedShowtime.branchName}</strong></span>
                <span>
                  Phòng:{' '}
                  <strong>
                    {selectedShowtime.roomName}
                    {selectedShowtime.roomTechnology
                      ? ` (${formatScreening(selectedShowtime.screeningFormat, selectedShowtime.roomTechnology)})`
                      : ''}
                  </strong>
                </span>
                <span>
                  Suất: <strong className="pos-receipt-time">{formatTime(selectedShowtime.startTime)}</strong>
                  {' · '}{formatDate(selectedShowtime.startTime)}
                </span>
              </div>
            ) : (
              <div className="pos-receipt-empty">Chọn một suất chiếu để bắt đầu lập phiếu.</div>
            )}
          </div>
        </div>

        <div className="pos-receipt-section">
          <div className="pos-receipt-section-head">
            <span>Ghế đã chọn ({selectedSeats.length})</span>
            {selectedSeats.length > 0 && <span>{formatCurrency(seatTotal)}</span>}
          </div>

          {selectedSeatTickets.length === 0 ? (
            <div className="pos-receipt-empty">Chưa chọn ghế nào</div>
          ) : (
            <>
              <div className="pos-seat-chips">
                {selectedSeatTickets.map((t) => {
                  const code = t.seatCode || `${t.rowLabel || ''}${t.seatNumber || ''}`;
                  return (
                    <span key={t.seatId} className="pos-seat-chip">
                      {code}
                      <button type="button" onClick={() => toggleSeat(t)} aria-label={`Bỏ ghế ${code}`} title="Bỏ ghế này">
                        <XIcon size={12} aria-hidden="true" />
                      </button>
                    </span>
                  );
                })}
              </div>
              {seatGroups.map(([type, data]) => (
                <div key={type} className="pos-receipt-line">
                  <span className="pos-receipt-line-name">{data.seats.length} × {type}</span>
                  <span className="pos-receipt-line-price">{formatCurrency(data.price * data.seats.length)}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="pos-receipt-section">
          <div className="pos-receipt-section-head">
            <span>Bắp nước kèm ({foodQuantity})</span>
            {foodTotal > 0 && <span>{formatCurrency(foodTotal)}</span>}
          </div>

          {selectedFoodItems.length === 0 ? (
            <div className="pos-receipt-empty">Không có đồ ăn kèm</div>
          ) : (
            selectedFoodItems.map((food) => (
              <div key={food.id} className="pos-receipt-line">
                <span className="pos-receipt-line-name">{food.quantity} × {food.name}</span>
                <span className="pos-receipt-line-price">{formatCurrency(food.price * food.quantity)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pos-receipt-summary">
        <div className="pos-receipt-line"><span>Tiền vé</span><strong>{formatCurrency(seatTotal)}</strong></div>
        <div className="pos-receipt-line"><span>Tiền bắp nước</span><strong>{formatCurrency(foodTotal)}</strong></div>
        {promoDiscount > 0 && (
          <div className="pos-receipt-line pos-receipt-line--discount">
            <span>Mã giảm giá ({promoCode})</span>
            <strong>−{formatCurrency(promoDiscount)}</strong>
          </div>
        )}
        <div className="pos-receipt-total-row">
          <span>Tổng thu</span>
          <strong>{formatCurrency(finalPrice)}</strong>
        </div>
      </div>

      <div className="pos-receipt-actions">
        {currentStep === 'SELECTION' && (
          <StepButton primary block disabled={!canContinueSelection} onClick={continueFromSelection}>
            Tiếp tục chọn ghế
          </StepButton>
        )}

        {currentStep === 'SEATS' && (
          <>
            <StepButton back onClick={() => setCurrentStep('SELECTION')}>Đổi suất</StepButton>
            <StepButton primary disabled={!canContinueSeats} onClick={continueFromSeats}>Tiếp tục</StepButton>
          </>
        )}

        {currentStep === 'ADDONS' && (
          <>
            <StepButton back onClick={() => setCurrentStep('SEATS')}>Sơ đồ ghế</StepButton>
            <StepButton primary onClick={continueToCheckout}>Sang thanh toán</StepButton>
          </>
        )}

        {currentStep === 'CHECKOUT' && (
          <>
            <StepButton back onClick={() => setCurrentStep(foods.length > 0 ? 'ADDONS' : 'SEATS')}>Quay lại</StepButton>
            <Button variant="primary" className="seat-sidebar-btn" onClick={handleSubmit} disabled={submitting}
              icon={!submitting && paymentMethod === 'CASH' ? <CheckIcon size={16} /> : null}>
              {submitting ? 'Đang xử lý…' : paymentMethod === 'CASH' ? 'Thu tiền & xuất vé' : 'Tạo giao dịch VNPay'}
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}

import { formatScreening } from '../../../utils/cinemaFormats';
import SafeImage from '../../../components/Common/SafeImage';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  TicketIcon,
  XIcon,
} from '../../../components/Common/CinemaIcons';
import { formatCurrency, formatTime, formatDate } from './staffBookingUtils';

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
    <aside className="pos-receipt">
      <div className="pos-receipt-banner">
        <div className="pos-receipt-banner-title">
          <TicketIcon style={{ width: 18, height: 18 }} />
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
          <SafeImage
            src={posterUrl}
            alt={selectedShowtime.movieName}
            className="pos-receipt-poster"
          />
        )}
        <div className="pos-receipt-movie-info">
          <h3>
            {selectedShowtime ? selectedShowtime.movieName : 'Chưa chọn suất chiếu'}
          </h3>
          {selectedShowtime ? (
            <div className="pos-receipt-meta">
              <span>
                Rạp: <strong>{selectedShowtime.branchName}</strong>
              </span>
              <span>
                Phòng:{' '}
                <strong>
                  {selectedShowtime.roomName}
                  {selectedShowtime.roomTechnology ? ` (${formatScreening(selectedShowtime.screeningFormat, selectedShowtime.roomTechnology)})` : ''}
                </strong>
              </span>
              <span>
                Suất:{' '}
                <strong style={{ color: 'var(--blue)' }}>
                  {formatTime(selectedShowtime.startTime)}
                </strong>{' '}
                • {formatDate(selectedShowtime.startTime)}
              </span>
            </div>
          ) : (
            <div className="pos-receipt-empty">
              Chọn một suất chiếu để bắt đầu lập phiếu.
            </div>
          )}
        </div>
      </div>

      {/* Selected Seats Section */}
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
              {selectedSeatTickets.map((t) => (
                <span key={t.seatId} className="pos-seat-chip">
                  {t.seatCode || `${t.rowLabel || ''}${t.seatNumber || ''}`}
                  <button
                    type="button"
                    onClick={() => toggleSeat(t)}
                    title="Bỏ ghế này"
                  >
                    <XIcon size={12} />
                  </button>
                </span>
              ))}
            </div>
            {seatGroups.map(([type, data]) => (
              <div key={type} className="pos-receipt-line">
                <span className="pos-receipt-line-name">
                  {data.seats.length}x {type}
                </span>
                <span className="pos-receipt-line-price">
                  {formatCurrency(data.price * data.seats.length)}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Selected Foods Section */}
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
              <span className="pos-receipt-line-name">
                {food.quantity}x {food.name}
              </span>
              <span className="pos-receipt-line-price">
                {formatCurrency(food.price * food.quantity)}
              </span>
            </div>
          ))
        )}
      </div>

      </div>

      {/* Totals Summary */}
      <div className="pos-receipt-summary">
        <div className="pos-receipt-line"><span>Tiền vé</span><strong>{formatCurrency(seatTotal)}</strong></div>
        <div className="pos-receipt-line"><span>Tiền bắp nước</span><strong>{formatCurrency(foodTotal)}</strong></div>
        {promoDiscount > 0 && (
          <div className="pos-receipt-line" style={{ color: 'var(--green)' }}>
            <span>Mã giảm giá ({promoCode})</span>
            <strong>-{formatCurrency(promoDiscount)}</strong>
          </div>
        )}
        <div className="pos-receipt-total-row">
          <span>Tổng thu</span>
          <strong>{formatCurrency(finalPrice)}</strong>
        </div>
      </div>

      {/* Step Navigation Buttons */}
      <div className="pos-receipt-actions">
        {currentStep === 'SELECTION' && (
          <button
            type="button"
            className="btn btn-primary seat-sidebar-btn"
            style={{ width: '100%' }}
            disabled={!canContinueSelection}
            onClick={continueFromSelection}
          >
            <span>Tiếp tục chọn ghế</span>
            <ArrowRightIcon size={16} />
          </button>
        )}

        {currentStep === 'SEATS' && (
          <>
            <button
              type="button"
              className="btn btn-secondary seat-sidebar-btn"
              onClick={() => setCurrentStep('SELECTION')}
            >
              <ArrowLeftIcon size={16} />
              <span>Đổi suất</span>
            </button>
            <button
              type="button"
              className="btn btn-primary seat-sidebar-btn"
              disabled={!canContinueSeats}
              onClick={continueFromSeats}
            >
              <span>Tiếp tục</span>
              <ArrowRightIcon size={16} />
            </button>
          </>
        )}

        {currentStep === 'ADDONS' && (
          <>
            <button
              type="button"
              className="btn btn-secondary seat-sidebar-btn"
              onClick={() => setCurrentStep('SEATS')}
            >
              <ArrowLeftIcon size={16} />
              <span>Sơ đồ ghế</span>
            </button>
            <button
              type="button"
              className="btn btn-primary seat-sidebar-btn"
              onClick={continueToCheckout}
            >
              <span>Sang thanh toán</span>
              <ArrowRightIcon size={16} />
            </button>
          </>
        )}

        {currentStep === 'CHECKOUT' && (
          <>
            <button
              type="button"
              className="btn btn-secondary seat-sidebar-btn"
              onClick={() => setCurrentStep(foods.length > 0 ? 'ADDONS' : 'SEATS')}
            >
              <ArrowLeftIcon size={16} />
              <span>Quay lại</span>
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-primary seat-sidebar-btn"
              disabled={submitting}
            >
              {submitting ? (
                'Đang xử lý...'
              ) : paymentMethod === 'CASH' ? (
                <>
                  <CheckIcon size={16} />
                  <span>Thu tiền & Xuất vé</span>
                </>
              ) : (
                'Chuyển sang VNPay'
              )}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

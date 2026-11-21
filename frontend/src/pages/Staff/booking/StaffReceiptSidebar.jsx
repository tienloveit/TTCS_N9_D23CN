import { formatScreening } from '../../../utils/cinemaFormats';
import Button from '../../../components/Common/Button';
import SafeImage from '../../../components/Common/SafeImage';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  QrCodeIcon,
  TicketIcon,
  XIcon,
} from '../../../components/Common/CinemaIcons';
import { formatCurrency, formatDate, formatTime } from './staffBookingUtils';

const SEAT_TYPE_LABEL = { STANDARD: 'Ghế thường', VIP: 'Ghế VIP', COUPLE: 'Ghế đôi' };
const seatCodeOf = (ticket) => ticket.seatCode || `${ticket.rowLabel || ''}${ticket.seatNumber || ''}`;

function SeatGroupLines({ seatGroups }) {
  return seatGroups.map(([type, data]) => (
    <div key={type} className="counter-line">
      <span>{data.seats.length} × {SEAT_TYPE_LABEL[type] || type}</span>
      <span>{formatCurrency(data.price * data.seats.length)}</span>
    </div>
  ));
}

function FoodLines({ items }) {
  return items.map((food) => (
    <div key={food.id} className="counter-line">
      <span>{food.quantity} × {food.name}</span>
      <span>{formatCurrency(food.price * food.quantity)}</span>
    </div>
  ));
}

/** Khối mã khuyến mãi trong tóm tắt đơn: mã đang áp, ô nhập và các mã khả dụng bấm là áp. */
function PromoBox({ promo }) {
  const {
    appliedPromo, availablePromos, loadingPromos, onApply, onClear, promoCode, promoDiscount, promoError,
    setPromoCode, validatingPromo,
  } = promo;
  return (
    <div className="counter-promo">
      {appliedPromo && promoDiscount > 0 && (
        <div className="counter-promo-applied" role="status">
          <span><strong>{appliedPromo}</strong> · giảm {formatCurrency(promoDiscount)}</span>
          <button type="button" onClick={onClear} aria-label="Bỏ mã khuyến mãi">Bỏ</button>
        </div>
      )}
      <div className="counter-promo-row">
        <label htmlFor="counter-promo-code" className="sr-only">Mã khuyến mãi</label>
        <input
          id="counter-promo-code"
          className="input"
          placeholder="Mã khuyến mãi"
          value={promoCode}
          aria-invalid={Boolean(promoError)}
          aria-describedby={promoError ? 'counter-promo-error' : undefined}
          onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onApply();
            }
          }}
        />
        <Button onClick={() => onApply()} disabled={validatingPromo || !promoCode.trim()}>
          {validatingPromo ? 'Đang kiểm tra…' : 'Áp dụng'}
        </Button>
      </div>
      {promoError && <p id="counter-promo-error" className="counter-promo-error" role="alert">{promoError}</p>}
      {loadingPromos ? (
        <p className="counter-muted" role="status">Đang tải mã khả dụng…</p>
      ) : availablePromos.length > 0 && (
        <div className="counter-promo-chips" role="group" aria-label="Mã khuyến mãi khả dụng">
          {availablePromos.map((item) => (
            <button
              key={item.id ?? item.code}
              type="button"
              aria-pressed={appliedPromo === item.code}
              title={item.description || (item.discountPercent ? `Giảm ${item.discountPercent}%` : undefined)}
              disabled={validatingPromo}
              onClick={() => onApply(item.code)}
            >
              {item.code}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Cột phải màn bán vé. Bước chọn suất và chọn ghế: phiếu bán vé (hóa đơn tạm tính, nút chuyển bước).
 * Bước thu tiền: tóm tắt đơn kèm mã khuyến mãi, tổng thu và nút thu tiền.
 */
export default function StaffReceiptSidebar({
  canContinueSeats,
  canContinueSelection,
  cashChange,
  cashReceived,
  continueFromSeats,
  continueFromSelection,
  currentStep,
  customerLabel,
  finalPrice,
  foodQuantity,
  foodTotal,
  handleResetOrder,
  handleSubmit,
  onChangeShowtime,
  onEditOrder,
  paymentMethod,
  posterUrl,
  promo,
  seatGroups,
  seatTotal,
  selectedFoodItems,
  selectedSeatTickets,
  selectedSeats,
  selectedShowtime,
  showtimeId,
  submitting,
  toggleSeat,
}) {
  const format = selectedShowtime ? formatScreening(selectedShowtime.screeningFormat, selectedShowtime.roomTechnology) : '';

  if (currentStep === 'CHECKOUT') {
    const isCash = paymentMethod === 'CASH';
    const hasReceived = cashReceived !== '';
    const short = isCash && hasReceived && cashChange < 0;
    return (
      <aside className="counter-receipt" aria-label="Tóm tắt đơn">
        <div className="counter-receipt-banner">
          <span><TicketIcon size={18} aria-hidden="true" /> Tóm tắt đơn</span>
          <button type="button" disabled={submitting} onClick={onEditOrder}>Sửa</button>
        </div>

        <div className="counter-receipt-body" tabIndex={0} role="region" aria-label="Chi tiết đơn">
          <div className="counter-receipt-movie">
            <SafeImage src={posterUrl} alt={selectedShowtime?.movieName || ''} className="counter-receipt-poster" />
            <div>
              <h3>{selectedShowtime?.movieName}</h3>
              <span>{[selectedShowtime?.branchName, selectedShowtime && `${selectedShowtime.roomName || 'Phòng chiếu'} (${format})`].filter(Boolean).join(' · ')}</span>
              <span><strong className="counter-receipt-time">{formatTime(selectedShowtime?.startTime)}</strong> · {formatDate(selectedShowtime?.startTime)}</span>
              <span className="counter-chips">
                {selectedSeatTickets.map((ticket) => <span key={ticket.seatId} className="counter-chip">{seatCodeOf(ticket)}</span>)}
              </span>
            </div>
          </div>
          <div className="counter-lines">
            <SeatGroupLines seatGroups={seatGroups} />
            <FoodLines items={selectedFoodItems} />
          </div>
          <PromoBox promo={promo} />
        </div>

        <div className="counter-receipt-summary">
          <div className="counter-line"><span>Tạm tính</span><strong>{formatCurrency(seatTotal + foodTotal)}</strong></div>
          {promo.promoDiscount > 0 && (
            <div className="counter-line counter-line--discount">
              <span>Giảm giá ({promo.appliedPromo})</span><strong>−{formatCurrency(promo.promoDiscount)}</strong>
            </div>
          )}
          <div className="counter-line"><span>Khách hàng</span><strong>{customerLabel}</strong></div>
          {isCash && hasReceived && cashChange >= 0 && (
            <div className="counter-line">
              <span>Khách đưa / trả lại</span>
              <strong>{formatCurrency(Number(cashReceived))} / {formatCurrency(cashChange)}</strong>
            </div>
          )}
          <div className="counter-total"><span>Tổng thu</span><strong>{formatCurrency(finalPrice)}</strong></div>
        </div>

        <div className="counter-receipt-actions counter-receipt-actions--checkout">
          <Button variant="primary" size="lg" className="counter-submit" onClick={handleSubmit} disabled={submitting}
            icon={submitting ? null : isCash ? <CheckIcon size={17} /> : <QrCodeIcon size={17} />}>
            {submitting ? 'Đang xử lý…' : isCash ? `Thu ${formatCurrency(finalPrice)} & xuất vé` : `Tạo mã QR · ${formatCurrency(finalPrice)}`}
          </Button>
          {short && <p className="counter-short" role="alert">Khách đưa chưa đủ tiền. Kiểm tra lại trước khi xuất vé.</p>}
          <div className="counter-receipt-links">
            <button type="button" className="counter-link-button" disabled={submitting} onClick={onEditOrder}>
              <ArrowLeftIcon size={15} aria-hidden="true" /> Quay lại chọn ghế
            </button>
            <button type="button" className="counter-link-button counter-link-button--danger" disabled={submitting} onClick={handleResetOrder}>
              Hủy đơn
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="counter-receipt" aria-label="Phiếu bán vé">
      <div className="counter-receipt-banner">
        <span><TicketIcon size={18} aria-hidden="true" /> Phiếu bán vé</span>
        {(showtimeId || selectedSeats.length > 0 || foodQuantity > 0) && (
          <button type="button" disabled={submitting} onClick={handleResetOrder}>Xóa giỏ</button>
        )}
      </div>

      <div className="counter-receipt-body" tabIndex={0} role="region" aria-label="Chi tiết giỏ hàng">
        <div className="counter-receipt-movie">
          {selectedShowtime && (
            <SafeImage src={posterUrl} alt={selectedShowtime.movieName} className="counter-receipt-poster" />
          )}
          <div>
            <h3>{selectedShowtime ? selectedShowtime.movieName : 'Chưa chọn suất chiếu'}</h3>
            {selectedShowtime ? (
              <>
                <span>Rạp: <strong>{selectedShowtime.branchName}</strong></span>
                <span>Phòng: <strong>{selectedShowtime.roomName}{format ? ` (${format})` : ''}</strong></span>
                <span>Suất: <strong className="counter-receipt-time">{formatTime(selectedShowtime.startTime)}</strong> · {formatDate(selectedShowtime.startTime)}</span>
              </>
            ) : (
              <span className="counter-muted">Chọn một suất chiếu để bắt đầu lập phiếu.</span>
            )}
          </div>
        </div>

        <div className="counter-receipt-section">
          <div className="counter-receipt-section-head">
            <span>Ghế đã chọn ({selectedSeats.length})</span>
            {selectedSeats.length > 0 && <span>{formatCurrency(seatTotal)}</span>}
          </div>
          {selectedSeatTickets.length === 0 ? (
            <span className="counter-muted">Chưa chọn ghế nào</span>
          ) : (
            <>
              <div className="counter-chips">
                {selectedSeatTickets.map((ticket) => {
                  const code = seatCodeOf(ticket);
                  return (
                    <span key={ticket.seatId} className="counter-chip">
                      {code}
                      <button type="button" onClick={() => toggleSeat(ticket)} aria-label={`Bỏ ghế ${code}`}>
                        <XIcon size={13} aria-hidden="true" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <SeatGroupLines seatGroups={seatGroups} />
            </>
          )}
        </div>

        <div className="counter-receipt-section">
          <div className="counter-receipt-section-head">
            <span>Bắp nước kèm ({foodQuantity})</span>
            {foodTotal > 0 && <span>{formatCurrency(foodTotal)}</span>}
          </div>
          {selectedFoodItems.length === 0
            ? <span className="counter-muted">Không có đồ ăn kèm</span>
            : <FoodLines items={selectedFoodItems} />}
        </div>
      </div>

      <div className="counter-receipt-summary">
        <div className="counter-line"><span>Tiền vé</span><strong>{formatCurrency(seatTotal)}</strong></div>
        <div className="counter-line"><span>Tiền bắp nước</span><strong>{formatCurrency(foodTotal)}</strong></div>
        <div className="counter-total"><span>Tổng thu</span><strong>{formatCurrency(finalPrice)}</strong></div>
      </div>

      <div className="counter-receipt-actions">
        {currentStep === 'SELECTION' ? (
          <Button variant="primary" block disabled={!canContinueSelection} onClick={continueFromSelection}>
            Tiếp tục chọn ghế <ArrowRightIcon size={16} aria-hidden="true" />
          </Button>
        ) : (
          <>
            <Button onClick={onChangeShowtime}>Đổi suất</Button>
            <Button variant="primary" disabled={!canContinueSeats} onClick={continueFromSeats}>
              {canContinueSeats ? <>Sang thu tiền <ArrowRightIcon size={16} aria-hidden="true" /></> : 'Chọn ít nhất 1 ghế'}
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}

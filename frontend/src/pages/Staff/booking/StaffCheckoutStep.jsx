import {
  BanknoteIcon,
  CalculatorIcon,
  CreditCardIcon,
  GiftIcon,
} from '../../../components/Common/CinemaIcons';
import { formatCurrency } from './staffBookingUtils';

/** Bước 4: chọn phương thức thanh toán, tính tiền thừa, mã khuyến mãi và thông tin khách. */
export default function StaffCheckoutStep({
  availablePromos,
  cashChange,
  cashPresets,
  cashReceived,
  customer,
  finalPrice,
  handleShowPromos,
  handleValidatePromo,
  loadingPromos,
  paymentMethod,
  promoCode,
  promoError,
  setCashReceived,
  setCustomer,
  setPaymentMethod,
  setPromoCode,
  setShowPromos,
  showPromos,
  validatingPromo,
}) {
  return (
    <div className="pos-checkout-card">
      {/* Payment Method Cards */}
      <div>
        <h3 className="pos-section-title">
          <span>1. Phương thức thanh toán</span>
          <small>Chọn hình thức thu tiền tại quầy</small>
        </h3>
        <div className="pos-payment-methods">
          <button
            type="button"
            onClick={() => setPaymentMethod('CASH')}
            aria-pressed={paymentMethod === 'CASH'}
            className={`pos-pay-card ${
              paymentMethod === 'CASH' ? 'pos-pay-card--active' : ''
            }`}
          >
            <div className="pos-pay-icon">
              <BanknoteIcon size={22} />
            </div>
            <div className="pos-pay-info">
              <strong>Tiền mặt tại quầy</strong>
              <span>Thu tiền trực tiếp & in vé ngay</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('CARD')}
            aria-pressed={paymentMethod === 'CARD'}
            className={`pos-pay-card ${
              paymentMethod === 'CARD' ? 'pos-pay-card--active' : ''
            }`}
          >
            <div className="pos-pay-icon">
              <CreditCardIcon size={22} />
            </div>
            <div className="pos-pay-info">
              <strong>VNPay / QR Ngân hàng</strong>
              <span>Chuyển sang cổng thanh toán VNPay</span>
            </div>
          </button>
        </div>
      </div>

      {/* Quick Cash Calculator (Only for CASH) */}
      {paymentMethod === 'CASH' && (
        <div className="pos-cash-calc">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CalculatorIcon size={16} />
              <span>Công cụ tính tiền thừa nhanh (Không bắt buộc)</span>
            </strong>
            <div className="pos-cash-presets">
              {cashPresets.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setCashReceived(String(amount))}
                  className={`pos-cash-preset-btn ${
                    Number(cashReceived) === amount ? 'pos-cash-preset-btn--active' : ''
                  }`}
                >
                  {amount === finalPrice ? 'Đúng số tiền' : formatCurrency(amount)}
                </button>
              ))}
            </div>
          </div>

          <div className="pos-cash-row">
            <div className="pos-field">
              <label>Tiền khách đưa (VNĐ)</label>
              <input
                type="number"
                min="0"
                step="1000"
                className="input"
                placeholder={`Nhập số tiền (VD: ${finalPrice})`}
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
              />
            </div>

            <div
              className={`pos-change-box ${
                cashReceived && cashChange < 0 ? 'pos-change-box--short' : ''
              }`}
            >
              <span>
                {!cashReceived
                  ? 'Tiền thừa trả khách'
                  : cashChange >= 0
                  ? 'Tiền thừa trả khách'
                  : 'Khách đưa còn thiếu'}
              </span>
              <strong>
                {!cashReceived
                  ? formatCurrency(0)
                  : formatCurrency(Math.abs(cashChange))}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Promotion Code */}
      <div>
        <div className="pos-section-title">
          <span>2. Mã khuyến mãi / Voucher</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleShowPromos}
            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
          >
            <GiftIcon size={15} />
            <span>{showPromos ? 'Đóng danh sách mã' : 'Xem mã khả dụng'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            className="input"
            placeholder="Nhập mã giảm giá (nếu có)..."
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            style={{ textTransform: 'uppercase', flex: 1 }}
            onKeyDown={(e) =>
              e.key === 'Enter' && (e.preventDefault(), handleValidatePromo())
            }
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleValidatePromo}
            disabled={validatingPromo || !promoCode.trim()}
          >
            {validatingPromo ? 'Đang kiểm tra...' : 'Áp dụng'}
          </button>
        </div>
        {promoError && (
          <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: 6 }}>
            {promoError}
          </div>
        )}

        {showPromos && (
          <div
            style={{
              marginTop: 12,
              background: '#f8fafc',
              padding: 12,
              borderRadius: 10,
              border: '1px solid var(--border)',
              maxHeight: 210,
              overflowY: 'auto',
            }}
          >
            {loadingPromos ? (
              <div
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                Đang tải...
              </div>
            ) : availablePromos.length === 0 ? (
              <div
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                Không có mã khuyến mãi khả dụng
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {availablePromos.map((promo) => (
                  <div
                    key={promo.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                    }}
                    onClick={() => {
                      setPromoCode(promo.code);
                      setShowPromos(false);
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--seat-available)' }}>
                        {promo.code}
                      </strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {promo.description || `Giảm ${promo.discountPercent}%`}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'var(--blue)',
                      }}
                    >
                      Chọn mã
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer Info */}
      <div>
        <h3 className="pos-section-title">
          <span>3. Thông tin khách hàng (Tùy chọn)</span>
          <small>Dùng để gửi vé điện tử hoặc tra cứu bảo hành vé</small>
        </h3>
        <div className="pos-customer-grid">
          <div className="pos-field">
            <label>Họ và tên khách</label>
            <input
              className="input"
              placeholder="Khách vãng lai"
              value={customer.customerName}
              onChange={(e) =>
                setCustomer({ ...customer, customerName: e.target.value })
              }
            />
          </div>
          <div className="pos-field">
            <label>Số điện thoại</label>
            <input
              className="input"
              placeholder="09xx..."
              value={customer.customerPhone}
              onChange={(e) =>
                setCustomer({ ...customer, customerPhone: e.target.value })
              }
            />
          </div>
          <div className="pos-field">
            <label>Email nhận vé</label>
            <input
              className="input"
              placeholder="example@email.com"
              value={customer.customerEmail}
              onChange={(e) =>
                setCustomer({ ...customer, customerEmail: e.target.value })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

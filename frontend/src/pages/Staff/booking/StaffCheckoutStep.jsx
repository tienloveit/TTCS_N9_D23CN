import {
  BanknoteIcon,
  CalculatorIcon,
  CheckIcon,
  CreditCardIcon,
  GiftIcon,
} from '../../../components/Common/CinemaIcons';
import Button from '../../../components/Common/Button';
import { formatCurrency } from './staffBookingUtils';

/**
 * Kết quả tra cứu khách theo SĐT/email. Khi trùng một tài khoản có sẵn, nhân viên hỏi lại khách rồi
 * bấm xác nhận; backend từ chối bán nếu chưa xác nhận, để vé và email QR không đến nhầm người.
 */
function CustomerMatch({ confirmedCustomerId, lookup, onConfirm, onLookup }) {
  if (!lookup) return null;
  if (lookup.status === 'checking') {
    return <p className="pos-customer-match" role="status">Đang kiểm tra thông tin khách…</p>;
  }
  if (lookup.status === 'error') {
    return (
      <div className="pos-customer-match pos-customer-match--error" role="alert">
        <span>{lookup.message}</span>
        <Button size="sm" onClick={onLookup}>Kiểm tra lại</Button>
      </div>
    );
  }
  if (lookup.status === 'none') {
    return (
      <p className="pos-customer-match" role="status">
        Chưa có tài khoản với thông tin này. Khi thu tiền, hệ thống tạo hồ sơ khách mới.
      </p>
    );
  }

  const { data } = lookup;
  const confirmed = confirmedCustomerId === data.customerId;
  const name = data.maskedName || (data.guestAccount ? 'Khách từng mua tại quầy' : 'Khách hàng');
  const details = [data.maskedPhone, data.maskedEmail, data.membershipTier && 'Hạng ' + data.membershipTier]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className={'pos-customer-match pos-customer-match--found' + (confirmed ? ' is-confirmed' : '')} role="status">
      <div>
        <strong>{confirmed ? 'Đã xác nhận: ' : 'Trùng tài khoản: '}{name}</strong>
        {details && <span>{details}</span>}
        <small>
          {confirmed
            ? 'Đơn và vé sẽ gắn vào tài khoản này; vé điện tử gửi về email của tài khoản.'
            : 'Hỏi lại khách trước khi bán. Nếu không đúng người, sửa lại SĐT hoặc email.'}
        </small>
      </div>
      {confirmed ? (
        <Button size="sm" variant="ghost" onClick={() => onConfirm(null)}>Bỏ xác nhận</Button>
      ) : (
        <Button size="sm" variant="primary" icon={<CheckIcon size={15} />} onClick={() => onConfirm(data.customerId)}>
          Đúng khách này
        </Button>
      )}
    </div>
  );
}

/** Bước 4: chọn phương thức thanh toán, tính tiền thừa, mã khuyến mãi và thông tin khách. */
export default function StaffCheckoutStep({
  availablePromos,
  cashChange,
  cashPresets,
  cashReceived,
  confirmedCustomerId,
  customer,
  customerLookup,
  finalPrice,
  onConfirmCustomer,
  onLookupCustomer,
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
  const short = Boolean(cashReceived) && cashChange < 0;

  return (
    <div className="pos-checkout-card">
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
            className={`pos-pay-card ${paymentMethod === 'CASH' ? 'pos-pay-card--active' : ''}`}
          >
            <div className="pos-pay-icon"><BanknoteIcon size={22} aria-hidden="true" /></div>
            <div className="pos-pay-info">
              <strong>Tiền mặt tại quầy</strong>
              <span>Thu tiền trực tiếp và in vé ngay</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('VNPAY')}
            aria-pressed={paymentMethod === 'VNPAY'}
            className={`pos-pay-card ${paymentMethod === 'VNPAY' ? 'pos-pay-card--active' : ''}`}
          >
            <div className="pos-pay-icon"><CreditCardIcon size={22} aria-hidden="true" /></div>
            <div className="pos-pay-info">
              <strong>VNPay / QR ngân hàng</strong>
              <span>Khách quét QR hoặc thanh toán trên cổng VNPay</span>
            </div>
          </button>
        </div>
      </div>

      {paymentMethod === 'CASH' && (
        <div className="pos-cash-calc">
          <div className="pos-cash-head">
            <strong className="pos-cash-title">
              <CalculatorIcon size={16} aria-hidden="true" />
              <span>Tính tiền thừa (không bắt buộc)</span>
            </strong>
            <div className="pos-cash-presets" role="group" aria-label="Số tiền khách đưa">
              {cashPresets.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  aria-pressed={Number(cashReceived) === amount}
                  onClick={() => setCashReceived(String(amount))}
                  className={`pos-cash-preset-btn ${Number(cashReceived) === amount ? 'pos-cash-preset-btn--active' : ''}`}
                >
                  {amount === finalPrice ? 'Đúng số tiền' : formatCurrency(amount)}
                </button>
              ))}
            </div>
          </div>

          <div className="pos-cash-row">
            <div className="pos-field">
              <label htmlFor="pos-cash-received">Tiền khách đưa (đ)</label>
              <input
                id="pos-cash-received"
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                className="input"
                placeholder={`Nhập số tiền (VD: ${finalPrice})`}
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
              />
            </div>

            <div className={`pos-change-box ${short ? 'pos-change-box--short' : ''}`} aria-live="polite">
              <span>{short ? 'Khách đưa còn thiếu' : 'Tiền thừa trả khách'}</span>
              <strong>{formatCurrency(cashReceived ? Math.abs(cashChange) : 0)}</strong>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="pos-section-title">
          <label htmlFor="pos-promo-code">2. Mã khuyến mãi</label>
          <Button size="sm" variant="ghost" icon={<GiftIcon size={15} />} aria-expanded={showPromos} onClick={handleShowPromos}>
            {showPromos ? 'Đóng danh sách mã' : 'Xem mã khả dụng'}
          </Button>
        </div>

        <div className="pos-promo-row">
          <input
            id="pos-promo-code"
            type="text"
            className="input pos-promo-input"
            placeholder="Nhập mã giảm giá (nếu có)"
            value={promoCode}
            aria-invalid={Boolean(promoError)}
            aria-describedby={promoError ? 'pos-promo-error' : undefined}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleValidatePromo();
              }
            }}
          />
          <Button onClick={handleValidatePromo} disabled={validatingPromo || !promoCode.trim()}>
            {validatingPromo ? 'Đang kiểm tra…' : 'Áp dụng'}
          </Button>
        </div>
        {promoError && <p id="pos-promo-error" className="pos-promo-error" role="alert">{promoError}</p>}

        {showPromos && (
          <div className="pos-promo-list">
            {loadingPromos ? (
              <p className="pos-promo-note" role="status">Đang tải…</p>
            ) : availablePromos.length === 0 ? (
              <p className="pos-promo-note">Không có mã khuyến mãi khả dụng</p>
            ) : (
              <ul>
                {availablePromos.map((promo) => (
                  <li key={promo.id}>
                    <button
                      type="button"
                      className="pos-promo-option"
                      onClick={() => {
                        setPromoCode(promo.code);
                        setShowPromos(false);
                      }}
                    >
                      <span>
                        <strong>{promo.code}</strong>
                        <small>{promo.description || `Giảm ${promo.discountPercent}%`}</small>
                      </span>
                      <span className="pos-promo-pick">Chọn mã</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="pos-section-title">
          <span>3. Thông tin khách hàng (tùy chọn)</span>
          <small>Dùng để gửi vé điện tử hoặc tra cứu đơn sau này</small>
        </h3>
        <div className="pos-customer-grid">
          <div className="pos-field">
            <label htmlFor="pos-customer-name">Họ và tên khách</label>
            <input
              id="pos-customer-name"
              className="input"
              autoComplete="off"
              placeholder="Khách vãng lai"
              value={customer.customerName}
              onChange={(e) => setCustomer({ ...customer, customerName: e.target.value })}
            />
          </div>
          <div className="pos-field">
            <label htmlFor="pos-customer-phone">Số điện thoại</label>
            <input
              id="pos-customer-phone"
              className="input"
              inputMode="tel"
              autoComplete="off"
              placeholder="09xx..."
              value={customer.customerPhone}
              onChange={(e) => setCustomer({ ...customer, customerPhone: e.target.value })}
              onBlur={onLookupCustomer}
            />
          </div>
          <div className="pos-field">
            <label htmlFor="pos-customer-email">Email nhận vé</label>
            <input
              id="pos-customer-email"
              className="input"
              type="email"
              autoComplete="off"
              placeholder="example@email.com"
              value={customer.customerEmail}
              onChange={(e) => setCustomer({ ...customer, customerEmail: e.target.value })}
              onBlur={onLookupCustomer}
            />
          </div>
        </div>
        <CustomerMatch
          confirmedCustomerId={confirmedCustomerId}
          lookup={customerLookup}
          onConfirm={onConfirmCustomer}
          onLookup={onLookupCustomer}
        />
      </div>
    </div>
  );
}

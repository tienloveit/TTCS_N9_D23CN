import {
  AlertCircleIcon,
  BanknoteIcon,
  CheckIcon,
  QrCodeIcon,
} from '../../../components/Common/CinemaIcons';
import Button from '../../../components/Common/Button';
import { formatCurrency, maskedInitials } from './staffBookingUtils';

const moneyInput = new Intl.NumberFormat('vi-VN');

/**
 * Kết quả tra cứu khách theo SĐT/email. Khi trùng một tài khoản có sẵn, nhân viên hỏi lại khách rồi
 * bấm xác nhận; backend từ chối bán nếu chưa xác nhận, để vé và email QR không đến nhầm người.
 */
function CustomerMatch({ confirmedCustomerId, lookup, onConfirm, onLookup }) {
  if (!lookup) return null;
  if (lookup.status === 'checking') {
    return <p className="counter-match" role="status">Đang kiểm tra thông tin khách…</p>;
  }
  if (lookup.status === 'error') {
    return (
      <div className="counter-match counter-match--error" role="alert">
        <span>{lookup.message}</span>
        <Button size="sm" onClick={onLookup}>Kiểm tra lại</Button>
      </div>
    );
  }
  if (lookup.status === 'none') {
    return (
      <p className="counter-match" role="status">
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
    <div className={'counter-match counter-match--found' + (confirmed ? ' is-confirmed' : '')} role="status">
      <div className="counter-match-who">
        <span className="counter-avatar" aria-hidden="true">{maskedInitials(name)}</span>
        <div>
          <strong>{confirmed ? 'Đã xác nhận: ' : 'Trùng tài khoản: '}{name}</strong>
          {details && <span>{details}</span>}
          <small>
            {confirmed
              ? 'Đơn và vé gắn vào tài khoản này, vé điện tử gửi về email của tài khoản.'
              : 'Hỏi lại khách trước khi bán. Không đúng người thì sửa SĐT hoặc email.'}
          </small>
        </div>
      </div>
      {confirmed ? (
        <Button size="sm" onClick={() => onConfirm(null)}>Bỏ xác nhận</Button>
      ) : (
        <Button size="sm" variant="primary" icon={<CheckIcon size={15} />} onClick={() => onConfirm(data.customerId)}>
          Đúng khách này
        </Button>
      )}
    </div>
  );
}

/** Bước 3: thông tin khách và phương thức thanh toán. Mã khuyến mãi và tổng tiền nằm ở cột tóm tắt đơn. */
export default function StaffCheckoutStep({
  cashChange,
  cashReceived,
  confirmedCustomerId,
  customer,
  customerLookup,
  onConfirmCustomer,
  onLookupCustomer,
  paymentMethod,
  selectedSeatCodes,
  setCashReceived,
  setCustomer,
  setPaymentMethod,
}) {
  const isCash = paymentMethod === 'CASH';
  const hasReceived = cashReceived !== '';
  const short = hasReceived && cashChange < 0;
  const changeTone = !hasReceived ? '' : short ? ' counter-change--short' : ' counter-change--ok';

  return (
    <>
      {/* Đơn tại quầy chỉ được tạo (và ghế chỉ được giữ) khi thu tiền hoặc tạo mã QR. */}
      <p className="counter-hold-note" role="note">
        <AlertCircleIcon size={18} aria-hidden="true" />
        <span>
          Ghế <strong>{selectedSeatCodes.join(', ')}</strong> chưa được giữ. Hệ thống giữ ghế khi bạn thu tiền hoặc tạo mã QR;
          nếu khách khác đặt trước, ghế đó sẽ tự bỏ khỏi đơn.
        </span>
      </p>

      <section className="counter-card counter-checkout-section" aria-labelledby="counter-customer-title">
        <div className="counter-section-head">
          <h2 id="counter-customer-title"><span className="counter-step-num" aria-hidden="true">1</span>Thông tin khách <small>(tùy chọn)</small></h2>
          <span>Gửi vé điện tử, cộng điểm thành viên</span>
        </div>
        <div className="counter-fields">
          <label>
            <span>Số điện thoại</span>
            <input className="input" inputMode="tel" autoComplete="off" placeholder="09xx..."
              value={customer.customerPhone}
              onChange={(event) => setCustomer({ ...customer, customerPhone: event.target.value })}
              onBlur={onLookupCustomer} />
          </label>
          <label>
            <span>Email nhận vé</span>
            <input className="input" type="email" autoComplete="off" placeholder="example@email.com"
              value={customer.customerEmail}
              onChange={(event) => setCustomer({ ...customer, customerEmail: event.target.value })}
              onBlur={onLookupCustomer} />
          </label>
          <label>
            <span>Họ và tên</span>
            <input className="input" autoComplete="off" placeholder="Khách vãng lai"
              value={customer.customerName}
              onChange={(event) => setCustomer({ ...customer, customerName: event.target.value })} />
          </label>
        </div>
        <CustomerMatch
          confirmedCustomerId={confirmedCustomerId}
          lookup={customerLookup}
          onConfirm={onConfirmCustomer}
          onLookup={onLookupCustomer}
        />
      </section>

      <section className="counter-card counter-checkout-section" aria-labelledby="counter-pay-title">
        <h2 id="counter-pay-title"><span className="counter-step-num" aria-hidden="true">2</span>Phương thức thanh toán</h2>
        <div className="counter-pay" role="radiogroup" aria-labelledby="counter-pay-title">
          <label className={'counter-pay-option' + (isCash ? ' is-active' : '')}>
            <input type="radio" name="counter-payment" value="CASH" checked={isCash} onChange={() => setPaymentMethod('CASH')} />
            <span className="counter-pay-icon counter-pay-icon--cash" aria-hidden="true"><BanknoteIcon size={20} /></span>
            <span className="counter-pay-text"><strong>Tiền mặt</strong><small>Thu tại quầy, xuất vé ngay</small></span>
          </label>

          {isCash && (
            <div className="counter-cash">
              <label className="counter-cash-input">
                <span>Tiền khách đưa</span>
                <span className="counter-money">
                  <input
                    className="input"
                    inputMode="numeric"
                    placeholder="0"
                    value={hasReceived ? moneyInput.format(Number(cashReceived)) : ''}
                    onChange={(event) => setCashReceived(event.target.value.replace(/\D/g, ''))}
                  />
                  <span aria-hidden="true">₫</span>
                </span>
                <small>Để trống nếu khách đưa đúng số tiền</small>
              </label>
              <div className={'counter-change' + changeTone} role="status">
                <span>{short ? 'Khách đưa còn thiếu' : 'Tiền thừa trả khách'}</span>
                <strong>{hasReceived ? formatCurrency(Math.abs(cashChange)) : '—'}</strong>
              </div>
            </div>
          )}

          <label className={'counter-pay-option counter-pay-option--vnpay' + (!isCash ? ' is-active' : '')}>
            <input type="radio" name="counter-payment" value="VNPAY" checked={!isCash} onChange={() => setPaymentMethod('VNPAY')} />
            <span className="counter-pay-icon counter-pay-icon--vnpay" aria-hidden="true"><QrCodeIcon size={20} /></span>
            <span className="counter-pay-text"><strong>VNPay / QR ngân hàng</strong><small>Khách quét QR bằng app ngân hàng hoặc ví</small></span>
          </label>

          {!isCash && (
            <div className="counter-vnpay-note">
              <strong>Bấm "Tạo mã QR" để hiện mã cho khách quét.</strong>
              <span>Màn hình đếm ngược theo hạn hệ thống trả về. Có thể hủy giao dịch để đổi sang tiền mặt mà không mất giỏ hàng.</span>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

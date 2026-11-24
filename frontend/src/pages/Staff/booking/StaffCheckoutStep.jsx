import {
  AlertCircleIcon,
  CheckIcon,
} from '../../../components/Common/CinemaIcons';
import { ChoiceCards, Field, Money, OpsButton, OpsPanel, TextInput } from '../../../components/Ops';
import { maskedInitials } from './staffBookingUtils';

const moneyInput = new Intl.NumberFormat('vi-VN');
const paymentOptions = [
  { value: 'CASH', label: 'Tiền mặt', description: 'Thu tại quầy, xuất vé ngay' },
  { value: 'VNPAY', label: 'VNPay / QR ngân hàng', description: 'Khách quét mã để thanh toán' },
];

/**
 * Kết quả tra cứu khách theo SĐT/email. Khi trùng một tài khoản có sẵn, nhân viên hỏi lại khách rồi
 * bấm xác nhận; backend từ chối bán nếu chưa xác nhận, để vé và email QR không đến nhầm người.
 */
function CustomerMatch({ confirmedCustomerId, lookup, onConfirm, onLookup }) {
  if (!lookup) return null;
  if (lookup.status === 'checking') {
    return <p className="o-counter-match" role="status">Đang kiểm tra thông tin khách…</p>;
  }
  if (lookup.status === 'error') {
    return (
      <div className="o-counter-match o-counter-match--error" role="alert">
        <span>{lookup.message}</span>
        <OpsButton size="sm" onClick={onLookup}>Kiểm tra lại</OpsButton>
      </div>
    );
  }
  if (lookup.status === 'none') {
    return (
      <p className="o-counter-match" role="status">
        Chưa có tài khoản với thông tin này. Khi thu tiền, hệ thống tạo hồ sơ khách mới.
      </p>
    );
  }

  const { data } = lookup;
  const confirmed = confirmedCustomerId === data.customerId;
  const name = data.maskedName || (data.guestAccount ? 'Khách từng mua tại quầy' : 'Khách hàng');
  const details = [data.maskedPhone, data.maskedEmail, data.membershipTier && 'Hạng ' + data.membershipTier]
    .filter(Boolean)
    .join(', ');
  return (
    <div className="o-counter-match o-counter-match--found" data-confirmed={confirmed || undefined} role="status">
      <div className="o-counter-match-who">
        <span className="o-counter-avatar" aria-hidden="true">{maskedInitials(name)}</span>
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
        <OpsButton size="sm" onClick={() => onConfirm(null)}>Bỏ xác nhận</OpsButton>
      ) : (
        <OpsButton size="sm" variant="primary" icon={<CheckIcon size={15} />} onClick={() => onConfirm(data.customerId)}>
          Đúng khách này
        </OpsButton>
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
  const changeTone = !hasReceived ? '' : short ? ' o-counter-change--short' : ' o-counter-change--ok';

  return (
    <>
      {/* Đơn tại quầy chỉ được tạo (và ghế chỉ được giữ) khi thu tiền hoặc tạo mã QR. */}
      <p className="o-counter-hold-note" role="note">
        <AlertCircleIcon size={18} aria-hidden="true" />
        <span>
          Ghế <strong>{selectedSeatCodes.join(', ')}</strong> chưa được giữ. Hệ thống giữ ghế khi bạn thu tiền hoặc tạo mã QR;
          nếu khách khác đặt trước, ghế đó sẽ tự bỏ khỏi đơn.
        </span>
      </p>

      <OpsPanel title="Thông tin khách" description="Dùng để gửi vé điện tử và cộng điểm thành viên.">
        <div className="o-form">
          <div className="o-form-grid">
            <Field label="Số điện thoại"><TextInput inputMode="tel" autoComplete="off"
              value={customer.customerPhone} onBlur={onLookupCustomer}
              onChange={event => setCustomer({ ...customer, customerPhone: event.target.value })} /></Field>
            <Field label="Email nhận vé"><TextInput type="email" autoComplete="off"
              value={customer.customerEmail} onBlur={onLookupCustomer}
              onChange={event => setCustomer({ ...customer, customerEmail: event.target.value })} /></Field>
            <Field label="Họ và tên"><TextInput autoComplete="off" placeholder="Khách tại quầy"
              value={customer.customerName}
              onChange={event => setCustomer({ ...customer, customerName: event.target.value })} /></Field>
          </div>
          <CustomerMatch confirmedCustomerId={confirmedCustomerId} lookup={customerLookup}
            onConfirm={onConfirmCustomer} onLookup={onLookupCustomer} />
        </div>
      </OpsPanel>

      <OpsPanel title="Thanh toán">
        <div className="o-form">
          <ChoiceCards name="o-counter-payment" label="Phương thức thanh toán"
            options={paymentOptions} value={paymentMethod} onChange={setPaymentMethod} />
          {isCash ? (
            <div className="o-counter-cash">
              <Field label="Tiền khách đưa (đ)" hint="Để trống nếu khách đưa đúng số tiền">
                <TextInput inputMode="numeric" placeholder="0" value={hasReceived ? moneyInput.format(Number(cashReceived)) : ''}
                  onChange={event => setCashReceived(event.target.value.replace(/\D/g, ''))} />
              </Field>
              <div className={'o-counter-change' + changeTone} role="status">
                <span>{short ? 'Khách đưa còn thiếu' : 'Tiền thừa trả khách'}</span>
                <strong>{hasReceived ? <Money value={Math.abs(cashChange)} /> : '—'}</strong>
              </div>
            </div>
          ) : (
            <div className="o-counter-vnpay-note">
              <strong>Bấm “Tạo mã QR” để hiện mã cho khách quét.</strong>
              <span>Màn hình hiển thị hạn giữ ghế từ hệ thống. Bạn có thể hủy giao dịch để đổi sang tiền mặt và giữ giỏ hàng.</span>
            </div>
          )}
        </div>
      </OpsPanel>
    </>
  );
}

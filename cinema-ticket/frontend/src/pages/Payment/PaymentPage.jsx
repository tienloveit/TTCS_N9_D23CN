import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { bookingApi, vnpayApi, promotionApi } from '../../api';
import BookingReceipt from '../../components/Common/BookingReceipt';
import {
  AlertTriangleIcon,
  CheckIcon,
  CreditCardIcon,
  GiftIcon,
  ShieldIcon,
  TimerIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';

export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [availablePromos, setAvailablePromos] = useState([]);
  const [showPromos, setShowPromos] = useState(false);
  const [loadingPromos, setLoadingPromos] = useState(false);

  const handleCancel = useCallback(
    async (auto = false) => {
      if (!auto) setCancelling(true);
      try {
        await bookingApi.cancel(bookingId);
        if (auto) {
          toast.error('Hết thời gian giữ ghế. Đơn hàng của bạn đã bị huỷ.');
        } else {
          toast.info('Đã huỷ đơn đặt vé.');
        }
        navigate('/movies');
      } catch {
        if (auto) toast.error('Hết thời gian giữ ghế.');
        navigate('/movies');
      } finally {
        setCancelling(false);
        setShowCancelConfirm(false);
      }
    },
    [bookingId, navigate]
  );

  useEffect(() => {
    bookingApi
      .getById(bookingId)
      .then((res) => {
        const data = res.data.result;
        setBooking(data);

        if (data.status !== 'PENDING' || data.paymentStatus !== 'PENDING') {
          navigate('/my-bookings', { replace: true });
          return;
        }

        const expiry = data.expiresAt
          ? new Date(data.expiresAt).getTime()
          : new Date(data.createdAt).getTime() + 6 * 60 * 1000;
        const now = new Date().getTime();
        const initialTime = Math.max(0, Math.floor((expiry - now) / 1000));

        if (initialTime <= 0) {
          handleCancel(true);
        } else {
          setTimeLeft(initialTime);
        }
      })
      .catch(() => setError('Không tìm thấy thông tin đặt vé'))
      .finally(() => setLoading(false));
  }, [bookingId, handleCancel, navigate]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      if (timeLeft === 0) handleCancel(true);
      return undefined;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, handleCancel]);

  const parseLocalDateTime = (dateStr) => {
    if (!dateStr) return null;
    const [datePart, timePart] = dateStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = (timePart || '00:00').split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute);
  };

  const formatShowtime = (dateStr) => {
    const date = parseLocalDateTime(dateStr);
    if (!date) return '-';

    const dd = date.getDate().toString().padStart(2, '0');
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');

    return `${hh}:${min} - ${dd}/${mm}/${yyyy}`;
  };

  const formatTimeLimit = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')}đ`;

  const handleApplyPromo = async (overrideCode) => {
    const codeToApply = (typeof overrideCode === 'string' ? overrideCode : promoCode).trim();
    if (!codeToApply) return;
    setApplyingPromo(true);
    setPromoError('');
    try {
      const res = await bookingApi.applyPromotion(bookingId, codeToApply);
      setBooking(res.data.result);
      setPromoCode('');
      setShowPromos(false);
      toast.success(`Đã áp dụng mã ${codeToApply}!`);
    } catch (err) {
      setPromoError(err.response?.data?.message || 'Mã không hợp lệ');
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleShowPromos = async () => {
    setShowPromos(!showPromos);
    if (availablePromos.length === 0 && !showPromos) {
      setLoadingPromos(true);
      try {
        const res = await promotionApi.getAvailable();
        setAvailablePromos(res.data.result || []);
      } catch (err) {
        console.error('Failed to fetch promotions', err);
      } finally {
        setLoadingPromos(false);
      }
    }
  };

  const handleRemovePromo = async () => {
    setApplyingPromo(true);
    setPromoError('');
    try {
      const res = await bookingApi.applyPromotion(bookingId, '');
      setBooking(res.data.result);
    } catch {
      // ignore
    } finally {
      setApplyingPromo(false);
    }
  };

  const handleVNPayPayment = async () => {
    setPaying(true);
    setError('');

    try {
      const res = await vnpayApi.createPaymentUrl({
        bookingId,
        amount: booking.totalAmount,
        bankCode: '',
      });

      if (res.data.result?.paymentUrl) {
        window.location.href = res.data.result.paymentUrl;
      } else {
        throw new Error('Missing payment URL');
      }
    } catch {
      setError('Lỗi khởi tạo thanh toán VNPay');
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ padding: 40 }}>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const bookingFoods = booking.foods || [];
  const seatCodes =
    booking.tickets?.map((ticket) => ticket.seatCode).join(', ') ||
    booking.seatCodes?.join(', ') ||
    '-';

  const steps = [
    { label: 'Suất chiếu', done: true },
    { label: 'Chọn ghế', done: true },
    { label: 'Bắp nước', done: true },
    { label: 'Thu tiền & Xuất vé', active: true },
  ];

  const isUrgent = timeLeft !== null && timeLeft < 60;

  return (
    <div className="page">
      <div className="container">
        <div className="booking-steps">
          {steps.map((step, i) => (
            <div key={i} className={`booking-step ${step.active ? 'booking-step--active' : ''} ${step.done ? 'booking-step--done' : ''}`}>
              <div className="booking-step-dot">{step.done ? <CheckIcon size={14} /> : i + 1}</div>
              <span className="booking-step-label">{step.label}</span>
              {i < steps.length - 1 && <div className="booking-step-line" />}
            </div>
          ))}
        </div>

        <div className="pay-layout" style={{ marginTop: 12 }}>
          {/* ===== LEFT COLUMN: Timer + Promotions + Payment Method ===== */}
          <div className="pay-main">
            {timeLeft !== null && (
              <div className={`pay-timer-banner ${isUrgent ? 'is-urgent' : ''}`} role="timer" aria-live="polite">
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem' }}>
                    Thời gian giữ ghế còn lại
                  </strong>
                  <span style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                    Vui lòng hoàn tất thanh toán trước khi hết giờ
                  </span>
                </div>
                <div className="pay-timer-clock">
                  <TimerIcon size={20} />
                  <span>{formatTimeLimit(timeLeft)}</span>
                </div>
              </div>
            )}

            {/* Mã khuyến mãi */}
            <div className="pay-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 className="pay-section-title" style={{ margin: 0 }}>
                  <GiftIcon size={18} style={{ color: 'var(--accent)' }} />
                  Ưu đãi & Mã giảm giá
                </h2>
                {!booking.promotionCode && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleShowPromos}
                    style={{ fontSize: '0.85rem', color: 'var(--blue)' }}
                  >
                    {showPromos ? 'Ẩn danh sách mã' : 'Xem mã khả dụng'}
                  </button>
                )}
              </div>

              {booking.promotionCode ? (
                <div className="pay-promo-applied">
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--seat-available)', letterSpacing: 0.8 }}>
                      {booking.promotionCode}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Đã giảm: <strong>-{formatCurrency(booking.discountAmount)}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleRemovePromo}
                    disabled={applyingPromo || paying || booking.paymentMethod === 'VNPAY'}
                    aria-label="Gỡ mã giảm giá"
                    style={{ color: '#ef4444', padding: 6 }}
                  >
                    <XIcon size={18} />
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      type="text"
                      className="input"
                      aria-label="Nhập mã giảm giá"
                      placeholder="Nhập mã khuyến mãi (VD: MOVIEPTIT)..."
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      style={{ textTransform: 'uppercase', flex: 1 }}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleApplyPromo()}
                      disabled={applyingPromo || paying || booking.paymentMethod === 'VNPAY' || !promoCode.trim()}
                    >
                      {applyingPromo ? 'Đang áp dụng...' : 'Áp dụng'}
                    </button>
                  </div>
                  {promoError && (
                    <div style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: 8 }}>{promoError}</div>
                  )}
                  {showPromos && (
                    <div className="pay-promo-list">
                      {loadingPromos ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>
                          Đang tải danh sách mã...
                        </div>
                      ) : availablePromos.length === 0 ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>
                          Hiện chưa có mã giảm giá khả dụng
                        </div>
                      ) : (
                        availablePromos.map((promo) => (
                          <button
                            key={promo.id || promo.code}
                            type="button"
                            className="pay-promo-option"
                            disabled={applyingPromo || paying || booking.paymentMethod === 'VNPAY'}
                            onClick={() => handleApplyPromo(promo.code)}
                          >
                            <div>
                              <strong style={{ color: 'var(--seat-available)', fontSize: '0.92rem' }}>
                                {promo.code}
                              </strong>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                {promo.description ||
                                  `Giảm ${promo.discountPercent}% (tối đa ${formatCurrency(promo.maxDiscount)})`}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--blue)' }}>
                              Dùng ngay
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Phương thức thanh toán */}
            <div className="pay-card">
              <h2 className="pay-section-title">
                <CreditCardIcon size={18} style={{ color: 'var(--blue)' }} />
                Phương thức thanh toán
              </h2>
              <div className="pay-method-box">
                <span className="pay-method-badge">VNPAY</span>
                <div style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    Cổng thanh toán VNPay QR / Thẻ ATM / Quốc tế
                  </strong>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Xác nhận vé tự động ngay sau khi giao dịch thành công
                  </span>
                </div>
                <CheckIcon size={18} style={{ color: 'var(--blue)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <ShieldIcon size={15} style={{ color: 'var(--green)' }} />
                <span>Giao dịch được bảo mật 100% qua cổng VNPay chuẩn PCI-DSS.</span>
              </div>
            </div>
          </div>

          <BookingReceipt
            className="booking-receipt-payment"
            movieName={booking.movieName}
            posterUrl={booking.movieThumbnailUrl}
            branchName={booking.branchName}
            roomName={booking.roomName}
            showtime={formatShowtime(booking.showtimeStart)}
            seats={booking.tickets?.length
              ? booking.tickets.map((ticket) => ticket.seatCode)
              : booking.seatCodes || []}
            seatLines={(booking.tickets || []).map((ticket) => ({
              id: ticket.id,
              label: `1x Ghế ${ticket.seatCode}`,
              amount: ticket.price,
            }))}
            seatTotal={booking.tickets?.length
              ? booking.tickets.reduce((sum, ticket) => sum + Number(ticket.price || 0), 0)
              : undefined}
            foods={bookingFoods.map((food) => ({
              id: food.foodId, name: food.foodName,
              quantity: food.quantity, subtotal: food.subtotal,
            }))}
            subtotal={Number(booking.totalAmount) + Number(booking.discountAmount || 0)}
            discount={booking.discountAmount || 0}
            promotionCode={booking.promotionCode}
          >
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', height: 52, fontSize: '1.02rem' }}
              onClick={handleVNPayPayment}
              disabled={paying || cancelling || applyingPromo || timeLeft === null || timeLeft <= 0}
            >
              <CreditCardIcon size={18} />
              {paying ? 'Đang chuyển hướng VNPay...' : 'Thanh toán qua VNPay'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={() => setShowCancelConfirm(true)}
              disabled={paying || cancelling}
            >
              Huỷ đặt vé
            </button>
          </BookingReceipt>
        </div>
      </div>

      {/* Confirm Cancel Modal */}
      {showCancelConfirm && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận huỷ đặt vé"
          onClick={() => !cancelling && setShowCancelConfirm(false)}
        >
          <div
            className="card"
            style={{ maxWidth: 440, width: '92%', padding: '28px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: '#dc2626' }}>
              <AlertTriangleIcon size={22} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Xác nhận huỷ đơn đặt vé?
              </h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 22 }}>
              Ghế <strong>{seatCodes}</strong> của phim <strong>{booking.movieName}</strong> sẽ được mở lại ngay cho khán giả khác.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
              >
                Tiếp tục thanh toán
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ background: '#dc2626' }}
                onClick={() => handleCancel(false)}
                disabled={cancelling}
              >
                {cancelling ? 'Đang huỷ...' : 'Đồng ý huỷ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

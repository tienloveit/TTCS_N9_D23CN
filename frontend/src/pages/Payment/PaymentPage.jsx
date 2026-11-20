import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { bookingApi, vnpayApi, promotionApi } from '../../api';
import BookingReceipt from '../../components/Common/BookingReceipt';
import Button from '../../components/Common/Button';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import {
  CheckIcon,
  CreditCardIcon,
  GiftIcon,
  ShieldIcon,
  TimerIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';
import { formatDate, formatTime, parseLocalDateTime } from '../../utils/cinemaTime';

const secondsUntil = (timestampMs) => Math.max(0, Math.floor((timestampMs - Date.now()) / 1000));

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
  // undefined = đang tải, null = backend không trả hạn giữ ghế.
  const [expiresAtMs, setExpiresAtMs] = useState(undefined);
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
          toast.error('Hết thời gian giữ ghế. Đơn hàng của bạn đã bị hủy.');
        } else {
          toast.info('Đã hủy đơn đặt vé.');
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

        // Hạn giữ ghế do backend quyết định (booking.holdMinutes); không tự ước tính.
        const expiry = parseLocalDateTime(data.expiresAt);
        if (!expiry) {
          setExpiresAtMs(null);
          return;
        }

        const initialTime = secondsUntil(expiry.getTime());
        if (initialTime <= 0) {
          handleCancel(true);
        } else {
          setExpiresAtMs(expiry.getTime());
          setTimeLeft(initialTime);
        }
      })
      .catch(() => setError('Không tìm thấy thông tin đặt vé'))
      .finally(() => setLoading(false));
  }, [bookingId, handleCancel, navigate]);

  useEffect(() => {
    if (expiresAtMs === null) return undefined;

    // Tính lại từ mốc hết hạn mỗi lần để không bị lệch khi tab bị trình duyệt tạm dừng.
    const timer = setInterval(() => {
      const remaining = secondsUntil(expiresAtMs);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        handleCancel(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAtMs, handleCancel]);

  const formatShowtime = (dateStr) =>
    parseLocalDateTime(dateStr) ? `${formatTime(dateStr)} - ${formatDate(dateStr)}` : '-';

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
      <div className="container page-error">
        <div className="error-message" role="alert">{error}</div>
        <Button to="/my-bookings">Xem vé của tôi</Button>
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
    { label: 'Thanh toán', active: true },
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

        <div className="pay-layout">
          {/* ===== LEFT COLUMN: Timer + Promotions + Payment Method ===== */}
          <div className="pay-main">
            {expiresAtMs === null && (
              <div className="pay-timer-banner" role="status">
                <div>
                  <strong className="pay-timer-title">
                    Chưa xác định được hạn giữ ghế
                  </strong>
                  <span className="pay-timer-note">
                    Hệ thống sẽ kiểm tra lại khi bạn thanh toán. Hãy hoàn tất sớm để giữ ghế.
                  </span>
                </div>
              </div>
            )}

            {expiresAtMs !== null && timeLeft !== null && (
              <div className={`pay-timer-banner ${isUrgent ? 'is-urgent' : ''}`} role="timer" aria-live="polite">
                <div>
                  <strong className="pay-timer-title">
                    Thời gian giữ ghế còn lại
                  </strong>
                  <span className="pay-timer-note">
                    Hết giờ, ghế sẽ được mở lại cho khách khác.
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
              <div className="pay-card-header">
                <h2 className="pay-section-title">
                  <GiftIcon size={18} aria-hidden="true" />
                  Mã giảm giá
                </h2>
                {!booking.promotionCode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="pay-link-button"
                    aria-expanded={showPromos}
                    onClick={handleShowPromos}
                  >
                    {showPromos ? 'Ẩn danh sách mã' : 'Xem mã khả dụng'}
                  </Button>
                )}
              </div>

              {booking.promotionCode ? (
                <div className="pay-promo-applied">
                  <div>
                    <div className="pay-promo-code">{booking.promotionCode}</div>
                    <div className="pay-promo-saving">
                      Đã giảm: <strong>-{formatCurrency(booking.discountAmount)}</strong>
                    </div>
                  </div>
                  <Button
                    variant="ghost-danger"
                    size="sm"
                    onClick={handleRemovePromo}
                    disabled={applyingPromo || paying || booking.paymentMethod === 'VNPAY'}
                    aria-label={`Gỡ mã ${booking.promotionCode}`}
                    title="Gỡ mã giảm giá"
                    icon={<XIcon size={18} />}
                  />
                </div>
              ) : (
                <div>
                  <div className="pay-promo-form">
                    <input
                      type="text"
                      className="input"
                      aria-label="Nhập mã giảm giá"
                      aria-invalid={Boolean(promoError)}
                      aria-describedby={promoError ? 'pay-promo-error' : undefined}
                      placeholder="Nhập mã, ví dụ MOVIEPTIT"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                    />
                    <Button
                      onClick={() => handleApplyPromo()}
                      disabled={applyingPromo || paying || booking.paymentMethod === 'VNPAY' || !promoCode.trim()}
                    >
                      {applyingPromo ? 'Đang áp dụng...' : 'Áp dụng'}
                    </Button>
                  </div>
                  {promoError && (
                    <div id="pay-promo-error" className="pay-field-error" role="alert">{promoError}</div>
                  )}
                  {showPromos && (
                    <div className="pay-promo-list">
                      {loadingPromos ? (
                        <div className="pay-promo-state" role="status">
                          Đang tải danh sách mã...
                        </div>
                      ) : availablePromos.length === 0 ? (
                        <div className="pay-promo-state">
                          Hiện chưa có mã giảm giá nào dùng được cho đơn này.
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
                              <strong>{promo.code}</strong>
                              <div className="pay-promo-desc">
                                {promo.description ||
                                  `Giảm ${promo.discountPercent}% (tối đa ${formatCurrency(promo.maxDiscount)})`}
                              </div>
                            </div>
                            <span className="pay-promo-cta">Dùng mã</span>
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
                <CreditCardIcon size={18} aria-hidden="true" />
                Phương thức thanh toán
              </h2>
              <div className="pay-method-box">
                <span className="pay-method-badge">VNPAY</span>
                <div className="pay-method-text">
                  <strong>VNPay: QR, thẻ ATM hoặc thẻ quốc tế</strong>
                  <span>Vé được xác nhận ngay khi VNPay báo giao dịch thành công.</span>
                </div>
                <CheckIcon size={18} aria-label="Đã chọn" />
              </div>
              <div className="pay-secure-note">
                <ShieldIcon size={15} aria-hidden="true" />
                <span>Bạn nhập thông tin thẻ trên trang của VNPay. MoviePTIT không nhận và không lưu số thẻ.</span>
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
            <Button
              variant="primary"
              block
              className="pay-submit"
              icon={<CreditCardIcon size={18} aria-hidden="true" />}
              onClick={handleVNPayPayment}
              disabled={
                paying ||
                cancelling ||
                applyingPromo ||
                expiresAtMs === undefined ||
                (expiresAtMs !== null && (timeLeft === null || timeLeft <= 0))
              }
            >
              {paying ? 'Đang chuyển sang VNPay...' : 'Thanh toán qua VNPay'}
            </Button>
            <Button
              block
              onClick={() => setShowCancelConfirm(true)}
              disabled={paying || cancelling}
            >
              Hủy đơn đặt vé
            </Button>
          </BookingReceipt>
        </div>
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        title="Hủy đơn đặt vé?"
        message={
          <>
            Ghế <strong>{seatCodes}</strong> của phim <strong>{booking.movieName}</strong> sẽ được mở lại
            ngay cho khách khác.
          </>
        }
        cancelText="Tiếp tục thanh toán"
        confirmText="Hủy đơn"
        loading={cancelling}
        onConfirm={() => handleCancel(false)}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}

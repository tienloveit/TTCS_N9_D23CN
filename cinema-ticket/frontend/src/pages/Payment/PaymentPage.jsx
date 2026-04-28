import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { bookingApi, vnpayApi } from '../../api';

export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);

  const handleCancel = useCallback(
    async (auto = false) => {
      try {
        await bookingApi.cancel(bookingId);
        if (auto) {
          toast.error('Hết thời gian giữ ghế. Đơn hàng của bạn đã bị huỷ.');
        }
        navigate('/movies');
      } catch {
        if (auto) toast.error('Hết thời gian giữ ghế.');
        navigate('/movies');
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
  }, [bookingId, handleCancel]);

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

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 600 }}>
        <div className="page-header" style={{ textAlign: 'center' }}>
          <h1 className="page-title">Thanh toán</h1>
          <p className="page-subtitle">Hoàn tất bước cuối cùng để nhận vé</p>

          {timeLeft !== null && (
            <div
              style={{
                marginTop: 16,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 20px',
                background:
                  timeLeft < 60 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: timeLeft < 60 ? '#ef4444' : '#f59e0b',
                borderRadius: 100,
                fontWeight: 700,
                fontSize: '1.2rem',
                border: `1px solid ${timeLeft < 60 ? '#ef444430' : '#f59e0b30'}`,
              }}
            >
              <span>{formatTimeLimit(timeLeft)}</span>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 32 }}>
          <div style={{ marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
            <h3 style={{ marginBottom: 12 }}>Thông tin vé</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Phim:</span>
              <strong style={{ textAlign: 'right' }}>{booking.movieName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Suất chiếu:</span>
              <span>{formatShowtime(booking.showtimeStart)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Phòng:</span>
              <span>{booking.roomName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Ghế:</span>
              <strong style={{ color: 'var(--accent)', textAlign: 'right' }}>{seatCodes}</strong>
            </div>
          </div>

          {bookingFoods.length > 0 && (
            <div style={{ marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Đồ ăn</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bookingFoods.map((food) => (
                  <div
                    key={food.foodId}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {food.foodName} x{food.quantity}
                    </span>
                    <strong>{formatCurrency(food.subtotal)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tổng tiền:</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--gold)' }}>
              {formatCurrency(booking.totalAmount)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%', height: 54, fontSize: '1.1rem' }}
              onClick={handleVNPayPayment}
              disabled={paying}
            >
              {paying ? 'Đang chuyển hướng...' : 'Thanh toán qua VNPay'}
            </button>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => handleCancel(false)}>
              Huỷ đặt vé
            </button>
          </div>

          <p style={{ marginTop: 24, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Bạn có 6 phút để hoàn tất thanh toán trước khi ghế được mở lại.
          </p>
        </div>
      </div>
    </div>
  );
}

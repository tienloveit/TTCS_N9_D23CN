import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { vnpayApi } from '../../api';
import confetti from 'canvas-confetti';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const params = Object.fromEntries(searchParams.entries());
    
    vnpayApi.handleReturn(params)
      .then((res) => {
        if (res.data.code === 200) {
          setStatus('success');
          // Trigger celebration
          handleCelebrate();
        } else {
          setStatus('error');
        }
      })
      .catch(() => {
        setStatus('error');
      });
  }, [searchParams]);

  const handleCelebrate = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start them a bit higher than average
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="container" style={{ maxWidth: 500, textAlign: 'center' }}>
        {status === 'success' ? (
          <div className="card" style={{ padding: 48, borderTop: '8px solid var(--green)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '5rem', marginBottom: 24, animation: 'bounce 1s infinite' }}>🎉</div>
            <h1 className="page-title" style={{ color: 'var(--green)', fontSize: '2.2rem', marginBottom: 16 }}>ĐẶT VÉ THÀNH CÔNG!</h1>
            <p className="page-subtitle" style={{ marginBottom: 40, lineHeight: 1.6, fontSize: '1.1rem' }}>
              Cảm ơn bạn! Hệ thống đã ghi nhận thanh toán của bạn. <br/>
              Bạn có thể xem vé và mã QR trong phần lịch sử đặt vé.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/my-bookings')}>
                🎟️ Xem vé của tôi
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/')}>
                Quay lại trang chủ
              </button>
            </div>
          </div>
        ) : status === 'error' ? (
          <div className="card" style={{ padding: 48, borderTop: '8px solid var(--accent)' }}>
            <div style={{ fontSize: '4rem', marginBottom: 24 }}>❌</div>
            <h1 className="page-title" style={{ color: 'var(--accent)', fontSize: '1.8rem' }}>Thanh toán thất bại</h1>
            <p className="page-subtitle" style={{ marginBottom: 40 }}>
              Đã có lỗi xảy ra hoặc giao dịch bị hủy. Đừng lo lắng, tiền của bạn vẫn an toàn nếu chưa bị trừ.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <button className="btn btn-primary" onClick={() => navigate('/')}>Quay lại Trang chủ</button>
            </div>
          </div>
        ) : (
          <div className="loading" style={{ flexDirection: 'column', gap: 20 }}>
            <div className="spinner" style={{ width: 60, height: 60 }} />
            <p style={{ color: 'var(--text-secondary)' }}>Đang xác thực giao dịch, vui lòng đợi...</p>
          </div>
        )}
      </div>
    </div>
  );
}

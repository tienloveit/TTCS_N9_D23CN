import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { bookingApi } from '../../api';
import EmptyState from '../../components/Common/EmptyState';
import DigitalTicket from '../../components/Ticket/DigitalTicket';
import {
  CheckCircleIcon,
  TicketIcon,
  TimerIcon,
  XCircleIcon,
} from '../../components/Common/CinemaIcons';

const STATUS_MAP = {
  PENDING: { label: 'Chờ thanh toán', color: '#f59e0b' },
  COMPLETED: { label: 'Đã hoàn tất', color: '#22c55e' },
  CANCELLED: { label: 'Đã huỷ', color: '#ef4444' },
  EXPIRED: { label: 'Hết hạn', color: '#6b7280' },
  REFUND_REQUESTED: { label: 'Đang chờ hoàn tiền', color: '#f97316' },
  REFUNDED: { label: 'Đã hoàn tiền', color: '#8b5cf6' },
};

const PAYMENT_MAP = {
  PENDING: { label: 'Chờ thanh toán', color: '#f59e0b' },
  PAID: { label: 'Đã thanh toán', color: '#22c55e' },
  FAILED: { label: 'Thất bại', color: '#ef4444' },
  CANCELLED: { label: 'Đã huỷ', color: '#6b7280' },
  REFUNDED: { label: 'Đã hoàn tiền', color: '#8b5cf6' },
};

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [showQR, setShowQR] = useState(null); 
  const [refundModal, setRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await bookingApi.getMyBookings();
        const data = res.data.result || [];
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBookings(data);
      } catch (err) {
        console.error('Lỗi khi tải vé', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Bạn có chắc muốn huỷ đơn đặt vé này?')) return;
    try {
      await bookingApi.cancel(bookingId);
      setBookings(prev =>
        prev.map(b => b.bookingId === bookingId
          ? { ...b, status: 'CANCELLED', paymentStatus: 'CANCELLED' }
          : b
        )
      );
    } catch (err) {
      alert('Không thể huỷ vé: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRequestRefund = async () => {
    if (!refundModal) return;
    setSubmittingRefund(true);
    try {
      const res = await bookingApi.requestRefund(refundModal, refundReason);
      const updated = res.data.result;
      setBookings(prev =>
        prev.map(b => b.bookingId === refundModal
          ? { ...b, status: 'REFUND_REQUESTED', refundReason: refundReason, refundAmount: updated.refundAmount }
          : b
        )
      );
      setRefundModal(null);
      setRefundReason('');
    } catch (err) {
      alert('Không thể yêu cầu hoàn tiền: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingRefund(false);
    }
  };

  const canRequestRefund = (booking) => {
    if (booking.status !== 'COMPLETED') return false;
    if (!booking.paidAt) return false;
    const paidAt = parseLocalDateTime(booking.paidAt);
    if (!paidAt) return false;
    const now = new Date();
    const diffHours = (now - paidAt) / (1000 * 60 * 60);
    return diffHours <= 24;
  };

  const getRefundTimeLeft = (booking) => {
    if (!booking.paidAt) return '';
    const paidAt = parseLocalDateTime(booking.paidAt);
    if (!paidAt) return '';
    const deadline = new Date(paidAt.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadline - now;
    if (diffMs <= 0) return '';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `Còn ${hours}h ${mins}p để yêu cầu hoàn tiền`;
  };

  const parseLocalDateTime = (dateStr) => {
    if (!dateStr) return null;
    const [datePart, timePart] = dateStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = (timePart || '00:00').split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute);
  };

  const FORMAT_DATE_TIME = (dateStr) => {
    const d = parseLocalDateTime(dateStr);
    if (!d) return '—';
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  const FORMAT_CURRENCY = (amount) => {
    if (!amount) return '0 đ';
    return Number(amount).toLocaleString('vi-VN') + ' đ';
  };

  const filteredBookings = filter === 'ALL'
    ? bookings
    : bookings.filter(b => b.status === filter);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title page-title-with-icon">
            <TicketIcon className="page-title-icon" />
            Vé của tôi
          </h1>
          <p className="page-subtitle">Lịch sử đặt vé và trạng thái thanh toán</p>
        </div>

        {/* Filter tabs */}
        <div className="booking-filter-bar">
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'PENDING', label: 'Chờ thanh toán', Icon: TimerIcon },
            { key: 'COMPLETED', label: 'Đã hoàn tất', Icon: CheckCircleIcon },
            { key: 'REFUND_REQUESTED', label: 'Chờ hoàn tiền', Icon: TimerIcon },
            { key: 'CANCELLED', label: 'Đã huỷ', Icon: XCircleIcon },
          ].map(tab => (
            <button
              key={tab.key}
              className={`booking-filter-tab ${filter === tab.key ? 'booking-filter-tab--active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.Icon && <tab.Icon className="booking-filter-icon" />}
              {tab.label}
              {tab.key !== 'ALL' && (
                <span className="booking-filter-count">
                  {bookings.filter(b => b.status === tab.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Booking list */}
        {filteredBookings.length === 0 ? (
          <EmptyState 
            title="Bạn chưa có vé nào"
            message={filter === 'ALL' 
              ? "Có vẻ như bạn chưa đặt vé nào tại MoviePTIT. Hãy chọn một bộ phim và trải nghiệm ngay nhé!" 
              : `Bạn không có đơn hàng nào ở trạng thái "${STATUS_MAP[filter]?.label || filter}".`}
            buttonText="Tìm phim đặt vé ngay"
          />
        ) : (
          <div className="booking-list">
            {filteredBookings.map(booking => {
              const ticketData = {
                ...booking,
                startTime: booking.showtimeStart,
                branchName: booking.branchName || 'Chi nhánh MoviePTIT'
              };

              return (
                <div key={booking.bookingId} style={{ marginBottom: 40, width: '100%' }}>
                  <DigitalTicket booking={ticketData} />

                  {/* Trạng thái hoàn tiền */}
                  {booking.status === 'REFUND_REQUESTED' && (
                    <div style={{
                      marginTop: 12, padding: '12px 16px', borderRadius: 8,
                      background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)',
                      display: 'flex', alignItems: 'center', gap: 10
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>⏳</span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f97316' }}>Đang chờ duyệt hoàn tiền</div>
                        {booking.refundReason && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            Lý do: {booking.refundReason}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {booking.status === 'REFUNDED' && (
                    <div style={{
                      marginTop: 12, padding: '12px 16px', borderRadius: 8,
                      background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)',
                      display: 'flex', alignItems: 'center', gap: 10
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>✅</span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#8b5cf6' }}>Đã hoàn tiền: {FORMAT_CURRENCY(booking.refundAmount)}</div>
                        {booking.refundedAt && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            Hoàn lúc: {FORMAT_DATE_TIME(booking.refundedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  {booking.status === 'PENDING' && (
                    <div style={{ marginTop: 12, textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/booking/${booking.bookingId}/payment`)}
                      > 💳 Thanh toán ngay </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleCancel(booking.bookingId)}
                      >
                        <XCircleIcon className="btn-icon" />
                        Hủy vé
                      </button>
                    </div>
                  )}

                  {booking.status === 'COMPLETED' && canRequestRefund(booking) && (
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        ⏰ {getRefundTimeLeft(booking)}
                      </span>
                      <button
                        className="btn btn-secondary"
                        onClick={() => { setRefundModal(booking.bookingId); setRefundReason(''); }}
                        style={{ fontSize: '0.9rem' }}
                      >
                        💰 Yêu cầu hoàn tiền
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(null)}>
          <div className="modal-content" style={{ maxWidth: 400, aspectRatio: 'auto', padding: 40, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowQR(null)}>×</button>
            <h3 style={{ marginBottom: 20 }}>Mã vé của bạn</h3>
            <div style={{ background: 'white', padding: 24, borderRadius: 16, display: 'inline-block', marginBottom: 20 }}>
              <QRCodeSVG value={showQR} size={240} />
            </div>
            <p style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: 2, fontFamily: 'monospace', color: 'white' }}>{showQR}</p>
            <p style={{ color: 'var(--text-secondary)', marginTop: 12, fontSize: '0.9rem' }}>
              Vui lòng đưa mã này cho nhân viên tại quầy để nhận vé.
            </p>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundModal && (
        <div className="modal-overlay" onClick={() => setRefundModal(null)}>
          <div className="modal-content" style={{ maxWidth: 480, aspectRatio: 'auto', padding: 32 }} onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setRefundModal(null)}>×</button>
            <h3 style={{ marginBottom: 8 }}>💰 Yêu cầu hoàn tiền</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
              Yêu cầu sẽ được Admin/Nhân viên xem xét và duyệt. Bạn sẽ được hoàn 100% số tiền đã thanh toán.
            </p>
            <label style={{ display: 'block', marginBottom: 8 }}>
              <span className="form-label">Lý do hoàn tiền</span>
              <textarea
                className="input"
                rows={3}
                placeholder="Nhập lý do bạn muốn hoàn tiền..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                style={{ resize: 'vertical', width: '100%' }}
              />
            </label>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleRequestRefund}
                disabled={submittingRefund || !refundReason.trim()}
              >
                {submittingRefund ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setRefundModal(null)}
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

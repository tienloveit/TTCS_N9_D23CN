import { useState, useEffect } from 'react';
import { bookingApi } from '../../api';
import { useAuth } from '../../context/useAuth';

const BookingManagement = () => {
  const { isAdmin, isStaff, isManager } = useAuth();
  const canProcessRefund = isAdmin || isStaff || isManager;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [processingRefund, setProcessingRefund] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await bookingApi.getAll();
        const sorted = (res.data.result || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setBookings(sorted);
      } catch (err) {
        console.error('Lỗi khi tải đơn đặt vé:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const handleProcessRefund = async (bookingId, approved) => {
    if (!canProcessRefund) return;
    const action = approved ? 'duyệt hoàn tiền' : 'từ chối hoàn tiền';
    if (!window.confirm(`Bạn có chắc muốn ${action} cho đơn này?`)) return;
    setProcessingRefund(bookingId);
    try {
      const res = await bookingApi.processRefund(bookingId, approved);
      const updated = res.data.result;
      setBookings(prev =>
        prev.map(b => b.bookingId === bookingId
          ? { ...b, status: updated.status, paymentStatus: updated.paymentStatus, refundedAt: updated.refundedAt, refundAmount: updated.refundAmount }
          : b
        )
      );
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessingRefund(null);
    }
  };

  const filtered = bookings.filter((b) => {
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchSearch =
      b.bookingCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.movieName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.username?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  const STATUS_OPTIONS = ['ALL', 'PENDING', 'COMPLETED', 'REFUND_REQUESTED', 'REFUNDED', 'CANCELLED'];
  const STATUS_MAP = {
    PENDING: { label: 'Chờ TT', className: 'status--pending' },
    COMPLETED: { label: 'Thành công', className: 'status--active' },
    CANCELLED: { label: 'Đã huỷ', className: 'status--inactive' },
    REFUND_REQUESTED: { label: 'Chờ hoàn tiền', className: 'status--pending' },
    REFUNDED: { label: 'Đã hoàn tiền', className: 'status--inactive' },
  };
  const PAYMENT_MAP = {
    PENDING: { label: 'Chờ TT', className: 'status--pending' },
    PAID: { label: 'Đã TT', className: 'status--active' },
    CANCELLED: { label: 'Đã huỷ', className: 'status--inactive' },
    FAILED: { label: 'Thất bại', className: 'status--inactive' },
    REFUNDED: { label: 'Đã hoàn', className: 'status--inactive' },
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  const totalRevenue = bookings
    .filter(b => b.paymentStatus === 'PAID')
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const refundRequestCount = bookings.filter(b => b.status === 'REFUND_REQUESTED').length;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Quản lý Đơn đặt vé</h1>
          <p className="page-subtitle">
            <strong>{bookings.length}</strong> đơn · Doanh thu: <strong style={{ color: 'var(--green)' }}>{formatCurrency(totalRevenue)}</strong>
            {refundRequestCount > 0 && (
              <span style={{ marginLeft: 12, color: '#f97316', fontWeight: 700 }}>
                · 🔔 {refundRequestCount} yêu cầu hoàn tiền
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="table-header" style={{ gap: '12px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', maxWidth: '280px', flex: 1 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="input"
              placeholder="Tìm mã đơn, tên phim..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', background: 'var(--bg-input)' }}
            />
          </div>

          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)', flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: statusFilter === s ? 'var(--bg-card-hover)' : 'transparent',
                  color: statusFilter === s ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {s === 'ALL' ? 'Tất cả' : STATUS_MAP[s]?.label || s}
                {s === 'REFUND_REQUESTED' && refundRequestCount > 0 && (
                  <span style={{ marginLeft: 4, background: '#f97316', color: '#fff', borderRadius: '50%', padding: '1px 6px', fontSize: '0.72rem', fontWeight: 800 }}>
                    {refundRequestCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', flexShrink: 0 }}>
            {filtered.length} đơn
          </span>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Phim</th>
              <th>Chi nhánh</th>
              <th>Ghế</th>
              <th>Ngày đặt</th>
              <th>Tổng tiền</th>
              <th>Đơn hàng</th>
              <th>Thanh toán</th>
              {canProcessRefund && <th>Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canProcessRefund ? 10 : 9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {searchTerm || statusFilter !== 'ALL' ? 'Không tìm thấy đơn hàng nào' : 'Chưa có đơn hàng'}
                </td>
              </tr>
            ) : (
              filtered.map((b, idx) => {
                const statusInfo = STATUS_MAP[b.status] || { label: b.status, className: '' };
                const payInfo = PAYMENT_MAP[b.paymentStatus] || { label: b.paymentStatus, className: '' };
                return (
                  <tr key={b.bookingId || idx}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {b.bookingCode || `#${b.bookingId?.slice(0, 8)}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                          width: '24px', height: '24px', borderRadius: '50%', 
                          background: 'linear-gradient(135deg, var(--purple), var(--blue))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 800, color: '#fff'
                        }}>
                          {(b.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.username || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.movieName || '—'}</div>
                        {b.roomName && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{b.roomName}</div>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{b.branchName || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {b.seatCodes?.map((s, i) => (
                          <span key={i} className="movie-badge">{s}</span>
                        )) || '—'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{formatDate(b.createdAt)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(b.totalAmount)}</td>
                    <td>
                      <span className={`status-badge ${statusInfo.className}`}>{statusInfo.label}</span>
                      {b.status === 'REFUND_REQUESTED' && b.refundReason && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          title={b.refundReason}>
                          Lý do: {b.refundReason}
                        </div>
                      )}
                    </td>
                    <td><span className={`status-badge ${payInfo.className}`}>{payInfo.label}</span></td>
                    {canProcessRefund && (
                      <td>
                        {b.status === 'REFUND_REQUESTED' && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                              onClick={() => handleProcessRefund(b.bookingId, true)}
                              disabled={processingRefund === b.bookingId}
                            >
                              ✓ Duyệt
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                              onClick={() => handleProcessRefund(b.bookingId, false)}
                              disabled={processingRefund === b.bookingId}
                            >
                              ✕ Từ chối
                            </button>
                          </div>
                        )}
                        {b.status === 'REFUNDED' && (
                          <span style={{ fontSize: '0.78rem', color: '#8b5cf6', fontWeight: 600 }}>
                            Đã hoàn {formatCurrency(b.refundAmount)}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingManagement;

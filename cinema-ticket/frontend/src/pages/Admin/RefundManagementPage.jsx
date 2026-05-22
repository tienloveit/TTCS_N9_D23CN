import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { bookingApi } from '../../api';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
    .format(Number(amount || 0));

const formatDateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '-';

const RefundManagementPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('REFUND_REQUESTED');

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const res = await bookingApi.getRefunds();
      setBookings(res.data.result || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải danh sách hoàn tiền');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const filtered = useMemo(
    () => bookings.filter((booking) => status === 'ALL' || booking.status === status),
    [bookings, status]
  );

  const handleDecision = async (approved) => {
    if (!selected) return;
    try {
      await bookingApi.processRefund(selected.bookingId, approved, note);
      toast.success(approved ? 'Đã duyệt hoàn tiền' : 'Đã từ chối hoàn tiền');
      setSelected(null);
      setNote('');
      fetchRefunds();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xử lý hoàn tiền');
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Xử lý hoàn tiền</h1>
          <p className="page-subtitle">Duyệt, từ chối và lưu ghi chú xử lý cho các yêu cầu hoàn tiền.</p>
        </div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="REFUND_REQUESTED">Chờ xử lý</option>
          <option value="REFUNDED">Đã hoàn tiền</option>
          <option value="ALL">Tất cả</option>
        </select>
      </div>

      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Phim</th>
              <th>Chi nhánh</th>
              <th>Số tiền</th>
              <th>Lý do</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 32 }}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 32 }}>Không có yêu cầu hoàn tiền</td></tr>
            ) : filtered.map((booking) => (
              <tr key={booking.bookingId}>
                <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{booking.bookingCode}</td>
                <td>{booking.username || '-'}</td>
                <td>{booking.movieName || '-'}</td>
                <td>{booking.branchName || '-'}</td>
                <td>{formatCurrency(booking.refundAmount || booking.totalAmount)}</td>
                <td style={{ maxWidth: 240 }}>{booking.refundReason || '-'}</td>
                <td>
                  <span className={`status-badge ${booking.status === 'REFUND_REQUESTED' ? 'status--pending' : 'status--inactive'}`}>
                    {booking.status === 'REFUND_REQUESTED' ? 'Chờ xử lý' : 'Đã hoàn tiền'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-primary btn-sm" onClick={() => { setSelected(booking); setNote(booking.refundProcessNote || ''); }}>
                    Chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680, padding: 28 }}>
            <div className="table-header">
              <h2>Yêu cầu {selected.bookingCode}</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>x</button>
            </div>
            <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
              <div><strong>Khách hàng:</strong> {selected.username || '-'}</div>
              <div><strong>Phim:</strong> {selected.movieName || '-'} - {selected.roomName || '-'}</div>
              <div><strong>Suất chiếu:</strong> {formatDateTime(selected.showtimeStart)}</div>
              <div><strong>Thanh toán:</strong> {selected.paymentMethod || '-'} - {formatCurrency(selected.totalAmount)}</div>
              <div><strong>Lý do khách gửi:</strong> {selected.refundReason || '-'}</div>
              {selected.refundProcessedAt && (
                <div><strong>Đã xử lý:</strong> {formatDateTime(selected.refundProcessedAt)} bởi {selected.refundProcessedByUsername || '-'}</div>
              )}
            </div>
            <label className="form-label">Ghi chú xử lý</label>
            <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 100, marginBottom: 16 }} />
            {selected.status === 'REFUND_REQUESTED' && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={() => handleDecision(true)}>Duyệt hoàn tiền</button>
                <button className="btn btn-secondary" onClick={() => handleDecision(false)}>Từ chối</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundManagementPage;

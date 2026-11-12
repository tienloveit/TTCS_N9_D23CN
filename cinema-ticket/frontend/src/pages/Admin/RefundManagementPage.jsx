import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { bookingApi } from '../../api';
import {
  CheckIcon,
  EyeIcon,
  RefreshIcon,
  SearchIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
    .format(Number(amount || 0));

const formatDateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '-';

const STATUS_TABS = [
  { key: 'REFUND_REQUESTED', label: 'Chờ xử lý' },
  { key: 'REFUNDED', label: 'Đã hoàn tiền' },
  { key: 'ALL', label: 'Tất cả' },
];

const RefundManagementPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('REFUND_REQUESTED');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    () =>
      bookings.filter((booking) => {
        if (status !== 'ALL' && booking.status !== status) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          (booking.bookingCode || '').toLowerCase().includes(q) ||
          (booking.username || '').toLowerCase().includes(q) ||
          (booking.movieName || '').toLowerCase().includes(q) ||
          (booking.refundReason || '').toLowerCase().includes(q)
        );
      }),
    [bookings, status, searchQuery]
  );

  const handleDecision = async (approved) => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const response = await bookingApi.processRefund(selected.bookingId, approved, note);
      const updated = response.data.result;
      if (approved && updated.status !== 'REFUNDED') {
        toast.info(updated.refundGatewayMessage || 'Yêu cầu chưa được xác nhận hoàn tiền. Vui lòng kiểm tra lại kết quả.');
        setSelected(updated);
        await fetchRefunds();
        return;
      }
      toast.success(approved ? 'Đã duyệt hoàn tiền' : 'Đã từ chối hoàn tiền');
      setSelected(null);
      setNote('');
      fetchRefunds();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xử lý hoàn tiền');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Xử lý hoàn tiền</h1>
          <p className="page-subtitle">Duyệt, từ chối và lưu ghi chú xử lý cho các yêu cầu hoàn tiền.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={fetchRefunds} disabled={loading}>
          <RefreshIcon size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      <div className="admin-table-card">
        <div className="console-toolbar">
          <div className="console-status-tabs">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.key === 'ALL'
                  ? bookings.length
                  : bookings.filter((b) => b.status === tab.key).length;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`console-status-tab ${status === tab.key ? 'is-active' : ''}`}
                  onClick={() => setStatus(tab.key)}
                >
                  <span>{tab.label}</span>
                  <span className="console-status-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div style={{ position: 'relative', minWidth: 250 }}>
            <SearchIcon
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Tìm mã đơn, khách, phim, lý do..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, height: 38, fontSize: '0.85rem' }}
            />
          </div>
        </div>

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
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Không có yêu cầu hoàn tiền phù hợp</td></tr>
            ) : filtered.map((booking) => (
              <tr key={booking.bookingId}>
                <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{booking.bookingCode}</td>
                <td>{booking.username || '-'}</td>
                <td style={{ fontWeight: 600 }}>{booking.movieName || '-'}</td>
                <td>{booking.branchName || '-'}</td>
                <td style={{ fontWeight: 700, color: '#dc2626' }}>
                  {formatCurrency(booking.refundAmount || booking.totalAmount)}
                </td>
                <td style={{ maxWidth: 240 }}>{booking.refundReason || '-'}</td>
                <td>
                  <span className={`status-badge ${booking.status === 'REFUND_REQUESTED' ? 'status--pending' : 'status--inactive'}`}>
                    {booking.status === 'REFUND_REQUESTED' ? 'Chờ xử lý' : 'Đã hoàn tiền'}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setSelected(booking);
                      setNote(booking.refundProcessNote || '');
                    }}
                  >
                    <EyeIcon size={14} />
                    <span>Chi tiết</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div
            className="modal-content admin-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 680, height: 'auto', aspectRatio: 'unset', padding: 28, background: 'var(--bg-card)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Yêu cầu {selected.bookingCode}</h2>
              <button
                type="button"
                className="modal-close"
                style={{ position: 'static', width: 32, height: 32 }}
                onClick={() => setSelected(null)}
                aria-label="Đóng"
              >
                <XIcon size={16} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16 }}>
              <div><strong>Khách hàng:</strong> {selected.username || '-'}</div>
              <div><strong>Phim:</strong> {selected.movieName || '-'} - {selected.roomName || '-'}</div>
              <div><strong>Suất chiếu:</strong> {formatDateTime(selected.showtimeStart)}</div>
              <div><strong>Thanh toán:</strong> {selected.paymentMethod || '-'} - {formatCurrency(selected.totalAmount)}</div>
              <div style={{ gridColumn: 'span 2' }}><strong>Lý do khách gửi:</strong> {selected.refundReason || '-'}</div>
              {selected.refundProcessedAt && (
                <div style={{ gridColumn: 'span 2' }}>
                  <strong>Lần xử lý gần nhất:</strong> {formatDateTime(selected.refundProcessedAt)} bởi {selected.refundProcessedByUsername || '-'}
                </div>
              )}
            </div>

            {selected.refundGatewayMessage && selected.status === 'REFUND_REQUESTED' && (
              <p role="status">{selected.refundGatewayMessage}</p>
            )}
            <label className="form-label">Ghi chú xử lý</label>
            <textarea
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú đối soát hoặc lý do từ chối..."
              style={{ minHeight: 90, marginBottom: 18 }}
            />
            {selected.status === 'REFUND_REQUESTED' && (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting || ['PROCESSING', 'UNKNOWN'].includes(selected.refundGatewayStatus)}
                  onClick={() => handleDecision(false)}
                >
                  <XIcon size={16} />
                  <span>Từ chối</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={submitting}
                  onClick={() => handleDecision(true)}
                >
                  <CheckIcon size={16} />
                  <span>{submitting ? 'Đang xử lý...'
                    : ['PROCESSING', 'UNKNOWN'].includes(selected.refundGatewayStatus) ? 'Kiểm tra kết quả'
                      : selected.refundGatewayStatus === 'FAILED' ? 'Thử lại hoàn tiền' : 'Duyệt hoàn tiền'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundManagementPage;


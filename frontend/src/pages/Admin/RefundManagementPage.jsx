import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { bookingApi } from '../../api';
import Badge from '../../components/Common/Badge';
import Button from '../../components/Common/Button';
import useModalDialog from '../../components/Common/useModalDialog';
import {
  CheckIcon,
  EyeIcon,
  RefreshIcon,
  SearchIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';
import { formatCinema } from '../../utils/cinemaTime';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
    .format(Number(amount || 0));

const formatDateTime = (value) => formatCinema(value, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, day: '2-digit', month: '2-digit', year: 'numeric' }, '-');

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
  const dialog = useModalDialog(Boolean(selected), () => setSelected(null), { disabled: submitting });

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
        <Button icon={<RefreshIcon size={16} />} onClick={fetchRefunds} disabled={loading}>
          Làm mới
        </Button>
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

          <div className="admin-search">
            <SearchIcon size={16} className="input-leading-icon" aria-hidden="true" />
            <input
              type="search"
              className="input input-sm"
              placeholder="Tìm mã đơn, khách, phim, lý do..."
              aria-label="Tìm yêu cầu hoàn tiền"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
              <tr><td colSpan="8" className="admin-table-empty" role="status">Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="8" className="admin-table-empty">Không có yêu cầu hoàn tiền phù hợp.</td></tr>
            ) : filtered.map((booking) => (
              <tr key={booking.bookingId}>
                <td className="cell-code">{booking.bookingCode}</td>
                <td>{booking.username || '-'}</td>
                <td className="cell-strong">{booking.movieName || '-'}</td>
                <td>{booking.branchName || '-'}</td>
                <td className="cell-amount-out">
                  {formatCurrency(booking.refundAmount || booking.totalAmount)}
                </td>
                <td className="cell-wrap">{booking.refundReason || '-'}</td>
                <td>
                  <Badge tone={booking.status === 'REFUND_REQUESTED' ? 'warning' : 'success'} dot>
                    {booking.status === 'REFUND_REQUESTED' ? 'Chờ xử lý' : 'Đã hoàn tiền'}
                  </Badge>
                </td>
                <td>
                  <Button
                    variant={booking.status === 'REFUND_REQUESTED' ? 'primary' : 'secondary'}
                    size="sm"
                    icon={<EyeIcon size={14} />}
                    aria-label={`Xem yêu cầu ${booking.bookingCode}`}
                    onClick={() => {
                      setSelected(booking);
                      setNote(booking.refundProcessNote || '');
                    }}
                  >
                    {booking.status === 'REFUND_REQUESTED' ? 'Xử lý' : 'Chi tiết'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" {...dialog.overlayProps}>
          <div className="modal-content admin-modal admin-modal--lg" {...dialog.contentProps}>
            <div className="admin-modal-header">
              <h2 id={dialog.titleId}>Yêu cầu {selected.bookingCode}</h2>
              <button
                type="button"
                className="modal-close modal-close--inline"
                onClick={() => setSelected(null)}
                aria-label="Đóng"
              >
                <XIcon size={16} />
              </button>
            </div>
            <div className="admin-detail-grid">
              <div><strong>Khách hàng:</strong> {selected.username || '-'}</div>
              <div><strong>Phim:</strong> {selected.movieName || '-'} - {selected.roomName || '-'}</div>
              <div><strong>Suất chiếu:</strong> {formatDateTime(selected.showtimeStart)}</div>
              <div><strong>Thanh toán:</strong> {selected.paymentMethod || '-'} - {formatCurrency(selected.totalAmount)}</div>
              <div className="span-full"><strong>Lý do khách gửi:</strong> {selected.refundReason || '-'}</div>
              {selected.refundProcessedAt && (
                <div className="span-full">
                  <strong>Lần xử lý gần nhất:</strong> {formatDateTime(selected.refundProcessedAt)} bởi {selected.refundProcessedByUsername || '-'}
                </div>
              )}
            </div>

            {selected.refundGatewayMessage && selected.status === 'REFUND_REQUESTED' && (
              <p className="admin-notice" role="status">{selected.refundGatewayMessage}</p>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="refund-note">Ghi chú xử lý</label>
              <textarea
                id="refund-note"
                className="input admin-textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú đối soát hoặc lý do từ chối..."
              />
            </div>
            {selected.status === 'REFUND_REQUESTED' && (
              <div className="admin-modal-actions">
                <Button
                  icon={<XIcon size={16} />}
                  disabled={submitting || ['PROCESSING', 'UNKNOWN'].includes(selected.refundGatewayStatus)}
                  onClick={() => handleDecision(false)}
                >
                  Từ chối
                </Button>
                <Button
                  variant="primary"
                  icon={<CheckIcon size={16} />}
                  disabled={submitting}
                  onClick={() => handleDecision(true)}
                >
                  {submitting ? 'Đang xử lý...'
                    : ['PROCESSING', 'UNKNOWN'].includes(selected.refundGatewayStatus) ? 'Kiểm tra kết quả'
                      : selected.refundGatewayStatus === 'FAILED' ? 'Thử lại hoàn tiền' : 'Duyệt hoàn tiền'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundManagementPage;


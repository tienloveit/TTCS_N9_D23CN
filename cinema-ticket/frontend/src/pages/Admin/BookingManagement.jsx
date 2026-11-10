import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { bookingApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import {
  BellIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  RefreshIcon,
  SearchIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';

const PAGE_SIZE = 15;

const BookingManagement = () => {
  const { isAdmin, isManager } = useAuth();
  const canProcessRefund = isAdmin || isManager;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [processingRefund, setProcessingRefund] = useState(null);
  const [page, setPage] = useState(1);

  // Confirm Dialog state for Refund Decision
  const [confirmState, setConfirmState] = useState(null); // { bookingId, bookingCode, approved }
  // Booking Detail Modal state
  const [detailBooking, setDetailBooking] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingApi.getAll();
      const sorted = (res.data.result || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setBookings(sorted);
    } catch (err) {
      console.error('Lỗi khi tải đơn đặt vé:', err);
      toast.error('Không thể tải danh sách đơn đặt vé');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const requestProcessRefund = (booking, approved) => {
    if (!canProcessRefund) return;
    setConfirmState({
      bookingId: booking.bookingId,
      bookingCode: booking.bookingCode || `#${booking.bookingId}`,
      approved,
    });
  };

  const executeProcessRefund = async () => {
    if (!confirmState) return;
    const { bookingId, approved } = confirmState;
    setProcessingRefund(bookingId);
    try {
      const res = await bookingApi.processRefund(bookingId, approved);
      const updated = res.data.result;
      setBookings((prev) =>
        prev.map((b) =>
          b.bookingId === bookingId
            ? {
                ...b,
                status: updated.status,
                paymentStatus: updated.paymentStatus,
                refundedAt: updated.refundedAt,
                refundAmount: updated.refundAmount,
              }
            : b
        )
      );
      toast.success(approved ? 'Đã duyệt hoàn tiền thành công' : 'Đã từ chối yêu cầu hoàn tiền');
      setConfirmState(null);
    } catch (err) {
      toast.error('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessingRefund(null);
    }
  };

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        b.bookingCode?.toLowerCase().includes(q) ||
        b.movieName?.toLowerCase().includes(q) ||
        b.username?.toLowerCase().includes(q) ||
        b.branchName?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [bookings, statusFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  const formatDateTime = (d) =>
    d
      ? new Date(d).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '—';

  const STATUS_OPTIONS = ['ALL', 'COMPLETED', 'PENDING', 'REFUND_REQUESTED', 'REFUNDED', 'CANCELLED'];
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
    .filter((b) => b.paymentStatus === 'PAID')
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const refundRequestCount = bookings.filter((b) => b.status === 'REFUND_REQUESTED').length;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Quản lý Đơn đặt vé</h1>
          <p className="page-subtitle">
            <strong>{bookings.length}</strong> đơn · Doanh thu thanh toán:{' '}
            <strong style={{ color: 'var(--green)' }}>{formatCurrency(totalRevenue)}</strong>
            {refundRequestCount > 0 && (
              <span
                style={{
                  marginLeft: 12,
                  color: '#f97316',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                · <BellIcon size={15} /> {refundRequestCount} yêu cầu hoàn tiền
              </span>
            )}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={fetchBookings}>
          <RefreshIcon size={16} />
          <span>Làm mới</span>
        </button>
      </div>

      <div className="admin-table-card">
        <div className="console-toolbar">
          <div className="console-status-tabs">
            {STATUS_OPTIONS.map((s) => {
              const count =
                s === 'ALL' ? bookings.length : bookings.filter((b) => b.status === s).length;
              return (
                <button
                  key={s}
                  type="button"
                  className={`console-status-tab ${statusFilter === s ? 'is-active' : ''}`}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                >
                  <span>{s === 'ALL' ? 'Tất cả' : STATUS_MAP[s]?.label || s}</span>
                  <span className="console-status-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div style={{ position: 'relative', minWidth: 260, flex: '0 1 320px' }}>
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
              placeholder="Tìm mã đơn, khách, phim, rạp..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: 38, height: 38, fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Phim & Phòng</th>
              <th>Chi nhánh</th>
              <th>Ghế</th>
              <th>Ngày đặt</th>
              <th>Tổng tiền</th>
              <th>Đơn hàng</th>
              <th>Thanh toán</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {searchTerm || statusFilter !== 'ALL' ? 'Không tìm thấy đơn hàng nào' : 'Chưa có đơn hàng'}
                </td>
              </tr>
            ) : (
              paginated.map((b, idx) => {
                const statusInfo = STATUS_MAP[b.status] || { label: b.status, className: '' };
                const payInfo = PAYMENT_MAP[b.paymentStatus] || { label: b.paymentStatus, className: '' };
                return (
                  <tr key={b.bookingId || idx}>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {b.bookingCode || `#${b.bookingId}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--purple), var(--blue))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            color: '#fff',
                          }}
                        >
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
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            marginTop: 2,
                            maxWidth: 120,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={b.refundReason}
                        >
                          Lý do: {b.refundReason}
                        </div>
                      )}
                    </td>
                    <td><span className={`status-badge ${payInfo.className}`}>{payInfo.label}</span></td>
                    <td>
                      <div className="action-btns" style={{ alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          title="Xem chi tiết đơn"
                          onClick={() => setDetailBooking(b)}
                        >
                          <EyeIcon size={15} />
                        </button>
                        {canProcessRefund && b.status === 'REFUND_REQUESTED' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                              onClick={() => requestProcessRefund(b, true)}
                              disabled={processingRefund === b.bookingId}
                            >
                              <CheckIcon size={14} />
                              <span>Duyệt</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                              onClick={() => requestProcessRefund(b, false)}
                              disabled={processingRefund === b.bookingId}
                            >
                              <XIcon size={14} />
                              <span>Từ chối</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {filtered.length > PAGE_SIZE && (
          <div className="console-pagination">
            <span>
              Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length} đơn
            </span>
            <div className="console-page-btns">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeftIcon size={15} />
                <span>Trước</span>
              </button>
              <span style={{ padding: '0 10px', fontWeight: 700 }}>
                Trang {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <span>Sau</span>
                <ChevronRightIcon size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      {detailBooking && (
        <div className="modal-overlay" onClick={() => setDetailBooking(null)}>
          <div
            className="modal-content admin-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 620, height: 'auto', aspectRatio: 'unset', padding: 28, background: 'var(--bg-card)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  Chi tiết đơn {detailBooking.bookingCode || `#${detailBooking.bookingId}`}
                </h2>
                <small style={{ color: 'var(--text-muted)' }}>
                  Đặt lúc: {formatDateTime(detailBooking.createdAt)}
                </small>
              </div>
              <button
                type="button"
                className="modal-close"
                style={{ position: 'static', width: 32, height: 32 }}
                onClick={() => setDetailBooking(null)}
                aria-label="Đóng"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Khách hàng</div>
                <strong style={{ fontSize: '0.95rem' }}>{detailBooking.username || 'Khách tại quầy'}</strong>
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Chi nhánh & Phòng</div>
                <strong style={{ fontSize: '0.95rem' }}>{detailBooking.branchName || '—'} · {detailBooking.roomName || '—'}</strong>
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Phim</div>
                <strong style={{ fontSize: '0.95rem' }}>{detailBooking.movieName || '—'}</strong>
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Suất chiếu</div>
                <strong style={{ fontSize: '0.95rem' }}>{formatDateTime(detailBooking.showtimeStart)}</strong>
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Ghế đã chọn</div>
                <strong style={{ fontSize: '0.95rem' }}>{(detailBooking.seatCodes || []).join(', ') || '—'}</strong>
              </div>
              <div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Tổng thanh toán</div>
                <strong style={{ fontSize: '1.05rem', color: 'var(--blue)' }}>{formatCurrency(detailBooking.totalAmount)}</strong>
              </div>
            </div>

            {detailBooking.foods?.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, marginBottom: 8 }}>Combo Bắp & Nước đi kèm</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {detailBooking.foods.map((f, idx) => (
                    <span key={idx} className="movie-badge" style={{ padding: '5px 10px', fontSize: '0.82rem' }}>
                      {f.quantity}x {f.foodName} ({formatCurrency(f.subtotal || f.unitPrice * f.quantity)})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detailBooking.refundReason && (
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: 18, fontSize: '0.86rem' }}>
                <strong>Lý do yêu cầu hoàn tiền:</strong> {detailBooking.refundReason}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDetailBooking(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.approved ? 'Duyệt yêu cầu hoàn tiền' : 'Từ chối yêu cầu hoàn tiền'}
        message={
          confirmState?.approved
            ? `Xác nhận duyệt hoàn tiền cho đơn ${confirmState?.bookingCode}?`
            : `Xác nhận từ chối yêu cầu hoàn tiền của đơn ${confirmState?.bookingCode}?`
        }
        confirmText={confirmState?.approved ? 'Duyệt hoàn tiền' : 'Từ chối'}
        variant={confirmState?.approved ? 'primary' : 'danger'}
        loading={Boolean(processingRefund)}
        onConfirm={executeProcessRefund}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
};

export default BookingManagement;


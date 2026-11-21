import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { bookingApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import Badge from '../../components/Common/Badge';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import {
  BellIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  DownloadIcon,
  EyeIcon,
  ListIcon,
  RefreshIcon,
  SearchIcon,
  TicketIcon,
  XIcon,
} from '../../components/Common/CinemaIcons';
import './BookingManagement.css';

const PAGE_SIZE = 15;
const EMPTY_FILTERS = { branch: '', from: '', to: '', payment: '' };
const DASH = '—';
const BOOKING_STATUS = {
  PENDING: { label: 'Chờ xử lý', tone: 'warning' },
  COMPLETED: { label: 'Hoàn tất', tone: 'success' },
  REFUND_REQUESTED: { label: 'Yêu cầu hoàn tiền', tone: 'warning' },
  REFUNDED: { label: 'Đã hoàn tiền', tone: 'info' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
  EXPIRED: { label: 'Hết hạn', tone: 'neutral' },
};
const PAYMENT_STATUS = {
  PENDING: { label: 'Chờ thanh toán', tone: 'warning' },
  PAID: { label: 'Đã thanh toán', tone: 'success' },
  REFUNDED: { label: 'Đã hoàn tiền', tone: 'info' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
  FAILED: { label: 'Thất bại', tone: 'danger' },
  NO_TRANSACTION: { label: 'Chưa có giao dịch', tone: 'neutral' },
};
const PAYMENT_METHOD = { CASH: 'Tiền mặt', CARD: 'Thẻ', VNPAY: 'VNPay' };

const timeZone = 'Asia/Ho_Chi_Minh';
const dateKeyFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone, dateStyle: 'short' });
const dateFormatter = new Intl.DateTimeFormat('vi-VN', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('vi-VN', { timeZone, timeStyle: 'short' });
const exportTimeFormatter = new Intl.DateTimeFormat('vi-VN', { timeZone, timeStyle: 'medium' });
const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND', maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat('vi-VN');

function parseBookingDate(value) {
  if (!value) return null;
  // The API returns LocalDateTime values in cinema time, without an offset.
  const timestamp = value.length > 10 && !/[Zz]$|[+-]\d{2}:\d{2}$/.test(value) ? value + '+07:00' : value;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

const formatCurrency = (amount) => currencyFormatter.format(amount ?? 0);
const formatDate = (value) => {
  const date = parseBookingDate(value);
  return date ? dateFormatter.format(date) : DASH;
};
const formatDateTime = (value) => {
  const date = parseBookingDate(value);
  return date ? dateFormatter.format(date) + ' · ' + timeFormatter.format(date) : DASH;
};
const bookingCode = (booking) => booking.bookingCode || '#' + booking.bookingId;
const customerName = (booking) => booking.username || 'Khách tại quầy';
const seats = (booking) => (booking.seatCodes || []).filter(Boolean).join(', ');
// Khớp RefundPolicy/BookingAccessPolicy ở backend: đơn bán tại quầy, đã thanh toán, chưa check-in.
// Thời hạn và phạm vi chi nhánh vẫn do backend quyết định.
const canRequestRefundForCustomer = (booking) => Boolean(booking)
  && booking.staffUserId != null
  && booking.status === 'COMPLETED'
  && booking.paymentStatus === 'PAID'
  && !(booking.tickets || []).some((ticket) => ticket.checkedInAt);
const branchKey = (booking) => booking.branchId != null ? 'id:' + booking.branchId : 'name:' + (booking.branchName || '');

function StatusBadge({ statuses, value }) {
  const status = statuses[value] || { label: value || 'Chưa có dữ liệu', tone: 'neutral' };
  return <span className={'booking-badge booking-tone--' + status.tone}>{status.label}</span>;
}

function StatusSelect({ label, statuses, value, onChange, all = '' }) {
  return (
    <label>{label}
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value={all}>Tất cả</option>
        {Object.entries(statuses).map(([key, status]) => <option key={key} value={key}>{status.label}</option>)}
      </select>
    </label>
  );
}

async function downloadBookings(bookings) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const textCell = (value) => ({ value: value || '' });
  const dateCell = (value) => {
    const date = parseBookingDate(value);
    if (!date) return null;
    const local = dateKeyFormatter.format(date) + 'T' + exportTimeFormatter.format(date) + 'Z';
    return { value: new Date(local), format: 'dd/mm/yyyy hh:mm:ss' };
  };
  const headings = [
    'Mã đơn', 'Khách hàng', 'Phim', 'Chi nhánh', 'Mã chi nhánh (ID)', 'Phòng', 'Ghế', 'Ngày đặt',
    'Suất chiếu', 'Tổng tiền (VND)', 'Trạng thái đơn', 'Thanh toán', 'Phương thức', 'Thời điểm thanh toán',
  ];
  const data = [
    headings.map((value) => ({ ...textCell(value), fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: '#0756A6' })),
    ...bookings.map((booking) => [
      textCell(bookingCode(booking)),
      textCell(customerName(booking)),
      textCell(booking.movieName),
      textCell(booking.branchName),
      textCell(booking.branchId?.toString()),
      textCell(booking.roomName),
      textCell(seats(booking)),
      dateCell(booking.createdAt),
      dateCell(booking.showtimeStart),
      booking.totalAmount == null ? null : { value: Number(booking.totalAmount), format: '#,##0' },
      textCell(BOOKING_STATUS[booking.status]?.label || booking.status),
      textCell(PAYMENT_STATUS[booking.paymentStatus || 'NO_TRANSACTION']?.label || booking.paymentStatus),
      textCell(PAYMENT_METHOD[booking.paymentMethod] || booking.paymentMethod),
      dateCell(booking.paidAt),
    ]),
  ];
  await writeXlsxFile(data, {
    sheet: 'Đơn đặt vé',
    stickyRowsCount: 1,
    columns: [23, 24, 35, 28, 21, 18, 20, 23, 23, 20, 23, 22, 18, 25].map((width) => ({ width })),
  }).toFile('don-dat-ve-' + dateKeyFormatter.format(new Date()) + '.xlsx');
}

const BookingManagement = ({ staff = false, requestedBookingId } = {}) => {
  const { isAdmin, isManager } = useAuth();
  const canProcessRefund = isAdmin || isManager;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [processingRefund, setProcessingRefund] = useState(null);
  const [page, setPage] = useState(1);
  const [confirmState, setConfirmState] = useState(null);
  const [detailBooking, setDetailBooking] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [loadError, setLoadError] = useState('');
  const [lookupNotice, setLookupNotice] = useState('');
  const openedRequest = useRef(null);
  const drawer = useRef(null);
  const closeButton = useRef(null);
  const pageCheckbox = useRef(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await bookingApi.getAll();
      const sorted = (res.data.result || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setBookings(sorted);
      if (staff && requestedBookingId && openedRequest.current !== requestedBookingId) {
        openedRequest.current = requestedBookingId;
        const requested = sorted.find((booking) => String(booking.bookingId) === requestedBookingId);
        if (requested) setDetailBooking(requested);
        else setLookupNotice('Không tìm thấy đơn trong danh sách hiện có.');
      }
    } catch (err) {
      console.error('Lỗi khi tải đơn đặt vé:', err);
      if (staff) setLoadError(err.response?.data?.message || 'Không thể tải danh sách đơn đặt vé.');
      else toast.error('Không thể tải danh sách đơn đặt vé');
    } finally {
      setLoading(false);
    }
  }, [requestedBookingId, staff]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const requestProcessRefund = (booking, approved) => {
    if (!canProcessRefund) return;
    setRefundError('');
    setConfirmState({
      bookingId: booking.bookingId,
      bookingCode: booking.bookingCode || `#${booking.bookingId}`,
      approved,
    });
  };

  // Đơn bán tại quầy: nhân viên gửi yêu cầu hoàn thay khách vãng lai (không có tài khoản đăng nhập).
  const requestCustomerRefund = (booking) => {
    setRefundError('');
    setRefundReason('');
    setConfirmState({
      kind: 'request',
      bookingId: booking.bookingId,
      bookingCode: booking.bookingCode || `#${booking.bookingId}`,
      cash: booking.paymentMethod === 'CASH',
    });
  };

  const mergeUpdatedBooking = (bookingId, updated) => {
    setBookings((prev) => prev.map((b) => (b.bookingId === bookingId ? { ...b, ...updated } : b)));
    setDetailBooking((previous) => previous?.bookingId === bookingId ? { ...previous, ...updated } : previous);
  };

  const executeRequestRefund = async () => {
    const { bookingId } = confirmState;
    const reason = refundReason.trim();
    if (!reason) {
      setRefundError('Nhập lý do hoàn tiền');
      return;
    }
    setRefundError('');
    setProcessingRefund(bookingId);
    try {
      const res = await bookingApi.requestRefund(bookingId, reason);
      mergeUpdatedBooking(bookingId, res.data.result);
      toast.success('Đã gửi yêu cầu hoàn tiền. Quản lý chi nhánh sẽ duyệt.');
      setConfirmState(null);
      setRefundReason('');
    } catch (err) {
      setRefundError(err.response?.data?.message || err.message);
    } finally {
      setProcessingRefund(null);
    }
  };

  const executeProcessRefund = async () => {
    if (!confirmState) return;
    if (confirmState.kind === 'request') {
      await executeRequestRefund();
      return;
    }
    const { bookingId, approved } = confirmState;
    setRefundError('');
    setProcessingRefund(bookingId);
    try {
      const res = await bookingApi.processRefund(bookingId, approved);
      const updated = res.data.result;
      setBookings((prev) =>
        prev.map((b) =>
          b.bookingId === bookingId
            ? {
                ...b,
                ...updated,
              }
            : b
        )
      );
      if (approved && updated.status !== 'REFUNDED') {
        toast.info(updated.refundGatewayMessage || 'Chưa xác nhận hoàn tiền. Vui lòng kiểm tra lại kết quả.');
      } else {
        toast.success(approved ? 'Đã hoàn tiền thành công' : 'Đã từ chối yêu cầu hoàn tiền');
      }
      setDetailBooking((previous) => previous?.bookingId === bookingId ? { ...previous, ...updated } : previous);
      setConfirmState(null);
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      setRefundError(message);
      toast.error('Lỗi: ' + message);
    } finally {
      setProcessingRefund(null);
    }
  };

  const branchOptions = useMemo(() => {
    const options = new Map();
    for (const booking of bookings) {
      if (booking.branchId != null || booking.branchName) {
        options.set(branchKey(booking), {
          label: booking.branchName || 'Chi nhánh #' + booking.branchId,
          id: booking.branchId,
        });
      }
    }
    const nameCounts = new Map();
    for (const { label } of options.values()) {
      nameCounts.set(label, (nameCounts.get(label) || 0) + 1);
    }
    return [...options].map(([key, { label, id }]) => ({
      key,
      label: nameCounts.get(label) > 1 ? label + (id == null ? ' (chưa có mã)' : ' (#' + id + ')') : label,
    })).sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }, [bookings]);

  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  const filtered = useMemo(() => {
    if (invalidRange) return [];
    const query = searchTerm.trim().toLocaleLowerCase('vi');
    return bookings.filter((booking) => {
      if (filters.branch && branchKey(booking) !== filters.branch) return false;
      if (statusFilter !== 'ALL' && booking.status !== statusFilter) return false;
      if (filters.payment && (booking.paymentStatus || 'NO_TRANSACTION') !== filters.payment) return false;
      if (filters.from || filters.to) {
        const date = parseBookingDate(booking.createdAt);
        if (!date) return false;
        const day = dateKeyFormatter.format(date);
        if ((filters.from && day < filters.from) || (filters.to && day > filters.to)) return false;
      }
      return !query || [bookingCode(booking), customerName(booking), booking.movieName, booking.branchName,
        ...(staff ? (booking.tickets || []).map((ticket) => String(ticket.id ?? '')) : [])]
        .some((value) => value?.toLocaleLowerCase('vi').includes(query));
    });
  }, [bookings, filters, invalidRange, searchTerm, staff, statusFilter]);

  const stats = useMemo(() => filtered.reduce((totals, booking) => {
    if (booking.status === 'COMPLETED') totals.completed++;
    if (booking.status === 'REFUND_REQUESTED') totals.refundRequested++;
    if (booking.paymentStatus === 'PAID') totals.paidAmount += Number(booking.totalAmount) || 0;
    return totals;
  }, { completed: 0, refundRequested: 0, paidAmount: 0 }), [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const firstRow = (currentPage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(firstRow, firstRow + PAGE_SIZE);
  const selectedBookings = filtered.filter((booking) => selectedIds.has(booking.bookingId));
  const selectedOnPage = paginated.filter((booking) => selectedIds.has(booking.bookingId)).length;
  const pageSelected = paginated.length > 0 && selectedOnPage === paginated.length;
  const hasFilters = Boolean(searchTerm || statusFilter !== 'ALL' || Object.values(filters).some(Boolean));
  const drawerOpen = Boolean(detailBooking);
  const confirming = Boolean(confirmState);

  useEffect(() => {
    if (pageCheckbox.current) pageCheckbox.current.indeterminate = selectedOnPage > 0 && !pageSelected;
  }, [selectedOnPage, pageSelected, loading]);

  useEffect(() => {
    const dialog = drawer.current;
    if (!dialog) return;
    if (drawerOpen && !dialog.open) dialog.showModal();
    if (!drawerOpen && dialog.open) dialog.close();
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    if (confirming) drawer.current?.querySelector('.modal-overlay button')?.focus();
    else closeButton.current?.focus();
  }, [drawerOpen, confirming]);

  const resetSelection = () => {
    setPage(1);
    setSelectedIds(new Set());
  };

  const updateFilter = (key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    resetSelection();
  };

  const toggleSelection = (rows, checked) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      for (const booking of rows) {
        if (checked) next.add(booking.bookingId);
        else next.delete(booking.bookingId);
      }
      return next;
    });
  };

  const exportSelection = async () => {
    setExporting(true);
    try {
      await downloadBookings(selectedBookings);
    } catch (err) {
      console.error('Lỗi khi xuất đơn đặt vé:', err);
      toast.error('Không thể xuất Excel. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const summary = [
    { label: 'Tổng đơn', value: numberFormatter.format(filtered.length), icon: <TicketIcon size={21} />, tone: 'info' },
    { label: 'Đơn hoàn tất', value: numberFormatter.format(stats.completed), icon: <CheckIcon size={21} />, tone: 'success' },
    { label: 'Yêu cầu hoàn tiền', value: numberFormatter.format(stats.refundRequested), icon: <BellIcon size={21} />, tone: 'warning' },
    { label: 'Tổng tiền đã thanh toán', value: formatCurrency(stats.paidAmount), icon: <CreditCardIcon size={21} />, tone: 'success' },
  ];

  return (
    <div className="dashboard-container booking-management">
      <header className="dashboard-header booking-header">
        <div className={staff ? 'staff-heading-copy' : undefined}>
          {staff && <span className="staff-heading-icon"><ListIcon size={24} /></span>}
          <div>
            <h1 className="page-title">{staff ? 'Tra cứu đơn vé' : 'Quản lý đơn đặt vé'}</h1>
            <p className="page-subtitle">Theo dõi đơn đặt vé, giao dịch và yêu cầu hoàn tiền.</p>
          </div>
        </div>
        <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => {
          setSelectedIds(new Set());
          fetchBookings();
        }}>
          <RefreshIcon size={17} /> Làm mới
        </button>
      </header>

      <section className="booking-kpis" aria-label="Thống kê theo bộ lọc" aria-busy={loading}>
        {summary.map(({ label, value, icon, tone }) => (
          <article className="booking-kpi" key={label}>
            <span className={'booking-kpi-icon booking-tone--' + tone}>{icon}</span>
            <div><span>{label}</span><strong>{loading || (loadError && !bookings.length) ? DASH : value}</strong></div>
          </article>
        ))}
      </section>

      <section className="admin-table-card booking-list" aria-labelledby="booking-list-title" aria-busy={loading}>
        <div className="booking-list-heading">
          <div>
            <h2 id="booking-list-title">Danh sách đơn</h2>
            <p role="status">{loading ? 'Đang tải…' : loadError && !bookings.length ? 'Chưa tải được dữ liệu' : numberFormatter.format(filtered.length) + ' đơn phù hợp'}</p>
          </div>
          {isAdmin && (
            <button type="button" className="btn btn-primary" disabled={loading || exporting || !selectedBookings.length} onClick={exportSelection}>
              <DownloadIcon size={17} />
              {exporting ? 'Đang xuất…' : 'Xuất Excel' + (selectedBookings.length ? ' (' + selectedBookings.length + ')' : '')}
            </button>
          )}
        </div>

        <div className="booking-filters">
          <label>Tìm kiếm
            <span className="booking-search"><SearchIcon size={17} />
              <input type="search" className="input" placeholder={staff ? 'Mã đơn, mã vé, khách, phim' : 'Mã đơn, khách, phim'} value={searchTerm}
                onChange={(event) => { setSearchTerm(event.target.value); resetSelection(); }} />
            </span>
          </label>
          <label>Chi nhánh
            <select className="input" value={filters.branch} onChange={(event) => updateFilter('branch', event.target.value)}>
              <option value="">Tất cả chi nhánh</option>
              {branchOptions.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label>Đặt từ ngày
            <input type="date" className="input" value={filters.from} max={filters.to || undefined}
              aria-invalid={invalidRange} onChange={(event) => updateFilter('from', event.target.value)} />
          </label>
          <label>Đặt đến ngày
            <input type="date" className="input" value={filters.to} min={filters.from || undefined}
              aria-invalid={invalidRange} onChange={(event) => updateFilter('to', event.target.value)} />
          </label>
          <StatusSelect label="Trạng thái đơn" statuses={BOOKING_STATUS} value={statusFilter} all="ALL"
            onChange={(value) => { setStatusFilter(value); resetSelection(); }} />
          <StatusSelect label="Thanh toán" statuses={PAYMENT_STATUS} value={filters.payment}
            onChange={(value) => updateFilter('payment', value)} />
          {hasFilters && (
            <button type="button" className="btn btn-ghost booking-clear-filters" onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
              setFilters(EMPTY_FILTERS);
              resetSelection();
            }}>Xóa bộ lọc</button>
          )}
          {invalidRange && <p className="booking-filter-error" role="alert">Ngày kết thúc phải từ ngày bắt đầu trở đi.</p>}
        </div>

        {isAdmin && selectedBookings.length > 0 && (
          <div className="booking-selection">
            <strong role="status">Đã chọn {numberFormatter.format(selectedBookings.length)} đơn</strong>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>Bỏ chọn</button>
          </div>
        )}

        {lookupNotice && <p className="staff-booking-notice" role="status">{lookupNotice}</p>}
        {loadError && <div className="staff-state staff-state--error" role="alert">
          <strong>{loadError}</strong><button type="button" className="btn btn-secondary" onClick={fetchBookings}>Thử lại</button>
        </div>}
        {loading ? <div className="booking-empty" role="status">Đang tải đơn đặt vé…</div> : (!loadError || bookings.length > 0) && (
          <div className="booking-table-scroll" tabIndex={0} role="region" aria-label="Bảng đơn đặt vé">
            <table className="admin-table booking-table">
              <thead>
                <tr>
                  {isAdmin && (
                    <th scope="col" className="booking-checkbox-cell">
                      <input ref={pageCheckbox} type="checkbox" aria-label="Chọn tất cả đơn trên trang này"
                        checked={pageSelected} disabled={!paginated.length}
                        onChange={(event) => toggleSelection(paginated, event.target.checked)} />
                    </th>
                  )}
                  <th scope="col" className="booking-order-column">Mã đơn / Khách</th>
                  <th scope="col">{staff ? 'Phim / Suất chiếu' : 'Phim / Rạp'}</th>
                  <th scope="col" className="booking-date">Ngày đặt</th>
                  <th scope="col" className="booking-money">Tổng tiền</th>
                  <th scope="col" className="booking-status-column">Trạng thái đơn</th>
                  <th scope="col" className="booking-status-column">Thanh toán</th>
                  <th scope="col" className="booking-action-cell"><span className="booking-sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {!paginated.length && (
                  <tr><td colSpan={isAdmin ? 8 : 7}><div className="booking-empty"><ListIcon size={25} />
                    {hasFilters ? 'Không có đơn phù hợp với bộ lọc' : 'Chưa có đơn đặt vé'}
                  </div></td></tr>
                )}
                {paginated.map((booking) => {
                  const code = bookingCode(booking);
                  const selected = selectedIds.has(booking.bookingId);
                  const location = [booking.branchName, booking.roomName].filter(Boolean).join(' · ');
                  return (
                    <tr key={booking.bookingId} className={selected ? 'is-selected' : undefined}>
                      {isAdmin && (
                        <td className="booking-checkbox-cell"><input type="checkbox" checked={selected}
                          aria-label={'Chọn đơn ' + code} onChange={(event) => toggleSelection([booking], event.target.checked)} /></td>
                      )}
                      <td>
                        <button type="button" className="booking-order-link" title={code} onClick={() => setDetailBooking(booking)}>{code}</button>
                        <span className="booking-cell-secondary" title={customerName(booking)}>{customerName(booking)}</span>
                      </td>
                      <td>
                        <strong className="booking-cell-main" title={booking.movieName}>{booking.movieName || DASH}</strong>
                        {staff && booking.showtimeStart && <span className="booking-cell-secondary">{formatDateTime(booking.showtimeStart)}</span>}
                        <span className="booking-cell-secondary" title={location}>{location || DASH}</span>
                      </td>
                      <td className="booking-date" title={formatDateTime(booking.createdAt)}>{formatDate(booking.createdAt)}</td>
                      <td className="booking-money">{formatCurrency(booking.totalAmount)}</td>
                      <td><StatusBadge statuses={BOOKING_STATUS} value={booking.status} /></td>
                      <td><StatusBadge statuses={PAYMENT_STATUS} value={booking.paymentStatus || 'NO_TRANSACTION'} /></td>
                      <td className="booking-action-cell">
                        <button type="button" className="btn btn-ghost btn-sm booking-icon-button" title="Xem chi tiết"
                          aria-label={'Xem chi tiết đơn ' + code} onClick={() => setDetailBooking(booking)}>
                          <EyeIcon size={17} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <footer className="booking-pagination">
            <span>Hiển thị {firstRow + 1}–{firstRow + paginated.length} / {filtered.length} đơn</span>
            {totalPages > 1 && (
              <nav aria-label="Phân trang đơn đặt vé">
                <button type="button" className="btn btn-secondary btn-sm booking-icon-button" aria-label="Trang trước"
                  disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeftIcon size={17} /></button>
                <span>Trang {currentPage} / {totalPages}</span>
                <button type="button" className="btn btn-secondary btn-sm booking-icon-button" aria-label="Trang sau"
                  disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRightIcon size={17} /></button>
              </nav>
            )}
          </footer>
        )}
      </section>

      <dialog ref={drawer} className="booking-drawer" aria-labelledby="booking-drawer-title"
        onClick={(event) => {
          if (event.target === event.currentTarget && !confirming) setDetailBooking(null);
        }}
        onCancel={(event) => {
          event.preventDefault();
          if (processingRefund) return;
          if (confirming) setConfirmState(null);
          else setDetailBooking(null);
        }}>
        {detailBooking && (
          <div className="booking-drawer-panel" inert={confirming || undefined}>
            <header className="booking-drawer-header">
              <div>
                <h2 id="booking-drawer-title">Đơn {bookingCode(detailBooking)}</h2>
                <p>Ngày đặt {formatDateTime(detailBooking.createdAt)}</p>
              </div>
              <button ref={closeButton} type="button" className="btn btn-ghost booking-icon-button"
                aria-label="Đóng chi tiết đơn" onClick={() => setDetailBooking(null)}><XIcon size={21} /></button>
            </header>
            <div className="booking-drawer-body">
              <div className="booking-drawer-status">
                <div><span>Trạng thái đơn</span><StatusBadge statuses={BOOKING_STATUS} value={detailBooking.status} /></div>
                <div><span>Thanh toán</span><StatusBadge statuses={PAYMENT_STATUS} value={detailBooking.paymentStatus || 'NO_TRANSACTION'} /></div>
              </div>
              <section className="booking-detail-section">
                <h3>Thông tin vé</h3>
                <dl>
                  <div><dt>Khách hàng</dt><dd>{customerName(detailBooking)}</dd></div>
                  <div><dt>Phim</dt><dd>{detailBooking.movieName || DASH}</dd></div>
                  <div><dt>Chi nhánh</dt><dd>{detailBooking.branchName || DASH}</dd></div>
                  <div><dt>Phòng chiếu</dt><dd>{detailBooking.roomName || DASH}</dd></div>
                  <div><dt>Suất chiếu</dt><dd>{formatDateTime(detailBooking.showtimeStart)}</dd></div>
                  <div><dt>Ghế</dt><dd>{seats(detailBooking) || DASH}</dd></div>
                </dl>
              </section>
              {staff && detailBooking.tickets?.length > 0 && (
                <section className="booking-detail-section">
                  <h3>Trạng thái từng vé</h3>
                  <ul className="booking-food-list">
                    {detailBooking.tickets.map((ticket) => (
                      <li key={ticket.id ?? ticket.seatId}>
                        <span>{ticket.seatCode || DASH}{ticket.id != null ? ' · Vé #' + ticket.id : ''}</span>
                        <Badge tone={ticket.checkedInAt ? 'success' : 'neutral'}>
                          {ticket.checkedInAt ? 'Đã check-in · ' + formatDateTime(ticket.checkedInAt)
                            : detailBooking.status === 'REFUNDED' ? 'Đơn đã hoàn tiền'
                            : detailBooking.status === 'CANCELLED' ? 'Đơn đã hủy'
                            : ticket.ticketStatus === 'BOOKED' ? 'Chưa check-in'
                            : ticket.ticketStatus === 'HOLDING' ? 'Đang giữ' : 'Chưa xác nhận'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {detailBooking.foods?.length > 0 && (
                <section className="booking-detail-section">
                  <h3>Bắp, nước và combo</h3>
                  <ul className="booking-food-list">
                    {detailBooking.foods.map((food, index) => (
                      <li key={food.foodId ?? index}>
                        <span>{food.quantity} × {food.foodName || 'Sản phẩm'}</span>
                        <strong>{formatCurrency(food.subtotal ?? food.unitPrice * food.quantity)}</strong>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="booking-detail-section">
                <h3>Thông tin giao dịch</h3>
                <dl>
                  <div><dt>Phương thức</dt><dd>{PAYMENT_METHOD[detailBooking.paymentMethod] || detailBooking.paymentMethod || DASH}</dd></div>
                  <div><dt>Thời điểm thanh toán</dt><dd>{formatDateTime(detailBooking.paidAt)}</dd></div>
                  {detailBooking.providerTxnId && <div><dt>Mã giao dịch</dt><dd>{detailBooking.providerTxnId}</dd></div>}
                  {Number(detailBooking.discountAmount) > 0 && <div><dt>Giảm giá</dt><dd>{formatCurrency(detailBooking.discountAmount)}</dd></div>}
                </dl>
                <div className="booking-detail-total"><span>Tổng tiền đơn</span><strong>{formatCurrency(detailBooking.totalAmount)}</strong></div>
              </section>
              {(detailBooking.refundReason || detailBooking.refundProcessNote || detailBooking.refundGatewayMessage ||
                detailBooking.status === 'REFUND_REQUESTED' || detailBooking.status === 'REFUNDED') && (
                <section className="booking-detail-section">
                  <h3>Hoàn tiền</h3>
                  <dl className="booking-refund-fields">
                    {detailBooking.refundReason && <div><dt>Lý do yêu cầu</dt><dd>{detailBooking.refundReason}</dd></div>}
                    {detailBooking.refundProcessNote && <div><dt>Ghi chú xử lý</dt><dd>{detailBooking.refundProcessNote}</dd></div>}
                    {detailBooking.refundGatewayMessage && <div><dt>Thông tin giao dịch hoàn tiền</dt><dd>{detailBooking.refundGatewayMessage}</dd></div>}
                    {detailBooking.refundAmount != null && <div><dt>Số tiền hoàn</dt><dd>{formatCurrency(detailBooking.refundAmount)}</dd></div>}
                    {detailBooking.refundedAt && <div><dt>Thời điểm hoàn tiền</dt><dd>{formatDateTime(detailBooking.refundedAt)}</dd></div>}
                  </dl>
                </section>
              )}
            </div>
            {canRequestRefundForCustomer(detailBooking) && (
              <footer className="booking-drawer-footer">
                <button type="button" className="btn btn-secondary" disabled={Boolean(processingRefund)}
                  onClick={() => requestCustomerRefund(detailBooking)}>
                  <CreditCardIcon size={16} /><span>Yêu cầu hoàn thay khách</span>
                </button>
              </footer>
            )}
            {canProcessRefund && detailBooking.status === 'REFUND_REQUESTED' && (
              <footer className="booking-drawer-footer">
                <button type="button" className="btn btn-secondary" onClick={() => requestProcessRefund(detailBooking, false)}
                  disabled={Boolean(processingRefund) || ['PROCESSING', 'UNKNOWN'].includes(detailBooking.refundGatewayStatus)}>
                  <XIcon size={16} /><span>Từ chối</span>
                </button>
                <button type="button" className="btn btn-primary" disabled={Boolean(processingRefund)}
                  onClick={() => requestProcessRefund(detailBooking, true)}>
                  <CheckIcon size={16} />
                  {['PROCESSING', 'UNKNOWN'].includes(detailBooking.refundGatewayStatus) ? 'Kiểm tra kết quả'
                    : detailBooking.refundGatewayStatus === 'FAILED' ? 'Thử lại hoàn tiền' : 'Duyệt hoàn tiền'}
                </button>
              </footer>
            )}
          </div>
        )}

        <ConfirmDialog
          open={confirming}
          title={confirmState?.kind === 'request' ? 'Yêu cầu hoàn tiền thay khách'
            : confirmState?.approved ? 'Duyệt yêu cầu hoàn tiền' : 'Từ chối yêu cầu hoàn tiền'}
          message={confirmState?.kind === 'request' ? (
            <>
              <span>
                Đơn {confirmState.bookingCode} bán tại quầy. Quản lý chi nhánh sẽ duyệt yêu cầu
                {confirmState.cash ? '; tiền mặt hoàn tại quầy sau khi được duyệt.' : '.'}
              </span>
              <label className="booking-refund-reason">
                <span>Lý do hoàn tiền</span>
                <textarea className="input" rows={3} maxLength={500} value={refundReason}
                  placeholder="Ví dụ: bán nhầm suất chiếu, khách đổi ý trước giờ chiếu"
                  disabled={Boolean(processingRefund)} onChange={(event) => setRefundReason(event.target.value)} />
              </label>
              {refundError && <span className="booking-refund-error" role="alert">Lỗi: {refundError}</span>}
            </>
          ) : (confirmState?.approved
            ? 'Xác nhận xử lý hoàn tiền cho đơn ' + confirmState.bookingCode + '?'
            : 'Xác nhận từ chối yêu cầu hoàn tiền của đơn ' + confirmState?.bookingCode + '?') +
            (refundError ? '\n\nLỗi: ' + refundError : '')}
          confirmText={confirmState?.kind === 'request' ? 'Gửi yêu cầu' : confirmState?.approved ? 'Xác nhận' : 'Từ chối'}
          variant={confirmState?.kind === 'request' || confirmState?.approved ? 'primary' : 'danger'}
          loading={Boolean(processingRefund)}
          onConfirm={executeProcessRefund}
          onCancel={() => setConfirmState(null)}
        />
      </dialog>
    </div>
  );
};

export default BookingManagement;


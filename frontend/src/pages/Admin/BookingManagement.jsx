import { useCallback, useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { bookingApi, branchApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import { CheckIcon, CreditCardIcon, DownloadIcon, RefreshIcon, XIcon } from '../../components/Common/CinemaIcons';
import { Code, DataTable, Field, FilterBar, Money, OpsButton, OpsConfirm, OpsDrawer, OpsPage,
  OpsPanel, Pagination, Select, StatStrip, StatusBadge, Textarea, TextInput } from '../../components/Ops';
import { PAYMENT_STATUS_META as PAYMENT_STATUS } from '../../utils/paymentStatus';
import { formatDate, formatDateTime, parseLocalDateTime, toCinemaDateKey, formatCinema } from '../../utils/cinemaTime';
import { BOOKING_STATUS_META } from '../../utils/bookingStatus';

const PAGE_SIZE = 15;
const EMPTY_FILTERS = { branch: '', from: '', to: '', payment: '' };
const EMPTY_PAGE = { totalElements: 0, totalPages: 0, summary: { completed: 0, refundRequested: 0, paidAmount: 0 } };
const DASH = '—';
const BOOKING_STATUS = BOOKING_STATUS_META;
const PAYMENT_METHOD = { CASH: 'Tiền mặt', CARD: 'Thẻ', VNPAY: 'VNPay' };

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND', maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat('vi-VN');

const formatCurrency = (amount) => currencyFormatter.format(amount ?? 0);
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
// Bỏ tham số rỗng để URL chỉ chứa bộ lọc đang dùng.
const searchParams = (params) => Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== '' && value != null));

function StatusSelect({ label, statuses, value, onChange, all = '' }) {
  return (
    <Field label={label}>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value={all}>Tất cả</option>
        {Object.entries(statuses).map(([key, status]) => <option key={key} value={key}>{status.label}</option>)}
      </Select>
    </Field>
  );
}

async function downloadBookings(bookings) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const textCell = (value) => ({ value: value || '' });
  const dateCell = (value) => {
    const date = parseLocalDateTime(value);
    if (!date) return null;
    const local = toCinemaDateKey(date) + 'T' + formatCinema(date, {timeStyle: 'medium', hour12: false}) + 'Z';
    return { value: new Date(local), format: 'dd/mm/yyyy hh:mm:ss' };
  };
  const headings = [
    'Mã đơn', 'Khách hàng', 'Phim', 'Chi nhánh', 'Mã chi nhánh (ID)', 'Phòng', 'Ghế', 'Ngày đặt',
    'Suất chiếu', 'Tổng tiền (VND)', 'Trạng thái đơn', 'Thanh toán', 'Phương thức', 'Thời điểm thanh toán',
  ];
  const data = [
    headings.map((value) => ({ ...textCell(value), fontWeight: 'bold' })),
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
  }).toFile('don-dat-ve-' + toCinemaDateKey(new Date()) + '.xlsx');
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
  const [selectedIds, setSelectedIds] = useState(() => new Map());
  const [exporting, setExporting] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [loadError, setLoadError] = useState('');
  const [lookupNotice, setLookupNotice] = useState('');
  const [pageInfo, setPageInfo] = useState(EMPTY_PAGE);
  const [branches, setBranches] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const openedRequest = useRef(null);
  const latestRequest = useRef(0);
  const pageCheckbox = useRef(null);

  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);

  // Lọc, đếm và phân trang ở backend; chỉ nhận phản hồi của lần gọi mới nhất.
  const fetchBookings = useCallback(async () => {
    const request = ++latestRequest.current;
    if (invalidRange) {
      setBookings([]);
      setPageInfo(EMPTY_PAGE);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const res = await bookingApi.search(searchParams({
        q: debouncedSearch.trim(),
        status: statusFilter === 'ALL' ? '' : statusFilter,
        paymentStatus: filters.payment,
        branchId: filters.branch,
        from: filters.from,
        to: filters.to,
        page: page - 1,
        size: PAGE_SIZE,
      }));
      if (request !== latestRequest.current) return;
      const result = res.data.result || EMPTY_PAGE;
      setBookings(result.content || []);
      setPageInfo({
        totalElements: result.totalElements || 0,
        totalPages: result.totalPages || 0,
        summary: result.summary || EMPTY_PAGE.summary,
      });
      // Trang hiện tại không còn sau khi dữ liệu thay đổi: về trang cuối còn đơn.
      if (result.totalPages > 0 && page > result.totalPages) setPage(result.totalPages);
    } catch (err) {
      if (request !== latestRequest.current) return;
      console.error('Lỗi khi tải đơn đặt vé:', err);
      setLoadError(err.response?.data?.message || 'Không tải được danh sách đơn. Kiểm tra kết nối rồi thử lại.');
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [debouncedSearch, filters, invalidRange, page, statusFilter]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    setDebouncedSearch(searchTerm);
  }, [searchTerm]);

  // Chỉ ADMIN chọn chi nhánh; STAFF/MANAGER luôn bị backend giới hạn trong chi nhánh của mình.
  useEffect(() => {
    if (!isAdmin) return;
    branchApi.getAll()
      .then((res) => setBranches([...(res.data.result || [])]
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'))))
      .catch(() => setBranches([]));
  }, [isAdmin]);

  // Liên kết /staff/bookings?booking={id}: mở thẳng chi tiết đơn, không phụ thuộc trang đang xem.
  useEffect(() => {
    if (!staff || !requestedBookingId || openedRequest.current === requestedBookingId) return;
    openedRequest.current = requestedBookingId;
    bookingApi.getById(requestedBookingId)
      .then((res) => setDetailBooking(res.data.result))
      .catch(() => setLookupNotice('Không tìm thấy đơn hoặc đơn không thuộc phạm vi được xem.'));
  }, [requestedBookingId, staff]);

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

  const mergeSelected = (bookingId, updated) => setSelectedIds((previous) => previous.has(bookingId)
    ? new Map(previous).set(bookingId, { ...previous.get(bookingId), ...updated })
    : previous);

  const mergeUpdatedBooking = (bookingId, updated) => {
    setBookings((prev) => prev.map((b) => (b.bookingId === bookingId ? { ...b, ...updated } : b)));
    setDetailBooking((previous) => previous?.bookingId === bookingId ? { ...previous, ...updated } : previous);
    mergeSelected(bookingId, updated);
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
      mergeSelected(bookingId, updated);
      setConfirmState(null);
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      setRefundError(message);
      toast.error('Lỗi: ' + message);
    } finally {
      setProcessingRefund(null);
    }
  };

  const totalElements = pageInfo.totalElements;
  const stats = pageInfo.summary;
  const totalPages = Math.max(1, pageInfo.totalPages);
  const currentPage = Math.min(page, totalPages);
  const paginated = bookings;
  // Đơn đã chọn giữ qua các trang (theo ID) để xuất Excel một lần.
  const selectedBookings = [...selectedIds.values()];
  const selectedOnPage = paginated.filter((booking) => selectedIds.has(booking.bookingId)).length;
  const pageSelected = paginated.length > 0 && selectedOnPage === paginated.length;
  const hasFilters = Boolean(searchTerm || statusFilter !== 'ALL' || Object.values(filters).some(Boolean));
  const confirming = Boolean(confirmState);

  useEffect(() => {
    if (pageCheckbox.current) pageCheckbox.current.indeterminate = selectedOnPage > 0 && !pageSelected;
  }, [selectedOnPage, pageSelected, loading]);

  const resetSelection = () => {
    setPage(1);
    setSelectedIds(new Map());
  };

  const updateFilter = (key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    resetSelection();
  };

  const toggleSelection = (rows, checked) => {
    setSelectedIds((previous) => {
      const next = new Map(previous);
      for (const booking of rows) {
        if (checked) next.set(booking.bookingId, booking);
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

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setFilters(EMPTY_FILTERS);
    resetSelection();
  };

  const columns = [
    ...(isAdmin ? [{
      key: 'selection',
      header: <input ref={pageCheckbox} type="checkbox" aria-label="Chọn tất cả đơn trên trang này"
        checked={pageSelected} disabled={!paginated.length} onChange={event => toggleSelection(paginated, event.target.checked)} />,
      render: booking => <input type="checkbox" aria-label={'Chọn đơn ' + bookingCode(booking)}
        checked={selectedIds.has(booking.bookingId)} onClick={event => event.stopPropagation()}
        onChange={event => toggleSelection([booking], event.target.checked)} />,
    }] : []),
    { key: 'code', header: 'Mã đơn / Khách', render: booking => <><Code>{bookingCode(booking)}</Code><small className="o-subline">{customerName(booking)}</small></> },
    { key: 'movie', header: staff ? 'Phim / Suất chiếu' : 'Phim / Rạp', render: booking => <>
      <strong>{booking.movieName || DASH}</strong>
      {staff && <small className="o-subline">{formatDateTime(booking.showtimeStart)}</small>}
      <small className="o-subline">{[booking.branchName, booking.roomName].filter(Boolean).join(', ')}</small></> },
    { key: 'created', header: 'Ngày đặt', render: booking => formatDate(booking.createdAt) },
    { key: 'total', header: 'Tổng tiền', align: 'end', render: booking => <Money value={booking.totalAmount} /> },
    { key: 'status', header: 'Trạng thái đơn', render: booking => <StatusBadge kind="booking" value={booking.status} /> },
    { key: 'payment', header: 'Thanh toán', render: booking => <StatusBadge kind="payment" value={booking.paymentStatus || 'NO_TRANSACTION'} /> },
  ];

  return (
    <OpsPage title={staff ? 'Tra cứu đơn vé' : 'Quản lý đơn đặt vé'}
      description={isAdmin ? 'Tìm đơn đặt vé và theo dõi giao dịch của mọi chi nhánh.' : 'Tìm đơn đặt vé và theo dõi giao dịch tại chi nhánh.'}
      actions={<>
        <OpsButton disabled={loading} onClick={() => { setSelectedIds(new Map()); fetchBookings(); }}><RefreshIcon size={16} /> Làm mới</OpsButton>
        {isAdmin && <OpsButton variant="primary" disabled={loading || exporting || !selectedBookings.length} onClick={exportSelection}>
          <DownloadIcon size={16} />{exporting ? 'Đang xuất…' : 'Xuất Excel' + (selectedBookings.length ? ' (' + selectedBookings.length + ')' : '')}
        </OpsButton>}
      </>}>
      <StatStrip loading={loading} items={[
        { label: 'Tổng đơn', value: numberFormatter.format(totalElements) },
        { label: 'Đơn hoàn tất', value: numberFormatter.format(stats.completed) },
        { label: 'Yêu cầu hoàn tiền', value: numberFormatter.format(stats.refundRequested), tone: stats.refundRequested ? 'warning' : undefined },
        { label: 'Tổng tiền đã thanh toán', value: <Money value={stats.paidAmount} /> },
      ]} />
      <FilterBar search={searchTerm} onSearchChange={value => { setSearchTerm(value); resetSelection(); }}
        searchLabel="Tìm đơn đặt vé" searchPlaceholder="Mã đơn, mã vé, ghế, khách, phim"
        filtered={hasFilters} onReset={clearFilters} resultLabel={numberFormatter.format(totalElements) + ' đơn phù hợp'}>
        {isAdmin && <Field label="Chi nhánh"><Select value={filters.branch} onChange={event => updateFilter('branch', event.target.value)}>
          <option value="">Tất cả chi nhánh</option>
          {branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name || 'Chi nhánh #' + branch.branchId}</option>)}
        </Select></Field>}
        <Field label="Đặt từ ngày"><TextInput type="date" value={filters.from} max={filters.to || undefined}
          onChange={event => updateFilter('from', event.target.value)} /></Field>
        <Field label="Đặt đến ngày" error={invalidRange ? 'Ngày kết thúc phải từ ngày bắt đầu trở đi.' : undefined}>
          <TextInput type="date" value={filters.to} min={filters.from || undefined} onChange={event => updateFilter('to', event.target.value)} /></Field>
        <StatusSelect label="Trạng thái đơn" statuses={BOOKING_STATUS} value={statusFilter} all="ALL"
          onChange={value => { setStatusFilter(value); resetSelection(); }} />
        <StatusSelect label="Thanh toán" statuses={PAYMENT_STATUS} value={filters.payment} onChange={value => updateFilter('payment', value)} />
      </FilterBar>
      {lookupNotice && <p role="status">{lookupNotice}</p>}
      <OpsPanel title="Danh sách đơn" flush actions={selectedBookings.length > 0 && <OpsButton variant="ghost"
        onClick={() => setSelectedIds(new Map())}>Bỏ chọn {selectedBookings.length} đơn</OpsButton>}>
        <DataTable caption="Danh sách đơn" columns={columns} rows={paginated} rowKey={booking => booking.bookingId}
          state={loading ? 'loading' : loadError ? 'error' : 'ready'} onRetry={fetchBookings}
          empty={{ title: hasFilters ? 'Không có đơn phù hợp với bộ lọc' : 'Chưa có đơn đặt vé',
            action: hasFilters ? { label: 'Xóa bộ lọc', onClick: clearFilters } : { label: 'Làm mới', onClick: fetchBookings } }}
          selectedKey={detailBooking?.bookingId} onRowOpen={setDetailBooking} />
        {!loading && totalElements > 0 && <Pagination page={currentPage - 1} pageSize={PAGE_SIZE}
          totalItems={totalElements} noun="đơn" onPageChange={value => setPage(value + 1)} />}
      </OpsPanel>
      {detailBooking && <OpsDrawer open title={'Đơn ' + bookingCode(detailBooking)} onClose={() => setDetailBooking(null)}
        description={'Ngày đặt ' + formatDateTime(detailBooking.createdAt)} disabled={confirming} footer={<>
            {canRequestRefundForCustomer(detailBooking) && (
              <>
                <OpsButton disabled={Boolean(processingRefund)}
                  onClick={() => requestCustomerRefund(detailBooking)}>
                  <CreditCardIcon size={16} /><span>Yêu cầu hoàn thay khách</span>
                </OpsButton>
              </>
            )}
            {canProcessRefund && detailBooking.status === 'REFUND_REQUESTED' && (
              <>
                <OpsButton onClick={() => requestProcessRefund(detailBooking, false)}
                  disabled={Boolean(processingRefund) || ['PROCESSING', 'UNKNOWN'].includes(detailBooking.refundGatewayStatus)}>
                  <XIcon size={16} /><span>Từ chối</span>
                </OpsButton>
                <OpsButton variant="primary" disabled={Boolean(processingRefund)}
                  onClick={() => requestProcessRefund(detailBooking, true)}>
                  <CheckIcon size={16} />
                  {['PROCESSING', 'UNKNOWN'].includes(detailBooking.refundGatewayStatus) ? 'Kiểm tra kết quả'
                    : detailBooking.refundGatewayStatus === 'FAILED' ? 'Thử lại hoàn tiền' : 'Duyệt hoàn tiền'}
                </OpsButton>
              </>
            )}
        </>}>
              <div className="o-summary-pair">
                <div><span>Trạng thái đơn</span><StatusBadge kind="booking" value={detailBooking.status} /></div>
                <div><span>Thanh toán</span><StatusBadge kind="payment" value={detailBooking.paymentStatus || 'NO_TRANSACTION'} /></div>
              </div>
              <section className="o-detail">
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
                <section className="o-detail">
                  <h3>Trạng thái từng vé</h3>
                  <ul className="o-line-list">
                    {detailBooking.tickets.map((ticket) => (
                      <li key={ticket.id ?? ticket.seatId}>
                        <span>{ticket.seatCode || DASH}{ticket.id != null ? ', Vé #' + ticket.id : ''}</span>
                        <StatusBadge tone={ticket.checkedInAt ? 'success' : 'neutral'}>
                          {ticket.checkedInAt ? 'Đã check-in, ' + formatDateTime(ticket.checkedInAt)
                            : detailBooking.status === 'REFUNDED' ? 'Đơn đã hoàn tiền'
                            : detailBooking.status === 'CANCELLED' ? 'Đơn đã hủy'
                            : ticket.ticketStatus === 'BOOKED' ? 'Chưa check-in'
                            : ticket.ticketStatus === 'HOLDING' ? 'Đang giữ' : 'Chưa xác nhận'}
                        </StatusBadge>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {detailBooking.foods?.length > 0 && (
                <section className="o-detail">
                  <h3>Bắp, nước và combo</h3>
                  <ul className="o-line-list">
                    {detailBooking.foods.map((food, index) => (
                      <li key={food.foodId ?? index}>
                        <span>{food.quantity} × {food.foodName || 'Sản phẩm'}</span>
                        <strong>{food.subtotal == null ? DASH : formatCurrency(food.subtotal)}</strong>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="o-detail">
                <h3>Thông tin giao dịch</h3>
                <dl>
                  <div><dt>Phương thức</dt><dd>{PAYMENT_METHOD[detailBooking.paymentMethod] || detailBooking.paymentMethod || DASH}</dd></div>
                  <div><dt>Thời điểm thanh toán</dt><dd>{formatDateTime(detailBooking.paidAt)}</dd></div>
                  {detailBooking.providerTxnId && <div><dt>Mã giao dịch</dt><dd>{detailBooking.providerTxnId}</dd></div>}
                  {Number(detailBooking.discountAmount) > 0 && <div><dt>Giảm giá</dt><dd>{formatCurrency(detailBooking.discountAmount)}</dd></div>}
                </dl>
                <div className="o-detail-total"><span>Tổng tiền đơn</span><strong>{formatCurrency(detailBooking.totalAmount)}</strong></div>
              </section>
              {(detailBooking.refundReason || detailBooking.refundProcessNote || detailBooking.refundGatewayMessage ||
                detailBooking.status === 'REFUND_REQUESTED' || detailBooking.status === 'REFUNDED') && (
                <section className="o-detail">
                  <h3>Hoàn tiền</h3>
                  <dl className="o-detail-list">
                    {detailBooking.refundReason && <div><dt>Lý do yêu cầu</dt><dd>{detailBooking.refundReason}</dd></div>}
                    {detailBooking.refundProcessNote && <div><dt>Ghi chú xử lý</dt><dd>{detailBooking.refundProcessNote}</dd></div>}
                    {detailBooking.refundGatewayMessage && <div><dt>Thông tin giao dịch hoàn tiền</dt><dd>{detailBooking.refundGatewayMessage}</dd></div>}
                    {detailBooking.refundAmount != null && <div><dt>Số tiền hoàn</dt><dd>{formatCurrency(detailBooking.refundAmount)}</dd></div>}
                    {detailBooking.refundedAt && <div><dt>Thời điểm hoàn tiền</dt><dd>{formatDateTime(detailBooking.refundedAt)}</dd></div>}
                  </dl>
                </section>
              )}
      </OpsDrawer>}
        <OpsConfirm
          open={confirming}
          title={confirmState?.kind === 'request' ? 'Yêu cầu hoàn tiền thay khách'
            : confirmState?.approved ? 'Duyệt yêu cầu hoàn tiền' : 'Từ chối yêu cầu hoàn tiền'}
          message={confirmState?.kind === 'request' ? (
            <>
              <span>
                Đơn {confirmState.bookingCode} bán tại quầy. Quản lý chi nhánh sẽ duyệt yêu cầu
                {confirmState.cash ? '; tiền mặt hoàn tại quầy sau khi được duyệt.' : '.'}
              </span>
              <label className="o-field">
                <span>Lý do hoàn tiền</span>
                <Textarea rows={3} maxLength={500} value={refundReason}
                  placeholder="Ví dụ: bán nhầm suất chiếu, khách đổi ý trước giờ chiếu"
                  disabled={Boolean(processingRefund)} onChange={(event) => setRefundReason(event.target.value)} />
              </label>
              {refundError && <span className="o-field-error" role="alert">Lỗi: {refundError}</span>}
            </>
          ) : (confirmState?.approved
            ? 'Xác nhận xử lý hoàn tiền cho đơn ' + confirmState.bookingCode + '?'
            : 'Xác nhận từ chối yêu cầu hoàn tiền của đơn ' + confirmState?.bookingCode + '?') +
            (refundError ? '\n\nLỗi: ' + refundError : '')}
          confirmLabel={confirmState?.kind === 'request' ? 'Gửi yêu cầu' : confirmState?.approved ? 'Duyệt hoàn tiền' : 'Từ chối'}
          tone={confirmState?.kind === 'request' || confirmState?.approved ? 'primary' : 'danger'}
          loading={Boolean(processingRefund)}
          onConfirm={executeProcessRefund}
          onClose={() => setConfirmState(null)}
        />
    </OpsPage>
  );
};

export default BookingManagement;


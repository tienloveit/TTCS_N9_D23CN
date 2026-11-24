import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { bookingApi } from '../../api';
import { Code, DataTable, DateLabel, Field, FilterBar, Money, OpsButton, OpsDrawer, OpsPage,
  OpsPanel, Segmented, ShowTime, StatusBadge, Textarea } from '../../components/Ops';
import { RefreshIcon } from '../../components/Common/CinemaIcons';

const STATUS_TABS = [
  { key: 'REFUND_REQUESTED', label: 'Chờ xử lý' },
  { key: 'REFUNDED', label: 'Đã hoàn tiền' },
  { key: 'ALL', label: 'Tất cả' },
];

const RefundManagementPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('REFUND_REQUESTED');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRefunds = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await bookingApi.getRefunds();
      setBookings(res.data.result || []);
    } catch (err) {
      setLoadError(true);
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
      toast.success((approved ? 'Đã duyệt hoàn tiền đơn ' : 'Đã từ chối hoàn tiền đơn ') + (selected.bookingCode || '#' + selected.bookingId));
      setSelected(null);
      setNote('');
      fetchRefunds();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể xử lý hoàn tiền');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => { setSearchQuery(''); setStatus('ALL'); };
  const openDetails = booking => {
    setSelected(booking);
    setNote(booking.refundProcessNote || '');
  };
  const awaitingGateway = ['PROCESSING', 'UNKNOWN'].includes(selected?.refundGatewayStatus);
  const retrying = selected?.refundGatewayStatus === 'FAILED';
  const columns = [
    { key: 'bookingCode', header: 'Mã đơn', render: row => <Code>{row.bookingCode || '#' + row.bookingId}</Code> },
    { key: 'username', header: 'Khách hàng', render: row => row.username || 'Khách tại quầy' },
    { key: 'movieName', header: 'Phim' },
    { key: 'branchName', header: 'Chi nhánh' },
    { key: 'amount', header: 'Số tiền', align: 'end', render: row => <Money value={row.refundAmount ?? row.totalAmount} /> },
    { key: 'refundReason', header: 'Lý do' },
    { key: 'status', header: 'Trạng thái', render: row => <StatusBadge kind="booking" value={row.status} /> },
    { key: 'open', header: 'Chi tiết', render: row => <OpsButton onClick={() => openDetails(row)}
      aria-label={'Xem yêu cầu ' + row.bookingCode}>{row.status === 'REFUND_REQUESTED' ? 'Xử lý' : 'Xem'}</OpsButton> },
  ];
  return (
    <OpsPage title="Xử lý hoàn tiền" description="Duyệt, từ chối và lưu ghi chú xử lý cho các yêu cầu hoàn tiền."
      actions={<OpsButton icon={<RefreshIcon size={16} />} onClick={fetchRefunds} disabled={loading}>Làm mới</OpsButton>}>
      <FilterBar search={searchQuery} onSearchChange={setSearchQuery} searchLabel="Tìm yêu cầu"
        searchPlaceholder="Mã đơn, khách, phim, lý do" filtered={Boolean(searchQuery || status !== 'ALL')}
        onReset={reset} resultLabel={filtered.length + ' yêu cầu'}>
        <Segmented label="Trạng thái" value={status} onChange={setStatus} options={STATUS_TABS.map(({ key, label }) => ({
          value: key, label, count: key === 'ALL' ? bookings.length : bookings.filter(booking => booking.status === key).length,
        }))} />
      </FilterBar>
      <OpsPanel flush title="Yêu cầu hoàn tiền">
        <DataTable caption="Yêu cầu hoàn tiền" rows={filtered} rowKey="bookingId" columns={columns} stackOnMobile
          state={loading ? 'loading' : loadError ? 'error' : 'ready'} onRetry={fetchRefunds}
          empty={{ title: 'Không có yêu cầu phù hợp', action: { label: 'Xóa bộ lọc', onClick: reset } }} />
      </OpsPanel>
      {selected && <OpsDrawer open title={'Yêu cầu ' + (selected.bookingCode || '#' + selected.bookingId)}
        onClose={() => setSelected(null)} disabled={submitting} footer={selected.status === 'REFUND_REQUESTED' && <>
          <OpsButton variant="ghost-danger" disabled={submitting || awaitingGateway} onClick={() => handleDecision(false)}>Từ chối</OpsButton>
          <OpsButton variant="primary" loading={submitting} onClick={() => handleDecision(true)}>
            {awaitingGateway ? 'Kiểm tra kết quả' : retrying ? 'Thử lại hoàn tiền' : 'Duyệt hoàn tiền'}
          </OpsButton>
        </>}>
        <dl className="o-facts">
          <div><dt>Khách hàng</dt><dd>{selected.username || 'Khách tại quầy'}</dd></div>
          <div><dt>Phim</dt><dd>{selected.movieName || '—'}</dd></div>
          <div><dt>Phòng chiếu</dt><dd>{selected.roomName || '—'}</dd></div>
          <div><dt>Suất chiếu</dt><dd><DateLabel value={selected.showtimeStart} /> <ShowTime value={selected.showtimeStart} /></dd></div>
          <div><dt>Phương thức thanh toán</dt><dd>{selected.paymentMethod || '—'}</dd></div>
          <div><dt>Tổng tiền đơn</dt><dd><Money value={selected.totalAmount} /></dd></div>
          <div><dt>Lý do khách gửi</dt><dd>{selected.refundReason || '—'}</dd></div>
          {selected.refundProcessedAt && <div><dt>Lần xử lý gần nhất</dt>
            <dd><DateLabel value={selected.refundProcessedAt} /> <ShowTime value={selected.refundProcessedAt} />
              <small className="o-subline">{selected.refundProcessedByUsername}</small></dd></div>}
        </dl>
        {selected.refundGatewayMessage && selected.status === 'REFUND_REQUESTED' && <p role="status">{selected.refundGatewayMessage}</p>}
        <Field label="Ghi chú xử lý">
          <Textarea value={note} readOnly={selected.status !== 'REFUND_REQUESTED'}
            onChange={event => setNote(event.target.value)} placeholder="Ghi chú đối soát hoặc lý do từ chối" />
        </Field>
      </OpsDrawer>}
    </OpsPage>
  );
};

export default RefundManagementPage;

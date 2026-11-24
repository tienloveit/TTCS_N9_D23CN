import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { branchApi, operationsApi, reportsApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import { DownloadIcon, RefreshIcon } from '../../components/Common/CinemaIcons';
import { Code, DataTable, Field, FilterBar, Money, OpsButton, OpsPage, OpsPanel,
  Select, ShowTime, StatStrip, StateBlock, TextInput } from '../../components/Ops';
import { cinemaTodayKey } from '../../utils/cinemaTime';

const number = new Intl.NumberFormat('vi-VN');
const percent = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 });
const paymentLabels = { CASH: 'Tiền mặt', CARD: 'Thẻ', VNPAY: 'VNPay' };

const OperationsReportPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [date, setDate] = useState(cinemaTodayKey);
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [revision, setRevision] = useState(0);
  const [response, setResponse] = useState(null);
  const [exporting, setExporting] = useState(false);
  const requestKey = `${date}/${branchId}/${revision}`;
  const currentResponse = response?.key === requestKey ? response : null;
  const loading = !currentResponse;
  const report = currentResponse?.report;
  const error = currentResponse?.error;

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    branchApi.getAll()
      .then((res) => setBranches(res.data.result || []))
      .catch(() => setBranches([]));
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    operationsApi.getDailyReport({ date, branchId: branchId || undefined })
      .then((res) => {
        if (!cancelled) {
          setResponse({ key: requestKey, report: res.data.result });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResponse({
            key: requestKey,
            error: err.response?.data?.message || 'Không thể tải báo cáo vận hành',
          });
        }
      });
    return () => { cancelled = true; };
  }, [date, branchId, requestKey]);

  const summary = report?.summary || {};
  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await reportsApi.exportOperations({ date, branchId: branchId || undefined });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `operations-report-${date}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất file Excel báo cáo vận hành');
    } catch {
      toast.error('Không thể xuất file Excel');
    } finally {
      setExporting(false);
    }
  };


  const basePath = isAdmin ? '/admin' : '/manager';
  const reload = () => setRevision(value => value + 1);
  const today = cinemaTodayKey();
  const filterActive = date !== today || Boolean(branchId);
  const filterReset = () => { setDate(today); setBranchId(''); };
  const paymentRows = report?.paymentBreakdown || [];
  const refundRows = report?.refundQueue || [];
  const showtimeRows = report?.showtimeLoads || [];
  const tableState = loading ? 'loading' : 'ready';
  const paymentColumns = [
    { key: 'method', header: 'Phương thức', render: row => paymentLabels[row.paymentMethod] || row.paymentMethod || '—' },
    { key: 'bookings', header: 'Số đơn', align: 'end', render: row => number.format(row.bookings) },
    { key: 'amount', header: 'Doanh thu', align: 'end', render: row => <Money value={row.amount} /> },
  ];
  const refundColumns = [
    { key: 'code', header: 'Mã đơn', render: row => <Code>{row.bookingCode || '#' + row.bookingId}</Code> },
    { key: 'customerName', header: 'Khách hàng' },
    { key: 'amount', header: 'Số tiền', align: 'end', render: row => <Money value={row.amount} /> },
    { key: 'reason', header: 'Lý do' },
  ];
  const showtimeColumns = [
    { key: 'time', header: 'Giờ chiếu', render: row => <ShowTime value={row.startTime} /> },
    { key: 'film', header: 'Phim / phòng', render: row => <>{row.movieName}<small className="o-subline">{row.roomName}</small></> },
    { key: 'seats', header: 'Vé / ghế', align: 'end', render: row => number.format(row.ticketsSold) + ' / ' + number.format(row.capacity) },
    { key: 'occupancy', header: 'Lấp đầy', align: 'end', render: row => <span className="o-metric">
      <progress max={100} value={row.occupancyRate || 0} className="o-progress" aria-label="Tỷ lệ lấp đầy" />
      {percent.format((row.occupancyRate || 0) / 100)}
    </span> },
  ];
  return (
    <OpsPage title="Báo cáo vận hành" description={report?.branchName}
      actions={<>
        <OpsButton icon={<RefreshIcon size={16} />} onClick={reload} disabled={loading}>Làm mới</OpsButton>
        <OpsButton variant="primary" icon={<DownloadIcon size={16} />} loading={exporting} onClick={exportExcel}>Xuất XLSX</OpsButton>
      </>}>
      <FilterBar filtered={filterActive} onReset={filterReset}>
        <Field label="Ngày báo cáo">
          <TextInput type="date" value={date} onChange={event => setDate(event.target.value || today)} />
        </Field>
        {isAdmin && <Field label="Chi nhánh">
          <Select value={branchId} onChange={event => setBranchId(event.target.value)}>
            <option value="">Tất cả chi nhánh</option>
            {branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
          </Select>
        </Field>}
      </FilterBar>
      {error ? <StateBlock state="error" title={error} onRetry={reload} /> : <>
        <StatStrip loading={loading} items={[
          { label: 'Doanh thu', value: <Money value={summary.revenue} />, note: number.format(summary.completedBookings || 0) + ' đơn đã thanh toán' },
          { label: 'Vé đã bán', value: number.format(summary.ticketsSold || 0), note: <>Doanh thu vé <Money value={summary.ticketRevenue} /></> },
          { label: 'Lấp đầy', value: percent.format((summary.occupancyRate || 0) / 100), note: number.format(summary.totalCapacity || 0) + ' ghế qua ' + number.format(summary.showtimes || 0) + ' suất' },
          { label: 'Hoàn tiền chờ duyệt', value: summary.refundRequests, tone: summary.refundRequests > 0 ? 'warning' : undefined,
            to: basePath + '/refunds', note: <>Đã hoàn <Money value={summary.refundedAmount} /></> },
        ]} />
        <div className="o-report-grid">
          <OpsPanel flush title="Đối soát thanh toán">
            <DataTable caption="Đối soát thanh toán" columns={paymentColumns} rows={paymentRows} rowKey="paymentMethod"
              state={tableState} empty={{ title: 'Chưa có thanh toán trong ngày' }} />
            {paymentRows.length > 0 && <p className="o-report-total">Tổng {number.format(summary.completedBookings || 0)} đơn <Money value={summary.revenue} /></p>}
          </OpsPanel>
          <OpsPanel flush title="Hoàn tiền chờ duyệt" actions={<OpsButton to={basePath + '/refunds'}>Quản lý hoàn tiền</OpsButton>}
            description={summary.refundRequests > refundRows.length ? 'Hiển thị ' + refundRows.length + ' trong ' + summary.refundRequests + ' yêu cầu' : undefined}>
            <DataTable caption="Hoàn tiền chờ duyệt" columns={refundColumns} rows={refundRows} rowKey="bookingId" state={tableState}
              empty={{ title: 'Không có yêu cầu hoàn tiền chờ duyệt' }} />
          </OpsPanel>
        </div>
        <OpsPanel flush title="Suất chiếu trong ngày">
          <DataTable caption="Suất chiếu trong ngày" columns={showtimeColumns} rows={showtimeRows} rowKey="showtimeId"
            state={tableState} empty={{ title: 'Không có suất chiếu trong ngày' }} />
        </OpsPanel>
      </>}
    </OpsPage>
  );
};

export default OperationsReportPage;

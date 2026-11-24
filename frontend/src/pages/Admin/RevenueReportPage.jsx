import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { branchApi, movieApi, reportsApi, userApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import { DownloadIcon } from '../../components/Common/CinemaIcons';
import { Code, DataTable, DateLabel, Field, FilterBar, Money, OpsButton, OpsPage,
  OpsPanel, Segmented, Select, ShowTime, StatStrip, StateBlock, TextInput } from '../../components/Ops';
import { addDaysToDateKey, cinemaTodayKey } from '../../utils/cinemaTime';

const dateDaysAgo = days => addDaysToDateKey(cinemaTodayKey(), -days);
const firstDayOfMonth = today => today.slice(0, 7) + '-01';
const formatNumber = value => new Intl.NumberFormat('vi-VN').format(Number(value || 0));
const shareFormatter = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 });
const paymentLabels = { CASH: 'Tiền mặt', CARD: 'Thẻ', VNPAY: 'VNPay' };
const groups = [
  { key: 'movieBreakdown', label: 'Phim' },
  { key: 'branchBreakdown', label: 'Chi nhánh' },
  { key: 'staffBreakdown', label: 'Nhân viên' },
  { key: 'paymentBreakdown', label: 'Thanh toán' },
];

const DEFAULT_FILTERS = () => ({
  from: dateDaysAgo(29),
  to: dateDaysAgo(0),
  branchId: '',
  movieId: '',
  staffId: '',
  paymentMethod: '',
});

const RevenueReportPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [group, setGroup] = useState(groups[0]);
  const [response, setResponse] = useState(null);
  const [branches, setBranches] = useState([]);
  const [movies, setMovies] = useState([]);
  const [staff, setStaff] = useState([]);
  const [exporting, setExporting] = useState(false);
  const rangeInvalid = filters.from && filters.to && filters.from > filters.to;
  const currentResponse = response?.filters === filters ? response : null;
  const report = currentResponse?.report;
  const loading = !currentResponse && !rangeInvalid;

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      isAdmin ? branchApi.getAll() : Promise.resolve({ data: { result: [] } }),
      movieApi.getAll({ size: 1000 }),
      userApi.getAll({ size: 1000 }),
    ]).then(([branchRes, movieRes, userRes]) => {
      if (!active) return;
      setBranches(branchRes.value?.data.result || []);
      const movieResult = movieRes.value?.data.result;
      setMovies(Array.isArray(movieResult) ? movieResult : movieResult?.data || []);
      const users = userRes.value?.data.result?.data || userRes.value?.data.result || [];
      setStaff(users.filter((item) => item.role === 'STAFF'));
    });
    return () => { active = false; };
  }, [isAdmin]);

  useEffect(() => {
    if (rangeInvalid) return;
    let active = true;
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
    reportsApi.getRevenue(params)
      .then((res) => {
        if (active) setResponse({ filters, report: res.data.result });
      })
      .catch((err) => {
        if (active) {
          setResponse({ filters, error: err.response?.data?.message || 'Không thể tải báo cáo doanh thu.' });
        }
      });
    return () => {
      active = false;
    };
  }, [filters, rangeInvalid]);

  const summary = report?.summary || {};
  const cards = [
    {
      label: 'Tổng doanh thu',
      value: <Money value={summary.revenue} />,
      note: `${formatNumber(summary.bookings)} đơn hoàn tất`,
    },
    {
      label: 'Doanh thu vé',
      value: <Money value={summary.ticketRevenue} />,
      note: `${formatNumber(summary.ticketsSold)} vé đã bán`,
    },
    {
      label: 'Doanh thu bắp nước',
      value: <Money value={summary.foodRevenue} />,
    },
    {
      label: 'Giá trị đơn trung bình',
      value: <Money value={summary.averageOrderValue} />,
    },
  ];

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const today = dateDaysAgo(0);
  const presets = [
    { label: 'Hôm nay', from: today },
    { label: '7 ngày', from: dateDaysAgo(6) },
    { label: '30 ngày', from: dateDaysAgo(29) },
    { label: 'Tháng này', from: firstDayOfMonth(today) },
  ];
  const activePreset = filters.to === today && presets.find(({ from }) => from === filters.from);
  const applyPreset = (from) => setFilters((prev) => ({ ...prev, from, to: today }));

  const exportExcel = async () => {
    setExporting(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
      const res = await reportsApi.exportRevenue(params);
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `revenue-report-${filters.from}-to-${filters.to}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất file Excel doanh thu chi tiết');
    } catch {
      toast.error('Không thể xuất file Excel');
    } finally {
      setExporting(false);
    }
  };


  const transactionRows = report?.rows || [];
  const breakdownRows = report?.[group.key] || [];
  const error = rangeInvalid ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' : currentResponse?.error;


  const activeFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS());
  const reset = () => setFilters(DEFAULT_FILTERS());
  const retry = () => setFilters(current => ({ ...current }));
  const isPaymentGroup = group.key === 'paymentBreakdown';
  const breakdownColumns = [
    { key: 'name', header: isPaymentGroup ? 'Phương thức' : group.label, render: row =>
      isPaymentGroup ? paymentLabels[row.paymentMethod] || row.paymentMethod || '—' : row.name },
    { key: 'bookings', header: 'Số đơn', align: 'end', render: row => formatNumber(row.bookings) },
    ...(!isPaymentGroup ? [{ key: 'tickets', header: 'Số vé', align: 'end', render: row => formatNumber(row.ticketsSold) }] : []),
    { key: 'revenue', header: 'Doanh thu', align: 'end', render: row => <Money value={row.revenue} /> },
    { key: 'share', header: 'Tỷ trọng', align: 'end', render: row => {
      const share = Number(summary.revenue) > 0 ? Number(row.revenue || 0) / Number(summary.revenue) : 0;
      return <span className="o-metric"><progress max={1} value={Math.max(0, share)} className="o-progress" aria-label="Tỷ trọng doanh thu" />
        {shareFormatter.format(share)}</span>;
    } },
  ];
  const transactionColumns = [
    { key: 'code', header: 'Đơn đặt vé', render: row => <><Code>{row.bookingCode || '#' + row.bookingId}</Code>
      <small className="o-subline"><DateLabel value={row.paidAt} /> <ShowTime value={row.paidAt} /></small></> },
    { key: 'total', header: 'Tổng tiền', align: 'end', render: row => <Money value={row.totalAmount} /> },
    { key: 'movie', header: 'Phim / chi nhánh', render: row => <>{row.movieName || '—'}<small className="o-subline">{row.branchName}</small></> },
    { key: 'staff', header: 'Nhân viên', render: row => row.staffUsername || 'Trực tuyến' },
    { key: 'payment', header: 'Thanh toán', render: row => paymentLabels[row.paymentMethod] || row.paymentMethod || '—' },
    { key: 'ticket', header: 'Tiền vé', align: 'end', render: row => <Money value={row.ticketAmount} /> },
    { key: 'food', header: 'Bắp nước', align: 'end', render: row => <Money value={row.foodAmount} /> },
  ];
  const tableState = loading ? 'loading' : 'ready';
  return (
    <OpsPage title="Doanh thu chi tiết"
      actions={<OpsButton variant="primary" icon={<DownloadIcon size={16} />} loading={exporting} disabled={rangeInvalid}
        onClick={exportExcel}>Xuất XLSX</OpsButton>}>
      <div className="o-actions">
        <Segmented label="Khoảng ngày" value={activePreset?.label}
          options={presets.map(preset => ({ value: preset.label, label: preset.label }))}
          onChange={label => applyPreset(presets.find(preset => preset.label === label).from)} />
      </div>
      <FilterBar filtered={activeFilters} onReset={reset}>
        <Field label="Từ ngày">
          <TextInput type="date" value={filters.from} onChange={event => updateFilter('from', event.target.value)} />
        </Field>
        <Field label="Đến ngày" error={rangeInvalid ? error : undefined}>
          <TextInput type="date" value={filters.to} onChange={event => updateFilter('to', event.target.value)} />
        </Field>
        {isAdmin && <Field label="Chi nhánh">
          <Select value={filters.branchId} onChange={event => updateFilter('branchId', event.target.value)}>
            <option value="">Tất cả chi nhánh</option>
            {branches.map(branch => <option key={branch.branchId} value={branch.branchId}>{branch.name}</option>)}
          </Select>
        </Field>}
        <Field label="Phim">
          <Select value={filters.movieId} onChange={event => updateFilter('movieId', event.target.value)}>
            <option value="">Tất cả phim</option>
            {movies.map(movie => <option key={movie.movieId || movie.id} value={movie.movieId || movie.id}>{movie.movieName}</option>)}
          </Select>
        </Field>
        <Field label="Nhân viên">
          <Select value={filters.staffId} onChange={event => updateFilter('staffId', event.target.value)}>
            <option value="">Tất cả</option>
            {staff.map(item => <option key={item.id} value={item.id}>{item.fullName || item.username}</option>)}
          </Select>
        </Field>
        <Field label="Thanh toán">
          <Select value={filters.paymentMethod} onChange={event => updateFilter('paymentMethod', event.target.value)}>
            <option value="">Mọi phương thức</option>
            {Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>
      </FilterBar>
      {error ? <StateBlock state="error" title={error} onRetry={rangeInvalid ? undefined : retry} /> : <>
        <StatStrip items={cards} loading={loading} />
        <OpsPanel flush title="Phân tích doanh thu"
          actions={<Segmented label="Phân nhóm doanh thu" value={group.key}
            options={groups.map(item => ({ value: item.key, label: item.label }))}
            onChange={key => setGroup(groups.find(item => item.key === key))} />}>
          <DataTable caption={'Doanh thu theo ' + group.label.toLocaleLowerCase('vi')} columns={breakdownColumns}
            rows={breakdownRows} rowKey={row => row.id ?? row.name ?? row.paymentMethod} state={tableState}
            empty={{ title: 'Không có doanh thu trong kỳ này', action: { label: 'Đặt lại', onClick: reset } }} />
        </OpsPanel>
        <OpsPanel flush title="Giao dịch" description={!loading && (summary.bookings > transactionRows.length
          ? formatNumber(transactionRows.length) + ' trong ' + formatNumber(summary.bookings) + ' giao dịch gần nhất'
          : formatNumber(transactionRows.length) + ' giao dịch')}>
          <DataTable caption="Giao dịch" columns={transactionColumns} rows={transactionRows} rowKey="bookingId" state={tableState}
            empty={{ title: 'Không có giao dịch trong kỳ này', action: { label: 'Đặt lại', onClick: reset } }} />
        </OpsPanel>
      </>}
    </OpsPage>
  );
};

export default RevenueReportPage;

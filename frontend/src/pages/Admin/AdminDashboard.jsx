import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'react-toastify';
import { analyticsApi, reportsApi } from '../../api';
import { useAuth } from '../../context/useAuth';
import { DownloadIcon } from '../../components/Common/CinemaIcons';
import { Code, DataTable, DateLabel, Money, OpsButton, OpsDrawer, OpsPage, OpsPanel, Segmented,
  ShowTime, StatStrip, StateBlock, StatusBadge, getChartTheme } from '../../components/Ops';
import { cinemaTodayKey, formatDayMonth, toCinemaDateKey } from '../../utils/cinemaTime';
import { formatMoney } from '../../utils/opsFormat';

const number = new Intl.NumberFormat('vi-VN');
const compactNumber = new Intl.NumberFormat('vi-VN', { notation: 'compact' });
const percent = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 });
const percentOf = value => percent.format(Number(value || 0) / 100);
const count = (key, header) => ({ key, header, align: 'end', render: row => number.format(row[key] || 0) });
const money = (key, header) => ({ key, header, align: 'end', render: row => <Money value={row[key]} /> });
const periodOptions = [7, 14, 30].map(value => ({ value, label: value + ' ngày' })).concat({ value: 'month', label: 'Tháng này' });
const bookingCode = booking => booking.bookingCode || '#' + booking.bookingId;

const trendColumns = [{ key: 'label', header: 'Ngày' }, count('bookings', 'Số đơn'), count('tickets', 'Số vé'), money('revenue', 'Doanh thu')];
const movieColumns = [{ key: 'movieName', header: 'Phim' }, count('showtimes', 'Suất'), count('ticketsSold', 'Vé'),
  { key: 'occupancyRate', header: 'Lấp đầy', align: 'end', render: row => percentOf(row.occupancyRate) }, money('revenue', 'Doanh thu')];
const foodColumns = [{ key: 'foodName', header: 'Món' }, count('quantity', 'Số lượng'), money('revenue', 'Doanh thu')];
const bookingColumns = [
  { key: 'code', header: 'Mã đơn', render: row => <Code>{bookingCode(row)}</Code> },
  { key: 'movieName', header: 'Phim' },
  { key: 'createdAt', header: 'Ngày đặt', render: row => <DateLabel value={row.createdAt} /> },
  money('totalAmount', 'Tổng tiền'),
  { key: 'status', header: 'Trạng thái', render: row => <StatusBadge kind="booking" value={row.status} /> },
];

function RevenueTrend({ rows, asTable, today }) {
  if (asTable) return <DataTable caption="Doanh thu theo ngày" columns={trendColumns} rows={rows} rowKey="date" />;
  const theme = getChartTheme();
  return (
    <div role="img" aria-label="Biểu đồ cột doanh thu theo ngày. Bảng số liệu nằm trong cùng mục.">
      <ResponsiveContainer width="100%" height={240} minWidth={0}>
        <BarChart data={rows} accessibilityLayer={false}>
          <CartesianGrid {...theme.grid} />
          <XAxis dataKey="label" {...theme.axis} minTickGap={18} />
          <YAxis {...theme.axis} width={58} tickFormatter={value => compactNumber.format(value)} />
          <Tooltip {...theme.tooltip} formatter={value => [formatMoney(value), 'Doanh thu']} />
          <Bar dataKey="revenue" isAnimationActive={false} fill={theme.series}>
            {rows.map(row => <Cell key={row.date} fill={toCinemaDateKey(row.date) === today ? theme.mark : theme.series} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const basePath = isManager ? '/manager' : '/admin';
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState(30);
  const [asTable, setAsTable] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await analyticsApi.getDashboard();
      setAnalytics(data.result);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được dữ liệu tổng quan.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const today = cinemaTodayKey();
  const monthStart = today.slice(0, 7) + '-01';
  const revenue = useMemo(() => {
    const all = (analytics?.revenueTrend || []).map(item => ({ ...item, revenue: Number(item.revenue || 0) }));
    return period === 'month' ? all.filter(item => toCinemaDateKey(item.date) >= monthStart) : all.slice(-period);
  }, [analytics, monthStart, period]);

  const summary = analytics?.summary || {};
  const from = toCinemaDateKey(revenue[0]?.date) || toCinemaDateKey(analytics?.fromDate);
  const to = toCinemaDateKey(revenue.at(-1)?.date) || toCinemaDateKey(analytics?.toDate);
  const exportReport = async () => {
    setExporting(true);
    try {
      const { data } = await reportsApi.exportRevenue({ from, to });
      const url = URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'revenue-report-' + from + '-to-' + to + '.xlsx';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất XLSX doanh thu');
    } catch {
      toast.error('Không thể xuất XLSX doanh thu');
    } finally {
      setExporting(false);
    }
  };
  const scope = isManager ? 'Tổng quan chi nhánh' : 'Tổng quan hệ thống';
  const description = analytics?.fromDate && analytics?.toDate
    ? 'Tổng hợp từ ' + formatDayMonth(analytics.fromDate) + ' đến ' + formatDayMonth(analytics.toDate) : undefined;
  const tableState = loading ? 'loading' : 'ready';
  return (
    <OpsPage title={scope} description={description}
      actions={<OpsButton variant="primary" icon={<DownloadIcon size={16} />} disabled={loading || !from || !to}
        loading={exporting} onClick={exportReport}>Xuất XLSX</OpsButton>}>
      {error ? <StateBlock state="error" title={error} onRetry={load} /> : <>
        <StatStrip loading={loading} items={[
          { label: 'Tổng doanh thu', value: <Money value={summary.revenue} />, note: number.format(summary.paidBookings || 0) + ' đơn đã thanh toán' },
          { label: 'Vé đã bán', value: number.format(summary.ticketsSold || 0), note: <>Trung bình <Money value={summary.averageOrderValue} /> mỗi đơn</> },
          { label: 'Tỷ lệ lấp đầy', value: percentOf(summary.occupancyRate), note: number.format(summary.totalCapacity || 0) + ' ghế khả dụng' },
          { label: 'Doanh thu bắp nước', value: <Money value={summary.foodRevenue} />, note: <>Doanh thu vé <Money value={summary.ticketRevenue} /></> },
        ]} />
        <div className="o-report-grid" data-overview>
          <OpsPanel title="Doanh thu theo ngày"
            description={!loading && revenue.length > 0 ? <>Tổng <Money value={revenue.reduce((total, row) => total + row.revenue, 0)} /> trong {revenue.length} ngày</> : undefined}
            actions={<>
              <Segmented label="Khoảng thời gian biểu đồ" options={periodOptions} value={period} onChange={setPeriod} />
              <OpsButton onClick={() => setAsTable(value => !value)} aria-pressed={asTable}>{asTable ? 'Xem biểu đồ' : 'Xem dạng bảng'}</OpsButton>
            </>}>
            {loading ? <StateBlock state="loading" title="Đang tải doanh thu" /> :
              revenue.length ? <RevenueTrend rows={revenue} today={today} asTable={asTable} /> :
              <StateBlock title="Chưa có doanh thu trong kỳ" action={{ label: 'Xem báo cáo', to: basePath + '/revenue' }} />}
          </OpsPanel>
          <OpsPanel title="Lấp đầy theo chi nhánh">
            {loading ? <StateBlock state="loading" title="Đang tải tỷ lệ lấp đầy" /> :
              analytics?.occupancyByBranch?.length ? <ul className="o-work-list">
                {analytics.occupancyByBranch.map(branch => <li key={branch.branchId}>
                  <div><strong>{branch.branchName}</strong><small>{number.format(branch.ticketsSold)} / {number.format(branch.capacity)} ghế</small></div>
                  <span className="o-metric"><progress className="o-progress" aria-label={'Lấp đầy ' + branch.branchName}
                    max={100} value={branch.occupancyRate || 0} />{percentOf(branch.occupancyRate)}</span>
                </li>)}
              </ul> : <StateBlock title="Chưa có suất chiếu trong kỳ" />}
          </OpsPanel>
        </div>
        <div className="o-report-grid">
          <OpsPanel title="Phim có doanh thu cao" flush actions={<OpsButton to={basePath + (isManager ? '/showtimes' : '/movies')}>
            {isManager ? 'Quản lý suất chiếu' : 'Quản lý phim'}
          </OpsButton>}>
            <DataTable caption="Phim có doanh thu cao" columns={movieColumns} rows={analytics?.topMovies} rowKey="movieId"
              state={tableState} empty={{ title: 'Chưa có phim nào phát sinh doanh thu' }} />
          </OpsPanel>
          <OpsPanel title="Doanh số bắp nước" flush actions={<OpsButton to={basePath + '/foods'}>Quản lý bắp nước</OpsButton>}>
            <DataTable caption="Doanh số bắp nước" columns={foodColumns} rows={analytics?.foodSales} rowKey="foodId"
              state={tableState} empty={{ title: 'Chưa bán món nào trong kỳ' }} />
          </OpsPanel>
        </div>
        <OpsPanel title="Đơn đặt vé gần đây" flush actions={<OpsButton to={basePath + '/bookings'}>Quản lý đơn</OpsButton>}>
          <DataTable caption="Đơn đặt vé gần đây" columns={bookingColumns} rows={analytics?.recentBookings} rowKey="bookingId"
            state={tableState} selectedKey={detail?.bookingId} onRowOpen={setDetail} stackOnMobile
            empty={{ title: 'Chưa có đơn đặt vé', action: { label: 'Quản lý đơn', to: basePath + '/bookings' } }} />
        </OpsPanel>
      </>}
      {detail && <OpsDrawer open title={'Đơn ' + bookingCode(detail)} onClose={() => setDetail(null)}>
        <dl className="o-facts">
          <div><dt>Khách hàng</dt><dd>{detail.username || 'Khách tại quầy'}</dd></div>
          <div><dt>Phim</dt><dd>{detail.movieName || '—'}</dd></div>
          <div><dt>Suất chiếu</dt><dd><DateLabel value={detail.showtimeStart} /> <ShowTime value={detail.showtimeStart} /></dd></div>
          <div><dt>Chi nhánh</dt><dd>{detail.branchName || '—'}</dd></div>
          <div><dt>Tổng tiền</dt><dd><Money value={detail.totalAmount} /></dd></div>
          <div><dt>Trạng thái</dt><dd><StatusBadge kind="booking" value={detail.status} /></dd></div>
        </dl>
      </OpsDrawer>}
    </OpsPage>
  );
}
